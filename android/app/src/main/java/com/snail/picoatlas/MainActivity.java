package com.snail.picoatlas;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AppUpdaterPlugin.class);
        // 息屏听书：前台服务（唤醒锁 + 通知栏停止按钮）
        registerPlugin(KeepAwakePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
