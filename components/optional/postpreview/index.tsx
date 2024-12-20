import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { parseToElement } from "../../core/common/dom";
import { processPostBoxEvent } from "../../core/events";
import { enabledContains } from "../../core/settings";
import { PostPreviewApp } from "./PostPreviewApp";

const PostPreview = {
  cachedPaneEl: null as HTMLElement | null,
  cachedAppEl: null as HTMLElement | null,

  install() {
    processPostBoxEvent.addHandler(PostPreview.apply);
    PostPreview.cacheInjectables();
  },

  cacheInjectables() {
    const paneContainer = parseToElement(`<div id="post__preview__pane" />`) as HTMLElement;
    const appContainer = parseToElement(`<div id="post__preview__app" />`) as HTMLElement;
    PostPreview.cachedPaneEl = paneContainer;
    PostPreview.cachedAppEl = appContainer;
  },

  async apply(args: PostboxEventArgs) {
    const { postbox } = args || {};
    const is_enabled = await enabledContains(["post_preview"]);
    if (!is_enabled || !postbox) return;

    const positionElem = postbox.querySelector("div.csubmit");
    const container = postbox.querySelector("#post__preview__app");
    const altPositionElem = postbox?.querySelector("#frm_body");
    if (!container && positionElem) {
      const clonedAppEl = PostPreview.cachedAppEl?.cloneNode(false) as HTMLElement;
      const clonedPaneEl = PostPreview.cachedPaneEl?.cloneNode(false) as HTMLElement;

      const root = createRoot(clonedAppEl!);
      altPositionElem?.parentNode?.insertBefore(clonedPaneEl, altPositionElem);
      positionElem.append(clonedAppEl);
      root.render(
        <StrictMode>
          <PostPreviewApp postboxElem={postbox} paneMountElem={clonedPaneEl} />
        </StrictMode>,
      );
    }
  },
};

export { PostPreview };
