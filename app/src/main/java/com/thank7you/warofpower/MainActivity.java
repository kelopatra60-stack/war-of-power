package com.thank7you.warofpower;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.webkit.WebViewAssetLoader;

/**
 * War of Power — the game runs in a full-screen WebView.
 * The single-file game (assets/www/index.html, built from web/ by tools/build.py) is served from
 * https://appassets.androidplatform.net so the page is a secure origin (localStorage, WebRTC online rooms).
 * NetBridge is exposed to the page as window.TWNative for hotspot / Wi-Fi play (js/net/net.js).
 */
public class MainActivity extends Activity {
    private static final String HOME = "https://appassets.androidplatform.net/assets/www/index.html";
    private static final int PICK_FILE = 41;
    private WebView web;
    private NetBridge net;
    private ValueCallback<Uri[]> fileCb; // the page's <input type=file> waiting for the gallery (profile picture)

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        Window w = getWindow();
        w.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON | WindowManager.LayoutParams.FLAG_FULLSCREEN);
        if (Build.VERSION.SDK_INT >= 28) {
            WindowManager.LayoutParams lp = w.getAttributes();
            lp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            w.setAttributes(lp);
        }
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(6, 7, 5));
        setContentView(web);
        immersive();

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setUseWideViewPort(true);
        s.setLoadWithOverviewMode(true);
        s.setTextZoom(100); // keep the layout intact even with large system fonts
        s.setCacheMode(WebSettings.LOAD_DEFAULT);

        final WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();
        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
                return loader.shouldInterceptRequest(req.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                Uri u = req.getUrl();
                if ("appassets.androidplatform.net".equals(u.getHost())) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception ignored) { }
                return true; // support links, ntfy, Binance open outside the game
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(PermissionRequest request) { request.grant(request.getResources()); }

            // <input type=file> (the "+" on the commander screen): open the gallery / file picker and hand the chosen picture back to the page
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> cb, FileChooserParams params) {
                if (fileCb != null) fileCb.onReceiveValue(null);
                fileCb = cb;
                Intent pick = null;
                try { pick = params.createIntent(); } catch (Exception ignored) { }
                if (pick == null) { pick = new Intent(Intent.ACTION_GET_CONTENT); pick.addCategory(Intent.CATEGORY_OPENABLE); pick.setType("image/*"); }
                try {
                    startActivityForResult(Intent.createChooser(pick, null), PICK_FILE);
                } catch (Exception e) {
                    fileCb = null;
                    cb.onReceiveValue(null);
                }
                return true;
            }
        });
        net = new NetBridge(this, web);
        web.addJavascriptInterface(net, "TWNative");
        if (state != null) web.restoreState(state); else web.loadUrl(HOME);
    }

    private void immersive() {
        View d = getWindow().getDecorView();
        d.setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) immersive();
    }

    // the page decides: close a window, pause the battle, go back a screen… or leave the game from the main menu
    @Override
    public void onBackPressed() {
        web.evaluateJavascript("(window.__twBack ? window.__twBack() : 0)", v -> {
            if (v == null || "0".equals(v) || "null".equals(v)) MainActivity.super.onBackPressed();
        });
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    @Override
    protected void onPause() { super.onPause(); web.onPause(); }

    @Override
    protected void onResume() { super.onResume(); web.onResume(); immersive(); }

    @Override
    protected void onDestroy() {
        if (net != null) net.shutdown();
        if (web != null) web.destroy();
        super.onDestroy();
    }

    @Override
    protected void onActivityResult(int code, int result, Intent data) {
        super.onActivityResult(code, result, data);
        if (code != PICK_FILE || fileCb == null) return;
        fileCb.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result, data)); // null when the player backs out
        fileCb = null;
    }

    @Override
    public void onRequestPermissionsResult(int code, String[] perms, int[] res) {
        super.onRequestPermissionsResult(code, perms, res);
    }
}
