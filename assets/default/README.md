# 默认表情包素材

此目录由 `index.js` 在首次启动、且 `catalog.json` 不存在时播种到 `DSH_HOME/memes`。

## 文件约定

- `manifest.json`：包描述与贴纸清单；
- `<slug>.png`：12 张 256×256 透明背景表情；
- `icon.png`：插件图标候选（package.json 当前使用根目录 `icon.svg`）；
- `preview.png`：4×3 网格预览，供审阅，不参与运行时。

## manifest.json 格式

```json
{
  "pack": {
    "id": "whale-default",
    "name": "鲸鱼娘日常",
    "description": "默认表情包：开心、疑惑、无语、吃米饭……"
  },
  "stickers": [
    {
      "file": "happy.png",
      "name": "开心",
      "meaning": "很开心、心情很好，可用于打招呼或表达愉快",
      "tags": ["开心", "高兴"]
    }
  ]
}
```

素材要求：PNG、256×256、透明背景、单文件 ≤ 200 KiB；名称与含义用简体中文，含义要具体到使用场景。
