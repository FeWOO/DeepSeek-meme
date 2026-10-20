/**
 * DeepSeek Meme — Host half (project scaffold).
 *
 * Responsibilities planned for this half:
 *  - own the on-disk sticker library (packs, sticker files, catalog metadata);
 *  - serve the Client half over authenticated-origin HTTP routes under `/api/memes`;
 *  - append a user sticker message to a live Session when the user clicks one;
 *  - register the model-facing `send_sticker` tool so the assistant can send stickers;
 *  - inject a compact usage section into the system prompt.
 *
 * The implementation lands incrementally; see docs/ARCHITECTURE.md.
 */

export const name = 'dsh-deepseek-meme'

/** Services required by the finished Host half. */
export const inject = ['tools', 'webServer', 'systemPrompt']

/**
 * @param {import('@deepseek-ai/cordis').Context} ctx
 * @param {{ dataDir?: string, maxStickerBytes?: number, maxStickersPerPack?: number }} config
 */
export function apply(ctx, config = {}) {
  // Keep one fiber-owned effect so every future route/tool/prompt registration
  // is disposed with the plugin row.
  ctx.effect(() => {
    // TODO(host): sticker store, HTTP routes, send_sticker tool, prompt section.
    return () => {}
  }, 'deepseek-meme')
}
