# Changelog

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 的结构，版本号遵循 [SemVer](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### Added

- 项目骨架：DSH bundle 清单（`package.json` / `cordis.patch.yml`）、Host 与 Client 入口。
- 插件显示资源：`icon.svg`、`locale/zh.json`、`locale/en.json`。
- 设计文档：架构、HTTP API、开发与验证、路线图。
- 默认表情包目录 `assets/default/`。

## [0.3.1] - 2026-10-20

### Changed

- 通过表情包插件发送的贴纸现在会先缩到 **180px 长边**再进入会话，聊天里明显小于普通图片（DSH 原生单图上限 240px）；普通图片附件完全不受影响。
- 缩放走附件服务的 `readImageRequest`，对默认包、社区包和用户自建贴纸一视同仁；可通过 `messageStickerSize`（96–240）调整。
- `POST /api/memes/send` 的响应新增 `image.width/height/bytes`，方便冒烟验证。

## [0.3.0] - 2026-10-20

### Added

- 新默认包「默认表情」（`whale-gpt`）：10 张 GPT 绘制、由插件统一拆分/透明化/压缩的鲸鱼娘贴纸（收到、谢谢、我来啦、辛苦啦、晚安安、早安、喝奶茶、嗯…?、哼！、好困…）。
- 支持随包分发多个表情包：宿主扫描 `assets/*/manifest.json`，新增/删除目录会增删对应 bundled 包；同 id 保留用户编辑。
- `assets/gpt/` 保存两张 GPT 贴纸集的拆分源 PNG（不随 npm 包分发），`assets/_build/` 保存生成脚本（gitignore）。

### Changed

- 原「鲸鱼娘二创梗图」（8 张）移动到 `assets/community/`，作为第二个随包表情包保留，`order: 1`，内容与 id 均未改动。
- 插件图标改用默认包的「早安~」头像。
- `package.json` 只打包 `assets/default/` 与 `assets/community/`，不含原始拆分源。

## [0.2.1] - 2026-10-20

### Changed

- 用户点击发送表情现在**只发图片消息**，不再把 `【表情包】名称：含义` 文本一起发出。
- 模型改为直接看图理解表情；系统提示与工具描述同步更新，含义数据仍保留在目录中供 `send_sticker action=list` 查询。
- 图片附件的 `name` 仍保留贴纸名称，作为弱提示但不渲染成聊天文字。

## [0.2.0] - 2026-10-20

### Changed

- 默认表情包替换为社区二创「鲸鱼娘二创梗图」：8 张 640px WebP 梗图（举手开心 / DeepSeek完蛋了 / 她不是生来就只有战火 / 用户造反 / 瞪你 / 给我跪下 / 吃饱饱 / 大胆的想法），每张都带模型可读的中文含义与标签。
- 插件图标改用新默认包的 `happy-point` 头像（`assets/default/icon.png`）；删除旧 `icon.svg`。
- 新增默认包迁移：`manifest.pack.id` 变化时自动移除旧 bundled 包并重新播种，用户自建包与编辑保留。

### Added

- `manifest.json` 支持显式 `width/height`（WebP 也能在 UI 中拿到正确尺寸）。
- [默认梗图说明](docs/ASSETS.md)。

## [0.1.0] - 2026-10-20

### Added

- Host 半：本地表情库（`catalog.json` + `assets/`，原子写、串行化、默认包播种）。
- Host 半：`/api/memes/*` 路由（健康检查、目录、素材、包与贴纸 CRUD、用户发送）。
- Host 半：`send_sticker` 工具（list / send），工具结果携带 durable image；系统提示说明用户表情的含义格式。
- Client 半：模型选择栏旁表情按钮、输入区上方表情面板（包标签 / 网格 / 添加 / 编辑 / 删除 / 发送反馈）。
- Client 半：`send_sticker` 工具气泡渲染（通过 `loadImage` 显示图片）。
- 默认表情包「鲸鱼娘日常」12 张 256×256 PNG + 插件图标/预览图。
- 项目文档：架构、API、开发与验证、路线图、验证记录。

### Fixed

- 用户发送路由调用 `sessionController.prompt` 时补上必传的 `AbortSignal`（30s 超时），修复 `throwIfAborted` 空引用。

### Verified

- 安装 `application: applied`、12 张素材播种、目录/素材路由、包与贴纸 CRUD、`send_sticker` 列表与发送、用户发送 `accepted: true`、三个 Client 槽位注册。
- 视觉验收仍待用户确认（当前环境无法截图）。

[Unreleased]: https://github.com/FeWOO/DeepSeek-meme/commits/main
[0.1.0]: https://github.com/FeWOO/DeepSeek-meme/commits/main
