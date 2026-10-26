# DeepSeek Meme

English · [简体中文](README.md)

A sticker library for **DeepSeek Harness (DSH)**: a composer button and panel, two bundled sticker packs, and a `send_sticker` tool the model can understand and reply with.

<p align="center">
  <img src="assets/default/preview.png" alt="DeepSeek Meme default pack" width="760">
</p>

<p align="center">
  <a href="https://github.com/FeWOO/DeepSeek-meme/releases"><img alt="release" src="https://img.shields.io/github/v/release/FeWOO/DeepSeek-meme?style=flat-square&color=4D6BFE"></a>
  <a href="LICENSE"><img alt="license" src="https://img.shields.io/github/license/FeWOO/DeepSeek-meme?style=flat-square"></a>
  <img alt="DSH" src="https://img.shields.io/badge/DSH-0.2.1--rc.2-4D6BFE?style=flat-square">
  <a href="https://awesome-dsh-plugin.com/p/FeWOO/DeepSeek-meme/"><img alt="awesome-dsh-plugin" src="https://awesome-dsh-plugin.com/badge.svg"></a>
</p>

> Listed in the [awesome-dsh-plugin](https://awesome-dsh-plugin.com/p/FeWOO/DeepSeek-meme/) community catalog.

## Why

DSH chat has no sticker surface: users type, models cannot read pasted images, and there is no way to answer with a sticker. DeepSeek Meme makes stickers a first-class part of the conversation:

- **One click to send** — a sticker button next to the model selector; pick a sticker and it is posted immediately.
- **Image-only messages** — sticker messages contain just the image, scaled to 180px so they feel smaller than ordinary attachments.
- **Model-readable** — every sticker carries `name / meaning / tags`; the model can understand the image and look up the catalog when it needs precision.
- **Model can send too** — the `send_sticker` tool lets the model choose a sticker and reply with a 150px inline image.
- **Bring your own packs** — create packs, add images, edit names/meanings/tags, move or delete stickers; everything stays local.

## Features

| Area | Detail |
| --- | --- |
| Composer button | `conversation.input.right`, between the model selector and submit |
| Sticker panel | `conversation.input.dock`: pack tabs, grid, add/edit/delete |
| Send behavior | 180px image-only user message (`messageStickerSize`, 96–240) |
| Add stickers | PNG / JPEG / WebP / GIF with type and size validation |
| Edit stickers | Name, meaning, tags, pack; meanings stay in the model-readable catalog |
| Model tool | `send_sticker` list/send; expanded tool card + 150px inline Markdown image |
| Bundled packs | “默认表情” (10) + “鲸鱼娘二创梗图” (8), seeded on first run |
| Storage | `DSH_HOME/memes`; local only, no upload, no telemetry |

## Install

Requires **DeepSeek Harness 0.2.1-rc.2** (Desktop or Web profile).

```powershell
dsh plugin add github:FeWOO/DeepSeek-meme
```

Or search `DeepSeek-meme` in **Plugins → Discover / Plugin Market**, or install from the community page:

- Community catalog: <https://awesome-dsh-plugin.com/p/FeWOO/DeepSeek-meme/>
- Releases: <https://github.com/FeWOO/DeepSeek-meme/releases>

## Usage

1. Click the 🐋 sticker button in the composer.
2. Pick a pack tab and click a sticker to send it.
3. Hover a sticker and click ✎ to edit its name, meaning, tags, pack, or delete it.
4. Use “＋ Add sticker” to upload local images, or “＋” to create a pack.
5. The model can reply with stickers through the `send_sticker` tool.

**User-sent** stickers are image-only and scaled to 180px. **Model-sent** stickers use a 150px inline image plus a durable attachment.

## Bundled packs

- **默认表情 `whale-gpt` (10)** — 收到！ / 谢谢你~ / 我来啦！ / 辛苦啦 / 晚安安 / 早安~ / 喝奶茶中... / 嗯…? / 哼！ / 好困…
- **鲸鱼娘二创梗图 `whale-community` (8)** — community fan art; copyright remains with the original artists. See [docs/ASSETS.md](docs/ASSETS.md).

Both packs are independent; add or remove `assets/*/manifest.json` directories to add or remove bundled packs.

## Configuration

```yaml
- id: deepseek-meme
  name: dsh-deepseek-meme
  config:
    dataDir: ''              # default <DSH_HOME>/memes
    maxStickerBytes: 1048576 # per upload
    maxStickersPerPack: 500
    messageStickerSize: 180  # 96–240
```

## Architecture

- **Host**: local sticker store, `/api/memes/*` routes, `send_sticker`, system-prompt section.
- **Client**: `conversation.input.right` button, `conversation.input.dock` panel, `tool.call.toolview` view.
- **Data**: `DSH_HOME/memes/catalog.json` + `assets/`, atomic writes, serialized mutations, multi-bundle sync.
- **Sessions**: user stickers are normal `user/message` image blocks; model stickers are tool results plus an inline image. No fake session event types.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/API.md](docs/API.md).

## Privacy

Reads and writes only `DSH_HOME/memes`. No network fetches for sticker assets, no uploads, no telemetry. Image processing uses DSH attachment services; uploads are media-type and size checked; SVG is rejected.

## Compatibility

Targets DSH **0.2.1-rc.2**. Verified: dual-pack seeding, catalog/asset routes, sticker CRUD, 180px user sends, 150px inline model sends, community listing. See [docs/VERIFICATION.md](docs/VERIFICATION.md).

## Development

```powershell
node --check index.js
node --check client.js
```

Installation, host reload, smoke checks and Git workflow: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

## License

[MIT](LICENSE) © 2026 FeWOO

[![](https://img.shields.io/badge/powered_by-dsh-4D6BFE?style=flat-square&logo=deepseek&logoColor=white)](https://github.com/deepseek-ai/deepseek-harness)
