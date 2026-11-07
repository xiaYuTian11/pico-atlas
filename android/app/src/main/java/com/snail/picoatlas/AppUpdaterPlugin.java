package com.snail.picoatlas;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * 应用内升级：下载 APK + 唤起系统安装器。
 *
 * 为什么不用浏览器下载：
 *   孩子在用的时候不该弹出浏览器。升级入口只在家长层，
 *   下载进度也留在应用内，"下载完直接装"一步到位。
 *
 * 说明：Android 8.0+ 安装未知来源应用需要用户在系统设置里授权，
 * 这里检测到没授权会直接跳到对应设置页，而不是静默失败。
 */
@CapacitorPlugin(name = "AppUpdater")
public class AppUpdaterPlugin extends Plugin {

    @PluginMethod
    public void getVersion(PluginCall call) {
        JSObject ret = new JSObject();
        try {
            android.content.pm.PackageInfo info = getContext()
                .getPackageManager()
                .getPackageInfo(getContext().getPackageName(), 0);
            ret.put("version", info.versionName);
            ret.put("code", info.versionCode);
        } catch (Exception e) {
            ret.put("version", "0.0.0");
            ret.put("code", 0);
        }
        call.resolve(ret);
    }

    /** 下载 APK 到应用私有目录，进度通过 downloadProgress 事件推给 JS */
    @PluginMethod
    public void download(final PluginCall call) {
        final String url = call.getString("url");
        String fileName = call.getString("fileName");
        if (url == null) {
            call.reject("missing url");
            return;
        }
        final String name = (fileName == null || fileName.isEmpty()) ? "update.apk" : fileName;

        new Thread(
            () -> {
                HttpURLConnection conn = null;
                try {
                    File dir = new File(getContext().getExternalFilesDir(null), "updates");
                    if (!dir.exists() && !dir.mkdirs()) {
                        call.reject("cannot create update dir");
                        return;
                    }
                    File out = new File(dir, name);
                    if (out.exists() && !out.delete()) {
                        call.reject("cannot overwrite old apk");
                        return;
                    }

                    conn = (HttpURLConnection) new URL(url).openConnection();
                    conn.setInstanceFollowRedirects(true);
                    conn.setConnectTimeout(20000);
                    conn.setReadTimeout(60000);
                    conn.connect();

                    int status = conn.getResponseCode();
                    if (status < 200 || status >= 300) {
                        call.reject("http " + status);
                        return;
                    }

                    long total = conn.getContentLengthLong();
                    long received = 0;
                    int lastPercent = -1;

                    try (InputStream in = conn.getInputStream();
                         OutputStream os = new FileOutputStream(out)) {
                        byte[] buf = new byte[16384];
                        int n;
                        while ((n = in.read(buf)) > 0) {
                            os.write(buf, 0, n);
                            received += n;
                            if (total > 0) {
                                int percent = (int) (received * 100 / total);
                                if (percent != lastPercent) {
                                    lastPercent = percent;
                                    JSObject p = new JSObject();
                                    p.put("percent", percent);
                                    p.put("received", received);
                                    p.put("total", total);
                                    notifyListeners("downloadProgress", p);
                                }
                            }
                        }
                    }

                    JSObject ret = new JSObject();
                    ret.put("path", out.getAbsolutePath());
                    ret.put("size", out.length());
                    call.resolve(ret);
                } catch (Exception e) {
                    call.reject(e.getMessage() == null ? "download failed" : e.getMessage());
                } finally {
                    if (conn != null) conn.disconnect();
                }
            }
        ).start();
    }

    /** 唤起系统安装器 */
    @PluginMethod
    public void install(PluginCall call) {
        String path = call.getString("path");
        if (path == null) {
            call.reject("missing path");
            return;
        }
        File file = new File(path);
        if (!file.exists()) {
            call.reject("apk not found");
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            && !getContext().getPackageManager().canRequestPackageInstalls()) {
            try {
                Intent settings = new Intent(
                    Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                    Uri.parse("package:" + getContext().getPackageName())
                );
                settings.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(settings);
            } catch (Exception ignored) {
                // 跳不过去就让 JS 提示用户手动开
            }
            String msg = "need_permission";
            call.reject(msg);
            return;
        }

        try {
            Uri uri = FileProvider.getUriForFile(
                getContext(),
                getContext().getPackageName() + ".fileprovider",
                file
            );
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(uri, "application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject(e.getMessage() == null ? "install failed" : e.getMessage());
        }
    }
}
