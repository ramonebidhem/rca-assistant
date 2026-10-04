import { Link, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { SearchBar } from './SearchBar.js';
import { AssistantWidget } from './AssistantWidget.js';
import { useSettings } from '../settings/SettingsContext.js';
import { IS_STATIC } from '../static/staticApi.js';
import { ShieldIcon } from './icons.js';

export function Header({ showSearch = false }: { showSearch?: boolean }) {
  const navigate = useNavigate();
  const { siteName, slogan, logoUrl, logoSize } = useSettings();
  const size = logoSize(56);

  return (
    <header className="sticky top-0 z-30 border-b-2 border-accent bg-white/70 text-ink shadow-sm backdrop-blur-xl supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto flex max-w-6xl items-center gap-5 px-4 py-3">
        <Link to="/" className="flex shrink-0 items-center gap-3 rounded-md">
          <img
            src={logoUrl}
            alt={`${siteName} logo`}
            className="h-auto object-contain"
            style={{ width: size }}
          />
          <div className="leading-tight">
            <div className="font-display text-lg font-bold tracking-tight text-slate-900">
              {siteName}
            </div>
            {slogan && (
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                {slogan}
              </div>
            )}
          </div>
        </Link>

        <div className="ml-auto flex shrink-0 items-center gap-3">
          {showSearch && (
            <div className="hidden w-56 md:block lg:w-64">
              <SearchBar onSelect={(ft) => navigate(`/failure-types/${ft.id}`)} />
            </div>
          )}

          {/* The published read-only build has no API server, so no admin. */}
          {!IS_STATIC && (
            <Link
              to="/admin"
              aria-label="Admin"
              title="Admin"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-900/10 bg-white/50 text-slate-600 backdrop-blur-sm transition hover:border-accent/40 hover:bg-white hover:text-accent"
            >
              <ShieldIcon size={18} />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  const { footerText } = useSettings();
  return (
    <footer className="mt-auto border-t-2 border-accent bg-white/70 text-ink shadow-[0_-1px_2px_rgba(17,19,22,0.04)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto flex max-w-6xl items-center justify-center px-4 py-6 text-center">
        <div className="text-xs tracking-wide text-slate-500">{footerText}</div>
      </div>
    </footer>
  );
}

export function Layout({
  children,
  showSearch = false,
  hero,
}: {
  children: ReactNode;
  showSearch?: boolean;
  /** Full-bleed content rendered directly below the header, outside the padded container. */
  hero?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header showSearch={showSearch} />
      {hero}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
      <Footer />
      <AssistantWidget />
    </div>
  );
}
