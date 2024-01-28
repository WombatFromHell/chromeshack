import { isFirefox } from "./core/common/common";

export const requiredOrigin = "https://www.shacknews.com/chatty*";

const requestPermissions = async () => {
  return new Promise((resolve, reject) =>
    chrome.permissions.request({ origins: [requiredOrigin] }, (response) => {
      if (response) {
        console.log("Permission granted!");
        return resolve(true);
      }
      console.error("Permission denied!");
      return reject(false);
    })
  );
};

const getCurrentPermissions = () => {
  return new Promise((resolve, reject) => {
    chrome.permissions.contains({ origins: [requiredOrigin] }, (response) => {
      if (response) return resolve(true);
      return reject(false);
    });
  });
};

const setPanelState = (granted) => {
  const permissionBtn = document.getElementById("permissionBtn");
  const prompt = document.getElementById("prompt");
  const grantText = document.getElementById("granted");
  if (granted) {
    prompt.setAttribute("class", "hide");
    grantText.removeAttribute("class");
    permissionBtn.innerText = "Permission Granted";
    permissionBtn.setAttribute("disabled", "true");
    permissionBtn.setAttribute("class", "hide");
  } else {
    prompt.removeAttribute("class");
    grantText.setAttribute("class", "hide");
    permissionBtn.innerText = "Request Permission";
    permissionBtn.removeAttribute("disabled");
    permissionBtn.setAttribute("class", "");
  }
};

const initialize = async () => {
  const permissionBtn = document.getElementById("permissionBtn");
  if (permissionBtn) permissionBtn.addEventListener("click", requestPermissions);

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "permissions_granted" && permissionBtn) setPanelState(true);
    else if (message.type === "permissions_removed" && permissionBtn) setPanelState(false);
  });

  try {
    const currentPermissions = await getCurrentPermissions();
    if (permissionBtn) setPanelState(currentPermissions);
  } catch (e) {
    if (permissionBtn) setPanelState(false);
    console.error(e);
  }
};

(async () => {
  // only allow Firefox useragent's to use the permissions panel
  if (isFirefox()) await initialize();
})();
