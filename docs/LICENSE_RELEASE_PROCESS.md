# 商业版发布流程

## 首次发布前

1. 运行客户前端测试、lint、生产构建和 Rust 验签测试。
2. 运行签发器前端测试、lint、生产构建和 Rust 签发测试。
3. 启动本地签发工具，明确初始化正式根密钥。
4. 导出两份私钥离线备份并完成恢复演练。
5. 导出公钥 JSON，不要导出或复制私钥正文。
6. 使用 `npm run license:sync-public-key -- <public-key.json>` 同步正式公钥。
7. 生成第一条官方测试授权，确认激活、重启复验和移除授权均符合预期。
8. 运行 `npm run license:check-release`，必须完全通过。

## 构建顺序

```bash
npm ci
npm test
npm run lint
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
npm run license:check-release
```

然后通过客户应用的 GitHub Actions 构建三个安装包：

- macOS Apple Silicon DMG
- macOS Intel DMG
- Windows NSIS EXE

客户构建不得运行 `tools/license-issuer` 的打包命令，也不得上传其 `target`、`dist`、私钥、记录或导出目录。GitHub Pages 继续使用演示模式，演示开关在 Tauri 环境中不会绕过 Rust Gate。

## 客户交付

1. 在本地签发工具填写内部订单备注和销售渠道。
2. 生成永久 Pro 授权。
3. 将完整 `SL1...` 授权码发送给对应客户。
4. 客户首次启动桌面应用，粘贴授权码并在本机激活。
5. 客户重启后由本机公钥自动复验，无需联网。

授权丢失时可在签发记录中按 License ID、订单备注或渠道搜索并复制原授权码。删除签发记录不会使已发出的离线授权失效。

## `v0.6.1` 处理

公开发布 `v0.7.0` 商业版前，应移除 GitHub 上公开、未授权的 `v0.6.1` 安装资源，避免继续下载。已经下载或安装的旧二进制无法通过完全离线授权系统远程停用；这一限制必须如实保留在发布记录中。

## 每次后续发布

- 不重新初始化根密钥。
- 确认当前公钥仍与 `primary-2026` 一致。
- 保留客户本地业务数据和原授权文件路径，更新安装不得清空用户数据。
- 发布前重新运行完整测试和 release guard。
- 仅在明确批准打包后创建标签和公开 Release。
