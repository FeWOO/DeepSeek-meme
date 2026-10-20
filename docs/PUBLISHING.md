# 发布记录

## 已完成

- 仓库公开：https://github.com/FeWOO/DeepSeek-meme
- GitHub topics：`dsh-plugin`、`deepseek-harness`、`dsh`、`cordis-plugin`、`stickers`、`meme`
- Release：`v0.3.5`（含安装说明与商店截图）
- README 已加官方 DSH「powered by dsh」徽章
- `screenshots.json` 已声明两张商店预览图
- `package.json` 已补 repository / homepage / bugs / keywords，且包含 `dsh.bundle` manifest
- 社区目录投稿分支已备好：`FeWOO/awesome-dsh-plugin#add-deepseek-meme`
  - 条目文件：`data/plugins/FeWOO__DeepSeek-meme.yml`

## 待完成：awesome-dsh-plugin PR

该目录有一条硬性规则：**仓库创建满 1 天**才允许收录（[contributing.md](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/contributing.md)）。本仓库创建于 2026-10-20 17:45 (+08)，因此 PR 安排在 **2026-10-21 18:05 (+08)** 之后。

提交命令：

```powershell
gh pr create --repo awesome-dsh-plugin/awesome-dsh-plugin `
  --head FeWOO:add-deepseek-meme `
  --title "Add FeWOO/DeepSeek-meme" `
  --body "Adds DeepSeek Meme: a DSH sticker library with a composer button/panel, a GPT-drawn default pack (10), a community fan-art pack (8), and a send_sticker tool so the model can understand and reply with stickers."
```

提交后检查 CI：

- `dsh.bundle` 存在；
- 仓库年龄 ≥ 1 天；
- awesome-lint / README 生成通过。

## 其他社区入口

- GitHub topic `dsh-plugin` 会被多个聚合站自动发现（dshbase、WhaleHub 等）。
- [dsh-market](https://github.com/dsh-market/dsh-market) 的 Plugin Market 直接读取 awesome-dsh-plugin 目录；PR 合并后即可在应用内搜索到。

## 安装方式

```powershell
dsh plugin add github:FeWOO/DeepSeek-meme
```
