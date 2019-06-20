settingsLoadedEvent.addHandler(function() {
    if (getSetting("enabled_scripts").contains("nws_incognito"))
    {
        NwsIncognito =
        {
            hookToNwsPosts: function(item)
            {
                var allLinks = [];
                var nwsPost = getDescendentByTagAndAnyClassName(item, 'div', 'fpmod_nws');
                if(nwsPost)
                {
                    var postBody = getDescendentByTagAndClassName(nwsPost, 'div', 'postbody');
                    var links = postBody.getElementsByTagName('a');
                    for(var iLink = 0; iLink < links.length; iLink++)
                    {
                        //Clone the link to get rid of any handlers that were put on it before (like the inline image loader)
                        //Of course, that relies on it being done before this.  So... yeah.
                        var cloned = links[iLink].cloneNode(true);
                        //Add href to collection for open all.
                        allLinks.push(cloned.href);
                        $(cloned).click(function(e) {
                            browser.runtime.sendMessage({ name: "allowedIncognitoAccess" }).then(result => {
                                if (!window.chrome && !result)
                                    alert("This feature will not work unless you enable \"Run in Private Windows\" in the Chrome Shack addon settings for Firefox!");
                                browser.runtime.sendMessage({name: "launchIncognito", value: e.target.href});
                            });
                            return false;
                        });

                        // prevent reapplying
                        if (cloned.innerHTML.indexOf(" (Incognito)") == -1 ) {
                            cloned.innerHTML += ' (Incognito)'
                        };
                        $(links[iLink]).replaceWith(cloned);

                        // remove expando buttons for Incognito mode
                        var expando = links[iLink].querySelector("div.expando");
                        if (!!expando)
                            expando.parentNode.removeChild(expando);
                    }
                }
            }
        }

        processPostEvent.addHandler(NwsIncognito.hookToNwsPosts);
    }
});
