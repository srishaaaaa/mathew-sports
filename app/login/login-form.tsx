"use client";

import { useState, type CSSProperties } from "react";
import {
  AlertCircle,
  ChevronRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  ShieldCheck,
  Store,
  UserRound,
} from "lucide-react";
import type { BranchId, ThemeColors } from "@/lib/branches/types";
import { loginAction } from "./actions";

export type LoginBranch = {
  id: BranchId;
  shopName: string;
  tagline: string;
  address: string;
  logo: string;
  logoBg: string;
  colors: ThemeColors;
};

type Mode = "staff" | "admin";
type Accent = { accent: string; accentDark: string; onAccent: string };

// On this dark screen the accent must glow. Themes whose primary is near-black
// (e.g. "Night Court", "Noir & Rose") swap to their lettering colour instead.
function accentFor(c: ThemeColors): Accent {
  const hex = c.primary.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance < 0.12
    ? { accent: c.onPrimary, accentDark: c.primaryLight, onAccent: c.primary }
    : { accent: c.primary, accentDark: c.primaryDark, onAccent: c.onPrimary };
}

// Admin spans both shops: clean white on black.
const ADMIN_ACCENT: Accent = { accent: "#FFFFFF", accentDark: "#D9D9D9", onAccent: "#0F0F0F" };

export default function LoginForm({
  branches,
  initialBranch,
  initialMode,
}: {
  branches: LoginBranch[];
  initialBranch: BranchId;
  initialMode: Mode;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [branchId, setBranchId] = useState<BranchId>(initialBranch);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const branch = branches.find((b) => b.id === branchId) ?? branches[0];
  const isAdmin = mode === "admin";
  const a = isAdmin ? ADMIN_ACCENT : accentFor(branch.colors);
  // Background orbs: the chosen shop's colour, or one orb per shop for admin.
  const orbA = isAdmin ? accentFor(branches[0].colors).accent : a.accent;
  const orbB = isAdmin ? accentFor(branches[1]?.colors ?? branches[0].colors).accent : branch.colors.primaryLight;

  const vars = {
    "--l-accent": a.accent,
    "--l-accent-dark": a.accentDark,
    "--l-on-accent": a.onAccent,
  } as CSSProperties;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await loginAction(
        isAdmin
          ? { mode: "admin", id: loginId, password }
          : { mode: "staff", branch: branch.id, id: loginId, password },
      );
      if (res.ok) {
        window.location.assign(res.redirect);
        return; // keep the spinner while the next page loads
      }
      setError(res.error);
    } catch (err) {
      console.error(err);
      setError("Couldn't reach the server. Check your connection and try again.");
    }
    setBusy(false);
  };

  const clearError = () => error && setError("");

  return (
    <main
      style={vars}
      className="min-h-screen bg-[#0F0F0F] flex items-center justify-center p-6 relative overflow-hidden font-sans"
    >
      {/* Abstract background orbs */}
      <div
        className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full blur-[120px] mix-blend-screen animate-pulse opacity-25 transition-colors duration-700"
        style={{ backgroundColor: orbA }}
      />
      <div
        className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full blur-[120px] mix-blend-screen animate-pulse opacity-15 transition-colors duration-700"
        style={{ backgroundColor: orbB, animationDelay: "2s" }}
      />

      <div className="relative z-10 w-full max-w-6xl flex flex-col lg:flex-row items-center gap-12 lg:gap-20 py-8">
        {/* ── Left: branding ─────────────────────────────────── */}
        <div className="w-full lg:w-1/2 flex flex-col items-center lg:items-start text-center lg:text-left">
          {isAdmin ? (
            <div className="flex -space-x-4 mb-8">
              {branches.map((b, i) => (
                <div
                  key={b.id}
                  className="w-24 h-24 rounded-3xl overflow-hidden border border-white/10 shadow-2xl p-1.5 hover:scale-105 hover:z-10 transition-transform duration-500"
                  style={{ backgroundColor: b.logoBg, transform: `rotate(${i === 0 ? -6 : 6}deg)` }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.logo} alt={`${b.shopName} logo`} className="w-full h-full object-contain" />
                </div>
              ))}
            </div>
          ) : (
            <div
              key={branch.id}
              className="w-24 h-24 rounded-3xl overflow-hidden border border-white/10 shadow-2xl mb-8 p-1.5 group hover:scale-105 transition-transform duration-500 animate-in fade-in zoom-in-90"
              style={{ backgroundColor: branch.logoBg }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={branch.logo}
                alt={`${branch.shopName} logo`}
                className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500"
              />
            </div>
          )}

          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full mb-6 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-[var(--l-accent)] animate-pulse transition-colors duration-500" />
            <span className="text-[10px] font-bold text-white/80 tracking-widest uppercase">
              {isAdmin ? "Admin · All branches" : `System Online · ${branch.tagline}`}
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-white/90 to-white/40 tracking-tight leading-[1.1] mb-6">
            Next-Gen <br /> POS Control.
          </h1>
          <p className="text-white/50 text-base md:text-lg font-medium leading-relaxed max-w-md">
            {isAdmin ? (
              <>
                One control centre for{" "}
                <span className="text-white/80">{branches.map((b) => b.shopName).join(" and ")}</span> — combined
                sales, both terminals and staff accounts.
              </>
            ) : (
              <>
                Seamlessly manage orders, analytics, and digital invoices for{" "}
                <span className="text-white/80">{branch.shopName}</span> through a unified, hyper-fast portal.
              </>
            )}
          </p>
        </div>

        {/* ── Right: login card ──────────────────────────────── */}
        <div className="w-full lg:w-1/2 max-w-md">
          <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 md:p-10 shadow-[0_20px_70px_rgba(0,0,0,0.5)] relative overflow-hidden group">
            {/* card internal glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[60px] opacity-0 group-hover:opacity-25 transition-opacity duration-700 bg-[var(--l-accent)]" />

            <div className="relative z-10">
              <h3 className="text-2xl font-bold text-white mb-2">Welcome Back</h3>
              <p className="text-white/40 text-sm font-medium mb-7">
                {isAdmin ? "Sign in with your admin ID to open the control centre." : "Choose your branch and sign in to access the terminal."}
              </p>

              {/* Staff / Admin switch */}
              <div className="grid grid-cols-2 gap-1 p-1 mb-6 rounded-2xl bg-black/40 border border-white/10">
                {(["staff", "admin"] as const).map((m) => {
                  const active = mode === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setMode(m);
                        setError("");
                      }}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-[0.15em] transition-all duration-300 cursor-pointer ${
                        active
                          ? "bg-[var(--l-accent)] text-[var(--l-on-accent)] shadow-lg"
                          : "text-white/40 hover:text-white/80"
                      }`}
                    >
                      {m === "staff" ? <Store className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                      {m === "staff" ? "Staff POS" : "Admin"}
                    </button>
                  );
                })}
              </div>

              <form onSubmit={submit} className="space-y-5">
                {/* Branch picker */}
                {!isAdmin && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-300">
                    <label className="block text-[10px] font-bold text-white/60 uppercase tracking-[0.2em] ml-1">Branch</label>
                    <div className="grid grid-cols-1 min-[440px]:grid-cols-2 gap-2.5">
                      {branches.map((b) => {
                        const active = b.id === branch.id;
                        const ba = accentFor(b.colors);
                        return (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => {
                              setBranchId(b.id);
                              setError("");
                            }}
                            className={`flex items-center gap-2.5 p-2.5 rounded-2xl border text-left transition-all duration-300 cursor-pointer ${
                              active ? "bg-white/10 shadow-lg" : "bg-black/30 border-white/10 hover:border-white/25 opacity-60 hover:opacity-100"
                            }`}
                            style={active ? { borderColor: ba.accent, boxShadow: `0 0 0 1px ${ba.accent}, 0 10px 30px -12px ${ba.accent}` } : undefined}
                          >
                            <span
                              className="w-10 h-10 rounded-xl p-0.5 overflow-hidden shrink-0 border border-white/10"
                              style={{ backgroundColor: b.logoBg }}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={b.logo} alt="" className="w-full h-full object-contain" />
                            </span>
                            <span className="min-w-0">
                              <span className="block text-sm font-bold text-white truncate">{b.shopName}</span>
                              <span className="block text-[10px] font-semibold text-white/40 truncate">{b.tagline}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Login ID */}
                <div className="space-y-3">
                  <label htmlFor="login-id" className="block text-[10px] font-bold text-white/60 uppercase tracking-[0.2em] ml-1">
                    {isAdmin ? "Admin ID" : "Staff ID"}
                  </label>
                  <div className="relative">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-white/30">
                      <UserRound className="w-5 h-5" />
                    </div>
                    <input
                      id="login-id"
                      value={loginId}
                      onChange={(e) => {
                        setLoginId(e.target.value);
                        clearError();
                      }}
                      autoComplete="username"
                      autoCapitalize="none"
                      spellCheck={false}
                      autoFocus
                      placeholder={isAdmin ? "Enter admin ID" : "Enter staff ID"}
                      className="w-full bg-black/40 border border-white/10 hover:border-white/20 focus:border-[var(--l-accent)] focus:bg-black/60 rounded-2xl pl-14 pr-5 py-4 text-white font-bold focus:outline-none transition-all placeholder:text-white/20 placeholder:font-medium"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-3">
                  <label htmlFor="login-password" className="block text-[10px] font-bold text-white/60 uppercase tracking-[0.2em] ml-1">
                    Security Password
                  </label>
                  <div className="relative">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-white/30">
                      <Lock className="w-5 h-5" />
                    </div>
                    <input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        clearError();
                      }}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      className="w-full bg-black/40 border border-white/10 hover:border-white/20 focus:border-[var(--l-accent)] focus:bg-black/60 rounded-2xl pl-14 pr-14 py-4 text-white font-bold tracking-widest text-lg focus:outline-none transition-all placeholder:text-white/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/80 transition-colors cursor-pointer"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <p
                    role="alert"
                    className="flex items-center gap-2 text-xs font-bold text-[#FF6B6B] ml-1 animate-in fade-in slide-in-from-top-1"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full py-4 bg-gradient-to-r from-[var(--l-accent)] to-[var(--l-accent-dark)] hover:brightness-110 active:scale-[0.98] text-[var(--l-on-accent)] rounded-2xl font-bold text-sm uppercase tracking-[0.15em] transition-all shadow-[0_10px_30px_color-mix(in_srgb,var(--l-accent)_35%,transparent)] hover:shadow-[0_10px_40px_color-mix(in_srgb,var(--l-accent)_55%,transparent)] flex items-center justify-center gap-3 mt-2 group/btn cursor-pointer disabled:opacity-70 disabled:cursor-wait"
                >
                  {busy ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Authenticating
                    </>
                  ) : (
                    <>
                      {isAdmin ? "Enter Admin Panel" : `Launch ${branch.shopName}`}
                      <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-center gap-2 text-white/30 text-[10px] font-bold tracking-widest uppercase">
            <ShieldCheck className="w-3.5 h-3.5" />
            End-to-End Encrypted Session
          </div>
          <p className="mt-3 text-center text-white/20 text-[10px] font-semibold tracking-wider uppercase">
            Powered by Cenexa Systems · 2026
          </p>
        </div>
      </div>
    </main>
  );
}
