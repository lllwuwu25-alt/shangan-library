# 上岸资料库 v0.7.0 商业授权实施报告

## 项目现状

客户应用继续使用 React、TypeScript、Vite、Tailwind CSS、Zustand 与 Tauri 2。学习计划和基础数据保存在 WebView localStorage，资料附件与知识树数据保存在 IndexedDB。授权数据没有并入业务数据、备份 JSON 或清空数据流程。

桌面应用保留文件选择、文件系统与系统打开能力，使用 `tauri-plugin-dialog`、`tauri-plugin-fs` 和 `tauri-plugin-opener`。网页演示继续作为独立展示入口，不参与商业授权验证。

## 架构实现

### 共享协议

`crates/license-protocol` 定义 `SL1` 授权信封、负载字段、状态模型和 Base64URL 编解码。该 crate 不提供签名或密钥生成功能，客户应用与签发工具共同依赖同一协议模型。

### 客户验证器

客户侧 Rust 模块位于 `src-tauri/src/license`：

- `keys.rs` 仅保存正式公钥注册表。
- `verify.rs` 使用 Ed25519 验证签名，并检查产品、版本、授权类型、版本级别和有效期规则。
- `storage.rs` 将原始授权码独立保存为 Tauri app config 下的 `license.dat`，每次启动重新验证。
- `commands.rs` 只暴露查询、激活和移除授权三个命令。

React 的 `LicenseGate` 在 Tauri 环境中等待 Rust 状态后决定显示激活页或完整应用。开发模式和网页演示变量不能绕过 Tauri 授权门。设置页显示版本与授权状态，并允许只移除授权文件。

### 独立签发工具

开发者签发工具位于 `tools/license-issuer`，拥有独立的 Tauri Bundle Identifier 和数据目录。它支持：

- 明确确认后初始化新的正式授权体系。
- 从备份恢复已有私钥，并拒绝覆盖为不同根密钥。
- 生成唯一永久授权，保存订单备注与渠道记录。
- 搜索历史记录、复制授权、导出公钥和导出私钥备份。
- 私钥缺失时保持缺失状态，不自动生成替代密钥。

签发工具的 Unix 私钥和签发记录使用仅当前用户可读写的权限。客户构建、CI 和网页演示不会构建或上传签发工具。

## 本机存储位置

客户授权文件：

- macOS：`~/Library/Application Support/com.shangan.library/license.dat`
- Windows：`%APPDATA%/com.shangan.library/license.dat`

开发者签发数据位于签发工具自己的 app config 目录中，包含私钥文件和签发记录。私钥备份应继续保存在离线介质；公钥导出可用于受控同步脚本。任何私钥、签发记录和真实授权码都不得进入项目目录或 Git。

## 正式密钥流程

1. 所有功能、边界与安全测试先使用测试夹具完成。
2. 开发者在本机签发工具中手动输入保护短语并初始化正式体系。
3. 立即导出私钥离线备份与公钥 JSON。
4. `license:sync-public-key` 严格校验公钥文件，只更新客户公钥注册表受控区块。
5. `license:check-release` 确认正式公钥存在，客户代码没有签名能力，版本与 CI 发布边界一致。

同步脚本拒绝多余字段、私钥相关字段、错误算法、错误 Key ID、Base64 padding 和非 32 字节公钥。正式公钥正文未写入本报告。

## 首个授权验收

开发者通过签发工具界面生成第一条非客户验收授权，客户桌面端完成激活、退出重启、重新验证和移除授权。业务 localStorage 在移除授权前后长度与摘要一致，证明授权生命周期与学习数据彼此隔离。

## 备份与恢复

- 私钥至少保留两份离线备份，分别存放在不同介质。
- 公钥 JSON 可重新导出，但不能替代私钥备份。
- 更换开发机时先安装或运行签发工具，再选择恢复已有私钥。
- 恢复后核对 Key ID 与公钥指纹，再进行新授权签发。
- 不在聊天、工单、Git、公开网盘或安装包中传输私钥正文。

## 发布流水线

桌面 GitHub Actions 矩阵包含 macOS Apple Silicon、macOS Intel 与 Windows x64。每个平台在打包前执行 lint、前端测试、商业发布守卫和客户 Rust 验证器测试；桌面构建显式关闭演示模式，只上传客户安装包。

GitHub Pages 工作流显式开启演示模式，仅构建网页演示。签发工具没有进入任何客户 artifact 或 Release 路径。

## 发布状态

- 本机 macOS Intel release 应用与 DMG 已成功生成并检查。
- 正式授权激活、重启持久化、移除授权和业务数据保留已通过。
- Apple Silicon 与 Windows 安装包等待 GitHub Actions 在正式发布阶段构建。
- 当前尚未推送、创建 `v0.7.0` 标签或发布安装包，也未删除旧版公开资产。

## 已知限制与后续建议

- 完全离线授权无法实时撤销，也没有账户或设备指纹绑定；若未来需要限制设备数量，应升级协议并保留旧授权兼容策略。
- macOS 商业分发建议配置 Developer ID 签名与 Apple 公证，减少用户看到“应用已损坏”或来源不明提示的概率。
- 私钥恢复应定期在隔离环境演练，但演练不得覆盖正在使用的正式签发数据目录。
- 发布前继续遵循 `docs/LICENSE_RELEASE_PROCESS.md`，并在明确批准后才移除旧版资产、合并分支、打标签和触发三平台发布。
