import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.js';
import { useSettings } from '../settings/SettingsContext.js';
import {
  GaugeIcon,
  LayersIcon,
  InboxIcon,
  ExternalIcon,
  LogoutIcon,
  SlidersIcon,
} from '../components/icons.js';

const navClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
    isActive
      ? 'bg-accent text-white shadow-sm'
      : 'text-slate-300 hover:bg-white/10 hover:text-white'
  }`;

export function AdminLayout() {
  const { logout } = useAuth();
  const { siteName, logoUrl, logoSize } = useSettings();
  const navigate = useNavigate();

  const onLogout = () => {
    logout();
    navigate('/admin/login', { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="flex flex-col bg-ink text-white md:sticky md:top-0 md:h-screen md:w-64">
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
          <img
            src={logoUrl}
            alt=""
            className="h-auto object-contain"
            style={{ width: logoSize(48) }}
          />
          <div className="leading-tight">
            <div className="font-extrabold">{siteName}</div>
            <div className="text-[11px] uppercase tracking-[0.12em] text-slate-400">
              Admin panel
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          <div className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
            Manage
          </div>
          <NavLink to="/admin" end className={navClass}>
            <GaugeIcon size={18} />
            Dashboard
          </NavLink>
          <NavLink to="/admin/content" className={navClass}>
            <LayersIcon size={18} />
            Content manager
          </NavLink>
          <NavLink to="/admin/suggestions" className={navClass}>
            <InboxIcon size={18} />
            Suggestions
          </NavLink>

          <div className="px-3 pb-1 pt-5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
            Configure
          </div>
          <NavLink to="/admin/settings" className={navClass}>
            <SlidersIcon size={18} />
            Branding
          </NavLink>
        </nav>

        <div className="space-y-1 border-t border-white/10 p-3">
          <Link
            to="/"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            <ExternalIcon size={18} />
            View site
          </Link>
          <button
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            <LogoutIcon size={18} />
            Log out
          </button>
        </div>
      </aside>

      <main className="flex-1 bg-surface p-6 sm:p-8">
        <div className="mx-auto max-w-5xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
