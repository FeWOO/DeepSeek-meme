# HTTP API 契约

所有路由挂在 DSH Web 服务的 `/api/memes` 前缀下，供本插件浏览器半调用。请求/响应均为 UTF-8 JSON（素材读取与上传除外）。

## 通用约定

- 错误响应：

  ```json
  { "error": { "code": "STICKER_NOT_FOUND", "message": "贴纸不存在" } }
  ```

- 状态码：`400` 参数错误、`404` 不存在、`409` 冲突、`413` 超过大小、`415` 媒体类型不允许、`500` 内部错误。
- 主要错误码：`INVALID_JSON`、`PACK_NOT_FOUND`、`PACK_EXISTS`、`PACK_PROTECTED`、`PACK_LIMIT`、`STICKER_NOT_FOUND`、`STICKER_LIMIT`、`STICKER_TOO_LARGE`、`UNSUPPORTED_MEDIA`、`EMPTY_FILE`、`BODY_TOO_LARGE`、`SESSION_REQUIRED`、`SESSION_NOT_LIVE`、`STICKER_REQUIRED`。
- 文本字段长度限制：`name` ≤ 40 字，`meaning` ≤ 200 字，`tags` 最多 8 个、每个 ≤ 16 字。
- 目录类响应带 `Cache-Control: no-store`；素材读取带长缓存（内容寻址 id）。

## 目录

### `GET /api/memes/catalog`

返回完整目录（含素材相对 URL）。

```json
{
  "version": 1,
  "packs": [
    {
      "id": "whale-default",
      "name": "鲸鱼娘日常",
      "description": "默认表情包",
      "order": 0,
      "bundled": true,
      "stickers": [
        {
          "id": "st_8f3c1a2b",
          "name": "开心",
          "meaning": "很开心、心情很好",
          "tags": ["开心"],
          "mediaType": "image/png",
          "bytes": 18234,
          "width": 256,
          "height": 256,
          "url": "/api/memes/assets/st_8f3c1a2b"
        }
      ]
    }
  ]
}
```

## 素材

### `GET /api/memes/assets/:stickerId`

返回图片字节。

- `Content-Type`：记录的 `mediaType`；
- `Cache-Control: public, max-age=31536000, immutable`；
- 找不到返回 404。

## 表情包

### `POST /api/memes/packs`

```json
{ "name": "猫猫图", "description": "可选" }
```

返回新建的 pack（不含 stickers 或为空数组）。名称重复允许（id 不同）。最多 50 个包。

### `PATCH /api/memes/packs/:packId`

```json
{ "name": "新名字", "description": "新描述", "order": 3 }
```

字段均可选。默认包允许改名，但不允许删除。

### `DELETE /api/memes/packs/:packId`

- 成功 `{ "deleted": true }`，同时删除包内所有素材文件；
- 默认包返回 409。

## 贴纸

### `POST /api/memes/stickers?packId=<packId>`

请求体为图片原始字节（**不是 multipart**），元数据通过请求头传递：

| Header | 必填 | 说明 |
| --- | --- | --- |
| `Content-Type` | 是 | `image/png` / `image/jpeg` / `image/webp` / `image/gif` |
| `x-meme-name` | 否 | `encodeURIComponent` 后的名称；缺省用文件名 |
| `x-meme-meaning` | 否 | `encodeURIComponent` 后的含义 |
| `x-meme-tags` | 否 | `encodeURIComponent` 后逗号分隔 |

返回新建的 sticker（含 `url`）。

### `PATCH /api/memes/stickers/:stickerId`

```json
{ "name": "新名字", "meaning": "新含义", "tags": ["新", "标签"], "packId": "可选，移动到的包" }
```

字段均可选。返回更新后的 sticker。

### `DELETE /api/memes/stickers/:stickerId`

删除记录并尽力删除素材文件，返回 `{ "deleted": true }`。

## 发送

### `POST /api/memes/send`

用户点击表情时调用。

```json
{ "sessionId": "session-...", "stickerId": "st_8f3c1a2b", "mode": "queue" }
```

- `mode` 可选：`queue`（默认）| `steer`；
- Host 校验 session、读取贴纸、把图片（canonical base64）作为**纯图片用户消息**投递；不含任何含义文字；
- 成功：`{ "accepted": true }`；
- 失败：`404 STICKER_NOT_FOUND` / `400 SESSION_INVALID` / `409 SESSION_NOT_LIVE` / `500 SEND_FAILED`。

> 模型侧发送不走这个接口，而是 `send_sticker` 工具，详见 [ARCHITECTURE.md](ARCHITECTURE.md#52-模型发表情)。表情含义保存在目录中，用户消息本身只带图片。

## 健康检查

### `GET /api/memes/health`

```json
{ "ok": true, "packs": 1, "stickers": 12, "dataDir": "C:\\Users\\...\\.dsh\\memes" }
```

用于安装后冒烟验证。
