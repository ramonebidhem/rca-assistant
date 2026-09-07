import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { publicApi } from '../api/endpoints.js';
import { imageUrl } from '../api/client.js';
import type { SiteSettings } from '../types.js';

const DEFAULTS: SiteSettings = {
  siteName: 'Défauthèque',
  slogan: 'Find the cause. Fix it right.',
  logoPath: null,
  logoScale: 100,
};

interface SettingsState {
  siteName: string;
  slogan: string;
  logoUrl: string;
  logoScale: number;
  // Pixel size for a logo given its base size at 100%.
  logoSize: (base: number) => number;
  refresh: () => Promise<void>;
}

const SettingsContext = createContext<SettingsState>({
  ...DEFAULTS,
  logoUrl: '/logo.png',
  logoSize: (base) => base,
  refresh: async () => {},
});

export function useSettings() {
  return useContext(SettingsContext);
}

// Falls back to the static /logo.png when no custom logo has been uploaded.
function resolveLogo(logoPath: string | null): string {
  return logoPath ? imageUrl(logoPath)! : '/logo.png';
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULTS);

  const refresh = useCallback(async () => {
    try {
      const data = await publicApi.getSettings();
      setSettings(data);
    } catch {
      setSettings(DEFAULTS);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Keep the browser tab title in sync with the branding.
  useEffect(() => {
    document.title = `${settings.siteName} — ${settings.slogan}`;
  }, [settings.siteName, settings.slogan]);

  return (
    <SettingsContext.Provider
      value={{
        siteName: settings.siteName,
        slogan: settings.slogan,
        logoUrl: resolveLogo(settings.logoPath),
        logoScale: settings.logoScale,
        logoSize: (base: number) => Math.round((base * (settings.logoScale || 100)) / 100),
        refresh,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}
