/**
 * DeepSeek Meme — Web Client half.
 *
 * Registers three things:
 *  - a compact sticker button in `conversation.input.right` (beside the model select);
 *  - a full-width sticker panel in `conversation.input.dock` (above the composer card);
 *  - a sticker bubble renderer for the `send_sticker` tool result.
 *
 * Plain-JS module-loader file: no build step, React comes from the factory
 * `require`, and every style/listener is owned by ctx.effect or a component.
 */
window.__ModuleLoader__.load({
  id: 'dsh-deepseek-meme',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const NS = 'dsh-deepseek-meme'

    const MEDIA_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

    const ZH = {
      'button.label': '表情包',
      'button.hint': '打开表情面板',
      'panel.title': '表情包',
      'panel.close': '收起',
      'panel.refresh': '刷新',
      'panel.addSticker': '添加表情',
      'panel.newPack': '新建表情包',
      'panel.newPackHint': '给新表情包起个名字',
      'panel.createPack': '创建',
      'panel.cancel': '取消',
      'panel.empty': '这个表情包还是空的，点「添加表情」收一张吧～',
      'panel.noPacks': '还没有表情包，先新建一个吧～',
      'panel.loading': '加载中…',
      'panel.sendHint': '点表情直接发送，右上角小笔可以改含义',
      'panel.count': '{count} 张',
      'panel.defaultBadge': '默认',
      'panel.uploading': '上传中…',
      'editor.title': '编辑表情',
      'editor.name': '名称',
      'editor.namePlaceholder': '例如：疑惑',
      'editor.meaning': '含义（让模型看懂）',
      'editor.meaningPlaceholder': '例如：没听懂、满头问号，适合追问或表达困惑',
      'editor.tags': '标签（逗号分隔）',
      'editor.tagsPlaceholder': '疑惑, 问号, 不懂',
      'editor.pack': '所属表情包',
      'editor.save': '保存',
      'editor.cancel': '取消',
      'editor.delete': '删除',
      'editor.deleteConfirm': '确定删除这张表情吗？',
      'add.added': '添加好了，补充一下含义模型就更容易看懂',
      'send.sent': '已发送「{name}」',
      'send.sending': '发送中…',
      'tool.pending': '正在发送表情…',
      'tool.alt': '表情包',
      'error.prefix': '出错了',
    }

    const EN = {
      'button.label': 'Stickers',
      'button.hint': 'Open the sticker panel',
      'panel.title': 'Stickers',
      'panel.close': 'Close',
      'panel.refresh': 'Refresh',
      'panel.addSticker': 'Add sticker',
      'panel.newPack': 'New pack',
      'panel.newPackHint': 'Name this sticker pack',
      'panel.createPack': 'Create',
      'panel.cancel': 'Cancel',
      'panel.empty': 'This pack is empty. Tap “Add sticker” to collect one.',
      'panel.noPacks': 'No pack yet. Create one first.',
      'panel.loading': 'Loading…',
      'panel.sendHint': 'Tap a sticker to send; use the pencil to edit its meaning',
      'panel.count': '{count} stickers',
      'panel.defaultBadge': 'default',
      'panel.uploading': 'Uploading…',
      'editor.title': 'Edit sticker',
      'editor.name': 'Name',
      'editor.namePlaceholder': 'e.g. Confused',
      'editor.meaning': 'Meaning (for the model)',
      'editor.meaningPlaceholder': 'e.g. puzzled, asking for an explanation',
      'editor.tags': 'Tags (comma separated)',
      'editor.tagsPlaceholder': 'confused, question',
      'editor.pack': 'Pack',
      'editor.save': 'Save',
      'editor.cancel': 'Cancel',
      'editor.delete': 'Delete',
      'editor.deleteConfirm': 'Delete this sticker?',
      'add.added': 'Added. Fill in its meaning so the model understands it.',
      'send.sent': 'Sent “{name}”',
      'send.sending': 'Sending…',
      'tool.pending': 'Sending a sticker…',
      'tool.alt': 'Sticker',
      'error.prefix': 'Error',
    }

    let translate = (key) => ZH[key] ?? key

    function t(key, params) {
      let text
      try {
        text = translate(key)
      } catch {
        text = ZH[key]
      }
      if (typeof text !== 'string' || text.length === 0) text = ZH[key] ?? key
      if (params === undefined) return text
      return text.replace(/\{(\w+)\}/g, (_match, name) => String(params[name] ?? ''))
    }

    function createStore(initial) {
      let state = initial
      const listeners = new Set()
      return {
        get: () => state,
        set(patch) {
          const next = typeof patch === 'function' ? patch(state) : patch
          state = Object.assign({}, state, next)
          for (const listener of [...listeners]) listener()
        },
        subscribe(listener) {
          listeners.add(listener)
          return () => listeners.delete(listener)
        },
      }
    }

    const ui = createStore({
      open: false,
      catalog: null,
      loading: false,
      error: null,
      notice: null,
      sendingId: null,
      sentId: null,
      editor: null,
      packId: null,
      uploadBusy: false,
      packForm: false,
    })

    let catalogRequest = null
    let sentTimer = null

    function useUi() {
      return React.useSyncExternalStore(ui.subscribe, ui.get, ui.get)
    }

    async function requestJson(url, options) {
      const response = await fetch(url, options)
      let payload = null
      try {
        payload = await response.json()
      } catch {
        payload = null
      }
      if (!response.ok) {
        const message =
          payload !== null && payload.error !== undefined && typeof payload.error.message === 'string'
            ? payload.error.message
            : `HTTP ${response.status}`
        const error = new Error(message)
        error.status = response.status
        throw error
      }
      return payload
    }

    function loadCatalog(force) {
      if (!force && ui.get().catalog !== null) return Promise.resolve(ui.get().catalog)
      if (catalogRequest !== null) return catalogRequest
      ui.set({ loading: true })
      catalogRequest = requestJson('/api/memes/catalog')
        .then((catalog) => {
          const before = ui.get()
          const packs = Array.isArray(catalog.packs) ? catalog.packs : []
          const packId =
            before.packId !== null && packs.some((pack) => pack.id === before.packId)
              ? before.packId
              : packs.length > 0
                ? packs[0].id
                : null
          ui.set({ catalog, loading: false, packId, error: null })
          return catalog
        })
        .catch((error) => {
          ui.set({ loading: false, error: `${t('error.prefix')}：${error.message}` })
          throw error
        })
        .finally(() => {
          catalogRequest = null
        })
      return catalogRequest
    }

    function togglePanel() {
      const open = !ui.get().open
      ui.set({ open, error: null, notice: null })
      if (open) void loadCatalog(false).catch(() => undefined)
    }

    function selectPack(packId) {
      ui.set({ packId })
    }

    function readImageSize(file) {
      if (typeof createImageBitmap !== 'function') return Promise.resolve(undefined)
      return createImageBitmap(file)
        .then((bitmap) => {
          const size = { width: bitmap.width, height: bitmap.height }
          if (typeof bitmap.close === 'function') bitmap.close()
          return size
        })
        .catch(() => undefined)
    }

    function nameFromFile(fileName) {
      const base = String(fileName ?? '').replace(/\.[^.]+$/, '').trim()
      return base.length > 0 ? base.slice(0, 40) : '未命名表情'
    }

    async function uploadFiles(files, packId) {
      if (packId === null) {
        ui.set({ error: `${t('error.prefix')}：先建一个表情包` })
        return
      }
      const selected = [...files]
      if (selected.length === 0) return
      ui.set({ uploadBusy: true, error: null, notice: null })
      let last = null
      for (const file of selected) {
        if (!MEDIA_TYPES.includes(file.type)) {
          ui.set({ error: `${file.name}：只支持 PNG / JPEG / WebP / GIF` })
          continue
        }
        try {
          const size = await readImageSize(file)
          const headers = {
            'content-type': file.type,
            'x-meme-name': encodeURIComponent(nameFromFile(file.name)),
            'x-meme-meaning': '',
            'x-meme-width': String(size?.width ?? 0),
            'x-meme-height': String(size?.height ?? 0),
          }
          last = await requestJson(`/api/memes/stickers?packId=${encodeURIComponent(packId)}`, {
            method: 'POST',
            headers,
            body: file,
          })
        } catch (error) {
          ui.set({ error: `${file.name}：${error.message}` })
        }
      }
      try {
        await loadCatalog(true)
      } catch {
        // loadCatalog already surfaced the failure
      }
      if (last !== null) {
        const catalog = ui.get().catalog
        const sticker =
          catalog !== null
            ? catalog.packs.flatMap((pack) => pack.stickers).find((item) => item.id === last.id)
            : undefined
        ui.set({
          uploadBusy: false,
          notice: t('add.added'),
          editor: sticker !== undefined ? { ...sticker, packId } : null,
        })
      } else {
        ui.set({ uploadBusy: false })
      }
    }

    function pickFiles(packId) {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = MEDIA_TYPES.join(',')
      input.multiple = true
      input.style.display = 'none'
      document.body.appendChild(input)
      input.onchange = () => {
        const files = [...(input.files ?? [])]
        input.remove()
        if (files.length > 0) void uploadFiles(files, packId)
      }
      input.click()
    }

    async function createPack(name) {
      const trimmed = String(name ?? '').trim()
      if (trimmed.length === 0) return
      try {
        const pack = await requestJson('/api/memes/packs', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name: trimmed }),
        })
        await loadCatalog(true)
        ui.set({ packId: pack.id, packForm: false, error: null, notice: `已创建「${pack.name}」` })
      } catch (error) {
        ui.set({ error: `${t('error.prefix')}：${error.message}` })
      }
    }

    async function saveSticker(stickerId, patch) {
      try {
        await requestJson(`/api/memes/stickers/${encodeURIComponent(stickerId)}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(patch),
        })
        await loadCatalog(true)
        ui.set({ editor: null, error: null, notice: '已保存' })
      } catch (error) {
        ui.set({ error: `${t('error.prefix')}：${error.message}` })
      }
    }

    async function removeSticker(stickerId) {
      try {
        await requestJson(`/api/memes/stickers/${encodeURIComponent(stickerId)}`, { method: 'DELETE' })
        await loadCatalog(true)
        ui.set({ editor: null, error: null, notice: '已删除' })
      } catch (error) {
        ui.set({ error: `${t('error.prefix')}：${error.message}` })
      }
    }

    async function sendSticker(sessionId, sticker) {
      if (typeof sessionId !== 'string' || sessionId.length === 0) return
      if (ui.get().sendingId !== null) return
      ui.set({ sendingId: sticker.id, error: null, notice: null })
      try {
        await requestJson('/api/memes/send', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ sessionId, stickerId: sticker.id }),
        })
        ui.set({ sendingId: null, sentId: sticker.id, notice: t('send.sent', { name: sticker.name }) })
        if (sentTimer !== null) clearTimeout(sentTimer)
        sentTimer = window.setTimeout(() => {
          sentTimer = null
          ui.set((state) => (state.sentId === sticker.id ? { sentId: null } : {}))
        }, 1500)
      } catch (error) {
        ui.set({ sendingId: null, error: `${t('error.prefix')}：${error.message}` })
      }
    }

    function StickerIcon() {
      return h(
        'svg',
        {
          viewBox: '0 0 16 16',
          width: 16,
          height: 16,
          'aria-hidden': true,
          className: 'dsm-btn-icon',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.35,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        },
        h('path', { d: 'M2.5 4.2c0-1 .8-1.8 1.8-1.8h7.4c1 0 1.8.8 1.8 1.8v4.3c0 1-.8 1.8-1.8 1.8H8.3L5 13.2v-2.9H4.3c-1 0-1.8-.8-1.8-1.8z' }),
        h('circle', { cx: 6, cy: 6.1, r: 0.85, fill: 'currentColor', stroke: 'none' }),
        h('circle', { cx: 10, cy: 6.1, r: 0.85, fill: 'currentColor', stroke: 'none' }),
        h('path', { d: 'M5.8 8.2c.5.9 1.3 1.3 2.2 1.3s1.7-.4 2.2-1.3' }),
        h('path', { d: 'M12.4 2.1l.5 1.1 1.1.5-1.1.5-.5 1.1-.5-1.1-1.1-.5 1.1-.5z', fill: 'currentColor', stroke: 'none' }),
      )
    }

    function StickerButton(props) {
      const state = useUi()
      const enabled = typeof props.sessionId === 'string' && props.sessionId.length > 0
      return h(
        'button',
        {
          type: 'button',
          className: `dsm-btn${state.open ? ' dsm-btn-active' : ''}`,
          title: t('button.hint'),
          'aria-label': t('button.label'),
          'aria-expanded': state.open,
          disabled: !enabled,
          onClick: togglePanel,
        },
        h(StickerIcon),
      )
    }

    function ErrorBar({ message }) {
      if (typeof message !== 'string' || message.length === 0) return null
      return h('div', { className: 'dsm-bar dsm-bar-error', role: 'alert' }, message)
    }

    function NoticeBar({ message }) {
      if (typeof message !== 'string' || message.length === 0) return null
      return h('div', { className: 'dsm-bar dsm-bar-notice', role: 'status' }, message)
    }

    function PackForm({ onCancel }) {
      const [name, setName] = React.useState('')
      return h(
        'form',
        {
          className: 'dsm-pack-form',
          onSubmit: (event) => {
            event.preventDefault()
            void createPack(name)
          },
        },
        h('input', {
          className: 'dsm-input',
          value: name,
          maxLength: 40,
          placeholder: t('panel.newPackHint'),
          autoFocus: true,
          onChange: (event) => setName(event.target.value),
        }),
        h('button', { className: 'dsm-primary', type: 'submit' }, t('panel.createPack')),
        h('button', { className: 'dsm-ghost', type: 'button', onClick: onCancel }, t('panel.cancel')),
      )
    }

    function Editor({ draft, packs, onClose }) {
      const [name, setName] = React.useState(draft.name ?? '')
      const [meaning, setMeaning] = React.useState(draft.meaning ?? '')
      const [tags, setTags] = React.useState((draft.tags ?? []).join(', '))
      const [packId, setPackId] = React.useState(draft.packId ?? (packs[0]?.id ?? ''))
      const [busy, setBusy] = React.useState(false)
      return h(
        'div',
        { className: 'dsm-editor', role: 'dialog', 'aria-label': t('editor.title') },
        h(
          'div',
          { className: 'dsm-editor-card' },
          h(
            'div',
            { className: 'dsm-editor-head' },
            h('span', { className: 'dsm-editor-title' }, t('editor.title')),
            h(
              'button',
              { type: 'button', className: 'dsm-icon-btn', 'aria-label': t('panel.close'), onClick: onClose },
              '×',
            ),
          ),
          h('label', { className: 'dsm-field' },
            h('span', { className: 'dsm-label' }, t('editor.name')),
            h('input', {
              className: 'dsm-input',
              value: name,
              maxLength: 40,
              placeholder: t('editor.namePlaceholder'),
              onChange: (event) => setName(event.target.value),
            }),
          ),
          h('label', { className: 'dsm-field' },
            h('span', { className: 'dsm-label' }, t('editor.meaning')),
            h('textarea', {
              className: 'dsm-input dsm-textarea',
              value: meaning,
              maxLength: 200,
              rows: 3,
              placeholder: t('editor.meaningPlaceholder'),
              onChange: (event) => setMeaning(event.target.value),
            }),
          ),
          h('label', { className: 'dsm-field' },
            h('span', { className: 'dsm-label' }, t('editor.tags')),
            h('input', {
              className: 'dsm-input',
              value: tags,
              placeholder: t('editor.tagsPlaceholder'),
              onChange: (event) => setTags(event.target.value),
            }),
          ),
          h('label', { className: 'dsm-field' },
            h('span', { className: 'dsm-label' }, t('editor.pack')),
            h(
              'select',
              {
                className: 'dsm-input',
                value: packId,
                onChange: (event) => setPackId(event.target.value),
              },
              packs.map((pack) => h('option', { key: pack.id, value: pack.id }, pack.name)),
            ),
          ),
          h(
            'div',
            { className: 'dsm-editor-actions' },
            h(
              'button',
              {
                type: 'button',
                className: 'dsm-danger',
                disabled: busy,
                onClick: () => {
                  if (!window.confirm(t('editor.deleteConfirm'))) return
                  setBusy(true)
                  void removeSticker(draft.id).finally(() => setBusy(false))
                },
              },
              t('editor.delete'),
            ),
            h('span', { className: 'dsm-spacer' }),
            h('button', { type: 'button', className: 'dsm-ghost', onClick: onClose }, t('editor.cancel')),
            h(
              'button',
              {
                type: 'button',
                className: 'dsm-primary',
                disabled: busy,
                onClick: () => {
                  setBusy(true)
                  const nextTags = tags.split(',').map((tag) => tag.trim()).filter((tag) => tag.length > 0)
                  void saveSticker(draft.id, { name, meaning, tags: nextTags, packId }).finally(() => setBusy(false))
                },
              },
              t('editor.save'),
            ),
          ),
        ),
      )
    }

    function StickerPanel(props) {
      const state = useUi()
      const sessionId = typeof props.sessionId === 'string' ? props.sessionId : ''

      React.useEffect(() => {
        if (!state.open) return undefined
        void loadCatalog(false).catch(() => undefined)
        const onKeyDown = (event) => {
          if (event.key === 'Escape') {
            if (ui.get().editor !== null) ui.set({ editor: null })
            else ui.set({ open: false })
          }
        }
        document.addEventListener('keydown', onKeyDown)
        return () => {
          document.removeEventListener('keydown', onKeyDown)
          if (sentTimer !== null) {
            clearTimeout(sentTimer)
            sentTimer = null
          }
        }
      }, [state.open])

      if (!state.open || sessionId.length === 0) return null

      const catalog = state.catalog
      const packs = catalog !== null ? catalog.packs : []
      const pack = packs.find((item) => item.id === state.packId) ?? packs[0] ?? null
      const stickers = pack !== null ? pack.stickers : []
      const uploading = state.uploadBusy

      const grid = []
      for (const sticker of stickers) {
        const sending = state.sendingId === sticker.id
        const sent = state.sentId === sticker.id
        grid.push(
          h(
            'div',
            { className: `dsm-cell${sending ? ' dsm-cell-busy' : ''}${sent ? ' dsm-cell-sent' : ''}`, key: sticker.id },
            h(
              'button',
              {
                type: 'button',
                className: 'dsm-sticker',
                title: `${sticker.name}：${sticker.meaning || '（未填写含义）'}`,
                'aria-label': `${sticker.name}：${sticker.meaning || ''}`,
                disabled: state.sendingId !== null,
                onClick: () => void sendSticker(sessionId, sticker),
              },
              h('img', { src: sticker.url, alt: sticker.name, loading: 'lazy', draggable: false }),
              sending ? h('span', { className: 'dsm-sticker-status' }, '…') : null,
              sent ? h('span', { className: 'dsm-sticker-status dsm-sticker-ok' }, '✓') : null,
            ),
            h(
              'button',
              {
                type: 'button',
                className: 'dsm-edit',
                title: t('editor.title'),
                'aria-label': `${t('editor.title')} ${sticker.name}`,
                onClick: () => ui.set({ editor: { ...sticker, packId: pack.id } }),
              },
              '✎',
            ),
          ),
        )
      }

      if (pack !== null) {
        grid.push(
          h(
            'button',
            {
              type: 'button',
              className: 'dsm-cell dsm-add-cell',
              key: 'add',
              disabled: uploading,
              onClick: () => pickFiles(pack.id),
            },
            h('span', { className: 'dsm-add-plus' }, uploading ? '…' : '＋'),
            h('span', { className: 'dsm-add-label' }, uploading ? t('panel.uploading') : t('panel.addSticker')),
          ),
        )
      }

      return h(
        'div',
        { className: 'dsm-panel' },
        h(
          'div',
          { className: 'dsm-head' },
          h('span', { className: 'dsm-title' }, `🐳 ${t('panel.title')}`),
          h(
            'div',
            { className: 'dsm-tabs', role: 'tablist' },
            packs.map((item) =>
              h(
                'button',
                {
                  type: 'button',
                  role: 'tab',
                  key: item.id,
                  className: `dsm-tab${pack !== null && item.id === pack.id ? ' dsm-tab-active' : ''}`,
                  'aria-selected': pack !== null && item.id === pack.id,
                  onClick: () => selectPack(item.id),
                  title: item.description || item.name,
                },
                item.name,
                item.bundled ? h('span', { className: 'dsm-badge' }, t('panel.defaultBadge')) : null,
              ),
            ),
            h(
              'button',
              {
                type: 'button',
                className: 'dsm-tab dsm-tab-add',
                title: t('panel.newPack'),
                'aria-label': t('panel.newPack'),
                onClick: () => ui.set({ packForm: true }),
              },
              '＋',
            ),
          ),
          h(
            'div',
            { className: 'dsm-head-actions' },
            h(
              'button',
              {
                type: 'button',
                className: 'dsm-icon-btn',
                title: t('panel.refresh'),
                'aria-label': t('panel.refresh'),
                onClick: () => void loadCatalog(true).catch(() => undefined),
              },
              '↻',
            ),
            h(
              'button',
              {
                type: 'button',
                className: 'dsm-icon-btn',
                title: t('panel.close'),
                'aria-label': t('panel.close'),
                onClick: () => ui.set({ open: false }),
              },
              '×',
            ),
          ),
        ),
        state.packForm ? h(PackForm, { onCancel: () => ui.set({ packForm: false }) }) : null,
        h(ErrorBar, { message: state.error }),
        h(NoticeBar, { message: state.notice }),
        state.loading && catalog === null
          ? h('div', { className: 'dsm-placeholder' }, t('panel.loading'))
          : null,
        catalog !== null && packs.length === 0
          ? h(
              'div',
              { className: 'dsm-placeholder' },
              h('span', null, t('panel.noPacks')),
              h(
                'button',
                { type: 'button', className: 'dsm-primary', onClick: () => ui.set({ packForm: true }) },
                t('panel.newPack'),
              ),
            )
          : null,
        catalog !== null && pack !== null && stickers.length === 0
          ? h('div', { className: 'dsm-placeholder' }, t('panel.empty'))
          : null,
        grid.length > 0 ? h('div', { className: 'dsm-grid' }, grid) : null,
        h(
          'div',
          { className: 'dsm-foot' },
          h('span', null, pack !== null ? `${pack.name} · ${t('panel.count', { count: stickers.length })}` : ''),
          h('span', { className: 'dsm-hint' }, t('panel.sendHint')),
        ),
        state.editor !== null
          ? h(Editor, {
              draft: state.editor,
              packs,
              onClose: () => ui.set({ editor: null }),
            })
          : null,
      )
    }

    function StickerToolView(props) {
      const block = props.block
      const phase = props.phase
      const image =
        phase === 'result' && block !== undefined && Array.isArray(block.content)
          ? block.content.find((item) => item !== null && typeof item === 'object' && item.type === 'image' && item.attachment !== undefined)
          : undefined
      const text =
        phase === 'result' && block !== undefined && Array.isArray(block.content)
          ? block.content
              .filter((item) => item !== null && typeof item === 'object' && item.type === 'text')
              .map((item) => item.text)
              .join('\n')
          : ''
      const [url, setUrl] = React.useState(null)
      const attachmentId = image !== undefined && image.attachment !== undefined ? image.attachment.attachmentId : ''

      React.useEffect(() => {
        if (attachmentId.length === 0 || typeof props.loadImage !== 'function') return undefined
        let cancelled = false
        Promise.resolve(props.loadImage(image.attachment))
          .then((resolved) => {
            if (!cancelled) setUrl(resolved)
          })
          .catch(() => undefined)
        return () => {
          cancelled = true
        }
      }, [attachmentId])

      if (phase !== 'result' || image === undefined) {
        return h('div', { className: 'dsm-tool dsm-tool-pending' }, t('tool.pending'))
      }
      return h(
        'div',
        { className: 'dsm-tool' },
        text.length > 0 ? h('div', { className: 'dsm-tool-text' }, text) : null,
        url !== null
          ? h('img', { className: 'dsm-tool-img', src: url, alt: t('tool.alt'), draggable: false })
          : h('div', { className: 'dsm-tool-loading' }, t('panel.loading')),
      )
    }

    const CSS = `
.dsm-btn{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;padding:0;border:1px solid transparent;border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;line-height:0;transition:background .12s ease,color .12s ease,border-color .12s ease}
.dsm-btn:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.dsm-btn:disabled{opacity:.4;cursor:default}
.dsm-btn-active{color:var(--dsw-alias-brand-primary);background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-border-l1)}
.dsm-btn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.dsm-btn-icon{display:block;pointer-events:none}
.dsm-panel{position:relative;box-sizing:border-box;width:100%;max-width:820px;margin:0 auto 8px;padding:10px 12px 8px;border:1px solid var(--dsw-alias-border-l1);border-radius:14px;background:var(--dsw-alias-bg-layer-1);box-shadow:0 10px 30px rgba(0,0,0,.12);color:var(--dsw-alias-label-primary);font-size:13px}
.dsm-head{display:flex;align-items:center;gap:10px;min-height:28px}
.dsm-title{font-weight:600;white-space:nowrap;color:var(--dsw-alias-label-primary)}
.dsm-tabs{display:flex;align-items:center;gap:4px;overflow-x:auto;flex:1;min-width:0;scrollbar-width:thin}
.dsm-tab{flex:none;display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border:1px solid transparent;border-radius:999px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;font-size:12px;white-space:nowrap}
.dsm-tab:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.dsm-tab-active{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-border-l1);font-weight:600}
.dsm-tab-add{padding:3px 8px;font-size:14px}
.dsm-badge{margin-left:2px;padding:0 5px;border-radius:999px;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary);font-size:10px;font-weight:400}
.dsm-head-actions{display:flex;align-items:center;gap:2px;flex:none}
.dsm-icon-btn{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;padding:0;border:none;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;font-size:16px;line-height:1}
.dsm-icon-btn:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.dsm-bar{margin-top:8px;padding:6px 9px;border-radius:8px;font-size:12px;line-height:1.5;word-break:break-word}
.dsm-bar-error{color:var(--dsw-alias-state-error-primary);background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-state-error-primary)}
.dsm-bar-notice{color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2)}
.dsm-pack-form{display:flex;align-items:center;gap:6px;margin-top:8px}
.dsm-input{box-sizing:border-box;min-width:0;padding:6px 9px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-size:12px;line-height:1.4;font-family:inherit}
.dsm-input:focus{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-1px}
.dsm-pack-form .dsm-input{flex:1}
.dsm-textarea{resize:vertical;min-height:56px}
.dsm-primary{padding:5px 12px;border:1px solid var(--dsw-alias-brand-primary);border-radius:8px;background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-bg-base);font-size:12px;font-weight:600;cursor:pointer}
.dsm-primary:disabled{opacity:.5;cursor:default}
.dsm-ghost{padding:5px 12px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary);font-size:12px;cursor:pointer}
.dsm-ghost:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2)}
.dsm-danger{padding:5px 12px;border:1px solid var(--dsw-alias-state-error-primary);border-radius:8px;background:transparent;color:var(--dsw-alias-state-error-primary);font-size:12px;cursor:pointer}
.dsm-placeholder{display:flex;align-items:center;gap:10px;justify-content:center;padding:18px 8px;color:var(--dsw-alias-label-secondary);font-size:12px;text-align:center}
.dsm-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(64px,1fr));gap:8px;margin-top:10px;max-height:272px;overflow-y:auto;padding:2px}
.dsm-cell{position:relative;min-width:0}
.dsm-sticker{display:flex;align-items:center;justify-content:center;width:100%;aspect-ratio:1;padding:5px;border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-layer-2);cursor:pointer;overflow:hidden;transition:transform .1s ease,border-color .12s ease}
.dsm-sticker:hover{border-color:var(--dsw-alias-brand-primary);transform:translateY(-1px)}
.dsm-sticker:disabled{cursor:default;opacity:.75}
.dsm-sticker img{display:block;width:100%;height:100%;object-fit:contain;pointer-events:none}
.dsm-cell-busy .dsm-sticker{opacity:.7}
.dsm-cell-sent .dsm-sticker{border-color:var(--dsw-alias-state-success-primary)}
.dsm-sticker-status{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;color:var(--dsw-alias-label-primary);pointer-events:none}
.dsm-sticker-ok{color:var(--dsw-alias-state-success-primary)}
.dsm-edit{position:absolute;top:3px;right:3px;width:18px;height:18px;padding:0;border:1px solid var(--dsw-alias-border-l1);border-radius:6px;background:var(--dsw-alias-bg-overlay);color:var(--dsw-alias-label-secondary);font-size:10px;line-height:1;cursor:pointer;opacity:0;transition:opacity .12s ease}
.dsm-cell:hover .dsm-edit,.dsm-edit:focus-visible{opacity:1}
.dsm-edit:hover{color:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary)}
.dsm-add-cell{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;aspect-ratio:1;border:1px dashed var(--dsw-alias-border-l2);border-radius:12px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer}
.dsm-add-cell:hover{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary)}
.dsm-add-cell:disabled{opacity:.5;cursor:default}
.dsm-add-plus{font-size:20px;line-height:1}
.dsm-add-label{font-size:10px;line-height:1.2;text-align:center;padding:0 4px}
.dsm-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:8px;color:var(--dsw-alias-label-secondary);font-size:11px;line-height:1.4}
.dsm-hint{opacity:.8;text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dsm-editor{position:absolute;inset:0;z-index:5;display:flex;align-items:center;justify-content:center;padding:10px;border-radius:inherit;background:var(--dsw-alias-bg-overlay)}
.dsm-editor-card{box-sizing:border-box;width:min(460px,100%);max-height:100%;overflow:auto;padding:12px;border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-layer-1);box-shadow:0 12px 32px rgba(0,0,0,.18)}
.dsm-editor-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
.dsm-editor-title{font-weight:600}
.dsm-field{display:flex;flex-direction:column;gap:3px;margin-top:8px}
.dsm-label{color:var(--dsw-alias-label-secondary);font-size:11px}
.dsm-editor-actions{display:flex;align-items:center;gap:6px;margin-top:12px}
.dsm-spacer{flex:1}
.dsm-tool{display:flex;flex-direction:column;gap:5px;align-items:flex-start;padding:2px 0}
.dsm-tool-pending{color:var(--dsw-alias-label-secondary);font-size:12px}
.dsm-tool-text{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:1.45}
.dsm-tool-img{display:block;max-width:180px;max-height:180px;border-radius:12px;object-fit:contain;background:transparent}
.dsm-tool-loading{color:var(--dsw-alias-label-secondary);font-size:12px}
@media (max-width:520px){.dsm-hint{display:none}.dsm-panel{max-width:100%}}
`

    function installLocale(ctx) {
      const locale = ctx.get('locale')
      if (locale === undefined) return
      try {
        ctx.effect(() => {
          let zhDispose
          let enDispose
          try {
            zhDispose = locale.register(NS, 'zh', ZH)
            enDispose = locale.register(NS, 'en', EN)
          } catch (error) {
            console.error('[deepseek-meme] locale registration failed', error)
            if (typeof zhDispose === 'function') zhDispose()
            if (typeof enDispose === 'function') enDispose()
            return () => undefined
          }
          return () => {
            try {
              if (typeof enDispose === 'function') enDispose()
            } catch { /* ignore */ }
            try {
              if (typeof zhDispose === 'function') zhDispose()
            } catch { /* ignore */ }
          }
        }, 'deepseek-meme-locale')
        const bound = locale.bind(NS)
        translate = (key) => {
          const value = bound(key)
          return typeof value === 'string' && value.length > 0 && value !== key ? value : (ZH[key] ?? key)
        }
      } catch (error) {
        console.error('[deepseek-meme] locale bind failed', error)
      }
    }

    function installStyles(ctx) {
      ctx.effect(() => {
        const style = document.createElement('style')
        style.dataset.plugin = 'deepseek-meme'
        style.dataset.pluginCss = 'deepseek-meme/style.css'
        style.textContent = CSS
        document.head.appendChild(style)
        return () => style.remove()
      }, 'deepseek-meme-styles')
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        installStyles(ctx)
        installLocale(ctx)

        ctx.slots.inject('conversation.input.right', () =>
          ctx.slots.register(
            {
              name: 'conversation.input.right',
              id: 'deepseek-meme-button',
              order: 40,
              label: () => t('button.label'),
            },
            StickerButton,
          ),
        )

        ctx.slots.inject('conversation.input.dock', () =>
          ctx.slots.register(
            {
              name: 'conversation.input.dock',
              id: 'deepseek-meme-panel',
              order: 10,
            },
            StickerPanel,
          ),
        )

        ctx.slots.inject('tool.call.toolview', () =>
          ctx.slots.register(
            {
              name: 'tool.call.toolview',
              key: 'send_sticker',
            },
            StickerToolView,
          ),
        )
      },
    }
  },
})
