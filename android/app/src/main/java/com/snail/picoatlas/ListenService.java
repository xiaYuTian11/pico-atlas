package com.snail.picoatlas;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;

import androidx.core.app.NotificationCompat;

/**
 * 听书前台服务：息屏播放时持有 PARTIAL_WAKE_LOCK，让 WebView 的 JS 计时器
 * 与 <audio> 不因息屏休眠而停摆（配合 Capacitor 默认 keepRunning=true）。
 *
 * 孩子息屏后故事/古诗继续播；通知栏给家长一个「停止」出口。
 */
public class ListenService extends Service {

    public static final String CHANNEL_ID = "pico_atlas_listen";
    private static final int NOTI_ID = 9527;
    private PowerManager.WakeLock wakeLock;

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "picoatlas:listen");
        wakeLock.setReferenceCounted(false);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && "stop".equals(intent.getAction())) {
            KeepAwakePlugin.onServiceStopped();
            stopSelf();
            return START_NOT_STICKY;
        }
        String title = intent != null ? intent.getStringExtra("title") : null;
        Notification notification = buildNotification(title == null ? "小图鉴" : title);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTI_ID, notification, android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        } else {
            startForeground(NOTI_ID, notification);
        }
        if (wakeLock != null && !wakeLock.isHeld()) {
            // 6 小时上限：一场听书远用不完，兜底防泄漏
            wakeLock.acquire(6 * 60 * 60 * 1000L);
        }
        return START_NOT_STICKY;
    }

    @Override
    public void onDestroy() {
        if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
        super.onDestroy();
    }

    private Notification buildNotification(String title) {
        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel ch = new NotificationChannel(
                    CHANNEL_ID, "息屏听书", NotificationManager.IMPORTANCE_LOW);
            ch.setDescription("息屏后继续播放故事与古诗");
            nm.createNotificationChannel(ch);
        }

        // 点通知回到应用
        Intent open = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent pOpen = open == null ? null : PendingIntent.getActivity(
                this, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        // 「停止」动作
        Intent stop = new Intent(this, ListenService.class);
        stop.setAction("stop");
        PendingIntent pStop = PendingIntent.getService(
                this, 1, stop, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder b = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
                .setContentTitle(title)
                .setContentText("正在息屏播放，点按停止")
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .addAction(0, "停止", pStop);
        if (pOpen != null) b.setContentIntent(pOpen);
        return b.build();
    }
}
