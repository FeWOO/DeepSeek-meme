# 架构设计

> 面向 DSH `0.2.1-rc.2` 桌面版暴露的接口面。任何与实现相关的 Service / Slot / Tool 契约，以 `cordis_inspect_query` 的实时结果为准；本文记录的是当前设计决策。

## 1. 目标与非目标

### 目标

- 用户在对话输入区旁一键打开表情面板，点表情即发送。
- 用户可以把本地图片一键加入表情包，并维护名称 / 含义 / 标签。
- 模型能理解用户发送的表情含义，并能通过工具主动回发表情。
- 表情数据本地持久化，重启与升级后保留；默认带一套「鲸鱼娘日常」表情。

### 非目标（当前版本）

- 云同步、跨设备同步、在线表情市场。
- 服务端多用户隔离（DSH 是单人本地应用）。
- 自动给表情图做 AI 识别（后续可接视觉模型，但不阻塞 MVP）。

## 2. 双面结构

```text
┌──────────────────────────── DSH Host 进程 ────────────────────────────┐
│ index.js                                                              │
│  ├─ StickerStore   catalog.json + assets/*.png（原子写、串行化）        │
│  ├─ webServer      /api/memes/* 路由（目录、素材、上传、编辑、发送）     │
│  ├─ tools          send_sticker / list_stickers                        │
│  ├─ systemPrompt   简短使用说明（不塞完整目录）                          │
│  └─ sessionController.prompt  把「用户表情」写成一条正常用户消息          │
└───────────────────────────────────────────────────────────────────────┘
              ▲  fetch('/api/memes/...')                │ session events
              │                                           ▼
┌─────────────┴───────────── 浏览器 Web Client ─────────────────────────┐
│ client.js                                                             │
│  ├─ conversation.input.right  表情按钮（模型选择栏旁）                   │
│  ├─ conversation.input.dock   表情面板（pack tabs + 网格 + 添加/编辑）   │
│  └─ tool.call.toolview        key = send_sticker → 表情气泡 + 含义       │
└───────────────────────────────────────────────────────────────────────┘
```

- **Host 是唯一写数据的一方**：目录 JSON、素材文件、会话消息都由 Host 完成。
- **Client 只做展示与触发**：通过 HTTP 路由调用 Host，不直接读写文件系统。
- **为什么不用 package-private `host.call`**：本项目是静态 bundle（与 dsh-files 同类），浏览器半与 Host 半之间没有天然 RPC 通道；同源 `/api/memes/*` 路由是既有插件验证过的做法，也便于本地排查。

## 3. 数据模型

`DSH_HOME/memes/catalog.json`：

```jsonc
{
  "version": 1,
  "packs": [
    {
      "id": "whale-default",
      "name": "鲸鱼娘日常",
      "description": "默认表情包：开心、疑惑、无语、吃米饭……",
      "order": 0,
      "createdAt": 1760000000000,
      "stickers": [
        {
          "id": "st_8f3c1a2b",
          "name": "开心",
          "meaning": "很开心、心情很好，可用于打招呼或表达愉快",
          "tags": ["开心", "高兴"],
          "file": "st_8f3c1a2b.png",
          "mediaType": "image/png",
          "bytes": 18234,
          "width": 256,
          "height": 256,
          "createdAt": 1760000000000
        }
      ]
    }
  ]
}
```

约束：

- `pack.id`、`sticker.id` 由 Host 生成，只允许 `[a-z0-9-]`，**永远不把用户输入拼进文件路径**。
- `sticker.file` 由 Host 生成，格式 `<id>.<ext>`；扩展名与 `mediaType` 一致。
- `name` 1–40 字；`meaning` 0–200 字；`tags` 最多 8 个、每个最多 16 字。
- 图片媒体类型允许：`image/png`、`image/jpeg`、`image/webp`、`image/gif`。
- **拒绝 SVG**（可携带脚本）；客户端 `<img>` 只加载路由返回的位图。
- 单张上限由配置 `maxStickerBytes` 控制，默认 1 MiB；每个包上限 `maxStickersPerPack`，默认 500。

## 4. 存储与播种

- 数据目录：配置 `dataDir`；为空时使用 `join(DSH_HOME, 'memes')`（`DSH_HOME` 缺省 `~/.dsh`）。
- 目录不存在时创建；`catalog.json` 不存在时播种 `assets/default/`：
  1. 读取随包 `manifest.json`；
  2. 复制图片到 `memes/assets/`；
  3. 生成稳定 id 与 catalog。
  播种只执行一次；如果用户删除了默认包，不自动重建（避免“删了又回来”）。
- 写入策略：所有目录变更串行经过同一个 Promise 队列；先写 `catalog.json.tmp` 再 `rename` 覆盖，避免半写文件。
- 素材文件写入：先确认大小与媒体类型，再写临时文件并 rename；删除贴纸时先改 catalog，再尽力删除文件。

## 5. 会话写入策略（关键）

### 5.1 用户发表情

目标：用户点一下表情，聊天流里立刻出现一张正常用户消息——图片 + 可读含义，模型也能看懂。

1. Client `POST /api/memes/send`，body `{ sessionId, stickerId, mode? }`。
2. Host 校验 session 存在于 `ctx.sessions`（或可解析的 live agent），并读取贴纸。
3. Host 把图片读成字节，经 `ctx.attachments.saveImage({ data, mediaType })` 得到 `ImageAttachmentRef`。
4. Host 构造一条用户消息内容：
   - `{ type: 'text', text: '【表情包】<name>：<meaning>' }`
   - `{ type: 'image', attachment: ref }`
5. Host 调用 `ctx.sessionController.prompt({ requestId, sessionId, mode, content, clientTimeZone })` 投递。
6. 浏览器收到 `{ accepted: true }` 后轻提示“已发送”，面板保持打开。

选择这条路的原因：

- 会话日志是唯一事实来源，用户消息必须走正常的 `user/message` 事件；自定义事件类型会破坏会话重开。
- 内置的 `conversation.chat.user.content` / `conversation.chat.user.images` 会替我们渲染文字与图片，不需要替换原生渲染器。
- 模型侧拿到的是标准用户消息内容；文字含义让非视觉模型也能理解。

**风险 / 待验证**：`sessionController.prompt` 原本是 Remote 入口，Host 直接调用是否受调用方身份限制需在实现时验证。若被拒绝，降级顺序为：
1. `ctx.agents.get(sessionId)` 拿到 live agent 后走 Agent 的 prompt / inbox 入口；
2. 仍不可用时，改走 `ctx.conversation` 的 Host 侧等价入口（若存在）；
3. 最后降级为“只插入输入框等用户发送”，并在 UI 明确提示。

### 5.2 模型发表情

注册工具 `send_sticker`：

```jsonc
// parameters
{
  "action": "list" | "send",
  "stickerId": "string（action=send 时必填）",
  "note": "string（可选，比如想配的一句话）"
}
```

- `action = list`：返回紧凑目录（包名 + 贴纸 id / 名称 / 含义 / 标签），供模型选择。
- `action = send`：Host 读取贴纸 → 保存为 attachment → 返回 `ToolExecutionResult`，其内容块为：
  - `{ type: 'text', text: '已发送表情包「<name>」（含义：<meaning>）' }`
  - `{ type: 'image', attachment: ref }`
- 工具定义通过 `output.render(args, value)` 产出内容块；`presentResult` 提供结构化 meta 供 Client 的自定义 toolview 使用。
- Client 在 `tool.call.toolview` 以 `key: 'send_sticker'` 注册气泡视图；未加载该视图时，内置 `tool.call.images` 仍会兜底展示图片。

**为什么不用“assistant 消息里直接塞 image”**：当前生产适配器声明文本输出，assistant 消息不允许图片。用工具结果携带图片是官方支持的 `tool.call.images` 路径。

### 5.3 模型理解用户表情

- 用户表情消息的文字部分固定包含 `name` 与 `meaning`（见 5.1），模型可直接理解。
- 系统提示只注入一段简短说明：

  > 用户可能发送表情包，消息文字会带「【表情包】名称：含义」。你也可以用 `send_sticker` 工具查看或回发表情；只在情绪/语气合适时使用，通常一次回复最多一张。

- 完整目录不进系统提示（token 成本），由 `send_sticker action=list` 按需拉取。

## 6. 客户端设计

### 6.1 槽位选择

| 位置 | 槽位 | 类型 | 用途 |
| --- | --- | --- | --- |
| 模型选择栏旁按钮 | `conversation.input.right` | list | 紧凑控制，位于模型选择器与发送键之间；`id=deepseek-meme-button` |
| 表情面板 | `conversation.input.dock` | list | 输入卡上方的整行区域，适合可点击的网格；`id=deepseek-meme-panel` |
| 模型表情气泡 | `tool.call.toolview` | keyed | `key=send_sticker` |

不选 `conversation.input.activity`：它是 single 槽位且有 `shadows-shipped-ui` 风险。

### 6.2 面板交互

- 按钮：贴纸图标（SVG inline），`title`/`aria-label` 走 locale 文案；无 session 时禁用。
- 面板默认收起；展开后：
  - 顶部：包标签页（横向滚动）+ “＋ 新建包”；
  - 网格：每格 64–72px，`object-fit: contain`；
  - 每格单击 = 立即发送；悬停右上角出现“编辑”小按钮；
  - 底部：添加图片（`<input type=file multiple accept="image/*">`）、刷新、错误提示。
- 添加流程：选图 → 上传到当前包 → 弹出内联编辑（名称预填文件名、含义可空）→ 保存。空含义会提示“模型只能看懂名称”，不阻塞保存。
- 编辑弹窗：名称、含义、标签、所属包、删除；保存走 `PATCH`。
- 发送中：格子显示短暂 loading；成功后 400ms 绿色勾；失败红色错误条（保留面板）。
- 主题：容器/文字只用 `--dsw-alias-*` token；素材本身颜色不受限制。

### 6.3 状态共享

按钮与面板分属两个槽位，但在同一个 `client.js` 模块里；用一个模块级 `createStore()`（`subscribe/getSnapshot`）共享“面板开合 / 当前包 / 目录缓存 / 错误”。组件用 `React.useSyncExternalStore` 订阅。Store 不持有 React 状态，卸载时不需要额外清理。

## 7. 生命周期与并发

- Host 所有注册（路由、工具、提示词段落）都放在 `apply()` 里的 `ctx.effect(...)` 中，随插件行卸载。
- 目录写入串行化；HTTP 上传按配置并发上限拒绝或排队（先做简单串行）。
- 发送表情与“正在跑 turn”无关：`mode` 默认 `queue`；如要插话可显式传 `steer`（MVP 不暴露）。
- Client 的所有副作用（事件监听、定时器、样式）都在 `apply` 或组件 `useEffect` 内，组件卸载即清理，不向 `document.body` 追加节点。

## 8. 安全与边界

- 路由只接受本机同源浏览器请求；不回显任意文件路径。
- 上传按字节上限读取，超限即断开（413），不把整个超大 body 读进内存。
- 严格 MIME + 扩展名双校验；文件名仅用于显示。
- `stickerId` / `packId` 只接受生成格式，防止路径穿越。
- 目录 JSON 读取失败时拒绝写入并返回 500，不覆盖损坏文件（保留人工修复空间）。

## 9. 兼容性与验证

- 目标版本：DSH Desktop `0.2.1-rc.2`（当前 profile `desktop`）。
- 只使用 `cordis_inspect_query` 能观测到的 Service / Slot / Tool 契约；不导入 `@deepseek-ai/dsh-client-ui-primitives` 等 Harness Client 包。
- 验证方式：
  - `node --check` + JSON 解析；
  - `plugin_manager install_bundle` 后看 `application` / `warnings`；
  - `cordis_inspect_query` 检查 Slot 占位与 `send_sticker` 工具；
  - `Invoke-WebRequest` 冒烟 `/api/memes/catalog`、素材、上传；
  - 实际点击由用户完成（当前环境无浏览器截图能力，安装成功不等于视觉验收）。
