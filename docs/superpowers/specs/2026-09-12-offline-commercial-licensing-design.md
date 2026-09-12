# 上岸资料库完全离线商业授权系统设计

## 目标

将当前上岸资料库升级为首个市售授权版本 `v0.7.0`。桌面应用使用 Ed25519 非对称签名在本机完成授权验证，不依赖服务器、账户、网络请求或云端数据库，并保持现有学习数据、附件、备份和应用数据目录不变。

## 已确认决策

- `v0.7.0` 是首个商业授权版本；公开的未授权 `v0.6.1` 安装资源在正式发布前下架。
- GitHub Pages 保留可操作网页演示版，并明确标识为演示环境。
- Tauri 桌面版不接受 Web 演示开关绕过授权。
- 采用“共享协议 + 独立签发工具”方案。
- 测试密钥与正式密钥严格分离；正式私钥只在功能和安全测试通过后，由开发者在本机签发工具中明确初始化。

## 当前系统审计摘要

- 前端为 React 19、TypeScript 6、Vite 8、Tailwind CSS 4，状态管理为 Zustand。
- 前端入口为 `src/main.tsx`，应用路由由 `src/App.tsx` 基于 pathname 管理。
- 桌面端为 Tauri 2.11.3，Rust 入口为 `src-tauri/src/main.rs` 和 `src-tauri/src/lib.rs`。
- 当前没有 Tauri commands，也没有 Free、Pro、VIP 或 License 逻辑。
- 业务数据使用 localStorage；附件和知识树使用 IndexedDB。
- 现有备份、恢复和清空均由前端处理，授权数据不得进入这些流程。
- Bundle ID 为 `com.shangan.library`；现有桌面工作流构建 Apple Silicon、Intel macOS 和 Windows 安装包。

完整审计结果在实现阶段写入 `docs/LICENSE_PRECHECK.md`。

## 架构

### 共享协议

新增独立 Rust crate `crates/license-protocol`，仅包含：

- `LicensePayload`、`LicenseStatus` 和稳定错误码数据模型。
- `SL1.<payload>.<signature>` 的 Base64URL no-padding 编解码。
- 确定性的 JSON payload 字节序列化规则。
- 公共字段常量和无签名能力的格式校验。

该 crate 不依赖 `ed25519-dalek::SigningKey`，不读取私钥，也不提供生成授权码的 API。客户端与签发工具共同依赖它，避免协议漂移。

### 客户端验证

在 `src-tauri/src/license/` 增加客户端专用模块：

- `keys.rs`：按 `key_id` 注册公钥，只包含公开信息。
- `verify.rs`：解析、选择公钥、验签并验证产品和商业规则。
- `storage.rs`：在 Tauri `app_config_dir` 下保存原始授权码为 `license.dat`。
- `commands.rs`：暴露 `activate_license`、`get_license_status`、`deactivate_license`。
- `error.rs`：向前端返回稳定错误码，不泄露授权字符串、签名字节或内部路径。

验证顺序为：检查 SL1 结构、解码 payload、只读取 `key_id` 以选公钥、验证 Ed25519 签名、再信任并检查 schema、product、edition、license type 和 expires_at。客户端每次启动都重新读取原始授权码并验签，不持久化布尔授权状态。

### 前端 Gate

新增 `LicenseGate`、`LicenseActivation` 和设置页中的 `LicenseStatusPanel`：

- 在 Tauri 环境启动时调用 Rust `get_license_status`。
- Missing 或 Invalid 只显示激活页，不渲染主应用布局。
- 激活成功后再次从 Rust 获取状态，再进入主应用。
- 移除授权仅调用 `deactivate_license`，随后返回激活页。
- Web 构建不调用 Tauri command；仅当 `VITE_DEMO_MODE=true` 且不在 Tauri 环境时进入演示应用。
- 即使前端缓存显示状态，Rust 返回结果仍是唯一授权依据。

### 独立签发工具

新增 `tools/license-issuer`，作为独立 Tauri 2 应用：

- 签名逻辑和 `SigningKey` 只存在于该工具 Rust 后端。
- 私钥保存在签发工具自身的 Application Support/App Config 目录，不进入源码、资源、CI 或 Release。
- 首次使用必须明确选择初始化新体系或恢复已有私钥，禁止缺失时静默生成。
- 私钥文件在 Unix 上限制为仅当前用户读写；其他平台采用可用的最严格本地文件权限并在文档中说明限制。
- 本地保存授权签发记录，包含 License ID、订单备注、销售渠道、生成时间、版本和原始授权码，不保存客户敏感身份信息。
- 支持搜索、复制授权、导出公钥、导出私钥备份和恢复私钥。
- 公钥同步工具只接受 32 字节 Ed25519 公钥，并只更新客户端公钥注册文件。

签发工具不进入桌面客户构建矩阵，也不上传到公开 GitHub Release。

## 数据模型

`LicensePayload` 固定包含：

- `schema_version = 1`
- `key_id = primary-2026`
- 安全随机 `license_id`
- `product_id = com.shangan.library`
- `edition = pro`
- `license_type = lifetime`
- `issued_at`
- 可选 `expires_at`
- 可选且非敏感的 `customer_ref`
- `features = [full_access]`

授权码格式为 `SL1.<base64url-json>.<base64url-ed25519-signature>`。同一授权码跨 CPU 架构和操作系统有效，不进行设备绑定。

## 数据隔离

- 客户端授权文件位于 Tauri `app_config_dir/license.dat`。
- localStorage、IndexedDB、完整备份 JSON 和“清空数据”均不包含或删除授权文件。
- 移除授权不触碰学习计划、资料、附件、错题、番茄钟、设置或知识树。
- 用户更新应用时 Bundle ID 和应用数据目录保持不变。

## UI

激活页延续现有白底、低饱和蓝色和清晰留白，提供长授权码输入、完整粘贴、激活状态和本地隐私说明。错误信息映射为简洁中文，不显示 Rust 堆栈。

设置页新增“授权与版本”，显示 Pro、已激活、永久授权、License ID、应用版本、复制 License ID 和低强调的“移除此设备上的授权”。网页演示版显示演示标识，不伪装为已购买授权。

签发工具采用安静的桌面工作台布局：签发表单、结果区、记录搜索与密钥管理分区。危险的私钥导出、恢复和重建授权体系使用明确警告和二次确认。

## 正式密钥仪式

1. 开发和自动测试只使用 `tests/fixtures` 中的测试密钥；测试私钥不得被生产客户端引用或打包。
2. 客户端在尚未同步正式公钥时可以构建，但拒绝所有正式授权，并在发布检查中阻止制作客户 Release。
3. 安全测试通过后，开发者在本机签发工具中明确初始化 `primary-2026` 正式密钥。
4. 立即导出一份离线私钥备份并核对恢复能力。
5. 只导出正式公钥，经校验脚本同步至客户端公钥注册表。
6. 提交公钥，重新完成全部测试和客户安装包构建。

## 发布策略

- `v0.7.0` 客户构建工作流在构建前运行前端测试、lint、TypeScript/Vite build、客户端 cargo tests 和公钥就绪检查。
- 三个平台构建均使用相同协议和公钥，生成 macOS Apple Silicon、macOS Intel、Windows 安装包。
- GitHub Pages 继续使用 `VITE_DEMO_MODE=true`；桌面构建使用 `false`，Tauri 环境本身还会强制进入 Rust Gate。
- 正式发布前下架旧 `v0.6.1` 安装资源，但在文档中明确：已经下载的旧二进制无法通过完全离线系统远程停用。

## 测试与安全审查

- 协议测试覆盖格式、Base64URL、payload 序列化和错误输入。
- 客户端测试覆盖正常签名、所有字段篡改、错误签名、未知 schema/key、错误产品、错误 edition/type 和过期授权。
- 存储测试覆盖 Missing、Valid、重启重验、文件篡改、删除授权和业务数据隔离。
- 前端测试覆盖启动 Gate、失败提示、激活成功、设置状态和移除授权。
- 签发工具测试覆盖两个唯一授权、客户端互认、记录删除不影响验证、私钥缺失不自动再生和备份恢复。
- 最终搜索客户端、构建产物、Git 跟踪文件和日志中的私钥、签名 API、万能开关和敏感字符串。

## 明确限制

完全离线且不绑定设备的 V1 无法可靠提供远程撤销、设备数量统计、订阅控制、防分享或系统时间防篡改。该版本不声称具备这些能力，也不采集硬件标识。
