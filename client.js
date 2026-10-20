/**
 * DeepSeek Meme — Web Client half (project scaffold).
 *
 * Planned registrations:
 *  - conversation.input.right  : small sticker button beside the model selector
 *  - conversation.input.dock   : full-width sticker panel above the composer
 *  - tool.call.toolview / send_sticker : sticker bubble for assistant-sent stickers
 *
 * Read-only source: the module loader hands us React through the factory
 * `require`, and `ctx.slots` owns registration lifetime.
 */
window.__ModuleLoader__.load({
  id: 'dsh-deepseek-meme',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    /** Placeholder so the scaffold mounts nothing until the panel exists. */
    function ComingSoon() {
      return null
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        // TODO(client): sticker button, sticker panel, and send_sticker toolview.
        void React
        void h
        void ComingSoon
        void ctx
      },
    }
  },
})
