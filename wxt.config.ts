import { preact } from "@preact/preset-vite";
import { description, version } from "./package.json";
import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  extensionApi: "chrome",
  outDir: "dist",
  vite: () => ({
    plugins: [preact()],
  }),

  manifest: ({ browser, manifestVersion }) => {
    const baseConfig = {
      name: "Chrome Shack",
      version,
      description,
      icons: {
        "16": "images/icon16.png",
        "48": "images/icon48.png",
        "96": "images/icon96.png",
        "128": "images/icon-chrome-web-store.png",
        "144": "images/icon144.png",
      },
      action: {
        default_icon: "images/icon16.png",
        default_title: "Chrome Shack",
      },
      permissions: ["tabs", "storage", "notifications", "alarms"],
    };

    const firefoxMixin = {
      browser_specific_settings: {
        gecko: {
          id: "{33a5e61a-ec1e-4761-9515-e7ab23a8b679}",
          strict_min_version: "109.0",
        },
      },
      options_ui: {
        page: "permissions.html",
      },
      permissions: [...baseConfig.permissions, "scripting"],
    };

    const v2Mixin = {
      permissions: [
        "activeTab",
        "https://api.imgur.com/3/*",
        "https://api.gfycat.com/v1/gfycats/*",
        "https://filedrop.gfycat.com/*",
        "https://*.youtube.com/embed/*",
        "https://api.streamable.com/videos/*",
        "https://*.shacknews.com/chatty*",
      ],
    };

    let outputConfig: any = {};
    if (browser === "firefox") {
      outputConfig = { ...baseConfig, ...firefoxMixin };
    } else {
      outputConfig = { ...baseConfig };
    }
    if (manifestVersion === 2) {
      outputConfig = { ...outputConfig, permissions: [...outputConfig.permissions, ...v2Mixin.permissions] };
    }

    return outputConfig;
  },
});
