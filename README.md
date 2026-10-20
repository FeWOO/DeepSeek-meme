# DeepSeek Meme 🐳

> 给 DeepSeek Harness（DSH）做一个像微信 / QQ 那样的表情包插件：**主人一键发，鲸鱼娘看得懂，还能回发**。

![status](https://img.shields.io/badge/status-v0.3.4-1d6bb8)
![license](https://img.shields.io/badge/license-MIT-0b2a5b)

## 这是什么

DSH 的对话里一直没有“表情包”这个位置：用户只能打字，模型看不懂别人贴的图，也谈不上用表情回话。DeepSeek Meme 想补上这一块：

1. **模型选择栏旁的入口**：一个小按钮，点开就是表情面板，点一下表情立即发出。
2. **一键添加**：选择图片文件即可收藏进表情包，按包分组；名称和含义可以随手补。
3. **模型能理解**：每个表情都带 `name / meaning / tags`，用户发图时会以可读文字把含义带进对话；模型也有 `send_sticker` 工具，能反过来给主人发表情。
4. **两套随包表情**：默认包「默认表情」是 GPT 绘制的 10 张鲸鱼娘日常/工作贴纸；另有「鲸鱼娘二创梗图」8 张社区二创梗图，两个包独立保留，模型都能读懂梗义并和你互发。
5. **本地优先**：表情素材保存在本机 `DSH_HOME/memes`，不联网抓取，不上传第三方。

> 当前状态：**v0.3.4 双包版 / 公开仓库**。默认包「默认表情」10 张、社区二创包 8 张；用户点表情**只发图片、不带含义文字**，并通过附件服务缩到 **180px** 后入会话（普通图片仍按原生 240px 上限显示）；模型发的贴纸在工具卡里显示为 **150px**。模型直接看图理解，含义保留在目录里供工具查询。视觉验收（按钮位置、面板样式、深浅色主题）仍需要你在页面上实际看一眼；详见 [验证记录](docs/VERIFICATION.md)。

## 功能清单

| 功能 | 状态 | 说明 |
| --- | --- | --- |
| 模型选择栏旁表情按钮 | ✅ 已实现 | 挂在 `conversation.input.right` 槽位 |
| 表情面板（分类 / 网格 / 添加 / 编辑） | ✅ 已实现 | 挂在 `conversation.input.dock` 槽位 |
| 点击表情一键发送 | ✅ 已验证 | 只发图片、不带含义文字；通过附件服务缩到 180px 再入会话，普通图片不受影响 |
| 表情消息尺寸 | ✅ 可配置 | 用户发送默认 180px（`messageStickerSize`，96–240）；模型发送在工具卡内显示 150px |
| 一键添加本地图片 | ✅ 已实现 | 支持 PNG / JPEG / WebP / GIF，上传/改/删均已冒烟 |
| 表情编辑（名称 / 含义 / 标签 / 移动包） | ✅ 已实现 | 面板内弹层编辑 |
| `send_sticker` 模型工具 | ✅ 已验证 | 目录查询与发表情均实测通过 |
| 随包表情包 | ✅ 已收录 | 默认包「默认表情」10 张 GPT 绘制贴纸 + 「鲸鱼娘二创梗图」8 张社区二创，两个 bundled 包独立保留 |
| 模型理解用户表情 | ✅ 已实现 | 用户表情是纯图片消息，模型看图理解；含义保留在目录，需要时用工具查询 |
| 视觉验收（真实页面） | ⚠️ 待用户确认 | 当前环境无法截图；见验证记录 |

## 项目结构

```text
DeepSeek-meme/
├─ index.js              # Host 半：存储、HTTP 路由、send_sticker 工具、提示词
├─ client.js             # Web Client 半：按钮、面板、工具卡片渲染
├─ cordis.patch.yml      # bundle patch：插入一条 Host 插件行
├─ package.json          # DSH bundle / client 清单
├─ locale/               # 插件管理页显示用的标题与描述
├─ assets/
│  ├─ default/            # 默认包「默认表情」（GPT 绘制 10 张，首次运行播种）
│  ├─ community/          # 社区二创包「鲸鱼娘二创梗图」（8 张）
│  └─ gpt/                # 两张 GPT 原图的拆分源 PNG（不随 npm 包分发）
└─ docs/
   ├─ ARCHITECTURE.md    # 架构、数据模型、会话写入策略、槽位选择
   ├─ API.md             # /api/memes 路由契约
   ├─ ASSETS.md          # 两套表情含义、来源说明与替换方法
   ├─ DEVELOPMENT.md     # 开发、安装、验证、Git 工作流
   ├─ VERIFICATION.md    # 实测证据与限制
   └─ ROADMAP.md         # 里程碑与范围
```

## 快速开始

公开安装（GitHub）：

```powershell
dsh plugin add github:FeWOO/DeepSeek-meme
```

当前这台机器已安装到 `desktop` profile（本地目录链接）。更新 Host 代码后需要重启 DSH，或对插件行做一次 disable → enable，才会加载新的 Node 模块；Client 改动在当前环境通常随 HMR 生效。

```powershell
# 语法检查
node --check index.js
node --check client.js

# 手动安装（已经装过就跳过）
#   plugin_manager install_bundle target = "D:\Kz\DeepSeek Harness\DeepSeek-meme"

# 健康检查
Invoke-RestMethod "http://127.0.0.1:4652/api/memes/health"
```

安装、验证与排错的完整步骤见 [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)，本轮实测证据见 [docs/VERIFICATION.md](docs/VERIFICATION.md)。

## 设计原则

- **不伪造会话事件**：用户表情走正常的用户消息，模型表情走 `send_sticker` 工具结果；不往 Session 里塞未知事件类型。
- **看起来是 DSH 的一部分**：只用 `--dsw-alias-*` 主题 token，布局与原生输入区一致；不加载 Harness Client 私有包。
- **模型上下文要省**：系统提示只说明“有表情包工具 + 如何查目录”，完整目录按需通过工具查询。
- **数据是本地的**：素材与目录都在 `DSH_HOME/memes`，目录写入采用临时文件 + 原子替换。

## 文档

- [架构设计](docs/ARCHITECTURE.md)
- [HTTP API 契约](docs/API.md)
- [默认梗图含义与替换](docs/ASSETS.md)
- [开发与验证](docs/DEVELOPMENT.md)
- [验证记录](docs/VERIFICATION.md)
- [路线图](docs/ROADMAP.md)
- [变更日志](CHANGELOG.md)

## License

[MIT](LICENSE) © 2026 FeWOO

[![](https://img.shields.io/badge/powered_by-dsh-4D6BFE?style=flat-square&logo=deepseek&logoColor=white)](https://github.com/deepseek-ai/deepseek-harness)
