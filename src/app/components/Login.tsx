import React, { useState } from 'react';
import { Eye, EyeOff, ArrowRight, ShieldCheck } from 'lucide-react';
import { loginAPI } from '../services/api';
import { normalizeRole } from '../utils/roles';

interface LoginProps {
  onLogin: (user: { id: string; name: string; email: string; role: string }) => void;
  onForgotPassword: () => void;
}

/* KAPS & Co. brand palette (mirrored from the marketing site) */
const NAVY = '#1b365d';
const GREEN = '#4ea72e';
const GREEN_LIGHT = '#6bc047';

/**
 * KAPS & Co. lockup — the official CA-India mark + JetBrains Mono wordmark with
 * the green rule under it, exactly as on the firm's website.
 */
function KapsLogo({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const onDark = tone === 'light';
  const primary = onDark ? '#ffffff' : NAVY;
  const sub = onDark ? 'rgba(255,255,255,0.6)' : '#5b6472';

  const mark = (
    <img
      src="/ca-india-logo.png"
      alt="KAPS & Co. — Chartered Accountants (CA India)"
      className="h-10 w-auto object-contain"
    />
  );

  return (
    <span className="inline-flex items-center gap-3">
      {onDark ? (
        <span className="flex items-center justify-center rounded-lg bg-white px-2 py-1.5 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.4)] ring-1 ring-black/5">
          {mark}
        </span>
      ) : (
        mark
      )}
      <span className="flex flex-col items-start leading-none">
        <span className="flex w-fit flex-col items-stretch">
          {/* The KAPS site writes this as `font-700`, but that class does not
              exist in their Tailwind build — so the wordmark actually renders at
              normal weight (400). Match that exactly. */}
          <span
            className="font-jetbrains -mr-[0.28em] text-[1.4rem] font-normal leading-none tracking-[0.06em] whitespace-nowrap"
            style={{ color: primary }}
          >
            KAPS&nbsp;&amp;&nbsp;Co.
          </span>
          <span
            aria-hidden
            className="my-[3px] h-[2px] w-full rounded-full"
            style={{
              background: `linear-gradient(to right, transparent 0%, transparent 30%, ${GREEN} 76%, ${GREEN_LIGHT} 100%)`,
            }}
          />
        </span>
        <span
          className="font-jetbrains text-[0.55rem] font-normal uppercase tracking-[0.22em]"
          style={{ color: sub }}
        >
          Chartered&nbsp;Accountants
        </span>
      </span>
    </span>
  );
}

/**
 * The browser's position, or null.
 *
 * Resolves rather than rejects on every failure path — denied permission, no
 * hardware, a slow fix — because location is a nice-to-have on the login audit
 * and must never stop someone signing in. The timeout is deliberately short for
 * the same reason.
 */
function getPosition(timeoutMs = 4000): Promise<{ latitude: number; longitude: number } | null> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(null);
    let settled = false;
    const done = (v: { latitude: number; longitude: number } | null) => {
      if (!settled) { settled = true; resolve(v); }
    };
    const timer = setTimeout(() => done(null), timeoutMs);
    navigator.geolocation.getCurrentPosition(
      (pos) => { clearTimeout(timer); done({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }); },
      () => { clearTimeout(timer); done(null); },
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 5 * 60 * 1000 },
    );
  });
}

export function Login({ onLogin, onForgotPassword }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'staff' | 'admin'>('staff');

  const switchMode = (m: 'staff' | 'admin') => { setMode(m); setError(''); };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Best-effort; resolves to null if the user declines or it takes too long.
      const pos = await getPosition();
      const response = await loginAPI.login({ email, password, ...(pos || {}) });

      if (response.success && response.data) {
        // The login endpoint returns the stored role verbatim, so normalize it
        // here the same way transformUser does for every other read.
        const role = normalizeRole(response.data.role);
        if (!role) {
          setError('This account has an unrecognized role. Contact an administrator.');
          return;
        }
        if (mode === 'admin' && role !== 'admin') {
          setError('This account is not an administrator.');
          return;
        }
        onLogin({
          id: response.data.id,
          name: response.data.name,
          email: response.data.email,
          role,
        });
      } else {
        const msg = response.error || response.message || 'Invalid email or password';
        setError(msg.toLowerCase().includes('invalid') ? 'Invalid email or password.' : msg);
      }
    } catch {
      setError('Login failed. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-white lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* ── Brand panel — KAPS world-map backdrop ───────────────── */}
      <aside
        className="relative hidden flex-col justify-between overflow-hidden px-14 py-12 text-white lg:flex"
        style={{
          background:
            'linear-gradient(160deg, #163055 0%, #0f2039 55%, #0a1728 100%)',
        }}
      >
        {/* World map — faint tinted landmasses, radially faded at the edges */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
          style={{
            maskImage:
              'radial-gradient(120% 90% at 50% 45%, #000 35%, transparent 80%)',
            WebkitMaskImage:
              'radial-gradient(120% 90% at 50% 45%, #000 35%, transparent 80%)',
          }}
        >
          <div
            className="absolute left-1/2 top-1/2 aspect-[2191/1135] w-[210%] -translate-x-1/2 -translate-y-1/2"
            style={{
              backgroundColor: 'rgba(255,255,255,0.07)',
              maskImage: "url('/world-map.svg')",
              WebkitMaskImage: "url('/world-map.svg')",
              maskSize: 'contain',
              WebkitMaskSize: 'contain',
              maskRepeat: 'no-repeat',
              WebkitMaskRepeat: 'no-repeat',
              maskPosition: 'center',
              WebkitMaskPosition: 'center',
            }}
          />
        </div>
        {/* Logo */}
        <div className="relative z-10">
          <KapsLogo tone="light" />
        </div>

        {/* Statement — the firm's own line */}
        <div className="relative z-10 max-w-md">
          <div className="mb-6 h-px w-14" style={{ backgroundColor: GREEN }} />
          <h2 className="font-display text-[3.2rem] font-normal leading-[1.05] tracking-tight">
            Integrity beyond
            <br />
            the <span style={{ color: GREEN_LIGHT }}>numbers</span>.
          </h2>
          <p
            className="mt-5 text-[0.95rem] leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.62)' }}
          >
            The internal workspace for our people — tasks, staff and records,
            held in one considered place.
          </p>
        </div>

        {/* Spacer — keeps the statement at its original height now that the
            footer is gone (the panel distributes its children with space-between). */}
        <div aria-hidden className="relative z-10" />

      </aside>

      {/* ── Form panel ──────────────────────────────────────────── */}
      <main className="flex min-h-screen items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full min-w-0 max-w-[380px]">
          {/* Compact logo for small screens */}
          <div className="mb-10 lg:hidden">
            <KapsLogo tone="dark" />
          </div>

          <div className="mb-8">
            {mode === 'admin' && (
              <span
                className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-[#E7EDF4] px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em]"
                style={{ backgroundColor: 'rgba(27,54,93,0.05)', color: NAVY }}
              >
                <ShieldCheck size={13} /> Administrator
              </span>
            )}
            <h1 className="text-[1.6rem] font-semibold tracking-tight" style={{ color: NAVY }}>
              {mode === 'admin' ? 'Admin sign in' : 'Sign in'}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {mode === 'admin' ? 'Restricted to administrator accounts.' : 'Welcome back. Please enter your details.'}
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5" noValidate>
            <Field
              id="email"
              label="Email address"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="name@kapsca.in"
              autoComplete="email"
            />

            <div>
              <div className="mb-1.5 flex items-baseline justify-between">
                <label htmlFor="password" className="text-sm font-medium" style={{ color: NAVY }}>
                  Password
                </label>
                <button
                  type="button"
                  onClick={onForgotPassword}
                  className="text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-[#3d8a22] hover:underline"
                >
                  Forgot?
                </button>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className="w-full rounded-lg border border-[#D1D5DB] bg-white px-3.5 py-2.5 pr-11 text-[0.95rem] text-foreground outline-none transition-all placeholder:text-muted-foreground/60 focus:border-[#4ea72e] focus:ring-2 focus:ring-[#4ea72e]/25"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-[#3d8a22]"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-lg px-4 py-3 text-[0.95rem] font-medium text-white transition-all duration-200 hover:shadow-[0_10px_30px_-12px_rgba(27,54,93,0.7)] disabled:cursor-not-allowed disabled:opacity-60"
              style={{ backgroundColor: NAVY }}
            >
              {/* green wipe on hover */}
              <span
                className="absolute inset-0 -translate-x-full transition-transform duration-300 ease-out group-hover:translate-x-0"
                style={{
                  background:
                    'linear-gradient(90deg, transparent, rgba(78,167,46,0.22), transparent)',
                }}
              />
              <span className="relative">{loading ? 'Signing in…' : 'Sign in'}</span>
              {!loading && (
                <ArrowRight
                  size={17}
                  className="relative transition-transform duration-200 group-hover:translate-x-0.5"
                />
              )}
            </button>
          </form>

          <div className="mt-10 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-[0.7rem] uppercase tracking-[0.2em] text-muted-foreground">
              Authorized access only
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground/80">
            Please use your KAPS &amp; Co. credentials to continue.
          </p>

          <div className="mt-5 text-center">
            {mode === 'staff' ? (
              <button
                type="button"
                onClick={() => switchMode('admin')}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-[#1b365d]"
              >
                <ShieldCheck size={13} /> Admin login
              </button>
            ) : (
              <button
                type="button"
                onClick={() => switchMode('staff')}
                className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-[#1b365d]"
              >
                <ArrowRight size={13} className="rotate-180" /> Back to staff login
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

interface FieldProps {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
}

function Field({ id, label, type, value, onChange, placeholder, autoComplete }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium" style={{ color: NAVY }}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
        className="w-full rounded-lg border border-[#D1D5DB] bg-white px-3.5 py-2.5 text-[0.95rem] text-foreground outline-none transition-all placeholder:text-muted-foreground/60 focus:border-[#4ea72e] focus:ring-2 focus:ring-[#4ea72e]/25"
      />
    </div>
  );
}
