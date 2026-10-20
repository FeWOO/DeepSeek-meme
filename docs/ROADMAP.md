# 路线图

## v0.1.0 — MVP（进行中）

- [x] 项目骨架、bundle 清单、图标、locale、设计文档
- [ ] Host：StickerStore（catalog.json + assets，原子写、串行写）
- [ ] Host：默认包播种（`assets/default/manifest.json` + PNG）
- [ ] Host：`/api/memes/{health,catalog,assets}` 读取路由
- [ ] Host：`/api/memes/{packs,stickers}` 增删改路由
- [ ] Host：`/api/memes/send` 用户表情写入会话
- [ ] Host：`send_sticker` 工具（list / send）+ 系统提示段落
- [ ] Client：模型选择栏旁按钮
- [ ] Client：表情面板（包标签、网格、添加、编辑、删除）
- [ ] Client：`send_sticker` 工具气泡视图
- [ ] 默认表情包「鲸鱼娘日常」12 张素材
- [ ] 安装到 `desktop` profile，完成冒烟验证 + 用户视觉验收
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
