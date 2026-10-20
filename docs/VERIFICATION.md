# 验证记录

日期：2026-10-20。环境：DSH Desktop `0.2.1-rc.2`，profile `desktop`，Web GUI `http://127.0.0.1:4652`。

## 已验证 ✅

| 项目 | 证据 |
| --- | --- |
| 插件安装/激活 | `plugin_manager install_bundle` → `application: applied`，`warnings: []`；插件行 `include:deepseek-meme` 为 `active` |
| 默认包播种 | `GET /api/memes/health` → `{ ok: true, packs: 1, stickers: 12, dataDir: "C:\\Users\\EDY\\.dsh\\memes" }` |
| 目录接口 | `GET /api/memes/catalog` 返回 1 个包、12 张表情，含 id/name/meaning/tags/url/尺寸 |
| 素材读取 | `GET /api/memes/assets/st_99ff69f7b225` → `200`，`Content-Type: image/png`，32819 bytes |
| 包/贴纸 CRUD | 创建临时包 → 上传 `angry.png` → 改含义/标签 → 删除包 → 目录恢复为 12 张（素材文件清理） |
| 模型工具 | `send_sticker action=list` 返回完整目录；`action=send` 返回文字 + 图片 attachment（`开心.png`，sha256 校验通过） |
| 用户一键发送 | `POST /api/memes/send`（本会话）→ `{ "accepted": true }`；用户消息将携带 `【表情包】加油：…` 与图片 |
| Client 槽位 | `conversation.input.right` 出现 `deepseek-meme-button`（order 40）；`conversation.input.dock` 出现 `deepseek-meme-panel`；`tool.call.toolview` 出现 `send_sticker` |
| Host 路由健壮性 | 缺 `packId`、超大小、未知贴纸等错误会返回 `{ error: { code, message } }` 结构；实测发送前会校验 live session |

## 未验证 / 限制 ⚠️

- **视觉未验证**：本环境无法对 Web GUI 截图或读取 DOM。按钮实际位置、面板在深浅色主题下的观感、工具气泡的图片尺寸需要用户在页面上验收。
- 浏览器 console 是否出现 `slot entry crashed` 未直接观测；只能确认 Client 槽位注册处于 active。
- Host 半是 Node 模块：**直接修改源码后不会热更新**，需要重启 DSH，或对插件行做一次 disable → enable（本次通过后者加载了修复）。

## 复现命令

```powershell
# 健康检查
Invoke-RestMethod "http://127.0.0.1:4652/api/memes/health"

# 目录
Invoke-RestMethod "http://127.0.0.1:4652/api/memes/catalog"

# 发送（把 sessionId 换成当前会话）
$body = @{ sessionId = $env:DSH_SESSION_ID; stickerId = 'st_99ff69f7b225'; mode = 'queue' } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:4652/api/memes/send" -ContentType 'application/json' -Body $body
```

> PowerShell 的 `Invoke-RestMethod` 在部分编码下会把中文请求体写成 `?`；测试带中文的 JSON 时优先用浏览器 fetch 或显式 UTF-8 字节。这属于测试脚本问题，不是插件问题。
