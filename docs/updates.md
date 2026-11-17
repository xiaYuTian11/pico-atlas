# 应用内升级（在线更新）

> 目标：家长在「家长设置 → 关于与更新」点一下，应用自己下载新版 APK 并唤起安装器。
> 孩子端永远看不到升级提示。

---

## 1. 现状与限制（务必先读）

| 方式                   | 能不能用         | 说明                                                      |
| ---------------------- | ---------------- | --------------------------------------------------------- |
| **GitHub Releases**    | 需要仓库**公开** | 匿名读 API **及匿名下载资产都要求 public**；私库全 404（已实测：带 token 200、匿名 404） |
| **latest.json 备用源** | 同样需要 public  | gist 本身可达，但 latest.json 里的 `url` 指向 GitHub Release 资产——私库下同样下载不到 |
| 应用商店               | 不适用           | 自用侧载，不上架                                          |

**结论：想在 App 内在线更新，仓库必须转 public**（Settings → General → Danger Zone → Change visibility）。
私库状态下更新面板会提示"连不上更新源"或下载失败，属预期行为。

代码里的两个常量在 `src/update/updater.ts`：

```ts
export const UPDATE_REPO = 'xiaYuTian11/pico-atlas';
export const UPDATE_FEED = `https://gist.githubusercontent.com/xiaYuTian11/9d35ae995de3782a380e948b1ab0dd9c/raw/latest.json`;
```

**当前仓库是 public**（已从 private 转出）—— 「检查更新」可直接读 GitHub Releases 匿名下载，
`latest.json` 的 gist 作为备用源。同签名前提下，应用内「下载并安装」与手动下载安装都是**覆盖升级**，不需要卸载。

---

## 2. 签名与覆盖安装（改这里前必读）

Android 要求**覆盖安装的 APK 与已装版本签名完全一致**，否则报「签名不兼容」，
只能先卸载旧版（连带丢存档）。所以签名密钥一旦确定就不能再变。

| 项 | 值 |
| --- | --- |
| 密钥文件 | `android/keystore/pico-atlas.keystore`（**不入库**，含私钥） |
| keystore 口令 | `android` |
| 别名 / 别名口令 | `androiddebugkey` / `android` |
| 证书 SHA-256 | `f0b3d92095b0be4b853cb3925685d7b62bae8b90575aa1b466dbc5ff45774bc2` |

**这份密钥就是 v0.2.0 / v0.2.1 / v0.2.2 的签名密钥**（实测三版指纹一致），
`android/app/build.gradle` 的 `signingConfigs.pico` 显式指向它，debug 与 release 都用它。
因此从 v0.2.2 起的所有后续版本都能直接覆盖安装。

> v0.1.0 用的是另一份签名，从它升到 0.2.x 必须卸载一次，属历史遗留，不再追。

**必须做的备份**：把该文件另存一份到仓库外（当前本机还有一份在 `~/.android/debug.keystore`）。
丢失后果 = 之后所有版本都无法覆盖安装，所有设备都得卸载重装一次。

密钥文件缺失时**构建会直接失败**并提示，不会再静默产出一份签名不同的包。

每次发版还要确认 `versionCode` 递增（`tools/bump-version.mjs` 会自动按 `主*10000+次*100+修订` 计算，
如 `0.2.3` → `203`），否则覆盖安装报「版本降级」。

---

## 3. 发一个新版本（三步）

```powershell
# 1) 改版本号（三处保持一致）
#    package.json / android/app/build.gradle(versionName) / public/updates/latest.json
# 2) 打包
npm run apk
# 3) 发布到 GitHub（公开仓库）
gh release create v0.1.1 "android/app/build/outputs/apk/debug/app-debug.apk#pico-atlas-0.1.1.apk" `
  --title "v0.1.1" --notes "修复：古诗读完四句；新增语速设置"
```

如果走备用源，同时把 `public/updates/latest.json` 的 `version / url / notes / size` 更新
（`size` 填真实字节数，可用 `ls -l` 查），提交到 main 后，
**gist 上也要同步改一份**（当前 UPDATE_FEED 读的是 gist，不是仓库 raw 地址）。

---

## 4. 客户端流程

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

## 5. 为什么不做"热更新"

Capacitor 的 Web 资源打在 APK 里，运行时替换需要 `@capgo/capacitor-updater` 之类的插件
把 web 包解到应用目录并切换加载路径。

自用场景下**不建议**：

- 每次热更新都是"未经系统校验的代码执行"，出问题会白屏且无法回滚；
- 内容（图片/语音）体积大，APK 全量替换反而更简单；
- 你的更新频率很低（加内容为主），装一次 APK 不麻烦。

如果以后真要"只更新内容、不动外壳"，正确的做法是：
内容包（JSON + 媒体）单独下载到应用目录，`media.ts` 优先查本地覆盖层 ——
这是一个独立特性，等词库稳定了再做。
