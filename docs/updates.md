# 应用内升级（在线更新）

> 目标：家长在「家长设置 → 关于与更新」点一下，应用自己下载新版 APK 并唤起安装器。
> 孩子端永远看不到升级提示。

---

## 1. 现状与限制（务必先读）

| 方式                   | 能不能用         | 说明                                                      |
| ---------------------- | ---------------- | --------------------------------------------------------- |
| **GitHub Releases**    | 需要仓库**公开** | 匿名读 API；私库会 404（除非把 token 塞进包里，绝不建议） |
| **latest.json 备用源** | 可以，私库也能用 | 放在任意公开地址（gist / 对象存储 / CDN），改 URL 即可    |
| 应用商店               | 不适用           | 自用侧载，不上架                                          |

代码里的两个常量在 `src/update/updater.ts`：

```ts
export const UPDATE_REPO = 'xiaYuTian11/pico-atlas';
export const UPDATE_FEED = `https://raw.githubusercontent.com/${UPDATE_REPO}/main/public/updates/latest.json`;
```

**当前仓库是 private** —— 所以现在点「检查更新」会提示"连不上更新源"。
两条路选一条：

1. 把仓库改成 public（最简单；代码里本来也没有隐私内容）；
2. 或把 `public/updates/latest.json` 同步到一个公开地址，改 `UPDATE_FEED`。

---

## 2. 发一个新版本（三步）

```powershell
# 1) 改版本号（三处保持一致）
#    package.json / android/app/build.gradle(versionName) / public/updates/latest.json
# 2) 打包
npm run apk
# 3) 发布到 GitHub（公开仓库）
gh release create v0.1.1 "android/app/build/outputs/apk/debug/app-debug.apk#pico-atlas-0.1.1.apk" `
  --title "v0.1.1" --notes "修复：古诗读完四句；新增语速设置"
```

如果走备用源，同时把 `public/updates/latest.json` 的 `version / url / notes / size` 更新，
提交到 main（`raw.githubusercontent.com` 会跟着更新）。

---

## 3. 客户端流程

```
家长设置 → 关于与更新 → 检查更新
   ↓ GitHub Releases 取不到
   ↓ 取 latest.json
发现新版本 → 显示版本号 / 体积 / 更新说明
   ↓ 点「下载并安装」
原生 AppUpdater.download()  → 下载到 app 私有目录 updates/
   ↓ 进度条（downloadProgress 事件）
原生 AppUpdater.install()   → FileProvider + ACTION_VIEW 唤起系统安装器
   ↓
系统弹"是否安装" → 完成
```

首次安装时 Android 8.0+ 需要允许「安装未知应用」：
应用检测不到权限会直接跳到系统授权页，授权后再点一次即可。

---

## 4. 为什么不做"热更新"

Capacitor 的 Web 资源打在 APK 里，运行时替换需要 `@capgo/capacitor-updater` 之类的插件
把 web 包解到应用目录并切换加载路径。

自用场景下**不建议**：

- 每次热更新都是"未经系统校验的代码执行"，出问题会白屏且无法回滚；
- 内容（图片/语音）体积大，APK 全量替换反而更简单；
- 你的更新频率很低（加内容为主），装一次 APK 不麻烦。

如果以后真要"只更新内容、不动外壳"，正确的做法是：
内容包（JSON + 媒体）单独下载到应用目录，`media.ts` 优先查本地覆盖层 ——
这是一个独立特性，等词库稳定了再做。
