# 默认表情包素材

此目录由 `index.js` 在首次启动、且 `catalog.json` 不存在时播种到 `DSH_HOME/memes`。当前默认包是「鲸鱼娘二创梗图」（`whale-community`），素材为用户提供的社区二创同人图，详见 [docs/ASSETS.md](../../docs/ASSETS.md)。

## 文件

- `manifest.json`：包描述与 8 张贴纸清单；
- `*.webp`：640px 长边的梗图（WebP，单张 ≤140KB）；
- `icon.png`：插件图标候选（package.json 通过 `./icon` 导出）；
- `preview.png`：4×2 网格预览，供审阅，不参与运行时。

## 包迁移

`manifest.pack.id` 是默认包的版本标识：

- 换成新 id（例如从 `whale-default` 换成 `whale-community`）→ 插件加载时自动替换旧默认包；
- 保持同一 id → 保留用户对默认包的编辑（改名、添加表情、改含义）。

面板里添加/编辑的表情永远保存在运行时目录，不受默认包迁移影响。
