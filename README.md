# DeepSeek Meme 🐳

> 给 DeepSeek Harness（DSH）做一个像微信 / QQ 那样的表情包插件：**主人一键发，鲸鱼娘看得懂，还能回发**。

![status](https://img.shields.io/badge/status-v0.1.0--dev-1d6bb8)
![license](https://img.shields.io/badge/license-MIT-0b2a5b)

## 这是什么

DSH 的对话里一直没有“表情包”这个位置：用户只能打字，模型看不懂别人贴的图，也谈不上用表情回话。DeepSeek Meme 想补上这一块：

1. **模型选择栏旁的入口**：一个小按钮，点开就是表情面板，点一下表情立即发出。
2. **一键添加**：选择图片文件即可收藏进表情包，按包分组；名称和含义可以随手补。
3. **模型能理解**：每个表情都带 `name / meaning / tags`，用户发图时会以可读文字把含义带进对话；模型也有 `send_sticker` 工具，能反过来给主人发表情。
4. **本地优先**：表情素材保存在本机 `DSH_HOME/memes`，不联网抓取，不上传第三方。

> 当前状态：**项目骨架 / 设计阶段**。Host 与 Client 目前是占位文件，尚不可安装使用；实现按 [ROADMAP](docs/ROADMAP.md) 推进。

## 功能清单

| 功能 | 状态 | 说明 |
| --- | --- | --- |
| 模型选择栏旁表情按钮 | 🚧 设计完成 | 挂在 `conversation.input.right` 槽位 |
| 表情面板（分类 / 网格 / 最近使用） | 🚧 设计完成 | 挂在 `conversation.input.dock` 槽位 |
| 点击表情一键发送 | 🚧 设计完成 | Host 写入用户消息（图片 + 含义文字） |
| 一键添加本地图片 | 🚧 设计完成 | 支持 PNG / JPEG / WebP / GIF |
| 表情编辑（名称 / 含义 / 标签 / 移动包） | 🚧 待实现 | 面板内联编辑 |
| `send_sticker` 模型工具 | 🚧 设计完成 | 模型可查看并回发表情 |
| 默认表情包「鲸鱼娘日常」 | 🚧 素材制作中 | 12 张 256×256 PNG |
| 模型理解用户表情 | 🚧 设计完成 | 消息文字携带含义 + 工具查询目录 |

## 项目结构

```text
DeepSeek-meme/
├─ index.js              # Host 半：存储、HTTP 路由、send_sticker 工具、提示词
├─ client.js             # Web Client 半：按钮、面板、工具卡片渲染
├─ cordis.patch.yml      # bundle patch：插入一条 Host 插件行
├─ package.json          # DSH bundle / client 清单
├─ icon.svg              # 插件图标
├─ locale/               # 插件管理页显示用的标题与描述
├─ assets/default/       # 随包分发的默认表情包（首次运行播种）
└─ docs/
   ├─ ARCHITECTURE.md    # 架构、数据模型、会话写入策略、槽位选择
   ├─ API.md             # /api/memes 路由契约
   ├─ DEVELOPMENT.md     # 开发、安装、验证、Git 工作流
   └─ ROADMAP.md         # 里程碑与范围
```

## 快速开始（开发期）

```powershell
# 1. 语法检查
node --check index.js
node --check client.js

# 2. 用 DSH 的插件管理器从目录安装（在会话里让模型调用）
#    plugin_manager install_bundle target = "D:\Kz\DeepSeek Harness\DeepSeek-meme"

# 3. 验证槽位与工具
#    cordis_inspect_query client Slots.listSubTree root=conversation.input.right
#    cordis_inspect_query host Tool.listTools
```

安装、验证与排错的完整步骤见 [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)。

## 设计原则

- **不伪造会话事件**：用户表情走正常的用户消息，模型表情走 `send_sticker` 工具结果；不往 Session 里塞未知事件类型。
- **看起来是 DSH 的一部分**：只用 `--dsw-alias-*` 主题 token，布局与原生输入区一致；不加载 Harness Client 私有包。
- **模型上下文要省**：系统提示只说明“有表情包工具 + 如何查目录”，完整目录按需通过工具查询。
- **数据是本地的**：素材与目录都在 `DSH_HOME/memes`，目录写入采用临时文件 + 原子替换。

## 文档

- [架构设计](docs/ARCHITECTURE.md)
- [HTTP API 契约](docs/API.md)
- [开发与验证](docs/DEVELOPMENT.md)
- [路线图](docs/ROADMAP.md)
- [变更日志](CHANGELOG.md)

## License

[MIT](LICENSE) © 2026 FeWOO
