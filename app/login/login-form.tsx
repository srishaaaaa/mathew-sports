"use client";

import { useState, type CSSProperties } from "react";
import {
  Eye,
  EyeOff,
  Loader2,
  Lock,
  MapPin,
  ShieldCheck,
  Store,
  UserRound,
  AlertCircle,
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

// Admin mode is neutral: it spans both shops.
const ADMIN = {
  primary: "#141414",
  primaryDark: "#000000",
  onPrimary: "#FFFFFF",
  tint: "#F1F1EF",
  border: "#E2E2DE",
};

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
  const c = isAdmin ? ADMIN : branch.colors;

  // Colours the whole card follows; switching branch/mode re-tints smoothly.
  const vars = {
    "--l-primary": c.primary,
    "--l-primary-dark": c.primaryDark,
    "--l-on-primary": c.onPrimary,
    "--l-tint": c.tint,
    "--l-border": c.border,
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

  const switchMode = (m: Mode) => {
    setMode(m);
    setError("");
  };

  const heading = isAdmin ? branches.map((b) => b.shopName).join(" + ") : branch.shopName;
  const eyebrow = isAdmin ? "Admin panel · All branches" : branch.tagline;

  return (
    <main
      style={vars}
      className="min-h-screen w-full flex items-center justify-center p-4 sm:p-8 bg-[radial-gradient(ellipse_at_top,_var(--l-tint),_#FAFAF8_60%)] transition-colors duration-500"
    >
      <div className="w-full max-w-5xl grid md:grid-cols-[0.9fr_1.1fr] bg-white rounded-[28px] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.25)] border border-black/5 overflow-hidden animate-in fade-in zoom-in-95 duration-500">
        {/* ── Brand panel ─────────────────────────────────────── */}
        <section
          className="relative flex flex-col justify-between gap-6 p-7 sm:p-10 text-[var(--l-on-primary)] overflow-hidden transition-[background] duration-500"
          style={{ background: "linear-gradient(150deg, var(--l-primary), var(--l-primary-dark))" }}
        >
          {/* soft glow + rings for depth */}
          <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -left-20 w-80 h-80 rounded-full border-[40px] border-white/5" />

          <p className="relative text-[11px] font-bold uppercase tracking-[0.25em] opacity-80">
            {isAdmin ? "Business control centre" : "Point of sale"}
          </p>

          <div className="relative flex flex-col items-center gap-5 py-2">
            {isAdmin ? (
              <div className="flex items-center gap-4">
                {branches.map((b, i) => (
                  <div
                    key={b.id}
                    className="w-32 h-32 sm:w-36 sm:h-36 rounded-3xl p-3 shadow-2xl ring-1 ring-white/15 flex items-center justify-center overflow-hidden"
                    style={{ transform: `rotate(${i === 0 ? -4 : 4}deg)`, backgroundColor: b.logoBg }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={b.logo} alt={`${b.shopName} logo`} className="max-w-full max-h-full object-contain" />
                  </div>
                ))}
              </div>
            ) : (
              <div
                key={branch.id}
                className="w-44 h-44 sm:w-56 sm:h-56 rounded-[2rem] p-4 shadow-2xl ring-4 ring-white/20 flex items-center justify-center overflow-hidden animate-in fade-in zoom-in-90 duration-500"
                style={{ backgroundColor: branch.logoBg }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={branch.logo} alt={`${branch.shopName} logo`} className="max-w-full max-h-full object-contain" />
              </div>
            )}
            {!isAdmin && (
              <div className="text-center">
                <p className="text-xl font-black tracking-tight">{branch.shopName}</p>
                {branch.address && (
                  <p className="mt-1 text-xs font-medium opacity-75 flex items-start justify-center gap-1.5 max-w-xs">
                    <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    {branch.address}
                  </p>
                )}
              </div>
            )}
          </div>

          <p className="relative flex items-center justify-center gap-2 text-xs font-semibold opacity-80">
            <ShieldCheck className="w-4 h-4" /> Secure retail workspace
          </p>
        </section>

        {/* ── Form panel ──────────────────────────────────────── */}
        <section className="p-7 sm:p-10 flex flex-col">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--l-primary)] transition-colors duration-500">
            {eyebrow}
          </p>
          <h1 className="mt-2 text-3xl sm:text-[2.1rem] leading-tight font-black tracking-tight text-black uppercase">
            {heading}
          </h1>

          {/* Mode switch */}
          <div className="mt-6 grid grid-cols-2 gap-1 p-1 rounded-2xl bg-black/[0.04] border border-black/5">
            {(["staff", "admin"] as const).map((m) => {
              const active = mode === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => switchMode(m)}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                    active
                      ? "bg-[var(--l-primary)] text-[var(--l-on-primary)] shadow-md"
                      : "text-black/50 hover:text-black"
                  }`}
                >
                  {m === "staff" ? <Store className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                  {m === "staff" ? "Staff POS Login" : "Admin"}
                </button>
              );
            })}
          </div>

          <form onSubmit={submit} className="mt-6 flex flex-col gap-5">
            {/* Branch picker */}
            {!isAdmin && (
              <div className="animate-in fade-in slide-in-from-top-1 duration-300">
                <Label icon={<Store className="w-3.5 h-3.5" />}>Select branch</Label>
                <div className="grid sm:grid-cols-2 gap-2.5">
                  {branches.map((b) => {
                    const active = b.id === branch.id;
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => {
                          setBranchId(b.id);
                          setError("");
                        }}
                        className={`flex items-center gap-3 p-2.5 rounded-2xl border-2 text-left transition-all duration-300 cursor-pointer ${
                          active ? "shadow-md -translate-y-0.5" : "border-black/10 hover:border-black/25 opacity-70 hover:opacity-100"
                        }`}
                        style={active ? { borderColor: b.colors.primary, backgroundColor: b.colors.tint } : undefined}
                      >
                        <span className="w-11 h-11 rounded-xl border border-black/10 p-0.5 flex items-center justify-center shrink-0 overflow-hidden" style={{ backgroundColor: b.logoBg }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={b.logo} alt="" className="max-w-full max-h-full object-contain" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-black text-black truncate">{b.shopName}</span>
                          <span className="block text-[11px] font-semibold text-black/50 truncate">{b.tagline}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <Label icon={<UserRound className="w-3.5 h-3.5" />}>
                {isAdmin ? "Admin ID" : `${branch.shopName} staff ID`}
              </Label>
              <input
                value={loginId}
                onChange={(e) => {
                  setLoginId(e.target.value);
                  if (error) setError("");
                }}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                placeholder={isAdmin ? "Enter admin ID" : "Enter staff ID"}
                className="w-full h-12 px-4 rounded-xl bg-[var(--l-tint)]/50 border-2 border-[var(--l-border)] text-black font-semibold placeholder:text-black/35 placeholder:font-medium outline-none focus:border-[var(--l-primary)] focus:bg-white transition-colors"
              />
            </div>

            <div>
              <Label icon={<Lock className="w-3.5 h-3.5" />}>Password</Label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError("");
                  }}
                  autoComplete="current-password"
                  placeholder="Enter password"
                  className="w-full h-12 pl-4 pr-12 rounded-xl bg-[var(--l-tint)]/50 border-2 border-[var(--l-border)] text-black font-semibold placeholder:text-black/35 placeholder:font-medium outline-none focus:border-[var(--l-primary)] focus:bg-white transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg flex items-center justify-center text-black/40 hover:text-black hover:bg-black/5 cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            {error && (
              <p
                role="alert"
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold animate-in fade-in slide-in-from-top-1 duration-200"
              >
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="h-12 mt-1 rounded-xl bg-[var(--l-primary)] hover:bg-[var(--l-primary-dark)] text-[var(--l-on-primary)] font-bold text-sm flex items-center justify-center gap-2 shadow-[0_12px_30px_-10px_var(--l-primary)] active:scale-[0.99] transition-all duration-300 disabled:opacity-70 cursor-pointer"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : isAdmin ? <ShieldCheck className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              {busy ? "Signing in…" : isAdmin ? "Sign in to Admin Panel" : `Launch ${branch.shopName} POS`}
            </button>

            <p className="text-center text-[11px] font-medium text-black/45">
              {isAdmin
                ? "Full access to both branches, staff accounts and combined sales."
                : `Opens the ${branch.shopName} billing terminal — its own products, orders and invoices.`}
            </p>
          </form>

          <p className="mt-auto pt-8 text-center text-[10px] font-semibold uppercase tracking-wider text-black/35">
            Powered by Cenexa Systems · 2026
          </p>
        </section>
      </div>
    </main>
  );
}

function Label({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-1.5 mb-2 text-[11px] font-bold uppercase tracking-wider text-black/60">
      {icon}
      {children}
      <span className="text-[var(--l-primary)]">*</span>
    </label>
  );
}
