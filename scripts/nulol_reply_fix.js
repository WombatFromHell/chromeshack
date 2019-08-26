/*
 *  Attempt to workaround Chatty's nuLOL API data not loading after replying
 */

processReplyEvent.addHandler((item, root) => {
    let rootPostRefreshBtn = root.querySelector(".fullpost.op .refresh > a");
    let refreshedOL = item.querySelector("span.oneline_body");
    // try to fix busted nuLOL tag data loading when replying
    if (rootPostRefreshBtn) {
        delayPromise(250)
            // get fresh tag data for the thread
            .then(Promise.resolve(rootPostRefreshBtn.click()))
            // ... then re-open the refreshed post
            .then(Promise.resolve(refreshedOL.click()))
            .then(console.log("nuLOL reply workaround ran"));
    }
});
