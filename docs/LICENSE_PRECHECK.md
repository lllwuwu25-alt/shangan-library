# License 开发前源码审计

审计日期：2026-09-12

## 产品与版本

- 产品名称：上岸资料库
- 当前商业开发目标版本：0.7.0
- Bundle Identifier：`com.shangan.library`
- 旧版本数据兼容要求：保持现有 Bundle ID、localStorage key、IndexedDB database name 和 Tauri 应用目录不变。

## 前端

- 框架：React 19.2.7
- 语言：TypeScript 6
- 构建：Vite 8.1.0
- 样式：Tailwind CSS 4
- 状态管理：Zustand 5
- 入口：`src/main.tsx`
- 应用启动：`src/main.tsx` 渲染 `App` 并注册 PWA；`src/App.tsx` 根据 `window.location.pathname` 选择页面，并由 `Layout` 包裹主应用。
- 路由：项目未使用 React Router，现有 pathname 路由保持不变。

## Tauri 与 Rust

- Tauri：2.11.3
- Rust edition：2021
- Rust 最低版本：1.77.2
- 可执行入口：`src-tauri/src/main.rs`
- 应用 Builder：`src-tauri/src/lib.rs`
- 现有 Tauri commands：无
- 现有插件：`tauri-plugin-log`、`tauri-plugin-dialog`、`tauri-plugin-fs`、`tauri-plugin-opener`
- 现有 capabilities：core default、dialog open、fs read/stat、opener reveal item in directory
- 当前 Rust setup 只在 debug 构建启用日志插件；授权实现不得记录原始 License、签名、公钥 dump 或存储绝对路径。

## 本地数据

- 学习任务、周计划、旧资料元数据、错题、番茄钟记录和设置保存在 localStorage key `shangan-library-data-v1`。
- 旧附件正文保存在 IndexedDB database `shangan-library-files`。
- 知识树和知识树文件正文保存在 IndexedDB database `shangan-library-knowledge`；Web 演示使用独立 database `shangan-library-knowledge-demo`。
- 资料文件可以引用桌面本地路径，现有 Tauri opener 能在文件管理器中定位文件。
- 设置页完整备份会导出业务数据、知识树和附件正文；恢复会重建业务数据与 IndexedDB 内容。
- “清空数据”会清除业务 localStorage、附件和知识树，不触碰 Tauri app config 目录。
- 当前代码没有使用 SQLite。

## AppData 与 Config 路径

- 当前业务数据没有使用 Tauri `app_data_dir` 或 `app_config_dir`。
- 新授权文件将独立使用 Tauri `app_config_dir/license.dat`，不得并入 localStorage、IndexedDB、备份 JSON 或清空数据操作。
- 独立签发工具使用自己的 Bundle Identifier 和 app config 目录保存私钥与签发记录。

## 既有商业授权逻辑

对源码全文搜索了 `license`、`licensed`、`premium`、`pro`、`vip`、`member`、`membership`、`isPro`、`isPremium`、`activation` 和 `activate`。

- 未发现既有 Free/Pro/VIP/会员/激活系统。
- 未发现授权布尔值或注册码白名单。
- 未发现 Ed25519 私钥、公钥或签发代码。
- `activate` 的现有命中只来自 PWA service worker 生命周期等无关语义。

因此本次不需要迁移旧授权状态。

## 构建与发布

- macOS 与 Windows 客户安装包由 `.github/workflows/desktop-build.yml` 构建。
- 构建矩阵包含 macOS Apple Silicon DMG、macOS Intel DMG 和 Windows NSIS EXE。
- macOS 另有 `.github/workflows/macos-build.yml` 工作流。
- GitHub Pages 演示由 `.github/workflows/pwa-pages.yml` 构建，执行 `npm run build:web-demo`。
- Web 演示已有 `VITE_DEMO_MODE=true` 语义，仅用于知识树虚拟资料；商业改造后它只能在非 Tauri runtime 中绕过桌面 Gate。
- 当前公开 `v0.6.1` 标签指向无 License Gate 的版本。正式发布 `v0.7.0` 前需要下架旧安装资源，但已下载的旧二进制无法通过离线方案远程失效。

## 非侵入结论

授权系统可以作为独立 Rust 子系统和 React 启动 Gate 加入，不要求迁移业务数据，也不要求修改现有资料、错题、计划、番茄钟、导入导出或文件管理结构。正式开发继续保持 `com.shangan.library` 与现有数据键不变。
