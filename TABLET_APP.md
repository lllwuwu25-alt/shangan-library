# 平板版交付说明

上岸资料库平板版采用两条路径：

1. iPad：在线 PWA。用户用 Safari 打开部署后的网址，然后选择“添加到主屏幕”。
2. 安卓平板：Capacitor Android App。当前版本先生成 debug APK，用于试用、演示和小范围交付。

## iPad PWA

PWA 已包含：

- `public/manifest.webmanifest`
- `public/sw.js`
- `public/offline.html`
- `public/apple-touch-icon.png`
- iOS 所需的 `apple-mobile-web-app-*` meta 标签

构建命令：

```bash
npm run build
```

将 `dist/` 部署到 HTTPS 静态站点后，iPad 用户打开网址并添加到主屏幕即可使用。

如果部署到 GitHub Pages 项目子路径，使用：

```bash
VITE_BASE_PATH=/shangan-library/ npm run build
cp dist/index.html dist/404.html
```

项目已添加自动部署 workflow：

```txt
.github/workflows/pwa-pages.yml
```

触发方式：

- 在 GitHub Actions 页面手动运行 `Deploy iPad PWA`
- 或推送标签，例如：

```bash
git tag pwa-v0.3.2
git push origin pwa-v0.3.2
```

部署完成后，iPad 用户访问：

```txt
https://lllwuwu25-alt.github.io/shangan-library/
```

注意：

- iPad PWA 的本地数据保存在 Safari/WebKit 的本机存储中。
- PWA 首次加载需要网络，之后会缓存应用外壳。
- 如果用户清理 Safari 网站数据，本地学习数据也会被清除，所以正式交付时仍建议引导用户定期导出 JSON。

## 安卓平板 APK

Capacitor 配置文件：

```txt
capacitor.config.ts
```

Android 原生工程：

```txt
android/
```

常用命令：

```bash
npm run android:sync
npm run android:open
```

`android:sync` 会先构建 React/Vite 产物，再同步到 Android 工程。

本机生成 APK 需要安装 Android Studio / Android SDK。安装后可运行：

```bash
cd android
./gradlew assembleDebug
```

APK 输出位置：

```txt
android/app/build/outputs/apk/debug/app-debug.apk
```

## GitHub Actions 构建 APK

已添加：

```txt
.github/workflows/android-apk.yml
```

触发方式：

- 在 GitHub Actions 页面手动运行 `Build Android APK`
- 或推送标签，例如：

```bash
git tag android-v0.3.2
git push origin android-v0.3.2
```

构建成功后下载 artifact：

```txt
shangan-library-android-debug-apk
```

## 后续正式售卖建议

当前 debug APK 适合演示和早期试用。正式售卖建议升级为：

- release APK/AAB
- 独立签名 keystore
- 版本号自动递增
- 数据从 localStorage/base64 附件逐步迁移到 IndexedDB Blob
