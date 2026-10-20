# 开发与验证

> 本轮的实测证据与限制见 [VERIFICATION.md](VERIFICATION.md)。

## 环境

- Windows + DSH Desktop；当前 profile：`desktop`（`C:\Users\<user>\.dsh\profiles\desktop`）。
- 本插件是“静态 bundle”：根目录的 `index.js` 是 Host 半，`client.js` 是浏览器半；客户端使用 `window.__ModuleLoader__.load` 工厂格式，无需构建步骤。
- 关键环境变量（Harness 启动的 shell 中）：`DSH_HOME`、`DSH_PROFILE`、`DSH_PROFILE_DIR`、`DSH_WEB_URL`。

## 本地检查

改完至少跑：

```powershell
node --check index.js
node --check client.js
Get-Content package.json -Raw | ConvertFrom-Json | Out-Null
Get-Content locale\zh.json -Raw | ConvertFrom-Json | Out-Null
Get-Content locale\en.json -Raw | ConvertFrom-Json | Out-Null
```

`cordis.patch.yml` 用 YAML 解析器验证（可让模型用 `node -e` + 已装依赖，或人工检查缩进）。

## 安装 / 更新 / 卸载

在会话中让模型调用 `plugin_manager`：

- 安装（本地目录）：`action: install_bundle`，`target` 为项目绝对路径；已安装到 `desktop` profile。
- **更新 Host 代码**：直接改源码不会替换已加载的 Node 模块。二选一：
  - 对插件行做一次禁用→启用：`set_plugin target=include:deepseek-meme enabled=false`，再 `enabled=true`；
  - 重启 DSH。
- 更新 Client 代码：通常由 HMR 重载；若页面无变化，刷新页面并检查浏览器 console。
- 卸载：`action: remove_bundle`（target 用 `dsh-deepseek-meme`）。

> 不要手写 profile 的 `package.json` / `cordis.patch.yml`，也不要直接在 profile 目录跑 pnpm；安装交给 `install_bundle`。

## 冒烟验证

1. **Host 路由**

   ```powershell
   Invoke-RestMethod "$env:DSH_WEB_URL/api/memes/health"
   Invoke-RestMethod "$env:DSH_WEB_URL/api/memes/catalog"
   ```

2. **工具注册**：`cordis_inspect_query` → host `Tool.listTools`，应出现 `send_sticker`（实现后）。

3. **槽位注册**：`cordis_inspect_query` → client `Slots.listSubTree`：
   - `root=conversation.input.right` → 占位 `deepseek-meme-button`
   - `root=conversation.input.dock` → 占位 `deepseek-meme-panel`
   - `root=tool.call.toolview` → 占位 `send_sticker`

4. **会话写入**：调用 `POST /api/memes/send` 往一个测试 Session 发一张表情，确认聊天流出现用户图片消息，且下一轮模型能看到 `【表情包】...` 文字。

5. **视觉**：本环境没有浏览器截图能力。安装成功、槽位注册成功都不等于视觉验收；需要用户在页面上实际查看按钮位置、面板布局、深浅色主题。本轮结论已写入 [VERIFICATION.md](VERIFICATION.md)，视觉项保持“未验证”。

## PowerShell 冒烟测试注意

- `Invoke-RestMethod` 的 JSON 请求体在部分控制台编码下会把中文写成 `?`；测中文元数据（包名/含义）时用浏览器 fetch，或显式发送 UTF-8 字节。
- 响应里的中文用 `[Console]::OutputEncoding = [Text.Encoding]::UTF8` 再打印；否则看起来像乱码，但服务端数据可能是对的。
- 上传用 `-InFile <png> -ContentType image/png`，元数据放 `x-meme-*` 头，值先 `[uri]::EscapeDataString()`。

## 数据目录

- 默认 `$env:DSH_HOME\memes\`（`catalog.json` + `assets/`）。
- 重置：关闭相关会话后删除该目录，下次启动会重新播种默认包。
- 调试时可用配置 `dataDir` 指向临时目录，避免污染真实数据。

## Git 工作流

这是本项目的硬性要求：**每次有意义的更新都要提交**。

```powershell
git add -A
git commit -m "feat: ..."   # 或 docs: / fix: / chore: / test:
git push
```

- 分支：`main`；远程：`origin` → `github.com/FeWOO/DeepSeek-meme`（私有）。
- 提交粒度：一个可描述的功能点或一次文档修订；不要攒一整天再提交。
- 提交信息用英文 conventional commit 前缀 + 中文正文（例如 `feat: 添加表情发送路由`）。
- 推送前先 `git status` 确认没有把运行时数据、密钥、临时文件带进仓库。

## 实现约束（来自 Harness 插件规范）

- Host 注册一律放在 `apply()` 内的 `ctx.effect` / `ctx.on`，返回清理函数。
- Client 工厂保持无副作用；样式、监听器都在 `apply` 或 `useEffect` 内注册并清理。
- 不使用自定义 Session 事件类型（会破坏会话重开）；用正常用户消息与工具结果。
- 不 `require('@deepseek-ai/dsh-client-ui-primitives')` 或其他 Harness Client 包；控件自己写，样式只用 `--dsw-alias-*` token。
- 不读取其他插件的 DOM / 样式；不向 `document.body` 追加应用。
- 可以在 Client 同模块内共享模块级 store（按钮与面板状态）。
- Host 的 `send_sticker` 工具使用 `ToolDefinition.output.render(args, value)` 产出内容块；执行函数只返回可 JSON 化的 value。

## 排错入口

- 插件是否激活：`plugin_manager list_plugins`（entry `deepseek-meme` 的 `fiberPhase`）。
- 路由 404：确认 `webServer` 已注入、路由 path 前缀正确、宿主用 `$env:DSH_WEB_URL` 访问。
- 槽位不出现：用 `Slots.listSubTree` 看 `occupants`；确认 `package.json` 的 `dsh.client` 配置和 `client.js` 的 `window.__ModuleLoader__.load` id 一致。
- Client 组件崩溃：浏览器 console 会出现 `slot entry crashed in '<slot>'`；保持组件纯、先返回 `null` 再逐步加功能。
