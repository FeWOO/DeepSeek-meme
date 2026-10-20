# 验证记录

日期：2026-10-20。环境：DSH Desktop `0.2.1-rc.2`，profile `desktop`，Web GUI `http://127.0.0.1:4652`。

## 已验证 ✅

| 项目 | 证据 |
| --- | --- |
| 插件安装/激活 | `plugin_manager install_bundle` → `application: applied`，`warnings: []`；插件行 `include:deepseek-meme` 为 `active` |
| 默认包播种 | `GET /api/memes/health` → `{ ok: true, packs: 1, stickers: 12, dataDir: "<DSH_HOME>/memes" }` |
| 目录接口 | `GET /api/memes/catalog` 返回 1 个包、12 张表情，含 id/name/meaning/tags/url/尺寸 |
| 素材读取 | `GET /api/memes/assets/st_99ff69f7b225` → `200`，`Content-Type: image/png`，32819 bytes |
| 包/贴纸 CRUD | 创建临时包 → 上传 `angry.png` → 改含义/标签 → 删除包 → 目录恢复为 12 张（素材文件清理） |
| 模型工具 | `send_sticker action=list` 返回完整目录；`action=send` 返回文字 + 图片 attachment（`开心.png`，sha256 校验通过） |
| 用户一键发送 | `POST /api/memes/send`（本会话）→ `{ "accepted": true }`；用户消息将携带 `【表情包】加油：…` 与图片 |
| Client 槽位 | `conversation.input.right` 出现 `deepseek-meme-button`（order 40）；`conversation.input.dock` 出现 `deepseek-meme-panel`；`tool.call.toolview` 出现 `send_sticker` |
| 最终素材刷新 | 素材定稿后按 disable → 删除旧 `DSH_HOME/memes` → enable 重新播种；`happy.png` 服务端 `Content-Length=32898` 与仓库文件字节一致，12 个文件全部为定稿版本 |
| Host 路由健壮性 | 缺 `packId`、超大小、未知贴纸等错误会返回 `{ error: { code, message } }` 结构；实测发送前会校验 live session |

## 未验证 / 限制 ⚠️

- **视觉未验证**：本环境无法对 Web GUI 截图或读取 DOM。按钮实际位置、面板在深浅色主题下的观感、工具气泡的图片尺寸需要用户在页面上验收。
- 浏览器 console 是否出现 `slot entry crashed` 未直接观测；只能确认 Client 槽位注册处于 active。
- Host 半是 Node 模块：**直接修改源码后不会热更新**，需要重启 DSH，或对插件行做一次 disable → enable（本次通过后者加载了修复）。

## v0.3.2 模型贴纸显示尺寸（2026-10-20）

| 项目 | 证据 |
| --- | --- |
| 模型贴纸缩小 | `send_sticker` 工具卡内的贴纸图片 CSS 上限从 200px 降到 **150px**；用户发送仍是 180px |
| 工具卡展开 | `send_sticker` toolview 调用 `useDisclosure().setExpanded(true)`，贴纸默认展开且不显示解释文字 |
| 回复内不再贴原图 | 助手文本回复不再嵌入 640px 原始贴纸，避免看起来过大 |

> 需要刷新页面加载 Client 改动后再确认观感。

## v0.3.1 表情消息小图（2026-10-20）

| 项目 | 证据 |
| --- | --- |
| 缩小发送 | `POST /api/memes/send`（steer，早安~）→ `{ accepted: true, image: { width: 180, height: 180, bytes: 13232 } }`；下一条用户消息中的图片为 180×180 WebP |
| 普通图片不受影响 | 贴纸缩放只发生在 `/api/memes/send`；普通附件仍走 DSH 原生消息图片（单张长边 240px） |
| 模型端仍可见 | 模型在纯图片消息中能辨认缩小后的「早安~」表情，含义目录仍可用 |
| 配置 | `messageStickerSize: 180`（96–240 范围），写在 `cordis.patch.yml` |

> 视觉验收：页面中贴纸气泡应明显小于普通 240px 图片；需刷新后由用户确认。

## v0.3.0 双包与默认表情（2026-10-20）

| 项目 | 证据 |
| --- | --- |
| 双包播种 | 重载后 `GET /api/memes/health` → `packs: 2, stickers: 18` |
| 默认包 | catalog 第一项 `whale-gpt / 默认表情 / order 0 / 10 张`，全部 `image/webp`，单张 82–124KB |
| 二创包保留 | 第二项 `whale-community / 鲸鱼娘二创梗图 / order 1 / 8 张`；首尾 id 与字节数与此前一致（未重新生成、未删除） |
| 运行时素材 | `DSH_HOME/memes/assets` 共 18 个 `.webp`；旧版 12 张简笔图/旧默认包文件均已不存在 |
| 工具目录 | `send_sticker action=list` 同时返回「默认表情」10 条与「鲸鱼娘二创梗图」8 条 |
| GPT 原图拆分 | 两张 1024/1254px 透明背景图各拆 5 张；640×640 RGBA、白边完整；预览见 `assets/default/preview.png` 与 `assets/gpt/preview.png` |

> 仍未验证：Web UI 中两个包标签页的实际渲染与切换——需要刷新页面后由用户确认。

## v0.2.1 纯图片发送（2026-10-20）

| 项目 | 证据 |
| --- | --- |
| 只发图片 | `POST /api/memes/send`（mode=steer，sticker=吃饱饱）→ `{ accepted: true }`；下一条用户消息只含一个 640×626 WebP image block，没有 `【表情包】…` text block |
| 模型看图理解 | 纯图片消息到达后，模型能直接识别画面与图内文字（“吃饱饱~摸摸肚子”），无需依赖含义文字 |
| 含义仍可用 | 目录仍保留 name/meaning/tags；`send_sticker action=list` 返回完整梗义，模型需要精确确认时可查 |
| 附件提示 | 图片 attachment 的 `name` 仍为贴纸名（`吃饱饱.webp`），作为弱提示，不渲染成聊天文字 |

> 限制：这条链路依赖当前会话模型支持图片输入；切换到纯文本模型时模型看不到画面，只靠附件名不足以理解梗图。

## v0.2.0 社区梗图包（2026-10-20）

| 项目 | 证据 |
| --- | --- |
| 默认包迁移 | 重载 Host 后 `health` → `packs: 1, stickers: 8`；`catalog` → `id=whale-community、bundled=true`；运行时 `memes/assets` 只剩 8 个 `st_*.webp`，旧 `whale-default` 的 12 张 PNG 已清理 |
| WebP 素材 | `GET /api/memes/assets/st_33359553cf2c` → `200`、`Content-Type: image/webp`、`64790` bytes，与 `assets/default/doomed.webp` 完全一致 |
| 模型目录 | `send_sticker action=list` 返回 8 条新梗图（举手开心 / DeepSeek完蛋了 / 她不是生来就只有战火 / 用户造反 / 瞪你 / 给我跪下 / 吃饱饱 / 大胆的想法），name/meaning/tags 均为中文梗义 |
| 模型发送 | `send_sticker action=send`（DeepSeek完蛋了）→ 返回文字 + 图片 attachment（640×636 WebP），工具结果图片可被 `loadImage` 加载 |
| Client 槽位 | 重载后 `deepseek-meme-button` 仍 active；`conversation.input.dock` / `tool.call.toolview` 注册未受影响 |
| 图标 | `assets/default/icon.png` 256×256、124444 bytes（≤256KiB 上限），已通过 `./icon` 导出 |

> 仍未验证：插件管理页里的图标实际渲染、面板内新梗图的缩略观感——需要刷新页面后由用户确认。

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
