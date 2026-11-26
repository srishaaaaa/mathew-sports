"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  AlertCircle,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  Globe,
  KeyRound,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  Package,
  Receipt,
  RefreshCw,
  ShieldCheck,
  Trash2,
  TrendingUp,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import type { Account, Role } from "@/lib/accounts";
import type { BranchId } from "@/lib/branches/types";
import {
  adminLogoutAction,
  changePasswordAction,
  createAccountAction,
  deleteAccountAction,
  listAccountsAction,
  overviewAction,
  type BranchOverview,
} from "./actions";

type View = "overview" | "staff";
type Scope = "all" | BranchId;

const inr = (n: number) =>
  "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const inrShort = (n: number) =>
  "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
const timeAgo = (iso: string) => {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

export default function AdminPanel({ adminName }: { adminName: string }) {
  const [view, setView] = useState<View>("overview");
  const [scope, setScope] = useState<Scope>("all");
  const [menuOpen, setMenuOpen] = useState(false);
  const [data, setData] = useState<BranchOverview[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  // Fetch figures; state is only updated once the request settles.
  const fetchOverview = useCallback(
    () =>
      overviewAction()
        .then((d) => {
          setData(d);
          setLoadError("");
          setUpdatedAt(new Date());
        })
        .catch((e) => {
          console.error(e);
          setLoadError("Couldn't load the latest figures. Retrying shortly.");
        })
        .finally(() => setRefreshing(false)),
    [],
  );

  const load = () => {
    setRefreshing(true);
    fetchOverview();
  };

  useEffect(() => {
    fetchOverview();
    const t = setInterval(fetchOverview, 60_000); // live: refresh every minute
    return () => clearInterval(t);
  }, [fetchOverview]);

  const logout = async () => {
    await adminLogoutAction();
    window.location.replace("/login?mode=admin");
  };

  const go = (v: View) => {
    setView(v);
    setMenuOpen(false);
  };

  const scopeBranch = data?.find((b) => b.id === scope);
  // The panel takes on the chosen branch's colours; neutral for "all branches".
  const accent = scopeBranch
    ? { "--a": scopeBranch.colors.primary, "--a-on": scopeBranch.colors.onPrimary, "--a-tint": scopeBranch.colors.tint }
    : { "--a": "#141414", "--a-on": "#FFFFFF", "--a-tint": "#EFEEEA" };

  return (
    <div style={accent as CSSProperties} className="min-h-screen flex bg-[#F6F5F1] text-black font-sans">
      {/* ── Sidebar ─────────────────────────────────────────── */}
      {menuOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[2px] lg:hidden" onClick={() => setMenuOpen(false)} />
      )}
      <aside
        className={`fixed lg:sticky top-0 z-40 h-screen w-64 shrink-0 bg-[#0F0F0F] text-white border-r border-white/10 shadow-xl flex flex-col transition-transform duration-300 ${
          menuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="p-6 flex items-center gap-3 border-b border-white/10">
          {/* One tile per shop, same size and style as the POS sidebar logo */}
          <div className="flex items-center gap-1.5 shrink-0">
            {(data ?? [null, null]).map((b, i) =>
              b ? (
                <span
                  key={b.id}
                  title={b.shopName}
                  className="w-10 h-10 rounded-xl border border-white/10 overflow-hidden flex items-center justify-center shrink-0"
                  style={{ backgroundColor: b.logoBg }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.logo} alt={`${b.shopName} logo`} className="w-full h-full object-contain" />
                </span>
              ) : (
                <span key={i} className="w-10 h-10 rounded-xl bg-white/10 animate-pulse" />
              ),
            )}
          </div>
          <div className="min-w-0">
            <p className="font-black text-sm tracking-tight leading-tight">Admin Panel</p>
            <span className="inline-block mt-1 px-1.5 py-0.5 rounded bg-white text-black text-[9px] font-black uppercase tracking-wider">
              Admin
            </span>
          </div>
          <button onClick={() => setMenuOpen(false)} className="ml-auto lg:hidden w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center cursor-pointer" aria-label="Close menu">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 pt-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40 mb-2">Operating branch</p>
          <div className="relative">
            <select
              value={scope}
              onChange={(e) => {
                setScope(e.target.value as Scope);
                go("overview");
              }}
              className="w-full appearance-none h-11 pl-3.5 pr-9 rounded-xl bg-white/[0.06] border border-white/15 text-sm font-bold outline-none focus:border-white/40 cursor-pointer"
            >
              <option value="all" className="text-black">All branches</option>
              {(data ?? []).map((b) => (
                <option key={b.id} value={b.id} className="text-black">{b.shopName}</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/60" />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-1">
          <NavItem active={view === "overview"} onClick={() => go("overview")} icon={<LayoutDashboard className="w-[18px] h-[18px]" />}>
            Business Overview
          </NavItem>

          <p className="px-3 pt-5 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">Enter branch workspace</p>
          {(data ?? []).map((b) => (
            <a
              key={b.id}
              href={b.home}
              className="group flex items-center gap-4 px-4 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider text-white hover:bg-white/10 transition-colors"
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: b.colors.primaryLight }} />
              {b.shopName} POS
              <ArrowUpRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-60 transition-opacity" />
            </a>
          ))}

          <div className="pt-4">
            <NavItem active={view === "staff"} onClick={() => go("staff")} icon={<Users className="w-[18px] h-[18px]" />}>
              Staff &amp; Memberships
            </NavItem>
          </div>
        </nav>

        <div className="p-4 border-t border-white/10 flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-white text-black font-black text-sm flex items-center justify-center">
            {adminName.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold truncate">{adminName}</p>
            <p className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">Administrator</p>
          </div>
          <button onClick={logout} className="ml-auto w-9 h-9 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white cursor-pointer" title="Log out" aria-label="Log out">
            <LogOut className="w-[18px] h-[18px]" />
          </button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 flex flex-col">
        <div className="lg:hidden sticky top-0 z-20 flex items-center gap-3 px-4 h-14 bg-[#F6F5F1]/90 backdrop-blur border-b border-black/5">
          <button onClick={() => setMenuOpen(true)} className="w-9 h-9 rounded-lg bg-white border border-black/10 flex items-center justify-center cursor-pointer" aria-label="Open menu">
            <Menu className="w-5 h-5" />
          </button>
          <p className="font-black text-sm">Admin Panel</p>
        </div>

        <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 py-8">
          {view === "overview" ? (
            <Overview
              data={data}
              scope={scope}
              loadError={loadError}
              refreshing={refreshing}
              updatedAt={updatedAt}
              onRefresh={load}
            />
          ) : (
            <Staff branches={data ?? []} />
          )}
        </div>

        <footer className="py-5 text-center text-[11px] font-semibold text-black/40">
          Powered by Cenexa Systems © 2026
        </footer>
      </main>
    </div>
  );
}

function NavItem({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
        active ? "bg-white text-black shadow-lg" : "text-white/80 hover:text-white hover:bg-white/[0.07]"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

// ═════════════════════════════════════════════════════════════════
//  Business overview
// ═════════════════════════════════════════════════════════════════
function Overview({
  data,
  scope,
  loadError,
  refreshing,
  updatedAt,
  onRefresh,
}: {
  data: BranchOverview[] | null;
  scope: Scope;
  loadError: string;
  refreshing: boolean;
  updatedAt: Date | null;
  onRefresh: () => void;
}) {
  const shown = useMemo(() => (data ?? []).filter((b) => scope === "all" || b.id === scope), [data, scope]);
  const sum = (k: "todaySales" | "todayBills" | "monthSales" | "products" | "totalBills") =>
    shown.reduce((t, b) => t + b[k], 0);
  const single = shown.length === 1 ? shown[0] : null;

  return (
    <div className="animate-in fade-in duration-300">
      <header className="flex flex-wrap items-start justify-between gap-4 mb-7">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[28px] font-black text-black tracking-tight">{single ? single.shopName : "Business Overview"}</h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black uppercase tracking-wider">
              <span className="relative flex w-1.5 h-1.5">
                <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-60" />
                <span className="relative w-1.5 h-1.5 rounded-full bg-emerald-500" />
              </span>
              Live
            </span>
          </div>
          <p className="mt-1 text-xs text-black font-semibold">
            {single ? `${single.tagline} · branch figures` : "Combined figures across Matthew Sports and Vybe Girl"}
            {updatedAt && <span className="text-black/35"> · updated {updatedAt.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}</span>}
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 h-10 px-4 rounded-xl bg-white border border-black/10 shadow-sm text-sm font-bold hover:border-black/25 transition-colors disabled:opacity-60 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
        </button>
      </header>

      {loadError && (
        <p className="mb-5 flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-semibold">
          <AlertCircle className="w-4 h-4" /> {loadError}
        </p>
      )}

      {/* Stat tiles */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-8">
        <StatTile loading={!data} icon={<TrendingUp className="w-4 h-4" />} label="Today's sales" value={inr(sum("todaySales"))} note={single ? "This branch, today" : "Both branches, today"} />
        <StatTile loading={!data} icon={<Receipt className="w-4 h-4" />} label="Bills today" value={String(sum("todayBills"))} note={`${sum("totalBills").toLocaleString("en-IN")} invoices all-time`} />
        <StatTile loading={!data} icon={<CalendarDays className="w-4 h-4" />} label="This month" value={inr(sum("monthSales"))} note={new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })} />
        <StatTile loading={!data} icon={<Package className="w-4 h-4" />} label="Products in catalogue" value={String(sum("products"))} note={single ? "This branch" : "Across both branches"} />
      </div>

      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-black/45">Branches</p>
        <p className="text-[11px] font-semibold text-black/35">Each branch runs its own products, orders and invoices</p>
      </div>

      <div className={`grid gap-5 ${shown.length > 1 ? "lg:grid-cols-2" : ""}`}>
        {!data
          ? [0, 1].map((i) => <div key={i} className="h-[430px] rounded-3xl bg-white border border-black/5 animate-pulse" />)
          : shown.map((b) => <BranchCard key={b.id} b={b} />)}
      </div>
    </div>
  );
}

function StatTile({ icon, label, value, note, loading }: { icon: React.ReactNode; label: string; value: string; note: string; loading: boolean }) {
  return (
    <div className="bg-white border border-black/10 rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center justify-between text-black/45">
        <p className="text-[10px] font-bold uppercase tracking-wider text-black">{label}</p>
        <span className="w-7 h-7 rounded-lg bg-[var(--a-tint)] text-[var(--a)] flex items-center justify-center">{icon}</span>
      </div>
      {loading ? (
        <div className="mt-3 h-8 w-28 rounded-lg bg-black/5 animate-pulse" />
      ) : (
        <p className="mt-2 text-xl font-black text-black tabular-nums">{value}</p>
      )}
      <p className="mt-1 text-[9px] font-semibold text-black">{note}</p>
    </div>
  );
}

function BranchCard({ b }: { b: BranchOverview }) {
  const c = b.colors;
  const max = Math.max(...b.last7.map((d) => d.sales), 0);

  return (
    <section
      className="bg-white rounded-3xl border-2 p-5 sm:p-6 flex flex-col gap-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-[0_18px_40px_-18px_rgba(0,0,0,0.25)] transition-shadow animate-in fade-in slide-in-from-bottom-2 duration-500"
      style={{ borderColor: c.primary }}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="w-12 h-12 rounded-2xl border border-black/10 p-1 flex items-center justify-center overflow-hidden shrink-0" style={{ backgroundColor: b.logoBg }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={b.logo} alt="" className="max-w-full max-h-full object-contain" />
        </span>
        <div className="min-w-0">
          <h2 className="font-black text-lg leading-tight truncate">{b.shopName}</h2>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-black/45 truncate">{b.tagline}</p>
        </div>
        <span className="ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider" style={{ backgroundColor: c.tint, color: c.textSoft }}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Operational
        </span>
      </div>

      {/* Figures */}
      <div className="grid grid-cols-3 gap-2.5">
        {[
          ["Today", inr(b.todaySales)],
          ["Bills today", String(b.todayBills)],
          ["This month", inr(b.monthSales)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl px-3 py-3 text-center" style={{ backgroundColor: c.tint }}>
            <p className="text-[10px] font-black uppercase tracking-wider text-black/50">{k}</p>
            <p className="mt-1 text-sm sm:text-base font-black tabular-nums truncate">{v}</p>
          </div>
        ))}
      </div>

      {/* Open advance orders — deposits are held, not yet revenue. */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-dashed border-black/15 px-4 py-2.5 text-xs">
        <span className="font-black uppercase tracking-wider text-black/50">Advance orders</span>
        <span className="font-semibold text-black/70">
          {b.advanceOpen} open · <b className="text-black">{inr(b.advanceDue)}</b> balance due · {inr(b.advanceHeld)} deposits held
        </span>
      </div>

      {/* Last 7 days — one series, so the card title names it (no legend). */}
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-black/50">Sales · last 7 days</p>
          <p className="text-[11px] font-semibold text-black/40 tabular-nums">
            {inrShort(b.last7.reduce((t, d) => t + d.sales, 0))} total
          </p>
        </div>
        <div className="relative h-32 flex items-end gap-2 border-b border-black/10 pt-6" role="img" aria-label={`Daily sales for ${b.shopName}, last 7 days`}>
          {b.last7.map((d, i) => {
            const h = max > 0 ? Math.max((d.sales / max) * 100, d.sales > 0 ? 4 : 0) : 0;
            // keep edge tooltips inside the card
            const tipPos = i <= 1 ? "left-0" : i >= 5 ? "right-0" : "left-1/2 -translate-x-1/2";
            return (
              <div key={d.date} className="group relative flex-1 h-full flex items-end justify-center cursor-default">
                {/* hit target spans the whole column */}
                <div
                  className="w-full max-w-[28px] rounded-t-[4px] transition-[height,opacity] duration-700 group-hover:opacity-80"
                  style={{ height: h ? `${h}%` : "2px", backgroundColor: h ? c.primary : c.border }}
                />
                <div className={`pointer-events-none absolute bottom-full mb-1 ${tipPos} whitespace-nowrap rounded-lg bg-black text-white px-2.5 py-1.5 text-[11px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-lg`}>
                  <span className="text-white/60">{d.label} · </span>
                  {inr(d.sales)} · {d.bills} bill{d.bills === 1 ? "" : "s"}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex gap-2 mt-1.5">
          {b.last7.map((d, i) => (
            <p key={d.date} className={`flex-1 text-center text-[10px] font-bold ${i === 6 ? "text-black" : "text-black/40"}`}>
              {i === 6 ? "Today" : d.label}
            </p>
          ))}
        </div>
      </div>

      {/* Recent invoices */}
      <div className="flex-1">
        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-black/50 mb-2">Recent invoices</p>
        {b.recent.length === 0 ? (
          <p className="text-sm text-black/40 font-medium py-4 text-center rounded-2xl border border-dashed border-black/10">
            No invoices yet — they&apos;ll appear here as soon as {b.shopName} bills a sale.
          </p>
        ) : (
          <ul className="divide-y divide-black/5">
            {b.recent.slice(0, 5).map((o) => (
              <li key={o.id}>
                <a href={`${b.invoiceBase}/${o.id}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 py-2.5 group">
                  <span className="text-xs font-black tabular-nums text-black/70 group-hover:text-black">{o.id}</span>
                  <span className="text-xs font-medium text-black/45 truncate">{o.customer}</span>
                  {o.online && <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/5 text-black/50">Online</span>}
                  <span className="ml-auto text-xs font-black tabular-nums">{inr(o.total)}</span>
                  <span className="w-14 text-right text-[10px] font-semibold text-black/40">{timeAgo(o.createdAt)}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      <a
        href={b.home}
        className="h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-all hover:brightness-95 active:scale-[0.99]"
        style={{ backgroundColor: c.primary, color: c.onPrimary, boxShadow: `0 12px 28px -14px ${c.primary}` }}
      >
        Open {b.shopName} POS <ArrowUpRight className="w-4 h-4" />
      </a>
    </section>
  );
}

// ═════════════════════════════════════════════════════════════════
//  Staff & memberships
// ═════════════════════════════════════════════════════════════════
function Staff({ branches }: { branches: BranchOverview[] }) {
  const [me, setMe] = useState("");
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(
    () =>
      listAccountsAction()
        .then((r) => {
          setMe(r.me);
          setAccounts(r.accounts);
        })
        .catch((e) => {
          console.error(e);
          setError("Couldn't load accounts.");
        }),
    [],
  );

  useEffect(() => {
    load();
  }, [load]);

  const branchOf = (id: BranchId | null) => branches.find((b) => b.id === id);

  return (
    <div className="animate-in fade-in duration-300 space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-black text-black tracking-tight">Staff &amp; Memberships</h1>
          <p className="mt-1 text-xs text-black font-semibold">Login accounts and the branch each one is restricted to.</p>
        </div>
        {accounts && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-black uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" /> {accounts.length} account{accounts.length === 1 ? "" : "s"}
          </span>
        )}
      </header>

      {error && <p className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold">{error}</p>}

      {/* Roster */}
      <Card title={`Active roster${accounts ? ` (${accounts.length})` : ""}`}>
        {!accounts ? (
          <div className="p-5 space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-12 rounded-xl bg-black/5 animate-pulse" />)}</div>
        ) : (
          <ul className="divide-y divide-black/5">
            {accounts.map((a) => (
              <RosterRow key={a.id} a={a} isMe={a.id === me} branch={branchOf(a.branch)} onChanged={load} />
            ))}
          </ul>
        )}
      </Card>

      <div className="grid xl:grid-cols-2 gap-6">
        <AddAccount branches={branches} onCreated={load} />
        <Card title="Change passcodes" subtitle="Takes effect immediately — that person is signed out everywhere.">
          <ul className="divide-y divide-black/5">
            {(accounts ?? []).map((a) => (
              <PasswordRow key={a.id} a={a} branch={branchOf(a.branch)} />
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function Card({ title, subtitle, icon, children }: { title: string; subtitle?: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-3xl border border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className="px-5 sm:px-6 py-4 border-b border-black/5 bg-black/[0.015]">
        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em]">{icon}{title}</p>
        {subtitle && <p className="mt-0.5 text-[11px] font-medium text-black/45">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function Avatar({ a, branch }: { a: Account; branch?: BranchOverview }) {
  const bg = branch ? branch.colors.tint : "#EFEEEA";
  const fg = branch ? branch.colors.textSoft : "#141414";
  return (
    <span className="w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shrink-0" style={{ backgroundColor: bg, color: fg }}>
      {(a.display_name || a.id).charAt(0).toUpperCase()}
    </span>
  );
}

function RosterRow({ a, isMe, branch, onChanged }: { a: Account; isMe: boolean; branch?: BranchOverview; onChanged: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const remove = async () => {
    setBusy(true);
    const r = await deleteAccountAction(a.id);
    setBusy(false);
    if (r.ok) onChanged();
    else {
      setError(r.error);
      setConfirming(false);
    }
  };

  return (
    <li className="px-5 sm:px-6 py-3.5 flex items-center gap-3">
      <Avatar a={a} branch={branch} />
      <div className="min-w-0">
        <p className="flex items-center gap-2 font-bold text-sm">
          {a.display_name || a.id}
          <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${a.role === "admin" ? "bg-black text-white" : "bg-black/5 text-black/60"}`}>
            {a.role}
          </span>
          {isMe && <span className="text-[10px] font-semibold text-black/40">(you)</span>}
        </p>
        <p className="text-xs text-black/45 font-medium truncate">Signs in with passcode · {a.id}</p>
        {error && <p className="text-xs text-red-600 font-semibold mt-0.5">{error}</p>}
      </div>
      <div className="ml-auto text-right">
        <p className="text-xs font-black" style={{ color: branch ? branch.colors.primaryDark : "#141414" }}>
          {branch ? branch.shopName : "All branches + admin panel"}
        </p>
        <p className="text-[10px] font-semibold text-black/40 flex items-center justify-end gap-1">
          {branch ? <><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Branch-restricted</> : <><Globe className="w-3 h-3" /> Full access</>}
        </p>
      </div>
      {!isMe &&
        (confirming ? (
          <div className="flex items-center gap-1.5 animate-in fade-in duration-200">
            <button onClick={remove} disabled={busy} className="h-8 px-3 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 disabled:opacity-60 cursor-pointer">
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Remove"}
            </button>
            <button onClick={() => setConfirming(false)} className="h-8 px-2.5 rounded-lg text-xs font-bold text-black/60 hover:bg-black/5 cursor-pointer">Cancel</button>
          </div>
        ) : (
          <button onClick={() => { setConfirming(true); setError(""); }} className="w-8 h-8 rounded-lg text-black/35 hover:text-red-600 hover:bg-red-50 flex items-center justify-center cursor-pointer" title={`Remove ${a.id}`} aria-label={`Remove ${a.id}`}>
            <Trash2 className="w-4 h-4" />
          </button>
        ))}
    </li>
  );
}

function PasswordInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative flex-1 min-w-0">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="new-password"
        className="w-full h-10 pl-3.5 pr-10 rounded-xl bg-[var(--a-tint)]/60 border border-black/10 text-sm font-semibold placeholder:text-black/35 placeholder:font-medium outline-none focus:border-[var(--a)] focus:bg-white transition-colors"
      />
      <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-md flex items-center justify-center text-black/40 hover:text-black cursor-pointer" aria-label={show ? "Hide passcode" : "Show passcode"}>
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

function PasswordRow({ a, branch }: { a: Account; branch?: BranchOverview }) {
  const [pw, setPw] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState("");

  const save = async () => {
    setState("saving");
    setError("");
    const r = await changePasswordAction(a.id, pw);
    if (r.ok) {
      setPw("");
      setState("saved");
      setTimeout(() => setState("idle"), 2500);
    } else {
      setError(r.error);
      setState("idle");
    }
  };

  return (
    <li className="px-5 sm:px-6 py-3.5">
      <div className="flex items-center gap-3">
        <Avatar a={a} branch={branch} />
        <div className="w-28 shrink-0 min-w-0">
          <p className="text-sm font-bold truncate">{a.display_name || a.id}</p>
          <p className="text-[10px] font-semibold text-black/40 truncate">{branch ? branch.shopName : "Admin"}</p>
        </div>
        <PasswordInput value={pw} onChange={(v) => { setPw(v); setError(""); }} placeholder="New passcode" />
        <button
          onClick={save}
          disabled={pw.length < 4 || state === "saving"}
          className="h-10 w-20 shrink-0 rounded-xl bg-[var(--a)] text-[var(--a-on)] text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-35 transition-opacity cursor-pointer disabled:cursor-not-allowed"
        >
          {state === "saving" ? <Loader2 className="w-4 h-4 animate-spin" /> : state === "saved" ? <><Check className="w-4 h-4" /> Saved</> : <><KeyRound className="w-3.5 h-3.5" /> Save</>}
        </button>
      </div>
      {error && <p className="mt-1.5 ml-[52px] text-xs text-red-600 font-semibold">{error}</p>}
    </li>
  );
}

function AddAccount({ branches, onCreated }: { branches: BranchOverview[]; onCreated: () => void }) {
  const [role, setRole] = useState<Role>("staff");
  const [branch, setBranch] = useState<BranchId>("pos1");
  const [name, setName] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const r = await createAccountAction({ displayName: name, role, branch: role === "staff" ? branch : null, password: pw });
    setBusy(false);
    if (r.ok) {
      setMsg({ ok: true, text: `${name.trim()} can now sign in with that passcode.` });
      setName("");
      setPw("");
      onCreated();
    } else setMsg({ ok: false, text: r.error });
  };

  const field = "w-full h-10 px-3.5 rounded-xl bg-[var(--a-tint)]/60 border border-black/10 text-sm font-semibold placeholder:text-black/35 placeholder:font-medium outline-none focus:border-[var(--a)] focus:bg-white transition-colors";

  return (
    <Card title="Add account" subtitle="Staff sign in with just their passcode, and only to the branch you pick." icon={<UserPlus className="w-4 h-4" />}>
      <form onSubmit={submit} className="p-5 sm:p-6 space-y-4">
        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-black/[0.04]">
          {(["staff", "admin"] as const).map((r) => (
            <button key={r} type="button" onClick={() => setRole(r)} className={`h-9 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${role === r ? "bg-white shadow-sm text-black" : "text-black/50"}`}>
              {r === "staff" ? "Staff" : "Admin"}
            </button>
          ))}
        </div>

        {role === "staff" && (
          <div className="grid grid-cols-2 gap-2 animate-in fade-in duration-200">
            {branches.map((b) => {
              const active = branch === b.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBranch(b.id)}
                  className="flex items-center gap-2 p-2 rounded-xl border-2 text-left transition-all cursor-pointer"
                  style={active ? { borderColor: b.colors.primary, backgroundColor: b.colors.tint } : { borderColor: "rgba(0,0,0,0.08)" }}
                >
                  <span className="w-8 h-8 rounded-lg border border-black/10 p-0.5 flex items-center justify-center overflow-hidden shrink-0" style={{ backgroundColor: b.logoBg }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={b.logo} alt="" className="max-w-full max-h-full object-contain" />
                  </span>
                  <span className="text-xs font-black truncate">{b.shopName}</span>
                </button>
              );
            })}
          </div>
        )}

        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className={field} />
        <PasswordInput value={pw} onChange={setPw} placeholder="Passcode (min. 4 characters)" />

        {msg && (
          <p className={`text-xs font-semibold px-3 py-2 rounded-lg ${msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{msg.text}</p>
        )}

        <button
          type="submit"
          disabled={busy || !name.trim() || pw.length < 4}
          className="w-full h-11 rounded-xl bg-[var(--a)] text-[var(--a-on)] text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40 transition-opacity cursor-pointer disabled:cursor-not-allowed"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
          Create {role} account
        </button>
      </form>
    </Card>
  );
}
