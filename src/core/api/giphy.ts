import type { ParsedResponse } from "./";

const parseLink = (href: string) => {
    const isGiphy = /https?:\/\/(?:.+\.)?giphy\.com\/(?:.+\/(\w+)\/|.+-(\w+))/i.exec(href);
    return isGiphy
        ? ({
              src: `https://media.giphy.com/media/${isGiphy[1] || isGiphy[2]}/giphy.mp4`,
              type: "video",
          } as ParsedResponse)
        : null;
};

export const isGiphy = (href: string) => parseLink(href);
