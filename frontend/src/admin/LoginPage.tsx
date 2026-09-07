import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.js";
import { useSettings } from "../settings/SettingsContext.js";
import { apiErrorMessage } from "../api/client.js";
import { XIcon } from "../components/icons.js";

export function LoginPage() {
    const { login } = useAuth();
    const { siteName, logoUrl, logoSize } = useSettings();
    const navigate = useNavigate();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setBusy(true);
        try {
            await login(username, password);
            navigate("/admin", { replace: true });
        } catch (err) {
            setError(apiErrorMessage(err));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink px-4">
            <div className="pointer-events-none absolute inset-0 bg-grid-fade bg-grid opacity-[0.12]" />
            <div
                className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full opacity-25 blur-3xl"
                style={{
                    background: "radial-gradient(circle, #1450E0 0%, transparent 70%)",
                }}
            />
            <form
                onSubmit={submit}
                className="relative w-full max-w-sm overflow-hidden rounded-xl2 border border-white/15 bg-white/[0.07] p-7 shadow-pop backdrop-blur-2xl"
            >
                {/* Liquid-glass highlights */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
                <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />

                <div className="relative mb-6 text-center">
                    <img
                        src={logoUrl}
                        alt={siteName}
                        className="mx-auto h-auto object-contain drop-shadow-lg"
                        style={{ width: logoSize(96) }}
                    />
                </div>

                {error && (
                    <div
                        className="relative mb-4 flex items-center gap-2 rounded-lg border border-ng/30 bg-ng/20 px-3 py-2.5 text-sm font-medium text-red-100"
                        role="alert"
                    >
                        <XIcon size={16} />
                        {error}
                    </div>
                )}

                <div className="relative space-y-4">
                    <div>
                        <label
                            htmlFor="username"
                            className="mb-1.5 block text-sm font-semibold text-slate-200"
                        >
                            Username
                        </label>
                        <input
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            autoFocus
                            className="w-full rounded-lg border border-white/15 bg-white/10 px-3.5 py-2.5 text-sm text-white shadow-sm outline-none transition placeholder:text-slate-400 focus:border-white/40 focus:bg-white/15"
                        />
                    </div>
                    <div>
                        <label
                            htmlFor="password"
                            className="mb-1.5 block text-sm font-semibold text-slate-200"
                        >
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full rounded-lg border border-white/15 bg-white/10 px-3.5 py-2.5 text-sm text-white shadow-sm outline-none transition placeholder:text-slate-400 focus:border-white/40 focus:bg-white/15"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={busy}
                        className="btn-primary w-full"
                    >
                        {busy ? "Signing in…" : "Sign in"}
                    </button>
                </div>
            </form>
        </div>
    );
}
