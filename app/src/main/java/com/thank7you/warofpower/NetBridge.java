package com.thank7you.warofpower;

import android.Manifest;
import android.app.Activity;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.InterfaceAddress;
import java.net.NetworkInterface;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Hotspot / Wi-Fi play for War of Power, exposed to the page as window.TWNative (see js/net/net.js).
 *
 * Host: a relay on TCP 47700. App players send one text line per message; friends without the app open
 * http://HOST-IP:47700 in a browser, get the game over HTTP from the same port and join through a WebSocket at /ws.
 * The relay speaks exactly the line protocol of the in-page hub in js/net/rtc.js:
 *   #hello|name|wantHost|ver → #welcome|id|hostId|[peers] (+ #join|id|name to the others) or #full / #nohost / #busy
 *   "to|payload" with to = h (host) · * (everyone else) · id   → delivered as "fromId|payload"
 *   #state|lobby|ingame · #ping → #pong · leaving → #leave|id, or #hostleft when the host goes.
 * Discovery: the host broadcasts "TWGAME|name|47700|players|max|state" on UDP 47701 every second;
 * scanning phones pass "ip|TWGAME|…" to the page.
 */
public class NetBridge {
    static final int PORT = 47700, DISC = 47701;
    private final Activity act;
    private final WebView web;
    private final Handler ui = new Handler(Looper.getMainLooper());

    NetBridge(Activity act, WebView web) { this.act = act; this.web = web; }

    /* ------------------------------------------------------------ page events ------------------------------------------------------------ */
    private void ev(final String type, final String data) {
        ui.post(() -> web.evaluateJavascript("window.TWNet&&TWNet._ev(" + JSONObject.quote(type) + "," + JSONObject.quote(data == null ? "" : data) + ")", null));
    }

    private final List<String> inbox = new ArrayList<>();
    private boolean flushQueued;

    private void lineIn(String l) {
        synchronized (inbox) {
            inbox.add(l);
            if (flushQueued) return;
            flushQueued = true;
        }
        ui.post(() -> {
            JSONArray a = new JSONArray();
            synchronized (inbox) { for (String s : inbox) a.put(s); inbox.clear(); flushQueued = false; }
            if (a.length() > 0) web.evaluateJavascript("window.TWNet&&TWNet._evs(" + a + ")", null);
        });
    }

    /* ------------------------------------------------------------ this phone as a player ------------------------------------------------------------ */
    private Socket cs;
    private OutputStream cout;
    private final Object cLock = new Object();

    @JavascriptInterface
    public void connect(final String host, final int port) {
        disconnect();
        new Thread(() -> {
            Socket s = new Socket();
            try {
                s.setTcpNoDelay(true);
                s.connect(new InetSocketAddress(host, port > 0 ? port : PORT), 6000);
                synchronized (cLock) { cs = s; cout = s.getOutputStream(); }
                ev("open", "");
                LineReader r = new LineReader(new BufferedInputStream(s.getInputStream()));
                String l;
                while ((l = r.readLine()) != null) lineIn(l);
                ev("close", "");
            } catch (IOException e) {
                ev(s.isConnected() ? "close" : "error", String.valueOf(e.getMessage()));
            } finally {
                synchronized (cLock) { if (cs == s) { cs = null; cout = null; } }
                try { s.close(); } catch (IOException ignored) { }
            }
        }, "tw-client").start();
    }

    @JavascriptInterface
    public void send(String line) {
        synchronized (cLock) {
            if (cout == null) return;
            try { cout.write((line + "\n").getBytes(StandardCharsets.UTF_8)); cout.flush(); } catch (IOException e) { try { cs.close(); } catch (IOException ignored) { } }
        }
    }

    @JavascriptInterface
    public void disconnect() {
        synchronized (cLock) { if (cs != null) try { cs.close(); } catch (IOException ignored) { } cs = null; cout = null; }
    }

    /* ------------------------------------------------------------ hosting ------------------------------------------------------------ */
    private ServerSocket server;
    private volatile String roomName = "War of Power", roomState = "lobby";
    private volatile int maxPlayers = 6;
    private final Map<Integer, Peer> peers = new ConcurrentHashMap<>();
    private int nextId = 1, hostId = 0;
    private Thread beacon;

    @JavascriptInterface
    public String hostStart(String name, int max) {
        roomName = clean(name); maxPlayers = Math.max(2, Math.min(6, max > 0 ? max : 6)); roomState = "lobby";
        synchronized (this) {
            if (server != null && !server.isClosed()) return "ok";
            try {
                ServerSocket ss = new ServerSocket();
                ss.setReuseAddress(true);
                ss.bind(new InetSocketAddress(PORT));
                server = ss;
            } catch (IOException e) {
                return "تعذر فتح المنفذ " + PORT + ": " + e.getMessage();
            }
        }
        final ServerSocket ss = server;
        new Thread(() -> {
            while (!ss.isClosed()) {
                try { final Socket s = ss.accept(); s.setTcpNoDelay(true); new Thread(() -> serve(s), "tw-peer").start(); } catch (IOException e) { break; }
            }
        }, "tw-accept").start();
        startBeacon();
        return "ok";
    }

    private synchronized void stopHosting() {
        if (server != null) try { server.close(); } catch (IOException ignored) { }
        server = null; hostId = 0;
        for (Peer p : peers.values()) p.close();
        peers.clear();
        if (beacon != null) beacon.interrupt();
        beacon = null;
    }

    abstract static class Peer {
        int id; String name = ""; boolean ok;
        abstract void tx(String line);
        abstract void close();
    }

    static final class TcpPeer extends Peer {
        final Socket s; final OutputStream o;
        TcpPeer(Socket s) throws IOException { this.s = s; this.o = s.getOutputStream(); }
        synchronized void tx(String line) { try { o.write((line + "\n").getBytes(StandardCharsets.UTF_8)); o.flush(); } catch (IOException e) { close(); } }
        void close() { try { s.close(); } catch (IOException ignored) { } }
    }

    static final class WsPeer extends Peer {
        final Socket s; final OutputStream o;
        WsPeer(Socket s) throws IOException { this.s = s; this.o = s.getOutputStream(); }
        synchronized void tx(String line) { try { frame(o, 0x1, line.getBytes(StandardCharsets.UTF_8)); } catch (IOException e) { close(); } }
        void close() { try { s.close(); } catch (IOException ignored) { } }
    }

    // one connection: an app player (text lines), a browser asking for the game (HTTP) or a browser player (WebSocket)
    private void serve(Socket s) {
        Peer p = null;
        try {
            BufferedInputStream in = new BufferedInputStream(s.getInputStream());
            LineReader r = new LineReader(in);
            String first = r.readLine();
            if (first == null) return;
            if (first.startsWith("GET ") || first.startsWith("HEAD ")) {
                Map<String, String> h = new ConcurrentHashMap<>();
                String l;
                while ((l = r.readLine()) != null && !l.isEmpty()) { int c = l.indexOf(':'); if (c > 0) h.put(l.substring(0, c).trim().toLowerCase(Locale.ROOT), l.substring(c + 1).trim()); }
                String path = first.split(" ")[1];
                String up = h.get("upgrade");
                if (path.startsWith("/ws") && up != null && up.equalsIgnoreCase("websocket")) {
                    String key = h.get("sec-websocket-key");
                    String acc = Base64.encodeToString(MessageDigest.getInstance("SHA-1").digest((key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").getBytes(StandardCharsets.UTF_8)), Base64.NO_WRAP);
                    OutputStream o = s.getOutputStream();
                    o.write(("HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: " + acc + "\r\n\r\n").getBytes(StandardCharsets.UTF_8));
                    o.flush();
                    p = add(new WsPeer(s));
                    wsLoop(r, (WsPeer) p);
                } else {
                    http(s, path, first.startsWith("HEAD "));
                }
                return;
            }
            p = add(new TcpPeer(s));
            recv(p, first);
            String l;
            while ((l = r.readLine()) != null) recv(p, l);
        } catch (Exception ignored) {
        } finally {
            if (p != null) drop(p);
            try { s.close(); } catch (IOException ignored) { }
        }
    }

    private synchronized Peer add(Peer p) { p.id = nextId++; peers.put(p.id, p); return p; }

    private List<Peer> live() { List<Peer> l = new ArrayList<>(); for (Peer p : peers.values()) if (p.ok) l.add(p); return l; }

    private synchronized void recv(Peer c, String l) {
        if (l == null || l.isEmpty()) return;
        if (l.charAt(0) == '#') {
            String[] f = l.split("\\|", -1);
            switch (f[0]) {
                case "#hello": {
                    boolean wantHost = f.length > 2 && "1".equals(f[2]);
                    if (live().size() >= maxPlayers) { c.tx("#full"); return; }
                    if (!wantHost && hostId == 0) { c.tx("#nohost"); return; }
                    if (!wantHost && "ingame".equals(roomState)) { c.tx("#busy"); return; }
                    if (wantHost) hostId = c.id;
                    c.ok = true;
                    String n = f.length > 1 && !f[1].isEmpty() ? f[1] : "لاعب";
                    c.name = n.length() > 18 ? n.substring(0, 18) : n;
                    JSONArray arr = new JSONArray();
                    for (Peer x : live()) { try { arr.put(new JSONObject().put("id", x.id).put("name", x.name)); } catch (Exception ignored) { } }
                    c.tx("#welcome|" + c.id + "|" + hostId + "|" + arr);
                    for (Peer o : live()) if (o != c) o.tx("#join|" + c.id + "|" + c.name);
                    return;
                }
                case "#state": roomState = f.length > 1 && "ingame".equals(f[1]) ? "ingame" : "lobby"; return;
                case "#room": if (c.id == hostId && f.length > 1) { roomName = clean(f[1]); if (f.length > 2) try { maxPlayers = Math.max(2, Math.min(6, Integer.parseInt(f[2]))); } catch (NumberFormatException ignored) { } } return;
                case "#ping": c.tx("#pong"); return;
                default: return;
            }
        }
        if (!c.ok) return;
        int bar = l.indexOf('|');
        if (bar < 0) return;
        String to = l.substring(0, bar), out = c.id + "|" + l.substring(bar + 1);
        if ("h".equals(to)) { Peer hc = peers.get(hostId); if (hc != null && hc != c) hc.tx(out); }
        else if ("*".equals(to)) { for (Peer o : live()) if (o != c) o.tx(out); }
        else { try { Peer o = peers.get(Integer.parseInt(to)); if (o != null && o.ok) o.tx(out); } catch (NumberFormatException ignored) { } }
    }

    private void drop(Peer c) {
        boolean hostGone;
        synchronized (this) {
            if (peers.remove(c.id) == null || !c.ok) return;
            hostGone = c.id == hostId;
            if (hostGone) { hostId = 0; for (Peer o : live()) o.tx("#hostleft"); }
            else for (Peer o : live()) o.tx("#leave|" + c.id);
        }
        if (hostGone) stopHosting(); // the room closes with its host
    }

    private void wsLoop(LineReader r, WsPeer p) throws IOException {
        InputStream in = r.in;
        ByteArrayOutputStream msg = new ByteArrayOutputStream();
        while (true) {
            int b0 = in.read(), b1 = in.read();
            if (b0 < 0 || b1 < 0) return;
            boolean fin = (b0 & 0x80) != 0; int op = b0 & 0x0f; boolean masked = (b1 & 0x80) != 0; long len = b1 & 0x7f;
            if (len == 126) len = ((in.read() & 0xff) << 8) | (in.read() & 0xff);
            else if (len == 127) { len = 0; for (int i = 0; i < 8; i++) len = (len << 8) | (in.read() & 0xff); }
            if (len > (1 << 22)) return;
            byte[] mask = new byte[4];
            if (masked) readFully(in, mask);
            byte[] data = new byte[(int) len];
            readFully(in, data);
            if (masked) for (int i = 0; i < data.length; i++) data[i] ^= mask[i & 3];
            if (op == 0x8) { synchronized (p) { frame(p.o, 0x8, new byte[0]); } return; }
            if (op == 0x9) { synchronized (p) { frame(p.o, 0xA, data); } continue; }
            if (op == 0xA) continue;
            msg.write(data, 0, data.length);
            if (fin) {
                String text = new String(msg.toByteArray(), StandardCharsets.UTF_8); msg.reset();
                for (String l : text.split("\n")) if (!l.isEmpty()) recv(p, l);
            }
        }
    }

    static void frame(OutputStream o, int op, byte[] d) throws IOException {
        ByteArrayOutputStream b = new ByteArrayOutputStream(d.length + 10);
        b.write(0x80 | op);
        if (d.length < 126) b.write(d.length);
        else if (d.length < 65536) { b.write(126); b.write(d.length >> 8); b.write(d.length & 0xff); }
        else { b.write(127); for (int i = 7; i >= 0; i--) b.write((int) ((long) d.length >> (8 * i)) & 0xff); }
        b.write(d, 0, d.length);
        o.write(b.toByteArray());
        o.flush();
    }

    static void readFully(InputStream in, byte[] b) throws IOException {
        int n = 0;
        while (n < b.length) { int k = in.read(b, n, b.length - n); if (k < 0) throw new IOException("eof"); n += k; }
    }

    // friends without the app: the same single-file game, served from the APK's assets
    private void http(Socket s, String path, boolean head) throws IOException {
        OutputStream o = s.getOutputStream();
        int q = path.indexOf('?'); if (q >= 0) path = path.substring(0, q);
        if (path.equals("/") || path.isEmpty()) path = "/index.html";
        if (path.contains("..")) path = "/index.html";
        byte[] body;
        try (InputStream in = act.getAssets().open("www" + path)) {
            ByteArrayOutputStream b = new ByteArrayOutputStream(); byte[] buf = new byte[65536]; int k;
            while ((k = in.read(buf)) > 0) b.write(buf, 0, k);
            body = b.toByteArray();
        } catch (IOException e) {
            o.write("HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n".getBytes(StandardCharsets.UTF_8)); o.flush(); return;
        }
        String type = path.endsWith(".html") ? "text/html; charset=utf-8" : path.endsWith(".js") ? "application/javascript; charset=utf-8" : path.endsWith(".css") ? "text/css; charset=utf-8"
                : path.endsWith(".png") ? "image/png" : path.endsWith(".svg") ? "image/svg+xml" : path.endsWith(".json") ? "application/json" : "application/octet-stream";
        o.write(("HTTP/1.1 200 OK\r\nContent-Type: " + type + "\r\nContent-Length: " + body.length + "\r\nCache-Control: no-cache\r\nConnection: close\r\n\r\n").getBytes(StandardCharsets.UTF_8));
        if (!head) o.write(body);
        o.flush();
    }

    /* ------------------------------------------------------------ discovery ------------------------------------------------------------ */
    private void startBeacon() {
        if (beacon != null && beacon.isAlive()) return;
        beacon = new Thread(() -> {
            try (DatagramSocket ds = new DatagramSocket()) {
                ds.setBroadcast(true);
                while (!Thread.currentThread().isInterrupted() && server != null) {
                    if (hostId != 0) {
                        byte[] b = ("TWGAME|" + roomName + "|" + PORT + "|" + live().size() + "|" + maxPlayers + "|" + roomState).getBytes(StandardCharsets.UTF_8);
                        for (InetAddress a : broadcasts()) { try { ds.send(new DatagramPacket(b, b.length, a, DISC)); } catch (IOException ignored) { } }
                    }
                    Thread.sleep(1000);
                }
            } catch (Exception ignored) { }
        }, "tw-beacon");
        beacon.start();
    }

    private static List<InetAddress> broadcasts() {
        List<InetAddress> out = new ArrayList<>();
        try {
            out.add(InetAddress.getByName("255.255.255.255"));
            for (NetworkInterface ni : Collections.list(NetworkInterface.getNetworkInterfaces())) {
                if (!ni.isUp() || ni.isLoopback()) continue;
                for (InterfaceAddress ia : ni.getInterfaceAddresses()) if (ia.getBroadcast() != null) out.add(ia.getBroadcast());
            }
        } catch (Exception ignored) { }
        return out;
    }

    private volatile DatagramSocket scanSock;
    private WifiManager.MulticastLock mlock;

    @JavascriptInterface
    public void scan(boolean on) {
        if (!on) { stopScan(); return; }
        if (scanSock != null) return;
        try {
            WifiManager wm = (WifiManager) act.getApplicationContext().getSystemService(Context.WIFI_SERVICE);
            if (wm != null) { mlock = wm.createMulticastLock("tw-scan"); mlock.setReferenceCounted(false); mlock.acquire(); }
        } catch (Exception ignored) { }
        new Thread(() -> {
            try {
                DatagramSocket ds = new DatagramSocket(null);
                ds.setReuseAddress(true); ds.setBroadcast(true); ds.bind(new InetSocketAddress(DISC));
                scanSock = ds;
                byte[] buf = new byte[512];
                while (!ds.isClosed()) {
                    DatagramPacket pk = new DatagramPacket(buf, buf.length);
                    ds.receive(pk);
                    String s = new String(pk.getData(), 0, pk.getLength(), StandardCharsets.UTF_8);
                    if (s.startsWith("TWGAME|")) ev("host", pk.getAddress().getHostAddress() + "|" + s);
                }
            } catch (IOException ignored) {
            } finally { scanSock = null; }
        }, "tw-scan").start();
    }

    private void stopScan() {
        DatagramSocket ds = scanSock; scanSock = null;
        if (ds != null) ds.close();
        if (mlock != null) try { mlock.release(); } catch (Exception ignored) { }
        mlock = null;
    }

    @JavascriptInterface
    public String ips() {
        List<String> out = new ArrayList<>();
        try {
            for (NetworkInterface ni : Collections.list(NetworkInterface.getNetworkInterfaces())) {
                if (!ni.isUp() || ni.isLoopback()) continue;
                for (InetAddress a : Collections.list(ni.getInetAddresses())) if (a instanceof Inet4Address) out.add(a.getHostAddress());
            }
        } catch (Exception ignored) { }
        StringBuilder b = new StringBuilder();
        for (String s : out) { if (b.length() > 0) b.append(','); b.append(s); }
        return b.toString();
    }

    /* ------------------------------------------------------------ notifications (friends' messages / invitations) ------------------------------------------------------------ */
    private boolean asked;

    /** While a multiplayer room is open: a foreground service keeps the game (and its connections) alive in the background. */
    @JavascriptInterface
    public void keepAlive(final boolean on, final String text) {
        ui.post(() -> {
            try {
                Intent i = new Intent(act, RoomService.class);
                if (on) {
                    if (Build.VERSION.SDK_INT >= 33 && act.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED)
                        act.requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 7);
                    i.putExtra("t", text);
                    if (Build.VERSION.SDK_INT >= 26) act.startForegroundService(i); else act.startService(i);
                } else act.stopService(i);
            } catch (Exception ignored) { }
        });
    }

    @JavascriptInterface
    public void notify(final String title, final String text) {
        ui.post(() -> {
            try {
                if (Build.VERSION.SDK_INT >= 33 && act.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                    if (!asked) { asked = true; act.requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 7); }
                    return;
                }
                NotificationManager nm = (NotificationManager) act.getSystemService(Context.NOTIFICATION_SERVICE);
                if (nm == null) return;
                Notification.Builder b;
                if (Build.VERSION.SDK_INT >= 26) {
                    nm.createNotificationChannel(new NotificationChannel("friends", "War of Power", NotificationManager.IMPORTANCE_DEFAULT));
                    b = new Notification.Builder(act, "friends");
                } else b = new Notification.Builder(act);
                Intent open = new Intent(act, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
                PendingIntent pi = PendingIntent.getActivity(act, 0, open, Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0);
                b.setSmallIcon(R.drawable.ic_stat).setContentTitle(title).setContentText(text).setAutoCancel(true).setContentIntent(pi);
                nm.notify((int) (System.currentTimeMillis() & 0xffff), b.build());
            } catch (Exception ignored) { }
        });
    }

    void shutdown() { disconnect(); stopScan(); stopHosting(); }

    private static String clean(String s) {
        if (s == null) return "War of Power";
        s = s.replace("|", " ").replace("\n", " ").trim();
        return s.isEmpty() ? "War of Power" : (s.length() > 24 ? s.substring(0, 24) : s);
    }

    /** UTF-8 line reader that keeps the raw stream usable afterwards (WebSocket frames follow the HTTP header). */
    static final class LineReader {
        final InputStream in;
        LineReader(InputStream in) { this.in = in; }
        String readLine() throws IOException {
            ByteArrayOutputStream b = new ByteArrayOutputStream(128);
            int c;
            while ((c = in.read()) >= 0) {
                if (c == '\n') break;
                if (c != '\r') b.write(c);
                if (b.size() > (1 << 20)) throw new IOException("line too long");
            }
            if (c < 0 && b.size() == 0) return null;
            return new String(b.toByteArray(), StandardCharsets.UTF_8);
        }
    }
}
