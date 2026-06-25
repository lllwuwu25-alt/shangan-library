# 桌面 App 打包说明

上岸资料库已接入 Tauri 2，可打包为 macOS 和 Windows 桌面应用。

## 本机依赖

需要先安装：

- Node.js 22+
- Rust 和 Cargo
- macOS 打包需要 Xcode Command Line Tools
- Windows 打包需要 Microsoft C++ Build Tools / WebView2 运行环境

macOS 可执行：

```bash
xcode-select --install
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

安装 Rust 后重开终端，确认：

```bash
rustc --version
cargo --version
```

## 开发预览

```bash
npm run desktop:dev
```

## 正式打包

```bash
npm run desktop:build
```

产物位置：

```text
src-tauri/target/release/bundle/
```

macOS 常见产物：

```text
src-tauri/target/release/bundle/dmg/*.dmg
src-tauri/target/release/bundle/macos/*.app
```

Windows 常见产物：

```text
src-tauri/target/release/bundle/msi/*.msi
src-tauri/target/release/bundle/nsis/*.exe
```

`bundle.targets` 当前使用 `all`，表示在当前系统生成该平台支持的安装包。macOS 安装包需要在 macOS 上打，Windows 安装包建议在 Windows 上打。

## GitHub Actions 自动打包

如果 `shangan-library/` 是独立 GitHub 仓库，仓库内已配置：

```text
.github/workflows/desktop-build.yml
```

如果使用当前外层目录作为 monorepo，外层仓库根目录也已配置：

```text
.github/workflows/shangan-desktop-build.yml
```

触发方式：

1. 在 GitHub 仓库页面进入 `Actions`
2. 独立仓库选择 `Build Desktop Installers`；外层 monorepo 选择 `Build Shangan Desktop Installers`
3. 点击 `Run workflow`

完成后在该 workflow run 的 `Artifacts` 里下载：

```text
shangan-library-macos
shangan-library-windows
```

独立仓库也可以通过 tag 触发：

```bash
git tag v0.1.0
git push origin v0.1.0
```

外层 monorepo 可以通过 tag 触发：

```bash
git tag shangan-v0.1.0
git push origin shangan-v0.1.0
```

注意：当前仓库里 `shangan-library/` 是子目录，所以 workflow 放在仓库根目录 `.github/workflows/` 下。如果以后把 `shangan-library` 单独拆成一个独立仓库，需要把 `.github/` 目录一起复制到新仓库根目录。

## 售卖前建议

- 先把附件存储从 `localStorage` 升级到 `IndexedDB`。
- 准备一份用户使用说明和数据备份说明。
- 如果要面向 macOS 正式分发，后续需要 Apple Developer 账号做签名和公证。
- 如果要面向 Windows 正式分发，后续建议准备代码签名证书，减少安全弹窗。
