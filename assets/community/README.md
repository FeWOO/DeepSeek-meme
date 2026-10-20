# 鲸鱼娘二创梗图（whale-community）

这是插件随包分发的**第二套**表情包，不替换默认包；默认包在 `assets/default/`（`whale-gpt`「默认表情」）。素材为用户提供的社区二创同人图，详见 [docs/ASSETS.md](../../docs/ASSETS.md)。

## 文件

- `manifest.json`：包描述与 8 张贴纸清单（`pack.id = whale-community`，order 1）；
- `*.webp`：640px 长边梗图（WebP，单张 ≤140KB）；
- `icon.png`：该包的图标候选（插件当前使用默认包的 icon）；
- `preview.png`：4×2 网格预览，供审阅，不参与运行时。

## 多包同步

宿主会扫描 `assets/*/manifest.json`，本目录存在就保留这个包；删除目录会移除该 bundled 包。保持同一 `pack.id` 时用户改名/加图/改含义不会被覆盖。面板里添加/编辑的表情永远保存在运行时目录。
