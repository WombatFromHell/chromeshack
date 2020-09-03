import { browser } from "webextension-polyfill-ts";
import { Dispatch } from "react";

import { arrHas, arrEmpty, isImage, isVideo, matchFileFormat, FormDataToJSON, fetchSafe, postBackground } from "../common";
import { imageFormats, videoFormats } from "../../builtin/image-uploader/uploaderStore";

import type {
    UploaderAction,
    UploadSuccessPayload,
    UploadFailurePayload,
} from "../../builtin/image-uploader/uploaderStore";
import type { UploadData } from "../../builtin/image-uploader/ImageUploaderApp";
import type { ParsedResponse } from "./";

const imgurApiImageBaseUrl = "https://api.imgur.com/3/image";
const imgurApiAlbumBaseUrl = "https://api.imgur.com/3/album";
const imgurApiUploadUrl = "https://api.imgur.com/3/upload";
const imgurClientId = "Client-ID c045579f61fc802";

interface ImgurResolution {
    imageId?: string;
    albumId?: string;
    galleryId?: string;
}

type ImgurMediaItem = {
    mp4?: string;
    link?: string;
};
interface ImgurResponse {
    data: {
        images?: ImgurMediaItem[];
        mp4?: string;
        link?: string;
    };
}

interface ImgurSource {
    src: string;
    type: "image" | "video";
}
type ImgurSources = ImgurSource[];

const parseLink = (href: string) => {
    // albumMatch[1] returns an album (data.images.length > 1)
    // albumMatch[2] can also be an image nonce (data.images.length === 1 || data.link)
    const albumMatch = /https?:\/\/(?:.+?\.)?imgur\.com\/(?:(?:album|gallery|a|g)\/(\w+)(?:#(\w+))?)/i.exec(href);
    // galleryMatch[1] matches a tagged gallery nonce (which is actually an album)
    const galleryMatch = /https?:\/\/(?:.+?\.)?imgur\.com\/(?:t\/\w+\/(\w+))/i.exec(href);
    // matches an image nonce (fallthrough from the two previous types)
    // [1] = direct match, [2] = gallery direct match, [3] = indirect match, plus the albumMatch[2] above
    const imageMatch = /https?:\/\/(?:.+?\.)?imgur\.com\/(?:i\/(\w+)|r\/\w+\/(\w+)|(\w+))$/i.exec(href);

    const albumId = albumMatch ? albumMatch[1] : null;
    const galleryId = galleryMatch ? galleryMatch[1] || galleryMatch[2] : null;
    // check if we've matched an image nonce of an album first
    const imageId = albumMatch ? albumMatch[2] : imageMatch ? imageMatch[1] || imageMatch[2] || imageMatch[3] : null;

    const result =
        albumId || galleryId || imageId
            ? ({ href, args: [imageId, albumId, galleryId], type: null, cb: getImgur } as ParsedResponse)
            : null;
    return result;
};

export const isImgur = (href: string) => parseLink(href);

// wrap fetchSafe() so we can silence transmission exceptions
const _fetch = async (url: string) =>
    // sanitized in common.js
    await fetchSafe({
        url,
        fetchOpts: { headers: { Authorization: imgurClientId } },
    }).catch((e: Error) => console.error(e));

export const doResolveImgur = async ({ imageId, albumId, galleryId }: ImgurResolution) => {
    try {
        const albumImageUrl = albumId && imageId && `${imgurApiAlbumBaseUrl}/${albumId}/image/${imageId}`;
        const albumUrl = albumId && `${imgurApiAlbumBaseUrl}/${albumId}`;
        // since a shortcode could be either an image or an album try both
        const imageUrl = imageId ? `${imgurApiImageBaseUrl}/${imageId}` : `${imgurApiImageBaseUrl}/${albumId}`;

        // try resolving as a single image album
        const _albumImage: ImgurResponse = albumImageUrl && (await _fetch(albumImageUrl));
        const resolvedAlbumImage = _albumImage ? _albumImage?.data?.mp4 || _albumImage?.data?.link : null;
        if (resolvedAlbumImage) return [resolvedAlbumImage];

        // next try resolving as a multi-image album
        const _album: ImgurResponse = albumUrl && (await _fetch(albumUrl));
        const resolvedMedia = arrHas(_album?.data?.images)
            ? _album.data.images.reduce((acc, v) => {
                  acc.push(v.mp4 || v.link);
                  return acc;
              }, [] as string[])
            : null;
        if (arrHas(resolvedMedia)) return resolvedMedia;

        // finally try resolving as a standalone image if everything else fails
        const _image: ImgurResponse = imageUrl && (await _fetch(imageUrl));
        const resolvedImage = _image ? _image?.data?.mp4 || _image?.data?.link : null;
        if (resolvedImage) return [resolvedImage];

        throw new Error(`Could not resolve Imgur using any available method: ${imageId} ${albumId} ${galleryId}`);
    } catch (e) {
        console.error(e);
        return null;
    }
};

export const getImgur = async (...args: any[]) => {
    const [imageId, albumId, galleryId] = args || [];
    const resolved = await doResolveImgur({ imageId, albumId, galleryId });
    const sources = arrHas(resolved)
        ? resolved.reduce((acc, m) => {
              const type = isImage(m) ? "image" : isVideo(m) ? "video" : null;
              acc.push({ src: m, type });
              return acc;
          }, [] as ImgurSource[])
        : [];
    return sources;
};

const doImgurUpload = async (data: UploadData, dispatch: Dispatch<UploaderAction>) => {
    try {
        dispatch({ type: "UPLOAD_PENDING" });
        const response = [];
        for (const file of data) {
            const dataBody = new FormData();
            const fileFormat = file instanceof File ? matchFileFormat(file as File, imageFormats, videoFormats) : -1;
            // imgur demands a FormData with upload specific information
            if (typeof file === "string") dataBody.append("type", "url");
            else dataBody.append("type", "file");
            if (fileFormat === 0 || typeof file === "string") dataBody.append("image", file);
            else if (fileFormat === 1) dataBody.append("video", file);
            else throw Error(`Could not detect the file format for: ${file}`);
            const stringified = await FormDataToJSON(dataBody);
            const res: ImgurResponse = await postBackground({
                url: imgurApiUploadUrl,
                fetchOpts: {
                    headers: { Authorization: imgurClientId },
                },
                data: stringified,
            });
            // sanitized in fetchSafe()
            if (res?.data?.link) response.push(res.data.link);
        }
        return response;
    } catch (e) {
        if (e) console.error(e);
    }
};

const handleImgurSuccess = (payload: UploadSuccessPayload, dispatch: Dispatch<UploaderAction>) =>
    dispatch({ type: "UPLOAD_SUCCESS", payload });

const handleImgurFailure = (payload: UploadFailurePayload, dispatch: Dispatch<UploaderAction>) =>
    dispatch({ type: "UPLOAD_FAILURE", payload });

const handleImgurUpload = async (data: UploadData, dispatch: Dispatch<UploaderAction>) => {
    try {
        const links: string[] = await doImgurUpload(data, dispatch);
        if (!arrEmpty(links)) handleImgurSuccess(links, dispatch);
        else handleImgurFailure({ code: 400, msg: "Server returned no media links!" }, dispatch);
    } catch (e) {
        if (e) console.error(e);
        handleImgurFailure({ code: 401, msg: e.message || `Something went wrong!` }, dispatch);
    }
};
export default handleImgurUpload;