import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../api/endpoints.js';
import { apiErrorMessage } from '../api/client.js';
import { Loading, ErrorState } from '../components/States.js';
import { useToast } from '../components/Toast.js';
import { useSettings } from '../settings/SettingsContext.js';
import { UploadIcon, ImageIcon } from '../components/icons.js';

const MIN_SCALE = 40;
const MAX_SCALE = 240;

export function SettingsPage() {
  const toast = useToast();
  const { logoUrl, adminLogoUrl, refresh } = useSettings();
  const fileRef = useRef<HTMLInputElement>(null);
  const adminFileRef = useRef<HTMLInputElement>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: adminApi.getSettings,
  });

  const [siteName, setSiteName] = useState('');
  const [slogan, setSlogan] = useState('');
  const [footerText, setFooterText] = useState('');
  const [logoScale, setLogoScale] = useState(100);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingAdmin, setUploadingAdmin] = useState(false);

  useEffect(() => {
    if (data) {
      setSiteName(data.siteName);
      setSlogan(data.slogan);
      setFooterText(data.footerText ?? '');
      setLogoScale(data.logoScale ?? 100);
    }
  }, [data]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteName.trim()) return;
    setSaving(true);
    try {
      await adminApi.updateSettings({
        siteName: siteName.trim(),
        slogan: slogan.trim(),
        footerText: footerText.trim(),
        logoScale,
      });
      await Promise.all([refetch(), refresh()]);
      toast('Branding updated');
    } catch (err) {
      toast(apiErrorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const uploadLogo = async (file: File) => {
    setUploading(true);
    try {
      await adminApi.uploadLogo(file);
      await Promise.all([refetch(), refresh()]);
      toast('Logo updated');
    } catch (err) {
      toast(apiErrorMessage(err), 'error');
    } finally {
      setUploading(false);
    }
  };

  const uploadAdminLogo = async (file: File) => {
    setUploadingAdmin(true);
    try {
      await adminApi.uploadAdminLogo(file);
      await Promise.all([refetch(), refresh()]);
      toast('Admin logo updated');
    } catch (err) {
      toast(apiErrorMessage(err), 'error');
    } finally {
      setUploadingAdmin(false);
    }
  };

  // Live preview sizes driven by the slider (before saving).
  const headerLogo = Math.round((64 * logoScale) / 100);
  const tileLogo = Math.min(headerLogo, 88);

  return (
    <div>
      <div className="eyebrow">Configure</div>
      <h1 className="mb-6 text-2xl font-extrabold text-slate-900">Branding</h1>

      {isLoading && <Loading />}
      {error && <ErrorState message={apiErrorMessage(error)} />}

      {data && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Logos + size */}
          <div className="space-y-6 lg:col-span-1">
            <section className="card p-5">
              <h2 className="text-sm font-bold text-slate-900">Public logo</h2>
              <p className="field-hint mt-0.5">
                Shown in the site header on a light background — use a dark or colour mark, not
                a white one.
              </p>
              <div className="mt-4 flex flex-col items-center gap-4 rounded-xl2 border border-dashed border-slate-200 bg-slate-50/60 p-6">
                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl2 bg-white ring-1 ring-slate-200">
                  <img
                    src={logoUrl}
                    alt="Current public logo"
                    className="h-auto object-contain"
                    style={{ width: tileLogo }}
                  />
                </div>
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                >
                  {uploading ? (
                    'Uploading…'
                  ) : (
                    <>
                      <UploadIcon size={15} /> Replace logo
                    </>
                  )}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadLogo(f);
                    e.target.value = '';
                  }}
                />
              </div>
            </section>

            <section className="card p-5">
              <h2 className="text-sm font-bold text-slate-900">Admin &amp; login logo</h2>
              <p className="field-hint mt-0.5">
                Shown on the login screen and admin sidebar, both on a dark background — a white
                mark works well here. Falls back to the public logo until you upload one.
              </p>
              <div className="mt-4 flex flex-col items-center gap-4 rounded-xl2 border border-dashed border-slate-200 bg-slate-50/60 p-6">
                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl2 bg-ink ring-1 ring-white/10">
                  <img
                    src={adminLogoUrl}
                    alt="Current admin logo"
                    className="h-auto object-contain"
                    style={{ width: tileLogo }}
                  />
                </div>
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  disabled={uploadingAdmin}
                  onClick={() => adminFileRef.current?.click()}
                >
                  {uploadingAdmin ? (
                    'Uploading…'
                  ) : (
                    <>
                      <UploadIcon size={15} /> Replace logo
                    </>
                  )}
                </button>
                <input
                  ref={adminFileRef}
                  type="file"
                  accept="image/png,image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadAdminLogo(f);
                    e.target.value = '';
                  }}
                />
              </div>
            </section>

            {/* Logo size control — applies to both logos wherever they appear */}
            <section className="card p-5">
              <div className="mb-1 flex items-center justify-between">
                <label htmlFor="logo-scale" className="text-sm font-semibold text-slate-700">
                  Logo size
                </label>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-600">
                    {logoScale}%
                  </span>
                  {logoScale !== 100 && (
                    <button
                      type="button"
                      onClick={() => setLogoScale(100)}
                      className="text-xs font-medium text-accent hover:underline"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
              <input
                id="logo-scale"
                type="range"
                min={MIN_SCALE}
                max={MAX_SCALE}
                step={5}
                value={logoScale}
                onChange={(e) => setLogoScale(Number(e.target.value))}
                className="w-full accent-accent"
              />
              <p className="field-hint">
                Scales both logos wherever they appear. Click “Save changes” to apply.
              </p>
            </section>
          </div>

          {/* Name + slogan + preview */}
          <section className="card p-5 lg:col-span-2">
            <h2 className="text-sm font-bold text-slate-900">Identity</h2>
            <p className="field-hint mt-0.5">
              The site name and slogan appear in the header, footer, home hero, and browser
              tab title.
            </p>
            <form onSubmit={save} className="mt-4 space-y-4">
              <div>
                <label className="field-label">Site name</label>
                <input
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  required
                  maxLength={80}
                  className="field-input"
                />
              </div>
              <div>
                <label className="field-label">Slogan</label>
                <input
                  value={slogan}
                  onChange={(e) => setSlogan(e.target.value)}
                  maxLength={160}
                  className="field-input"
                  placeholder="Optional tagline shown under the site name"
                />
              </div>
              <div>
                <label className="field-label">Footer text</label>
                <input
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                  maxLength={200}
                  className="field-input"
                  placeholder="Shown centered in the site footer"
                />
              </div>

              {/* Live preview (reflects the logo-size slider) */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="field-label">Public header preview</div>
                  <div className="flex min-h-[4.5rem] items-center gap-3 overflow-hidden rounded-xl2 border border-slate-200 bg-white px-4 py-3">
                    <span className="flex shrink-0 items-center justify-center overflow-hidden">
                      {logoUrl ? (
                        <img
                          src={logoUrl}
                          alt=""
                          className="h-auto object-contain"
                          style={{ width: headerLogo }}
                        />
                      ) : (
                        <ImageIcon size={24} className="text-slate-400" />
                      )}
                    </span>
                    <span className="leading-tight">
                      <span className="block text-xl font-extrabold tracking-tight text-slate-900">
                        {siteName || 'Site name'}
                      </span>
                      {slogan && (
                        <span className="block text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">
                          {slogan}
                        </span>
                      )}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="field-label">Admin &amp; login preview</div>
                  <div className="flex min-h-[4.5rem] items-center gap-3 overflow-hidden rounded-xl2 bg-ink px-4 py-3 text-white">
                    <span className="flex shrink-0 items-center justify-center overflow-hidden">
                      {adminLogoUrl ? (
                        <img
                          src={adminLogoUrl}
                          alt=""
                          className="h-auto object-contain"
                          style={{ width: headerLogo }}
                        />
                      ) : (
                        <ImageIcon size={24} />
                      )}
                    </span>
                    <span className="leading-tight">
                      <span className="block text-xl font-extrabold tracking-tight">
                        {siteName || 'Site name'}
                      </span>
                      {slogan && (
                        <span className="block text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
                          {slogan}
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <div className="field-label">Footer preview</div>
                <div className="flex min-h-[3.5rem] items-center justify-center overflow-hidden rounded-xl2 border border-slate-200 bg-white/70 px-4 py-3 text-center backdrop-blur-xl">
                  <span className="text-xs tracking-wide text-slate-500">
                    {footerText || 'Footer text'}
                  </span>
                </div>
              </div>

              <div className="flex justify-end">
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
