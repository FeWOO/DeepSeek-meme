# 路线图

## v0.2.0 — 社区梗图包（已落地）

- [x] 默认包替换为 8 张社区二创鲸鱼娘梗图（640px WebP，带梗义/标签）
- [x] 默认包迁移：`manifest.pack.id` 变化时自动替换旧 bundled 包
- [x] 插件图标切换为新默认包头像
- [x] 梗图含义与替换说明文档（`docs/ASSETS.md`）

## v0.1.0 — MVP（已跑通核心链路）

- [x] 项目骨架、bundle 清单、图标、locale、设计文档
- [x] Host：StickerStore（catalog.json + assets，原子写、串行写）
- [x] Host：默认包播种（`assets/default/manifest.json` + PNG）
- [x] Host：`/api/memes/{health,catalog,assets}` 读取路由
- [x] Host：`/api/memes/{packs,stickers}` 增删改路由
- [x] Host：`/api/memes/send` 用户表情写入会话
- [x] Host：`send_sticker` 工具（list / send）+ 系统提示段落
- [x] Client：模型选择栏旁按钮
- [x] Client：表情面板（包标签、网格、添加、编辑、删除）
- [x] Client：`send_sticker` 工具气泡视图
- [x] 默认表情包「鲸鱼娘日常」12 张素材
- [x] 安装到 `desktop` profile，完成路由/工具/槽位冒烟验证
- [ ] 用户视觉验收（按钮位置、面板样式、深浅色）
- [ ] 发布说明与截图

## v0.1.x — 打磨

- 最近使用 / 常用表情置顶（本地记录，不写 Session）。
- 搜索：按名称、含义、标签过滤。
- 拖拽图片到面板直接添加；粘贴图片添加。
- 键盘可达性：方向键浏览网格、Enter 发送、Esc 关闭。
- 添加时“含义”可一键生成建议（可选接入视觉模型，不改变本地优先原则）。
- 包排序、导入/导出（zip，含 manifest）。

## v0.2 — 协作与生态

- 表情包分享：导出 `.memepack` 文件，别人导入即可用。
- 与 Agent Teams / 子代理共享同一套表情目录（目录仍是 Host 单例）。
- 可选的表情市场（只读索引 + 本地安装，不自动执行远端内容）。

## 非目标

- 云端账号体系与多端同步。
- 任意 HTML/SVG 动画表情（只支持位图，避免脚本面）。
- 替换原生聊天渲染器或输入框。
