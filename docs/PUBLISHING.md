# 发布记录

## 已完成

- 仓库公开：<https://github.com/FeWOO/DeepSeek-meme>
- GitHub topics：`dsh-plugin`、`deepseek-harness`、`dsh`、`cordis-plugin`、`stickers`、`meme`
- Release：`v0.3.5`
- README 已加官方 DSH「powered by dsh」徽章
- `screenshots.json` 已声明两张商店预览图
- `package.json` 已补 repository / homepage / bugs / keywords，且包含 `dsh.bundle` manifest

## npm（已发布）

- **包名**：`dsh-deepseek-meme`
- **版本**：`0.3.5`（`latest`）
- **包页**：<https://www.npmjs.com/package/dsh-deepseek-meme>
- **安装**：`dsh plugin add dsh-deepseek-meme`
- **发布命令**：`npm publish --registry=https://registry.npmjs.org --access public`
- 注：npm 新包会先出现 `0.0.0-stage` 暂存占位版本，`latest` 已指向 `0.3.5`，不影响安装。

## 社区目录（已收录）

- **PR**：[awesome-dsh-plugin#8465](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/8465) — **已合并**（2026-10-21T17:13:02Z）
- **条目文件**：`data/plugins/FeWOO__DeepSeek-meme.yml`（`category: fun`）
- **市场页**：<https://awesome-dsh-plugin.com/p/FeWOO/DeepSeek-meme/>
- **目录数据**：`https://awesome-dsh-plugin.com/plugins.json` 已包含该条目
- **安装命令**（目录生成）：`dsh plugin --profile web add github:FeWOO/DeepSeek-meme`

PR 合并 / 目录收录后：

- DSH 应用内 **Plugins → Discover** 与 [dsh-market](https://github.com/dsh-market/dsh-market) 可搜索安装；
- `dsh-plugin` topic 也会被 dshbase、WhaleHub 等聚合站自动发现。

## 维护

- 后续更新直接推 `main`；市场按仓库 ref/版本重新检查。
- 社区条目描述如需更新，向 awesome-dsh-plugin 提交修改该 YAML 的 PR。
- CI 与 PR 状态：`gh pr view 8465 --repo awesome-dsh-plugin/awesome-dsh-plugin`、`gh pr checks 8465 --repo awesome-dsh-plugin/awesome-dsh-plugin`。

## 安装

```powershell
dsh plugin add github:FeWOO/DeepSeek-meme
```
