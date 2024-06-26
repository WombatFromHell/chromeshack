import { EmojiPoster } from "../builtin/emoji_poster";
import { parseToElement } from "../core/common/dom";
import { processPostBoxEvent } from "../core/events";
import { getEnabledBuiltin } from "../core/settings";

export const PostLengthCounter = {
  MAX_POST_BYTES: 105,
  updateTimer: null as ReturnType<typeof setTimeout> | null,
  cachedEl: null as HTMLElement | null,

  async install() {
    const isEnabled = await getEnabledBuiltin("post_length_counter");
    if (!isEnabled) return;

    processPostBoxEvent.addHandler(PostLengthCounter.apply);
    PostLengthCounter.cacheInjectables();
  },

  cacheInjectables() {
    const el = parseToElement(`<div id="post_length_counter_text" />`);
    PostLengthCounter.cachedEl = el as HTMLElement;
  },

  apply(args: PostboxEventArgs) {
    const { postbox } = args || {};
    const position = postbox?.querySelector("div.csubmit");
    if (postbox?.querySelector("#post_length_counter_text") || !position) return;
    const child = PostLengthCounter.cachedEl;
    if (child) position.parentNode?.insertBefore(child, position);
    PostLengthCounter.update(postbox);
    const updater = () => PostLengthCounter.update(postbox);
    postbox.querySelector("textarea#frm_body")?.addEventListener("keyup", () => {
      if (PostLengthCounter.updateTimer) clearTimeout(PostLengthCounter.updateTimer);
      PostLengthCounter.updateTimer = setTimeout(updater, 250);
    });
  },

  update(postbox: HTMLElement) {
    const counter = postbox?.querySelector("#post_length_counter_text") as HTMLElement;
    const textarea = postbox?.querySelector("textarea#frm_body") as HTMLInputElement;
    const rawPostText = textarea?.value;
    const encodedText = rawPostText && EmojiPoster.handleEncoding(rawPostText);
    const textCount: number = encodedText ? EmojiPoster.countText(encodedText) : 0;
    const astralCount: number = encodedText ? EmojiPoster.countAstrals(encodedText).astralsCount : 0;
    const charCount: number = astralCount ? textCount + astralCount : textCount;
    if (counter)
      counter.textContent =
        charCount > PostLengthCounter.MAX_POST_BYTES
          ? "The post preview will be truncated."
          : `Characters remaining in post preview: ${PostLengthCounter.MAX_POST_BYTES - charCount}`;
  },
};
