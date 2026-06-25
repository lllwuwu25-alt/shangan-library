# 网页离线包说明

这个版本不需要安装桌面 App。用户拿到压缩包后，双击启动脚本即可在本机浏览器中使用。

## 生成离线包

```bash
npm run offline:package
```

生成目录：

```text
offline-build/上岸资料库-本地版/
```

目录结构：

```text
上岸资料库-本地版/
├─ app/                         # Vite 构建后的网页文件
├─ runtime/                     # 内置本地服务器
├─ 启动上岸资料库.command        # macOS 启动脚本
├─ 启动上岸资料库.bat            # Windows 启动脚本
└─ 使用说明.md
```

## 使用方式

macOS 用户双击：

```text
启动上岸资料库.command
```

Windows 用户双击：

```text
启动上岸资料库.bat
```

程序会自动启动本地服务器并打开浏览器。

## 注意事项

- 当前脚本会编译当前平台的运行时。
- 要生成 Windows 可直接使用的离线包，请在 Windows 上执行 `npm run offline:package`，或用 CI 分平台构建。
- 数据仍保存在用户浏览器本地存储中，建议引导用户定期在设置页导出 JSON。

## GitHub Actions 自动生成 macOS / Windows 离线包

仓库根目录已配置：

```text
.github/workflows/shangan-offline-package.yml
```

使用方式：

1. 推送到 GitHub
2. 进入 `Actions`
3. 选择 `Build Shangan Offline Packages`
4. 点击 `Run workflow`
5. 在 `Artifacts` 下载：
   - `shangan-library-offline-macos`
   - `shangan-library-offline-windows`

也可以用 tag 触发：

```bash
git tag shangan-offline-v0.1.0
git push origin shangan-offline-v0.1.0
```
