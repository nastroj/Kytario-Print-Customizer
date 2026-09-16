const fs = require('fs');
let code = fs.readFileSync('src/utils/storage.ts', 'utf8');
code = code.replace(/await idbSet\('settings', settings\);/, "await idbSet(isDarkMode ? 'settings_dark' : 'settings_light', settings);");
code = code.replace(/await idbSet\('draftSettings', draftSettings\);/, "await idbSet(isDarkMode ? 'draftSettings_dark' : 'draftSettings_light', draftSettings);");
code = code.replace(/await idbDelete\('draftSettings'\);/, "await idbDelete(isDarkMode ? 'draftSettings_dark' : 'draftSettings_light');");
code = code.replace(/safeLocalStorageSet\(STORAGE_KEYS.SETTINGS, JSON.stringify\(settings\)\);/, "safeLocalStorageSet(isDarkMode ? STORAGE_KEYS.SETTINGS + '_dark' : STORAGE_KEYS.SETTINGS + '_light', JSON.stringify(settings));");
code = code.replace(/safeLocalStorageSet\(STORAGE_KEYS.DRAFT_SETTINGS, JSON.stringify\(draftSettings\)\);/, "safeLocalStorageSet(isDarkMode ? STORAGE_KEYS.DRAFT_SETTINGS + '_dark' : STORAGE_KEYS.DRAFT_SETTINGS + '_light', JSON.stringify(draftSettings));");
code = code.replace(/localStorage.removeItem\(STORAGE_KEYS.DRAFT_SETTINGS\);/, "localStorage.removeItem(isDarkMode ? STORAGE_KEYS.DRAFT_SETTINGS + '_dark' : STORAGE_KEYS.DRAFT_SETTINGS + '_light');");
fs.writeFileSync('src/utils/storage.ts', code);
