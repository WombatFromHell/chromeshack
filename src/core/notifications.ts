import { browser } from "webextension-polyfill-ts";
import { arrHas, fetchSafe } from "./common";
import { processNotifyEvent } from "./events";
import { ChromeShack } from "./observers";
import { getEnabled, getSetting, setSetting } from "./settings";

export const getEventId = async () => (await getSetting("nEventId")) as Promise<number>;
export const setEventId = async (eventId: number) => await setSetting("nEventId", eventId);
export const getUsername = async () => (await getSetting("nUsername")) as Promise<string>;
export const setUsername = async (username: string) => await setSetting("nUsername", username);

export interface NotifyEvent {
    eventData: {
        parentAuthor?: string;
        post?: {
            author?: string;
            body?: string;
            category?: string;
            date?: string;
            id?: number;
            lols?: any[];
            parentId?: number;
            threadId?: number;
        };
        postId?: number;
        updates?: {
            count: number;
            postId: number;
            tag: string;
        }[];
    };
    eventDate: string;
    eventId: number;
    eventType: string;
}
export interface NotifyResponse {
    events: NotifyEvent[] | [];
    lastEventId: number;
    tooManyEvents: boolean;
    error?: boolean;
    code?: string;
    message?: string;
}
interface NotifyMsg {
    name: string;
    data: NotifyResponse;
}
interface NewestEventResponse {
    eventId: number;
}

export const TabMessenger = {
    send(msg: NotifyMsg) {
        // NOTE: call this from a background script
        browser.tabs.query({ url: "https://*.shacknews.com/chatty*" }).then((tabs) => {
            for (const tab of tabs || []) {
                // broadcast a message to all subscribed scripts in running tabs
                if (ChromeShack.debugEvents) console.log("TabMessenger broadcast:", msg, tab.id, tab.title);
                browser.tabs.sendMessage(tab.id, msg);
            }
        });
    },
    connect() {
        // NOTE: call this from a content script
        browser.runtime.onMessage.addListener((msg: NotifyMsg) => {
            if (ChromeShack.debugEvents) console.log("TabMessenger received:", msg);
            if (msg.name === "notifyEvent") return Promise.resolve(processNotifyEvent.raise(msg.data));
            else return Promise.resolve(true);
        });
    },
};

const setInitialNotificationsEventId = async () => {
    const resp: NewestEventResponse = await fetchSafe({ url: "https://winchatty.com/v2/getNewestEventId" });
    if (resp) await setEventId(resp.eventId);
};

const notificationClicked = (notificationId: string) => {
    if (notificationId.indexOf("ChromeshackNotification") > -1) {
        const postId = notificationId.replace("ChromeshackNotification", "");
        const url = `https://www.shacknews.com/chatty?id=${postId}#item_${postId}`;
        browser.tabs.create({ url: url });
        browser.notifications.clear(notificationId);
    }
};

const matchNotification = async (nEvent: NotifyEvent) => {
    const loggedInUsername = (await getUsername())?.toLowerCase();
    const matches = (await getSetting("notifications")) as string[];
    const parentAuthor = nEvent?.eventData?.parentAuthor?.toLowerCase();
    const postEventBody = nEvent?.eventData?.post?.body?.toLowerCase();
    const postEventHasMe = postEventBody?.includes(loggedInUsername);
    const parentAuthorIsMe = parentAuthor === loggedInUsername;
    const postEventHasMatches = matches?.reduce((acc, m) => {
        const mToLower = m.toLowerCase();
        const matchesBody = postEventBody.indexOf(mToLower) > -1;
        const wasAdded = acc.find((x) => x.toLowerCase() === mToLower.trim());
        // trim extra trailing space from phrase matches for posterity
        if (!parentAuthorIsMe && matchesBody && !wasAdded) acc.push(m.trim());
        return acc;
    }, [] as string[]);
    if (postEventHasMe) return "Someone mentioned your name.";
    else if (parentAuthorIsMe) return "Someone replied to you.";
    else if (arrHas(postEventHasMatches)) {
        const message = `Someone mentioned: ${postEventHasMatches.join(", ")}`;
        return `${message.slice(0, 115)}...`;
    } else return null;
};

const handleEventSignal = (msg: NotifyMsg) => TabMessenger?.send(msg);

const handleNotification = async (response: NotifyResponse) => {
    const events = response.events;
    handleEventSignal({ name: "notifyEvent", data: response });
    const notify_enabled = await getEnabled("enable_notifications");
    for (const event of events || [])
        if (event.eventType === "newPost") {
            const match = await matchNotification(event);
            if (notify_enabled && match && event?.eventData?.post?.author) {
                const post = event.eventData.post;
                browser.notifications.create(`ChromeshackNotification${post.id.toString()}`, {
                    type: "basic",
                    title: "New post by " + post.author,
                    message: match,
                    iconUrl: "images/icon.png",
                });
            }
        }
};

const pollNotifications = async () => {
    const greenLightTimer = 15000; // tick
    const redLightTimer = 60000; // tock
    try {
        // TODO: have the consuming scripts set a consumer suboption
        const enabled = (await getEnabled("enable_notifications")) || (await getEnabled("highlight_pending_new_posts"));
        if (enabled) {
            let nEventId = await getEventId();
            if (!nEventId) {
                // avoid getting hung in a tock loop if saved id is unusable
                await setInitialNotificationsEventId();
                nEventId = await getEventId();
            }
            const resp: NotifyResponse =
                nEventId &&
                (await fetchSafe({
                    url: `https://winchatty.com/v2/pollForEvent?includeParentAuthor=true&lastEventId=${nEventId}`,
                }));
            if (resp?.lastEventId && !resp.error) {
                await setEventId(resp.lastEventId);
                await handleNotification(resp);
                // recheck every tick
                setTimeout(pollNotifications, greenLightTimer);
            } else if (resp?.code === "ERR_TOO_MANY_EVENTS") {
                await setInitialNotificationsEventId();
                // busy signal - recheck on next tick
                setTimeout(pollNotifications, greenLightTimer);
            }
            // fail - recheck on next tock
            else setTimeout(pollNotifications, redLightTimer);
        }
        // recheck every tick for enablement
        else setTimeout(pollNotifications, greenLightTimer);
    } catch (e) {
        console.log(e);
        // retry every tock
        setTimeout(pollNotifications, redLightTimer);
    }
};

export const startNotifications = async () => {
    browser.notifications.onClicked.addListener(notificationClicked);
    await setInitialNotificationsEventId();
    await pollNotifications();
};
