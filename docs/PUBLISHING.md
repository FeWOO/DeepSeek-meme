# 发布记录

## 已完成

- 仓库公开：https://github.com/FeWOO/DeepSeek-meme
- GitHub topics：`dsh-plugin`、`deepseek-harness`、`dsh`、`cordis-plugin`、`stickers`、`meme`
- Release：`v0.3.5`（含安装说明与商店截图）
- README 已加官方 DSH「powered by dsh」徽章
- `screenshots.json` 已声明两张商店预览图
- `package.json` 已补 repository / homepage / bugs / keywords，且包含 `dsh.bundle` manifest
- **社区目录 PR 已提交**：[awesome-dsh-plugin#8465](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/8465)（2026-10-21）
  - 来源分支：`FeWOO/awesome-dsh-plugin#add-deepseek-meme`
  - 条目文件：`data/plugins/FeWOO__DeepSeek-meme.yml`（`category: fun`）
  - PR 状态：OPEN / MERGEABLE，CI「PR check」运行中

## 提交条件

该目录要求**仓库创建满 1 天**才允许收录（[contributing.md](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/contributing.md)）。本仓库创建于 2026-10-20 17:45 (+08)，已于 2026-10-21 18:05 满足门槛后提交。

PR 通过 CI 且被维护者合并后：

- 应用内 **Plugins → Discover** 与 [dsh-market](https://github.com/dsh-market/dsh-market) 可搜索安装；
- `dsh-plugin` topic 也会被 dshbase、WhaleHub 等聚合站自动发现。

若 CI 报错，在同一分支（`add-deepseek-meme`）推送修复即可，无需重开 PR：

```powershell
gh pr view 8465 --repo awesome-dsh-plugin/awesome-dsh-plugin --comments
gh pr checks 8465 --repo awesome-dsh-plugin/awesome-dsh-plugin
```

## 安装方式

```powershell
dsh plugin add github:FeWOO/DeepSeek-meme
```
