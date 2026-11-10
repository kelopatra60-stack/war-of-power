package com.thank7you.warofpower;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;

/**
 * Keeps the game running while a multiplayer room is open (online or hotspot).
 * Without it Android may freeze the app as soon as the player switches to WhatsApp to send the room code,
 * and then nobody can join. Started and stopped from the page through NetBridge.keepAlive (js/net/net.js → keep()).
 * It only shows a quiet ongoing notification; tapping it brings the game back.
 */
public class RoomService extends Service {
    private static final String CHANNEL = "room";
    private static final int ID = 7;

    @Override
    public IBinder onBind(Intent intent) { return null; }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String text = intent != null ? intent.getStringExtra("t") : null;
        if (text == null || text.isEmpty()) text = "غرفة اللعب الجماعي مفتوحة";
        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26 && nm != null && nm.getNotificationChannel(CHANNEL) == null)
            nm.createNotificationChannel(new NotificationChannel(CHANNEL, "غرفة اللعب الجماعي", NotificationManager.IMPORTANCE_LOW));
        Intent open = new Intent(this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(this, 1, open, Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0);
        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(this, CHANNEL) : new Notification.Builder(this);
        b.setSmallIcon(R.drawable.ic_stat).setContentTitle("War of Power").setContentText(text).setContentIntent(pi).setOngoing(true);
        Notification n = b.build();
        try {
            if (Build.VERSION.SDK_INT >= 29) startForeground(ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC);
            else startForeground(ID, n);
        } catch (Exception e) {
            stopSelf(); // the system refused (rare): the game still works, it just may sleep in the background
        }
        return START_NOT_STICKY;
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) { stopSelf(); } // the game was swiped away: no room to keep
}
