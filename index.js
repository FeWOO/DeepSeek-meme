/**
 * DeepSeek Meme — Host half.
 *
 * Owns:
 *  - the local sticker library (`<DSH_HOME>/memes/catalog.json` + `assets/`);
 *  - the `/api/memes/*` routes the Web Client half calls;
 *  - appending a sticker as a normal user message when the user clicks one;
 *  - the model-facing `send_sticker` tool and a short system-prompt section.
 *
 * Design notes live in docs/ARCHITECTURE.md and docs/API.md.
 */

import { promises as fs } from 'node:fs'
import { createHash } from 'node:crypto'
import { homedir } from 'node:os'
import { dirname, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const name = 'dsh-deepseek-meme'

/** Services required by the Host half. */
export const inject = [
  'tools',
  'webServer',
  'systemPrompt',
  'attachments',
  'sessionController',
  'sessions',
]

const PACKAGE_DIR = dirname(fileURLToPath(import.meta.url))
const ASSETS_ROOT = join(PACKAGE_DIR, 'assets')
const ROUTE_PREFIX = '/api/memes'
const CATALOG_VERSION = 1
const MAX_PACKS = 50
const MAX_TAGS = 8
const MAX_TAG_LENGTH = 16
const MAX_NAME_LENGTH = 40
const MAX_MEANING_LENGTH = 200
const MAX_JSON_BODY = 64 * 1024
const DEFAULT_MAX_STICKER_BYTES = 1024 * 1024
const DEFAULT_MAX_STICKERS_PER_PACK = 500
const DEFAULT_MESSAGE_STICKER_SIZE = 180

const MEDIA_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
const EXTENSION_BY_MEDIA = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
}
const MEDIA_BY_EXTENSION = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
}

class HttpError extends Error {
  constructor(status, code, message) {
    super(message)
    this.status = status
    this.code = code
  }
}

function fail(status, code, message) {
  throw new HttpError(status, code, message)
}

function now() {
  return Date.now()
}

function slug(value, fallback) {
  const text = String(value ?? '').trim().toLowerCase()
  const cleaned = text.replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48)
  return cleaned.length > 0 ? cleaned : fallback
}

function stickerIdFor(packId, file) {
  return `st_${createHash('sha1').update(`${packId}/${file}`).digest('hex').slice(0, 12)}`
}

function newStickerId() {
  return `st_${createHash('sha1').update(`${now()}:${Math.random()}:${process.hrtime.bigint()}`).digest('hex').slice(0, 12)}`
}

function cleanName(value, fallback = '未命名表情') {
  const text = String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim()
  if (text.length === 0) return fallback
  return text.slice(0, MAX_NAME_LENGTH)
}

function cleanMeaning(value) {
  const text = String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim()
  return text.slice(0, MAX_MEANING_LENGTH)
}

function cleanTags(value) {
  const list = Array.isArray(value) ? value : []
  const seen = new Set()
  const tags = []
  for (const item of list) {
    const tag = String(item ?? '').trim().slice(0, MAX_TAG_LENGTH)
    if (tag.length === 0 || seen.has(tag)) continue
    seen.add(tag)
    tags.push(tag)
    if (tags.length >= MAX_TAGS) break
  }
  return tags
}

function mediaTypeOf(buffer, declared) {
  const declaredType = String(declared ?? '').split(';')[0].trim().toLowerCase()
  let sniffed
  if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    sniffed = 'image/png'
  } else if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    sniffed = 'image/jpeg'
  } else if (buffer.length >= 6 && buffer.subarray(0, 4).toString('latin1') === 'GIF8') {
    sniffed = 'image/gif'
  } else if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('latin1') === 'RIFF' &&
    buffer.subarray(8, 12).toString('latin1') === 'WEBP'
  ) {
    sniffed = 'image/webp'
  }
  if (sniffed === undefined) return undefined
  if (declaredType.length > 0 && declaredType !== sniffed) return undefined
  return sniffed
}

/** Best-effort intrinsic size; uploads may also supply dimensions from the browser. */
function imageSize(buffer, mediaType) {
  try {
    if (mediaType === 'image/png' && buffer.length >= 24) {
      return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
    }
    if (mediaType === 'image/gif' && buffer.length >= 10) {
      return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) }
    }
  } catch {
    // fall through to unknown
  }
  return undefined
}

function decodeHeader(value) {
  if (typeof value !== 'string') return ''
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function normalizeMode(value) {
  return value === 'steer' ? 'steer' : 'queue'
}

function requestId() {
  return `meme-${now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function catalogView(catalog) {
  return {
    version: catalog.version,
    packs: [...catalog.packs]
      .sort((a, b) => a.order - b.order || a.createdAt - b.createdAt)
      .map((pack) => ({
        id: pack.id,
        name: pack.name,
        description: pack.description,
        order: pack.order,
        bundled: pack.bundled === true,
        stickers: pack.stickers.map((sticker) => ({
          id: sticker.id,
          name: sticker.name,
          meaning: sticker.meaning,
          tags: sticker.tags,
          mediaType: sticker.mediaType,
          bytes: sticker.bytes,
          width: sticker.width ?? 0,
          height: sticker.height ?? 0,
          url: `${ROUTE_PREFIX}/assets/${sticker.id}`,
        })),
      })),
  }
}

function catalogText(catalog, limit = 120) {
  const entries = []
  for (const pack of [...catalog.packs].sort((a, b) => a.order - b.order || a.createdAt - b.createdAt)) {
    if (pack.stickers.length === 0) continue
    entries.push(`【${pack.name}】`)
    for (const sticker of pack.stickers) {
      if (entries.length > limit) break
      const tags = sticker.tags.length > 0 ? `；标签：${sticker.tags.join('/')}` : ''
      entries.push(`- ${sticker.id}｜${sticker.name}：${sticker.meaning || '（未填写含义）'}${tags}`)
    }
    if (entries.length > limit) break
  }
  if (entries.length === 0) return '表情包目录还是空的，可以先让主人添加几张。'
  if (entries.length > limit) entries.push(`…（内容较多，只显示前 ${limit} 条）`)
  return `可用表情包目录：\n${entries.join('\n')}\n\n发送方式：调用 send_sticker，action=send，stickerId 用上面列出的 id。`
}

/** Serialized, atomically-written sticker catalog plus its image files. */
class StickerStore {
  #dir
  #assetsDir
  #catalogPath
  #catalog = null
  #initPromise = null
  #queue = Promise.resolve()
  #limits

  constructor(dir, limits) {
    this.#dir = dir
    this.#assetsDir = join(dir, 'assets')
    this.#catalogPath = join(dir, 'catalog.json')
    this.#limits = limits
  }

  get dataDir() {
    return this.#dir
  }

  ensure() {
    if (this.#catalog !== null) return Promise.resolve(this.#catalog)
    if (this.#initPromise === null) {
      this.#initPromise = this.#load().catch((error) => {
        this.#initPromise = null
        throw error
      })
    }
    return this.#initPromise
  }

  async #load() {
    await fs.mkdir(this.#assetsDir, { recursive: true })
    let text
    try {
      text = await fs.readFile(this.#catalogPath, 'utf8')
    } catch (error) {
      if (error && error.code === 'ENOENT') {
        this.#catalog = await this.#seed()
        return this.#catalog
      }
      throw error
    }
    let parsed
    try {
      parsed = JSON.parse(text)
    } catch (error) {
      throw new Error(`catalog.json 不是合法 JSON，已保留原文件等待人工修复：${error.message}`)
    }
    const catalog = this.#validateCatalog(parsed)
    await this.#syncBundledPacks(catalog)
    this.#catalog = catalog
    return this.#catalog
  }

  /**
   * Discover every shipped pack: any `assets/<name>/manifest.json` directory.
   * `default` is seeded first; the remaining packs follow alphabetically.
   */
  async #listBundledManifests() {
    let entries
    try {
      entries = await fs.readdir(ASSETS_ROOT, { withFileTypes: true })
    } catch {
      return []
    }
    const manifests = []
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const dir = join(ASSETS_ROOT, entry.name)
      try {
        const text = await fs.readFile(join(dir, 'manifest.json'), 'utf8')
        const manifest = JSON.parse(text)
        if (typeof manifest !== 'object' || manifest === null) continue
        const sourcePack = typeof manifest.pack === 'object' && manifest.pack !== null ? manifest.pack : {}
        manifests.push({
          dir,
          name: entry.name,
          manifest,
          packId: slug(sourcePack.id, entry.name),
        })
      } catch {
        continue
      }
    }
    manifests.sort((a, b) => {
      if (a.name === 'default') return -1
      if (b.name === 'default') return 1
      return a.name.localeCompare(b.name)
    })
    return manifests
  }

  /** Materialize one bundled pack, copying its assets into the runtime library. */
  async #buildBundledPack(manifest, sourceDir, index) {
    const sourcePack = typeof manifest.pack === 'object' && manifest.pack !== null ? manifest.pack : {}
    const packId = slug(sourcePack.id, `bundled-${index}`)
    const pack = {
      id: packId,
      name: cleanName(sourcePack.name, '默认表情'),
      description: cleanMeaning(sourcePack.description),
      order: Number.isFinite(sourcePack.order) ? sourcePack.order : index,
      bundled: true,
      createdAt: now(),
      stickers: [],
    }
    const stickers = Array.isArray(manifest.stickers) ? manifest.stickers : []
    for (const entry of stickers) {
      if (pack.stickers.length >= this.#limits.maxStickersPerPack) break
      const file = typeof entry?.file === 'string' ? entry.file : ''
      const extension = extname(file).toLowerCase()
      const mediaType = MEDIA_BY_EXTENSION[extension]
      if (mediaType === undefined) continue
      let data
      try {
        data = await fs.readFile(join(sourceDir, file))
      } catch {
        continue
      }
      if (data.length === 0 || data.length > this.#limits.maxStickerBytes) continue
      const stickerId = stickerIdFor(packId, file)
      const target = join(this.#assetsDir, `${stickerId}${extension}`)
      await fs.writeFile(target, data)
      const size = imageSize(data, mediaType)
      const widthHint = Number(entry.width)
      const heightHint = Number(entry.height)
      pack.stickers.push({
        id: stickerId,
        name: cleanName(entry.name, file),
        meaning: cleanMeaning(entry.meaning),
        tags: cleanTags(entry.tags),
        file: `${stickerId}${extension}`,
        mediaType,
        bytes: data.length,
        width: Number.isFinite(widthHint) && widthHint > 0 ? widthHint : (size?.width ?? 0),
        height: Number.isFinite(heightHint) && heightHint > 0 ? heightHint : (size?.height ?? 0),
        createdAt: now(),
      })
    }
    return pack.stickers.length > 0 ? pack : undefined
  }

  async #seed() {
    const catalog = { version: CATALOG_VERSION, packs: [] }
    const manifests = await this.#listBundledManifests()
    for (const [index, entry] of manifests.entries()) {
      const pack = await this.#buildBundledPack(entry.manifest, entry.dir, index)
      if (pack !== undefined) catalog.packs.push(pack)
    }
    await this.#writeCatalog(catalog)
    return catalog
  }

  /**
   * Keep the runtime catalog in sync with every shipped pack:
   *  - add packs whose manifest is new;
   *  - drop bundled packs whose manifest disappeared;
   *  - refresh bundled pack order, but never overwrite user edits (name,
   *    extra stickers, changed meanings) on packs that still exist.
   */
  async #syncBundledPacks(catalog) {
    const manifests = await this.#listBundledManifests()
    if (manifests.length === 0) return
    const wanted = new Map(
      manifests.map((entry, index) => {
        const sourcePack = typeof entry.manifest.pack === 'object' && entry.manifest.pack !== null ? entry.manifest.pack : {}
        return [
          entry.packId,
          {
            ...entry,
            index,
            order: Number.isFinite(sourcePack.order) ? sourcePack.order : index,
          },
        ]
      }),
    )
    let changed = false
    const stale = []
    const kept = []
    for (const pack of catalog.packs) {
      if (pack.bundled === true && !wanted.has(pack.id)) {
        stale.push(pack)
        changed = true
        continue
      }
      kept.push(pack)
      const spec = wanted.get(pack.id)
      if (spec !== undefined && pack.order !== spec.order) {
        pack.order = spec.order
        changed = true
      }
    }
    catalog.packs = kept
    for (const [index, entry] of manifests.entries()) {
      if (catalog.packs.some((pack) => pack.id === entry.packId)) continue
      const pack = await this.#buildBundledPack(entry.manifest, entry.dir, index)
      if (pack !== undefined) {
        catalog.packs.push(pack)
        changed = true
      }
    }
    if (changed) {
      await this.#writeCatalog(catalog)
      if (stale.length > 0) {
        await this.#deleteStickerFiles(stale.flatMap((pack) => pack.stickers))
      }
    }
  }

  #validateCatalog(value) {
    if (typeof value !== 'object' || value === null || !Array.isArray(value.packs)) {
      throw new Error('catalog.json 结构不正确：缺少 packs 数组')
    }
    const packs = []
    for (const rawPack of value.packs) {
      if (typeof rawPack !== 'object' || rawPack === null) continue
      const stickers = []
      for (const rawSticker of Array.isArray(rawPack.stickers) ? rawPack.stickers : []) {
        if (typeof rawSticker !== 'object' || rawSticker === null) continue
        if (typeof rawSticker.id !== 'string' || typeof rawSticker.file !== 'string') continue
        if (!MEDIA_TYPES.includes(rawSticker.mediaType)) continue
        stickers.push({
          id: rawSticker.id,
          name: cleanName(rawSticker.name),
          meaning: cleanMeaning(rawSticker.meaning),
          tags: cleanTags(rawSticker.tags),
          file: rawSticker.file,
          mediaType: rawSticker.mediaType,
          bytes: Number.isFinite(rawSticker.bytes) ? rawSticker.bytes : 0,
          width: Number.isFinite(rawSticker.width) ? rawSticker.width : 0,
          height: Number.isFinite(rawSticker.height) ? rawSticker.height : 0,
          createdAt: Number.isFinite(rawSticker.createdAt) ? rawSticker.createdAt : now(),
        })
      }
      packs.push({
        id: slug(rawPack.id, `pack-${packs.length}`),
        name: cleanName(rawPack.name, '未命名表情包'),
        description: cleanMeaning(rawPack.description),
        order: Number.isFinite(rawPack.order) ? rawPack.order : packs.length,
        bundled: rawPack.bundled === true,
        createdAt: Number.isFinite(rawPack.createdAt) ? rawPack.createdAt : now(),
        stickers,
      })
    }
    return { version: CATALOG_VERSION, packs }
  }

  async #writeCatalog(catalog) {
    const tmp = `${this.#catalogPath}.tmp`
    await fs.writeFile(tmp, JSON.stringify(catalog, null, 2), 'utf8')
    await fs.rename(tmp, this.#catalogPath)
  }

  #serialize(operation) {
    const run = this.#queue.then(operation, operation)
    this.#queue = run.then(
      () => undefined,
      () => undefined,
    )
    return run
  }

  #mutate(operation) {
    return this.#serialize(async () => {
      const catalog = await this.ensure()
      const draft = structuredClone(catalog)
      const result = await operation(draft)
      await this.#writeCatalog(draft)
      this.#catalog = draft
      return result
    })
  }

  searchSticker(catalog, stickerId) {
    for (const pack of catalog.packs) {
      const sticker = pack.stickers.find((item) => item.id === stickerId)
      if (sticker !== undefined) return { pack, sticker }
    }
    return undefined
  }

  async requireSticker(stickerId) {
    const catalog = await this.ensure()
    const found = this.searchSticker(catalog, stickerId)
    if (found === undefined) fail(404, 'STICKER_NOT_FOUND', '这张表情不存在，可能已经被删除了')
    return found
  }

  async readStickerBytes(sticker) {
    return fs.readFile(join(this.#assetsDir, sticker.file))
  }

  async addPack(input) {
    return this.#mutate((catalog) => {
      if (catalog.packs.length >= MAX_PACKS) fail(409, 'PACK_LIMIT', `最多只能有 ${MAX_PACKS} 个表情包`)
      const packId = slug(input?.id, `pack-${now().toString(36)}${Math.random().toString(36).slice(2, 6)}`)
      if (catalog.packs.some((pack) => pack.id === packId)) fail(409, 'PACK_EXISTS', '同名表情包已存在')
      const pack = {
        id: packId,
        name: cleanName(input?.name, '新表情包'),
        description: cleanMeaning(input?.description),
        order: catalog.packs.length,
        bundled: false,
        createdAt: now(),
        stickers: [],
      }
      catalog.packs.push(pack)
      return pack
    })
  }

  async updatePack(packId, input) {
    return this.#mutate((catalog) => {
      const pack = catalog.packs.find((item) => item.id === packId)
      if (pack === undefined) fail(404, 'PACK_NOT_FOUND', '表情包不存在')
      if (input?.name !== undefined) pack.name = cleanName(input.name, pack.name)
      if (input?.description !== undefined) pack.description = cleanMeaning(input.description)
      if (Number.isFinite(input?.order)) pack.order = input.order
      return pack
    })
  }

  async deletePack(packId) {
    const removed = await this.#mutate((catalog) => {
      const index = catalog.packs.findIndex((item) => item.id === packId)
      if (index < 0) fail(404, 'PACK_NOT_FOUND', '表情包不存在')
      const [pack] = catalog.packs.splice(index, 1)
      if (pack.bundled) {
        // The bundled pack is part of the seeded experience; protect it.
        catalog.packs.splice(index, 0, pack)
        fail(409, 'PACK_PROTECTED', '默认表情包不能删除，可以改名或清空里面的表情')
      }
      return pack
    })
    await this.#deleteStickerFiles(removed.stickers)
    return { deleted: true }
  }

  async addSticker(packId, input) {
    const mediaType = mediaTypeOf(input.data, input.mediaType)
    if (mediaType === undefined) fail(415, 'UNSUPPORTED_MEDIA', '只支持 PNG / JPEG / WebP / GIF 图片，且内容要与类型一致')
    if (input.data.length === 0) fail(400, 'EMPTY_FILE', '图片是空的')
    if (input.data.length > this.#limits.maxStickerBytes) {
      fail(413, 'STICKER_TOO_LARGE', `单张表情不能超过 ${Math.floor(this.#limits.maxStickerBytes / 1024)} KB`)
    }
    const extension = EXTENSION_BY_MEDIA[mediaType]
    const stickerId = newStickerId()
    const fileName = `${stickerId}${extension}`
    const target = join(this.#assetsDir, fileName)
    await fs.mkdir(this.#assetsDir, { recursive: true })
    const tmp = `${target}.tmp`
    await fs.writeFile(tmp, input.data)
    await fs.rename(tmp, target)
    const size = imageSize(input.data, mediaType)
    let created
    try {
      created = await this.#mutate((catalog) => {
        const pack = catalog.packs.find((item) => item.id === packId)
        if (pack === undefined) fail(404, 'PACK_NOT_FOUND', '表情包不存在')
        if (pack.stickers.length >= this.#limits.maxStickersPerPack) {
          fail(409, 'STICKER_LIMIT', `每个表情包最多 ${this.#limits.maxStickersPerPack} 张表情`)
        }
        const sticker = {
          id: stickerId,
          name: cleanName(input.name, '未命名表情'),
          meaning: cleanMeaning(input.meaning),
          tags: cleanTags(input.tags),
          file: fileName,
          mediaType,
          bytes: input.data.length,
          width: Math.max(0, Number(input.width) || size?.width || 0),
          height: Math.max(0, Number(input.height) || size?.height || 0),
          createdAt: now(),
        }
        pack.stickers.push(sticker)
        return sticker
      })
    } catch (error) {
      await fs.rm(target, { force: true })
      throw error
    }
    return created
  }

  async updateSticker(stickerId, input) {
    return this.#mutate((catalog) => {
      const found = this.searchSticker(catalog, stickerId)
      if (found === undefined) fail(404, 'STICKER_NOT_FOUND', '表情不存在')
      const { pack, sticker } = found
      if (input?.name !== undefined) sticker.name = cleanName(input.name, sticker.name)
      if (input?.meaning !== undefined) sticker.meaning = cleanMeaning(input.meaning)
      if (input?.tags !== undefined) sticker.tags = cleanTags(input.tags)
      if (typeof input?.packId === 'string' && input.packId !== pack.id) {
        const targetPack = catalog.packs.find((item) => item.id === input.packId)
        if (targetPack === undefined) fail(404, 'PACK_NOT_FOUND', '目标表情包不存在')
        if (targetPack.stickers.length >= this.#limits.maxStickersPerPack) {
          fail(409, 'STICKER_LIMIT', `每个表情包最多 ${this.#limits.maxStickersPerPack} 张表情`)
        }
        const index = pack.stickers.findIndex((item) => item.id === stickerId)
        pack.stickers.splice(index, 1)
        targetPack.stickers.push(sticker)
      }
      return sticker
    })
  }

  async deleteSticker(stickerId) {
    const removed = await this.#mutate((catalog) => {
      const found = this.searchSticker(catalog, stickerId)
      if (found === undefined) fail(404, 'STICKER_NOT_FOUND', '表情不存在')
      const index = found.pack.stickers.findIndex((item) => item.id === stickerId)
      const [sticker] = found.pack.stickers.splice(index, 1)
      return sticker
    })
    await this.#deleteStickerFiles([removed])
    return { deleted: true }
  }

  async #deleteStickerFiles(stickers) {
    await Promise.all(
      stickers.map((sticker) =>
        fs.rm(join(this.#assetsDir, sticker.file), { force: true }).catch(() => undefined),
      ),
    )
  }

  counts() {
    const catalog = this.#catalog
    if (catalog === null) return { packs: 0, stickers: 0 }
    return {
      packs: catalog.packs.length,
      stickers: catalog.packs.reduce((total, pack) => total + pack.stickers.length, 0),
    }
  }
}

async function readRawBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let total = 0
    let settled = false
    const rejectOnce = (error) => {
      if (settled) return
      settled = true
      reject(error)
    }
    req.on('data', (chunk) => {
      if (settled) return
      total += chunk.length
      if (total > limit) {
        rejectOnce(new HttpError(413, 'BODY_TOO_LARGE', `请求体超过上限 ${Math.floor(limit / 1024)} KB`))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      if (settled) return
      settled = true
      resolve(Buffer.concat(chunks))
    })
    req.on('error', (error) => rejectOnce(error))
  })
}

async function readJsonBody(req, limit = MAX_JSON_BODY) {
  const raw = await readRawBody(req, limit)
  if (raw.length === 0) return {}
  let value
  try {
    value = JSON.parse(raw.toString('utf8'))
  } catch {
    fail(400, 'INVALID_JSON', '请求体不是合法 JSON')
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    fail(400, 'INVALID_JSON', '请求体必须是 JSON 对象')
  }
  return value
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body),
  })
  res.end(body)
}

function sendError(res, error) {
  const status = error instanceof HttpError ? error.status : 500
  const code = error instanceof HttpError ? error.code : 'INTERNAL_ERROR'
  const message = error instanceof Error ? error.message : String(error)
  if (status >= 500) console.error('[deepseek-meme]', error)
  sendJson(res, status, { error: { code, message } })
}

function sendBytes(res, data, mediaType) {
  res.writeHead(200, {
    'content-type': mediaType,
    'content-length': data.length,
    'cache-control': 'public, max-age=31536000, immutable',
  })
  res.end(data)
}

function createToolDefinition(ctx, store) {
  const imageSchema = {
    type: 'object',
    additionalProperties: false,
    required: ['attachmentId', 'mediaType', 'bytes', 'width', 'height'],
    properties: {
      attachmentId: { type: 'string' },
      mediaType: { type: 'string', enum: MEDIA_TYPES },
      bytes: { type: 'integer' },
      width: { type: 'integer' },
      height: { type: 'integer' },
      name: { type: 'string' },
    },
  }
  return {
    name: 'send_sticker',
    description:
      'Send a sticker image to the user. User-sent stickers also arrive as plain images without captions, so understand them visually. Call with action="list" first to see the available stickers, their ids, names, meanings and tags. Then call action="send" with a stickerId to post that sticker into the conversation. Use stickers sparingly: only when the emotional tone genuinely fits, at most one per reply, and never as a substitute for answering in text.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['action'],
      properties: {
        action: {
          type: 'string',
          enum: ['list', 'send'],
          description: 'list = show the sticker catalog; send = post one sticker to the user.',
        },
        stickerId: {
          type: 'string',
          description: 'The id from the list result, e.g. "st_8f3c1a2b". Required when action is "send".',
        },
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['ok'],
        properties: {
          ok: { type: 'boolean' },
          message: { type: 'string' },
          stickerId: { type: 'string' },
          name: { type: 'string' },
          meaning: { type: 'string' },
          image: imageSchema,
        },
      },
      render(_args, value) {
        if (value !== null && typeof value === 'object' && value.image !== undefined) {
          const text = typeof value.message === 'string' ? value.message : '已发送表情包'
          return [
            { type: 'text', text },
            { type: 'image', attachment: value.image },
          ]
        }
        const text = value !== null && typeof value === 'object' && typeof value.message === 'string'
          ? value.message
          : '表情包工具没有返回内容'
        return [{ type: 'text', text }]
      },
    },
    async execute(args) {
      if (args === null || typeof args !== 'object' || Array.isArray(args)) {
        throw new Error('arguments must be an object')
      }
      if (args.action === 'list') {
        const catalog = await store.ensure()
        return { ok: true, message: catalogText(catalog) }
      }
      if (args.action !== 'send') {
        throw new Error('action must be "list" or "send"')
      }
      const stickerId = typeof args.stickerId === 'string' ? args.stickerId.trim() : ''
      if (stickerId.length === 0) throw new Error('stickerId is required when action is "send"')
      let found
      try {
        found = await store.requireSticker(stickerId)
      } catch (error) {
        return { ok: false, message: `找不到表情 ${stickerId}，可以先调用 action="list" 查看可用 id` }
      }
      const bytes = await store.readStickerBytes(found.sticker)
      const ref = await ctx.attachments.saveImage({
        data: bytes,
        mediaType: found.sticker.mediaType,
        name: `${found.sticker.name}${EXTENSION_BY_MEDIA[found.sticker.mediaType]}`,
      })
      const meaning = found.sticker.meaning.length > 0 ? `（${found.sticker.meaning}）` : ''
      return {
        ok: true,
        message: `已发送表情包「${found.sticker.name}」${meaning}`,
        stickerId: found.sticker.id,
        name: found.sticker.name,
        meaning: found.sticker.meaning,
        image: {
          attachmentId: ref.attachmentId,
          mediaType: ref.mediaType,
          bytes: ref.bytes,
          width: ref.width,
          height: ref.height,
          ...(ref.name === undefined ? {} : { name: ref.name }),
        },
      }
    },
  }
}

/**
 * @param {import('@deepseek-ai/cordis').Context} ctx
 * @param {{ dataDir?: string, maxStickerBytes?: number, maxStickersPerPack?: number }} config
 */
export function apply(ctx, config = {}) {
  const home = process.env.DSH_HOME && process.env.DSH_HOME.length > 0
    ? process.env.DSH_HOME
    : join(homedir(), '.dsh')
  const dataDir = typeof config.dataDir === 'string' && config.dataDir.trim().length > 0
    ? config.dataDir
    : join(home, 'memes')
  const maxStickerBytes = Number.isInteger(config.maxStickerBytes) && config.maxStickerBytes > 0
    ? config.maxStickerBytes
    : DEFAULT_MAX_STICKER_BYTES
  const maxStickersPerPack = Number.isInteger(config.maxStickersPerPack) && config.maxStickersPerPack > 0
    ? config.maxStickersPerPack
    : DEFAULT_MAX_STICKERS_PER_PACK
  const configuredSize = Number(config.messageStickerSize)
  const messageStickerSize = Number.isInteger(configuredSize) && configuredSize >= 96 && configuredSize <= 240
    ? configuredSize
    : DEFAULT_MESSAGE_STICKER_SIZE
  const store = new StickerStore(dataDir, { maxStickerBytes, maxStickersPerPack })

  ctx.effect(() => {
    const disposers = []

    disposers.push(
      ctx.webServer.register({
        kind: 'prefix',
        path: ROUTE_PREFIX,
        async handler(req, res) {
          try {
            const url = new URL(req.url ?? '/', 'http://127.0.0.1')
            const path = url.pathname.startsWith(ROUTE_PREFIX)
              ? url.pathname.slice(ROUTE_PREFIX.length) || '/'
              : url.pathname
            const method = req.method ?? 'GET'
            const segments = path.split('/').filter(Boolean)

            if (method === 'GET' && path === '/health') {
              await store.ensure()
              const counts = store.counts()
              sendJson(res, 200, { ok: true, packs: counts.packs, stickers: counts.stickers, dataDir })
              return
            }
            if (method === 'GET' && path === '/catalog') {
              const catalog = await store.ensure()
              sendJson(res, 200, catalogView(catalog))
              return
            }
            if (method === 'GET' && segments.length === 2 && segments[0] === 'assets') {
              const { sticker } = await store.requireSticker(segments[1])
              const data = await store.readStickerBytes(sticker)
              sendBytes(res, data, sticker.mediaType)
              return
            }
            if (method === 'POST' && path === '/packs') {
              const body = await readJsonBody(req)
              sendJson(res, 201, await store.addPack(body))
              return
            }
            if (segments.length === 2 && segments[0] === 'packs') {
              if (method === 'PATCH') {
                sendJson(res, 200, await store.updatePack(segments[1], await readJsonBody(req)))
                return
              }
              if (method === 'DELETE') {
                sendJson(res, 200, await store.deletePack(segments[1]))
                return
              }
            }
            if (method === 'POST' && path === '/stickers') {
              const packId = url.searchParams.get('packId') ?? ''
              if (packId.length === 0) fail(400, 'PACK_REQUIRED', '缺少 packId')
              const declaredType = req.headers['content-type'] ?? ''
              const data = await readRawBody(req, maxStickerBytes + 1)
              const width = Number(req.headers['x-meme-width'])
              const height = Number(req.headers['x-meme-height'])
              const sticker = await store.addSticker(packId, {
                data,
                mediaType: declaredType,
                name: decodeHeader(req.headers['x-meme-name']),
                meaning: decodeHeader(req.headers['x-meme-meaning']),
                tags: decodeHeader(req.headers['x-meme-tags']).split(',').map((tag) => tag.trim()).filter(Boolean),
                width: Number.isFinite(width) ? width : 0,
                height: Number.isFinite(height) ? height : 0,
              })
              sendJson(res, 201, {
                ...sticker,
                url: `${ROUTE_PREFIX}/assets/${sticker.id}`,
                file: undefined,
              })
              return
            }
            if (segments.length === 2 && segments[0] === 'stickers') {
              if (method === 'PATCH') {
                sendJson(res, 200, await store.updateSticker(segments[1], await readJsonBody(req)))
                return
              }
              if (method === 'DELETE') {
                sendJson(res, 200, await store.deleteSticker(segments[1]))
                return
              }
            }
            if (method === 'POST' && path === '/send') {
              const body = await readJsonBody(req)
              const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : ''
              const stickerId = typeof body.stickerId === 'string' ? body.stickerId.trim() : ''
              if (sessionId.length === 0) fail(400, 'SESSION_REQUIRED', '缺少 sessionId')
              if (stickerId.length === 0) fail(400, 'STICKER_REQUIRED', '缺少 stickerId')
              if (ctx.sessions.get(sessionId) === undefined) {
                fail(409, 'SESSION_NOT_LIVE', '当前会话不在运行中，请先发送一条消息激活会话再发表情')
              }
              const { sticker } = await store.requireSticker(stickerId)
              const data = await store.readStickerBytes(sticker)
              const extension = EXTENSION_BY_MEDIA[sticker.mediaType]
              const name = `${sticker.name}${extension}`
              const fullRef = await ctx.attachments.saveImage({
                data,
                mediaType: sticker.mediaType,
                name,
              })
              // Sticker messages use a downscaled image so chat renders them
              // smaller than ordinary image attachments (240px single-image cap
              // in the shipped UI). Normal uploads never pass through this path.
              const sourceWidth = fullRef.width > 0 ? fullRef.width : 640
              const sourceHeight = fullRef.height > 0 ? fullRef.height : 640
              const scale = Math.min(1, messageStickerSize / Math.max(sourceWidth, sourceHeight))
              const target = {
                width: Math.max(1, Math.round(sourceWidth * scale)),
                height: Math.max(1, Math.round(sourceHeight * scale)),
                maxBytes: 512 * 1024,
              }
              let displayBytes = data
              let displayMediaType = sticker.mediaType
              let displayWidth = sourceWidth
              let displayHeight = sourceHeight
              try {
                const requestImage = await ctx.attachments.readImageRequest(fullRef, target)
                displayBytes = Buffer.from(requestImage.data)
                displayMediaType = requestImage.mediaType
                displayWidth = requestImage.width
                displayHeight = requestImage.height
              } catch (error) {
                console.error('[deepseek-meme] sticker downscale failed, sending original', error)
              }
              const controller = new AbortController()
              const timer = setTimeout(() => controller.abort(), 30000)
              let result
              try {
                result = await ctx.sessionController.prompt(
                  {
                    requestId: requestId(),
                    sessionId,
                    mode: normalizeMode(body.mode),
                    content: [
                      {
                        type: 'image',
                        mediaType: displayMediaType,
                        data: displayBytes.toString('base64'),
                        // Attachment name stays available as a hint; the chat row shows only the image.
                        name,
                      },
                    ],
                  },
                  controller.signal,
                )
              } finally {
                clearTimeout(timer)
              }
              sendJson(res, 200, {
                accepted: result?.accepted === true || result?.accepted === undefined,
                image: { width: displayWidth, height: displayHeight, bytes: displayBytes.length },
              })
              return
            }
            fail(404, 'NOT_FOUND', `没有这个接口：${method} ${path}`)
          } catch (error) {
            sendError(res, error)
          }
        },
      }),
    )

    disposers.push(ctx.tools.register(createToolDefinition(ctx, store)))

    disposers.push(
      ctx.systemPrompt.section({
        name: 'tool:send_sticker',
        order: 115,
        text: '用户发来的表情包是一条纯图片消息，不会附带含义文字；请直接观察图片理解它的情绪和梗义。需要回发表情或确认目录时，使用 send_sticker 工具（先 action="list" 查看全部表情的 id、名称、含义和标签）。',
      }),
    )

    return () => {
      for (const dispose of disposers.reverse()) {
        try {
          dispose()
        } catch (error) {
          console.error('[deepseek-meme] dispose failed', error)
        }
      }
    }
  }, 'deepseek-meme')
}
