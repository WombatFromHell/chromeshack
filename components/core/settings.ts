import { arrHas, objEmpty, objHas } from "./common/common";
import { superTrim } from "./common/dom";
import { DefaultSettings } from "./default_settings";

/// GETTERS

export const getSettings = async (defaults?: Settings) => {
  try {
    let settings = (await browser.storage.local.get()) as Settings;
    if (objEmpty(settings) && !defaults) {
      await browser.storage.local.set({ ...DefaultSettings, ...settings });
      settings = (await browser.storage.local.get()) as Settings;
    } else if (defaults) {
      await browser.storage.local.set(defaults);
      settings = defaults;
    }
    return settings;
  } catch (e) {
    if (e) console.error(e);
  }
};

export const setSetting = async (key: SettingKey, val: any) => {
  // Check each time we set a key that the val will fit within the storage limit
  // ... if we don't do this then the settings store can become corrupted
  // ... causing data loss of some kv-pairs.
  const maxSize = 10000000; // the limit is 10MiB for browser.storage.local
  const _settings = await getSettings();
  const _newVal = { [key]: val };
  const _withVal = { ..._settings, ..._newVal };
  const _newSetLen = JSON.stringify(_withVal).length;
  if (_newSetLen < maxSize) await browser.storage.local.set(_newVal);
  else console.error("Unable to write value - would cause storage overflow:", _withVal, _newSetLen);
};

export const getSetting = async (key: SettingKey, defaultVal?: any) => {
  const settings = (await getSettings()) as Settings;
  const found = settings[key];
  // overwrite key with default (if provided)
  if (found == null && defaultVal != null) setSetting(key, defaultVal);
  return found != null ? found : (defaultVal ?? null);
};

export const getSettingsVersion = async () => await getSetting("version", 0);
export const getManifestVersion = () => Number.parseFloat(browser.runtime.getManifest().version);

export const getEnabled = async (key?: EnabledOptions) => {
  const enabled = (await getSetting("enabled_scripts", null)) as EnabledOptions[];
  if (!key) return enabled;
  return enabled.find((v) => v === key) ?? null;
};

export const getEnabledBuiltins = async () => {
  const builtins = (await getSetting("enabled_builtins", null)) as EnabledBuiltinOptions[];
  return builtins;
};
export const getEnabledBuiltin = async (key: EnabledBuiltinOptions) => {
  const builtins = (await getEnabledBuiltins()) as EnabledBuiltinOptions[];
  return builtins.find((x) => x.toUpperCase() === key.toUpperCase()) || null;
};

export const getEnabledSuboptions = async () => {
  const enabled = (await getSetting("enabled_suboptions", null)) as EnabledSuboptions[];
  return enabled;
};
export const getEnabledSuboption = async (key: EnabledSuboptions) => {
  const suboptions = (await getEnabledSuboptions()) as EnabledSuboptions[];
  return suboptions.find((x) => x.toUpperCase() === key.toUpperCase()) || null;
};

export const getSettingsLegacy = async () => {
  const storage = await browser.storage.local.get();
  const settings = { ...DefaultSettings, ...storage };
  // for (const key of Object.keys(settings) || [])
  //     if (/[A-F0-9]{8}-(?:[A-F0-9]{4}-){3}[A-F0-9]{12}/.test(settings[key]))
  //         settings[key] = JSON.parse(settings[key]);
  //     else if (!isNaN(parseFloat(JSON.parse(settings[key])))) settings[key] = parseFloat(JSON.parse(settings[key]));
  //     else settings[key] = JSON.parse(settings[key]);

  return settings as any;
};

export const getMutableHighlights = async () => {
  const groups = (await getSetting("highlight_groups")) as HighlightGroup[];
  return groups.filter((x: HighlightGroup) => !x.built_in && x.users) || null;
};

/// SETTERS

export const updateSettingsVersion = async () => {
  const manifestVersion = getManifestVersion();
  const settingsVersion = await getSettingsVersion();
  if (!settingsVersion || manifestVersion !== settingsVersion) await setSetting("version", manifestVersion || 0);

  return manifestVersion;
};

export const setEnabled = async (key: EnabledOptions) => {
  const scripts = (await getEnabled()) as EnabledOptions[];
  if (!scripts.includes(key) && key.length > 0) scripts.push(key);
  return await setSetting("enabled_scripts", scripts);
};

export const setEnabledBuiltin = async (key: EnabledBuiltinOptions) => {
  const options = (await getEnabledBuiltins()) as EnabledBuiltinOptions[];
  if (!options.includes(key) && key.length > 0) options.push(key);
  return await setSetting("enabled_builtins", options);
};

export const setEnabledSuboption = async (key: EnabledSuboptions) => {
  const options = (await getEnabledSuboptions()) as EnabledSuboptions[];
  if (!options.includes(key) && key.length > 0) options.push(key);
  return await setSetting("enabled_suboptions", options);
};

export const setSettings = async (obj: Settings) => {
  await browser.storage.local.clear();
  return await browser.storage.local.set(obj);
};

export const setHighlightGroup = async (groupName: string, obj: HighlightGroup) => {
  // for overwriting a specific highlight group by name
  const records = (await getSetting("highlight_groups", [])) as HighlightGroup[];
  const indexMatch = records.findIndex((x: HighlightGroup) => x.name?.toLowerCase() === groupName.toLowerCase());
  // overwrite at index if applicable (append otherwise)
  if (indexMatch > -1) records[indexMatch] = obj;
  else records.push(obj);
  if (records) return setSetting("highlight_groups", records);
};

/// REMOVERS

export const removeEnabled = async (key: EnabledOptions) => {
  const scripts = (await getEnabled()) as EnabledOptions[];
  const filtered = scripts.filter((x) => x !== key) || [];
  await setSetting("enabled_scripts", filtered);
  return filtered;
};

export const removeEnabledBuiltin = async (key: EnabledBuiltinOptions) => {
  const options = ((await getEnabledBuiltins()) || []) as EnabledBuiltinOptions[];
  const filtered = options.filter((x) => x !== key) || [];
  await setSetting("enabled_builtins", filtered);
  return filtered;
};

export const removeEnabledSuboption = async (key: EnabledSuboptions) => {
  const options = ((await getEnabledSuboptions()) || []) as EnabledSuboptions[];
  const filtered = options.filter((x) => x !== key) || [];
  await setSetting("enabled_suboptions", filtered);
  return filtered;
};

export const removeSetting = (key: SettingKey) => browser.storage.local.remove(key);

export const resetSettings = async (defaults?: Settings) => {
  await browser.storage.local.clear();
  return await getSettings(defaults);
};

export const removeHighlightUser = async (groupName: string, username: string) => {
  const groups = (await getSetting("highlight_groups")) as HighlightGroup[];
  const filtered = groups.filter((x) => x.name === groupName);
  for (const group of filtered || []) {
    const mutated = group.users?.filter((x) => x && x.toLowerCase() !== superTrim(username.toLowerCase())) || null;
    if (mutated) group.users = mutated;
    if (group.name) await setHighlightGroup(group.name, group);
  }
};

export const removeFilter = async (username: string) => {
  const filters = ((await getSetting("user_filters")) || []) as string[];
  const filtered = filters.filter((y) => y.toLowerCase() !== username.toLowerCase()) || [];
  await setSetting("user_filters", filtered);
  return filtered;
};

/// CONTAINERS

export const enabledContains = async (keys: EnabledOptions[]) => {
  const enabled = (await getEnabled()) as EnabledOptions[];
  for (const key of keys || []) if (enabled.includes(key)) return true;
  return false;
};

export const highlightsContains = async (username: string): Promise<HighlightGroup[]> => {
  // return all group matches based on username
  return (await getMutableHighlights()).filter((x: HighlightGroup) =>
    x.users?.find((y) => y.toLowerCase() === superTrim(username.toLowerCase())),
  );
};

export const highlightGroupContains = async (groupName: string, username: string) => {
  const groups = await highlightsContains(username);
  for (const group of groups || []) if (group.name === groupName) return group;
  return null;
};

export const highlightGroupsEqual = (groupA: HighlightGroup, groupB: HighlightGroup) => {
  // deep equality check of two HighlightGroups by ordinality
  if (!objHas(groupA) || !objHas(groupB)) return false;
  const { built_in: built_inA, enabled: enabledA, name: nameA, css: cssA, users: usersA } = groupA;
  const { built_in: built_inB, enabled: enabledB, name: nameB, css: cssB, users: usersB } = groupB;
  if (built_inA !== built_inB || enabledA !== enabledB) return false;
  if (nameA?.toUpperCase() !== nameB?.toUpperCase() || cssA?.toUpperCase() !== cssB?.toUpperCase()) return false;
  if (usersA?.length !== usersB?.length || (!usersA && usersB) || (!usersB && usersA)) return false;
  for (const userA of usersA || []) if (!usersB?.includes(userA)) return false;
  return true;
};

export const filtersContains = async (username: string): Promise<string> => {
  const filters = (await getSetting("user_filters")) as string[];
  return filters.find((x) => x && x.toLowerCase() === superTrim(username?.toLowerCase())) ?? "";
};

export const addHighlightUser = async (groupName: string, username: string) => {
  const groups = (await getSetting("highlight_groups")) as HighlightGroup[];
  const filtered = groups.filter((x) => x.name === groupName) || null;
  for (const group of filtered || []) {
    if (!group?.users || !group?.name) continue;

    const mutated = [...group.users, username];
    group.users = mutated;
    await setHighlightGroup(group.name, group);
  }
};

export const addFilter = async (username: string) => {
  if (!(await filtersContains(username))) {
    const filters = (await getSetting("user_filters")) as string[];
    const mutated = [...filters, username];
    await setSetting("user_filters", mutated);
  }
};

/// SETTINGS MIGRATION

export const mergeUserFilters = async (newUsers: string[]) => {
  const oldUsers = ((await getSetting("user_filters")) || []) as string[];
  return arrHas(newUsers)
    ? newUsers.reduce((acc, u) => {
        // don't allow duplicate usernames
        const found = acc.find((x) => x.toUpperCase() === u.toUpperCase());
        if (!found) acc.push(u);
        return acc;
      }, oldUsers)
    : [];
};

export const mergeHighlightGroups = async (newGroups: HighlightGroup[], oldGroups: HighlightGroup[]) => {
  const builtinGroups = arrHas(oldGroups) ? oldGroups.filter((g) => g.built_in) : [];
  // try to intelligently merge default, old, and new groups
  return arrHas(newGroups)
    ? newGroups.reduce((acc, g) => {
        // compare ordinal group names (users can exist in multiple groups)
        const foundIdx = acc.findIndex((y) => y?.name?.toUpperCase() === g?.name?.toUpperCase());
        // update existing builtin with the fresh group (preserving defaults)
        if (foundIdx > -1) acc[foundIdx] = { ...acc[foundIdx], enabled: g.enabled, css: g.css };
        else {
          // only allow unique users in a given group (compare ordinal name)
          const uniqueUsers = g.users?.filter(
            (x, i, s) => s.findIndex((u) => u.toUpperCase() === x.toUpperCase()) === i,
          );
          if (uniqueUsers) g.users = uniqueUsers;
          // a group name is required to accumulate
          if (g.name) acc.push(g);
        }
        return acc;
      }, builtinGroups)
    : [];
};

export const mergeSettings = async (newSettings: MigratedSettings) => {
  // pass in an object named for the settings options we want to mutate
  // to rename if found, pass: { option_name: [{ old: "...", new: "..." }] }
  // to rename a top-level key, pass: { key: [{ old: "...", new: "..." }] }
  // to remove a top-level key, pass: { key: [{ old: "...", new: null }] }
  // to remove in a list if found, pass: { option_name: [{ old: "...", new: null }] }
  // to remove if found, pass: { option_name: null }
  const settings = (await getSettings()) as Record<string, any>;
  for (const [key, val] of Object.entries(newSettings))
    if (val != null && Array.isArray(val))
      for (const v of val) {
        const _oldVal = settings[key];
        const _oldTopVal = settings[v.old];
        if (key !== "key") {
          const foundIdx = (_oldVal as string[]).findIndex((x) => x === v.old);
          // mutate array and leave no duplicate options/sub-options
          if (foundIdx > -1 && v.new) {
            (_oldVal as string[])[foundIdx] = v.new;
            settings[key] = (_oldVal as string[]).filter((x, i, s) => s.indexOf(x) === i);
          } else if (foundIdx > -1 && v.new === null)
            settings[key] = (_oldVal as string[]).splice(foundIdx).filter((x, i, s) => s.indexOf(x) === i);
        } else if (key === "key" && _oldTopVal) {
          delete settings[v.old];
          settings[v.new] = _oldTopVal;
        } else if (key === "key" && settings[v.old] && v.new === null) delete settings[v.old];
      }
    else if (val === null && key && settings[key]) delete settings[key];

  return settings;
};

export const migrateSettings = async () => {
  const legacy_settings = await getSettingsLegacy();
  let current_version = getManifestVersion();
  let last_version = (await getSettingsVersion()) || current_version;
  let migrated = false;
  const legacyVersion = legacy_settings?.["version"];
  if (legacyVersion && legacyVersion <= 1.63) {
    // quick reload of default settings from nuStorage
    await resetSettings().then(getSettings);
    // preserve previous convertible filters and notifications state
    const prevFilters = legacy_settings?.["user_filters"] || null;
    const prevNotifyUID = legacy_settings?.["notificationuid"] || null;
    const prevNotifyState = legacy_settings?.["notifications"] || null;
    if (prevFilters) await setSetting("user_filters", prevFilters);
    if (prevNotifyUID && prevNotifyState) await setEnabled("enable_notifications");
    window.localStorage.clear();
    migrated = true;
  }
  if (last_version <= 1.68 && last_version >= 1.64) {
    // migrate pre-1.69 settings
    const settingsMutation = {
      enabled_scripts: [
        { old: "image_loader", new: "media_loader" },
        { old: "video_loader", new: "media_loader" },
        { old: "embed_socials", new: "social_loader" },
      ],
      enabled_suboptions: [{ old: "es_show_tweet_threads", new: "sl_show_tweet_threads" }],
      notificationuid: null,
    } as MigratedSettings;
    const mutatedSettings = await mergeSettings(settingsMutation);
    await setSettings(mutatedSettings);
    migrated = true;
  }
  if (last_version >= 1.69 && last_version < 1.72) {
    // migrate pre-1.72 settings
    const settingsMutation = {
      key: [{ old: "selected_tab", new: "selected_upload_tab" }],
      collapsed_threads: null,
      last_collapse_time: null,
    } as MigratedSettings;
    const mutatedSettings = await mergeSettings(settingsMutation);
    await setSettings(mutatedSettings);
    migrated = true;
  }
  if (last_version < 1.74) {
    // make sure highlight_groups are up-to-date for 1.74
    const mutatedGroups = await mergeHighlightGroups(
      legacy_settings?.["highlight_groups"],
      DefaultSettings.highlight_groups!,
    );
    await setSettings({
      ...legacy_settings,
      highlight_groups: mutatedGroups,
    });
    console.log("merged highlight groups:", mutatedGroups);
    migrated = true;
  }
  if (last_version < 1.75) {
    // reset NewCommentHighlighter settings
    await setSetting("new_comment_highlighter_last_id", JSON.stringify({}));
    await setSetting("last_highlight_time", 0);
    // reset saved drafts and templates
    await setSetting("saved_drafts", {});
    await setSetting("saved_templates", []);
    migrated = true;
  }
  if (last_version < 1.76) {
    // reset enabled_builtins from defaults when initially migrating
    await setSetting("enabled_builtins", DefaultSettings.enabled_builtins);
    migrated = true;
  }
  if (last_version < 1.77) {
    await setSetting("new_comment_highlighter_last_id", {});
    migrated = true;
  }
  if (last_version < 1.79) {
    // ensure discord link defaults to enabled when migrating from <1.79
    await setEnabledBuiltin("discord_link");
    migrated = true;
  }

  // pull the latest version data after the migration
  current_version = getManifestVersion();
  last_version = (await getSettingsVersion()) || current_version;
  const imported = await getEnabledSuboption("imported");
  const show_notes = await getEnabledSuboption("show_rls_notes");
  if (imported || last_version !== current_version) {
    // reset time tracked variables when migrating from imported data
    await setSetting("new_comment_highlighter_last_id", -1);
    await setSetting("chatty_news_lastfetchtime", -1);
    await setEnabledSuboption("show_rls_notes");
    await updateSettingsVersion();
  } else await updateSettingsVersion();
  // only show release notes once after the version is updated
  if (show_notes && !imported) {
    await browser.tabs.create({ url: "release_notes.html" });
    await removeEnabledSuboption("show_rls_notes");
  }
  await removeEnabledSuboption("imported");

  console.log("after migrateSettings:", await getSettings());
};

const mergeTransients = async (transientData: Settings, transientOpts?: TransientOpts) => {
  const { append = false, exclude = false, defaults = true, overwrite = false } = transientOpts || {};
  if (transientData == null || !Object.keys(transientData).length)
    throw Error(`mergeTransients was unable to use invalid payload: ${transientData}`);

  const settings = await getSettings();
  const _settings = defaults ? { ...DefaultSettings } : { ...settings };

  const output = Object.keys(transientData)?.reduce((acc, k) => {
    const v = transientData[k as keyof Settings];
    const sv = acc[k as keyof Settings];
    const valIsArray = Array.isArray(v) && (v as string[]);
    const setIsArray = Array.isArray(sv) && (sv as string[]);
    const foundList = !valIsArray && setIsArray && setIsArray.find((x) => x === v);
    const foundVal = sv === v;

    // 'append' simply appends a value to an existing list (probably HighlightGroups)
    const appended = append && valIsArray && setIsArray ? [...setIsArray, ...valIsArray] : null;
    // 'exclude' filters the given strings out of an option list
    const filtered =
      exclude && valIsArray && setIsArray
        ? valIsArray.reduce((opts, s) => opts.filter((o) => o !== s), setIsArray)
        : null;

    if (appended) return { ...acc, [k]: appended };
    else if (filtered) return { ...acc, [k]: filtered };
    else if (!foundList && !foundVal && !overwrite && setIsArray && valIsArray)
      return { ...acc, [k]: [...setIsArray, ...valIsArray] };
    else if (!foundList && !foundVal) return { ...acc, [k]: v };

    return acc;
  }, _settings as Settings);

  return output;
};
export const mergeTransientSettings = async () => {
  // process any testing related settings passed in by cypress
  try {
    const localTransientOpts = window.localStorage.getItem("transient-opts");
    const localTransientData = window.localStorage.getItem("transient-data");
    const transientOpts = JSON.parse(localTransientOpts ?? "{}");
    const transientData = JSON.parse(localTransientData ?? "{}");

    if (!Object.keys(transientOpts).length && !Object.keys(transientData).length) return;
    console.log("mergeTransientSettings called with payload:", localTransientOpts, localTransientData);
    const merged = await mergeTransients(transientData, transientOpts);
    const newSettings = await resetSettings(merged);
    console.log("mergeTransientSettings merged:", newSettings);
  } catch (e) {
    console.error(e);
  }
  localStorage.clear();
};
