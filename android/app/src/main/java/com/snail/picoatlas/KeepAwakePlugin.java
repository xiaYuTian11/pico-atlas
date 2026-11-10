package com.snail.picoatlas;

import android.content.Intent;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.lang.ref.WeakReference;

/**
 * 息屏听书插件（web 侧 src/audio/keepawake.ts 与之对应）。
 *
 * start(title)：启动 ListenService 前台服务（唤醒锁 + 通知栏停止按钮）
 * stop()：停服务放锁。重复调用幂等。
 */
@CapacitorPlugin(name = "KeepAwakeAudio")
public class KeepAwakePlugin extends Plugin {

    private boolean running = false;
    private static WeakReference<KeepAwakePlugin> instanceRef;

    @Override
    public void load() {
        super.load();
        instanceRef = new WeakReference<>(this);
    }

    public static void onServiceStopped() {
        if (instanceRef != null) {
            KeepAwakePlugin plugin = instanceRef.get();
            if (plugin != null) {
                plugin.running = false;
                JSObject ret = new JSObject();
                ret.put("action", "stop");
                plugin.notifyListeners("stopRequested", ret);
            }
        }
    }

    @PluginMethod
    public void start(PluginCall call) {
        String title = call.getString("title");
        Intent i = new Intent(getContext(), ListenService.class);
        if (title != null) i.putExtra("title", title);
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                getContext().startForegroundService(i);
            } else {
                getContext().startService(i);
            }
            running = true;
            call.resolve();
        } catch (Exception e) {
            // 厂商 ROM 限制或前台条件不满足：不阻塞功能，息屏播放退化为自然行为
            running = false;
            call.reject("service_start_failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        try {
            getContext().stopService(new Intent(getContext(), ListenService.class));
        } catch (Exception ignored) {
            // 服务已停
        }
        running = false;
        call.resolve();
    }

    @PluginMethod
    public void isRunning(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("running", running);
        call.resolve(ret);
    }
}
