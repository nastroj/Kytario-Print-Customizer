/**
 * Application Configuration
 *
 * Use this file to configure global application settings and developer tools.
 */

export interface AppConfig {
  /**
   * Application version.
   */
  APP_VERSION: string;

  /**
   * Controls whether the Song Fit Debug HUD and the debug (bug) icon in the toolbar are enabled.
   * - false (default): Debug HUD and debug icon are completely hidden from the UI.
   * - true: Shows the debug icon in the preview toolbar and allows opening the Debug HUD.
   */
  ENABLE_DEBUG_HUD: boolean;
}

export const APP_CONFIG: AppConfig = {
  APP_VERSION: '1.9.1',
  // Set to true to enable and show the Debug HUD and the debug icon in the toolbar
  ENABLE_DEBUG_HUD: false,
};

/**
 * Returns true if the debug HUD and debug toolbar icon should be available.
 * Strictly returns false in production builds.
 */
export function isDebugHudConfigured(): boolean {
  if (typeof import.meta !== 'undefined' && import.meta.env?.PROD) {
    return false;
  }
  return Boolean(APP_CONFIG.ENABLE_DEBUG_HUD);
}
