import { copyFileSync, cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const distDir = join(root, 'dist')
const serverSource = join(root, 'offline-runtime', 'server.rs')
const buildDir = join(root, 'offline-build')
const packageRoot = join(buildDir, '上岸资料库-本地版')
const runtimeDir = join(packageRoot, 'runtime')
const appDir = join(packageRoot, 'app')
const platform = process.platform
const serverName = platform === 'win32' ? 'shangan-server-windows.exe' : platform === 'darwin' ? 'shangan-server-macos' : 'shangan-server-linux'
const serverOut = join(runtimeDir, serverName)

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32', ...options })
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

if (!existsSync(distDir)) {
  console.log('未找到 dist，先执行 npm run build。')
  run('npm', ['run', 'build'])
}

rmSync(packageRoot, { recursive: true, force: true })
mkdirSync(runtimeDir, { recursive: true })
mkdirSync(appDir, { recursive: true })

cpSync(distDir, appDir, { recursive: true })

console.log(`编译本机运行时：${serverName}`)
run('rustc', [serverSource, '-O', '-o', serverOut])

if (platform !== 'win32') {
  run('chmod', ['+x', serverOut])
}

writeFileSync(join(packageRoot, '启动上岸资料库.command'), `#!/bin/bash
cd "$(dirname "$0")"
chmod +x "runtime/${serverName}"
"./runtime/${serverName}"
`, 'utf8')

writeFileSync(join(packageRoot, '启动上岸资料库.bat'), `@echo off
cd /d %~dp0
if exist runtime\\shangan-server-windows.exe (
  runtime\\shangan-server-windows.exe
) else (
  echo 未找到 Windows 运行时：runtime\\shangan-server-windows.exe
  echo 请使用 Windows 版离线包，或在 Windows 上运行 npm run offline:package 重新生成。
  pause
)
`, 'utf8')

if (platform !== 'win32') {
  run('chmod', ['+x', join(packageRoot, '启动上岸资料库.command')])
}

writeFileSync(join(packageRoot, '使用说明.md'), `# 上岸资料库 本地版

## 如何启动

macOS：

双击 \`启动上岸资料库.command\`。

Windows：

双击 \`启动上岸资料库.bat\`。

启动后会自动打开浏览器访问本地地址，例如：

\`\`\`text
http://127.0.0.1:38271
\`\`\`

## 数据保存在哪里

当前版本的数据保存在浏览器本地存储中。请固定使用同一个浏览器访问，不要随意清理站点数据。

建议定期进入系统的“设置”页面导出 JSON 备份。

## 如何关闭

关闭启动脚本打开的终端窗口即可停止本地服务。

## 常见问题

如果浏览器没有自动打开，可以手动复制终端里显示的本地地址到浏览器。

如果端口被占用，程序会自动尝试后续端口。
`, 'utf8')

if (existsSync(join(root, 'README.md'))) {
  copyFileSync(join(root, 'README.md'), join(packageRoot, '项目说明.md'))
}

console.log('')
console.log('离线包已生成：')
console.log(packageRoot)
