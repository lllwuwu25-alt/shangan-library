# 上岸资料库离线授权架构

## 目标

`v0.7.0` 使用完全离线、永久、非设备绑定的商业授权。客户不需要账户或网络，授权验证不会读取学习资料，也不会向外发送设备信息。

## 信任边界

系统分为三个互相隔离的部分：

1. 客户桌面应用只包含 Ed25519 公钥和验签代码，不包含签名能力。
2. 开发者签发工具位于 `tools/license-issuer/`，私钥和签发记录只保存在该工具的本机配置目录。
3. GitHub Pages 是演示构建，显式使用 `VITE_DEMO_MODE=true`；Tauri 桌面运行时始终优先执行 Rust 授权 Gate，因此此开关不能绕过桌面授权。

客户安装包的构建和上传路径只能位于 `src-tauri/target/`。签发工具、私钥备份和签发记录不得进入客户安装包。

## 授权协议

授权码格式为：

```text
SL1.<Base64URL payload>.<Base64URL Ed25519 signature>
```

Payload 使用 schema 1，并固定以下商业字段：

- `key_id`: `primary-2026`
- `product_id`: `com.shangan.library`
- `edition`: `pro`
- `license_type`: `lifetime`
- `features`: `full_access`
- `expires_at`: `null`

签发工具对规范化后的 payload 原始字节签名。客户程序先验证签名，再信任业务字段。任何字符、字段或签名变更都会导致验证失败。

## 启动流程

桌面应用每次启动都会从独立授权文件读取原始授权码并重新验证：

- `Missing`: 显示激活页。
- `Invalid`: 拒绝进入主应用并显示稳定错误提示。
- `Valid`: 进入学习系统。

激活成功只写入授权文件。移除授权只删除授权文件，不会删除学习计划、资料索引、附件、错题、设置或番茄钟记录。

## 本地位置

客户授权文件位于 Tauri 应用配置目录中的 `license.dat`：

- macOS: `~/Library/Application Support/com.shangan.library/license.dat`
- Windows: `%APPDATA%\com.shangan.library\license.dat`
- Linux: `~/.config/com.shangan.library/license.dat`

签发工具数据位于其独立应用配置目录的 `license-issuer-data/`：

- macOS: `~/Library/Application Support/com.shangan.library.license-issuer/license-issuer-data/`
- Windows: `%APPDATA%\com.shangan.library.license-issuer\license-issuer-data\`
- Linux: `~/.config/com.shangan.library.license-issuer/license-issuer-data/`

目录中包含 `license-private.key` 和 `issuance-records.json`。Unix 系统上的私钥和签发记录以 `0600` 权限写入。

## 已知边界

完全离线且不绑定设备的授权无法可靠实现远程撤销、授权设备数统计、订阅续费控制、防止授权码分享或系统时间防篡改。当前版本不声称具备这些能力，也不采集硬件标识。
