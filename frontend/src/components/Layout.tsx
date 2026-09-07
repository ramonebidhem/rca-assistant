import { Link, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { SearchBar } from './SearchBar.js';
import { AssistantWidget } from './AssistantWidget.js';
import { useSettings } from '../settings/SettingsContext.js';

export function Header({ showSearch = false }: { showSearch?: boolean }) {
  const navigate = useNavigate();
  const { siteName, slogan, logoUrl, logoSize } = useSettings();
  const size = logoSize(64);
  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-ink/95 text-white shadow-lg backdrop-blur supports-[backdrop-filter]:bg-ink/80">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link to="/" className="flex items-center gap-3 rounded-lg">
          <img
            src={logoUrl}
            alt={`${siteName} logo`}
            className="h-auto object-contain"
            style={{ width: size }}
          />
          <div className="leading-tight">
            <div className="text-xl font-extrabold tracking-tight">{siteName}</div>
            {slogan && (
              <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
                {slogan}
              </div>
            )}
          </div>
        </Link>

        {showSearch && (
          <div className="ml-6 hidden max-w-md flex-1 md:block">
            <SearchBar onSelect={(ft) => navigate(`/failure-types/${ft.id}`)} />
          </div>
        )}

        <div className="ml-auto">
          <Link
            to="/admin"
            className="rounded-lg border border-white/10 px-3.5 py-2 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
          >
            Admin
          </Link>
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-auto border-t border-white/5 bg-ink text-slate-400">
      <div className="mx-auto flex max-w-6xl items-center justify-center px-4 py-6 text-center">
        <div className="text-xs tracking-wide text-slate-500">
          © 2026 ROOT CAUSE ANALYSIS PLATFORM — GME COSEE CUTTING
        </div>
      </div>
    </footer>
  );
}

export function Layout({
  children,
  showSearch = false,
}: {
  children: ReactNode;
  showSearch?: boolean;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header showSearch={showSearch} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
      <Footer />
      <AssistantWidget />
    </div>
  );
}
