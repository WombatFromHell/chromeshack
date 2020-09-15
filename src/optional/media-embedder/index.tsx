import React, { useEffect, useState } from "react";
import { render } from "react-dom";

import { processPostEvent, processPostRefreshEvent } from "../../core/events";
import { arrHas, locatePostRefs, arrEmpty } from "../../core/common";
import { enabledContains } from "../../core/settings";
import { detectMediaLink } from "../../core/api";

import { Expando } from "./Expando";

const MediaEmbedderWrapper = (props: { links: HTMLAnchorElement[]; item: HTMLElement }) => {
    const { links, item } = props || {};
    const [children, setChildren] = useState(null);
    useEffect(() => {
        const mediaLinkReplacer = async () => {
            if (!item) return;
            /// replace each link with its mounted version
            const taggedLinks = item.querySelectorAll(`a[id^='tagged_']`);
            for (const link of taggedLinks || []) {
                const _this = link as HTMLAnchorElement;
                const postid = _this.dataset.postid;
                const idx = _this.dataset.idx;
                const matched = item.querySelector(`div#expando_${postid}-${idx}`);
                // avoid clobbering NWS links (part deux)
                const isNWS = _this.closest(".fullpost.fpmod_nws");
                const NWS_enabled = await enabledContains("nws_incognito");
                if ((matched && isNWS && !NWS_enabled) || (matched && !isNWS)) link.replaceWith(matched);
            }
        };
        if (children) mediaLinkReplacer();
    }, [item, children]);
    useEffect(() => {
        const resolveChildren = async () => {
            // tag all matching links and embed an Expando toggle for each one
            const detected = arrHas(links)
                ? await links.reduce(async (acc, l, i) => {
                      const detected = await detectMediaLink(l.href);
                      const { postid } = locatePostRefs(l);
                      const _acc = await acc;
                      if (detected) {
                          // tag the detected link in the DOM so we can replace it later
                          l.setAttribute("id", `tagged_${postid}-${i}`);
                          l.setAttribute("data-postid", postid);
                          l.setAttribute("data-idx", i.toString());
                          _acc.push(<Expando key={i} response={detected} postid={postid} idx={i.toString()} />);
                      }
                      return _acc;
                  }, Promise.resolve([] as React.ReactChild[]))
                : null;
            if (detected) setChildren(detected);
        };
        resolveChildren();
    }, [links]);
    return <>{children}</>;
};

export const MediaEmbedder = {
    install() {
        processPostEvent.addHandler(MediaEmbedder.processPost);
        processPostRefreshEvent.addHandler(MediaEmbedder.processPost);
    },

    processPost(item: HTMLElement) {
        // render inside a hidden container in each fullpost
        const postbody = item?.querySelector(".sel > .fullpost > .postbody");
        const links = [...postbody?.querySelectorAll("a")] as HTMLAnchorElement[];
        const embedded = [...postbody?.querySelectorAll("div.medialink")] as HTMLElement[];

        (async () => {
            if (arrHas(links) && arrEmpty(embedded)) {
                if (!postbody?.querySelector("#react-media-manager")) {
                    const container = document.createElement("div");
                    container.setAttribute("id", "react-media-manager");
                    //container.setAttribute("class", "hidden");
                    postbody.appendChild(container);
                }
                const mount = postbody?.querySelector("#react-media-manager");
                if (mount) render(<MediaEmbedderWrapper links={links} item={item} />, mount);
            }
        })();
    },
};
