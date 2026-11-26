"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Ban,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  IndianRupee,
  Loader2,
  MessageCircle,
  Package,
  Printer,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  balanceDiscount,
  balanceDue,
  cgstSgst,
  describePayment,
  type AdvanceOrder,
  type AdvanceStatus,
} from "@/lib/payments";
import PaymentPicker, { initialPayState, payStateError, splitParts, type PayState } from "./payment-picker";
import { PrintSettingsModal, fmtDate, inr, shareOnWhatsApp, type AdvanceActions, type AdvanceBranch } from "./shared";

type Period = "all" | "today" | "week" | "month" | "year" | "custom";
type StatusFilter = "ALL" | AdvanceStatus;

const STATUS_STYLE: Record<AdvanceStatus, string> = {
  PENDING: "bg-amber-50 text-amber-800 border-amber-200",
  READY: "bg-sky-50 text-sky-800 border-sky-200",
  COMPLETED: "bg-emerald-50 text-emerald-800 border-emerald-200",
  CANCELLED: "bg-black/5 text-black/50 border-black/10",
};

const localDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default function AdvanceOrdersPanel({
  branch,
  actions,
  role,
  onInvoiceCreated,
  refreshKey,
}: {
  branch: AdvanceBranch;
  actions: AdvanceActions;
  role: "admin" | "staff";
  /** Called after a balance is collected, so history and analytics reload. */
  onInvoiceCreated: () => void;
  /** Bump to reload (e.g. after a new advance order is booked). */
  refreshKey?: number;
}) {
  const [orders, setOrders] = useState<AdvanceOrder[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState<Period>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [viewing, setViewing] = useState<AdvanceOrder | null>(null);
  const [collecting, setCollecting] = useState<AdvanceOrder | null>(null);
  const [printUrl, setPrintUrl] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ title: string; body: string; label: string; run: () => Promise<void> } | null>(null);

  const reload = useCallback(
    () =>
      actions
        .list()
        .then((d) => {
          setOrders(d);
          setError("");
        })
        .catch((e) => {
          console.error(e);
          setError("Couldn't load advance orders.");
        })
        .finally(() => setLoading(false)),
    [actions],
  );

  useEffect(() => {
    reload();
  }, [reload, refreshKey]);

  const inPeriod = useCallback(
    (iso: string) => {
      const d = new Date(iso);
      const now = new Date();
      if (period === "today") return localDay(d) === localDay(now);
      if (period === "week") {
        const start = new Date(now);
        start.setDate(now.getDate() - ((now.getDay() + 6) % 7));
        start.setHours(0, 0, 0, 0);
        return d >= start;
      }
      if (period === "month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      if (period === "year") return d.getFullYear() === now.getFullYear();
      if (period === "custom") {
        const day = localDay(d);
        return (!from || day >= from) && (!to || day <= to);
      }
      return true;
    },
    [period, from, to],
  );

  const inRange = useMemo(() => (orders ?? []).filter((o) => inPeriod(o.created_at)), [orders, inPeriod]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return inRange.filter(
      (o) =>
        (status === "ALL" || o.status === status) &&
        (!q ||
          [o.id, o.customer_name, o.customer_phone, o.status, ...o.items.map((i) => i.name)].some((s) => s.toLowerCase().includes(q))),
    );
  }, [inRange, query, status]);

  const open = inRange.filter((o) => o.status === "PENDING" || o.status === "READY");
  const stats = {
    outstanding: open.reduce((t, o) => t + balanceDue(o), 0),
    ready: inRange.filter((o) => o.status === "READY").length,
    completed: inRange.filter((o) => o.status === "COMPLETED").length,
  };

  const run = async (id: string, fn: () => Promise<void>) => {
    setBusyId(id);
    try {
      await fn();
      await reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusyId(null);
    }
  };

  const whatsapp = (o: AdvanceOrder) =>
    shareOnWhatsApp(o.customer_phone, [
      `✨ *${branch.shopName}* ✨`,
      "",
      o.status === "COMPLETED" ? `Advance order *${o.id}* — paid in full. Thank you!` : `Advance order *${o.id}*`,
      `Order total: ${inr(o.total_amount)}`,
      `Paid so far: ${inr(o.payments.reduce((t, p) => t + p.amount, 0))}`,
      o.status === "COMPLETED" ? "" : `*Balance due: ${inr(balanceDue(o))}*`,
      o.delivery_date ? `Delivery: ${fmtDate(o.delivery_date)}` : "",
      "",
      `Receipt: ${window.location.origin}${branch.receiptBase}/${o.id}`,
    ].filter(Boolean));

  return (
    <div className="flex-1 flex flex-col max-w-[1400px] mx-auto w-full pb-8 pr-2 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6">
        <div>
          <h2 className="text-[28px] font-black text-black tracking-tight">Advance Orders</h2>
          <p className="text-xs font-semibold text-black/60">Partial-payment holds — revenue is recognised only when the balance is collected.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-white border border-black/10 rounded-xl p-1 shadow-sm">
            <span className="px-2 text-[9px] font-bold uppercase tracking-wider">Period:</span>
            {(["all", "today", "week", "month", "year"] as const).map((p) => (
              <button
                key={p}
                onClick={() => {
                  setPeriod(p);
                  setFrom("");
                  setTo("");
                }}
                className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer ${
                  period === p ? "bg-[var(--brand-primary-dark)] text-[var(--brand-on-primary)]" : "hover:bg-black/5"
                }`}
              >
                {p === "all" ? "All time" : p === "today" ? "Today" : `This ${p}`}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 bg-white border border-black/10 rounded-xl px-3 py-1.5 shadow-sm">
            <span className="text-[9px] font-bold uppercase">From:</span>
            <input type="date" value={from} onChange={(e) => { setPeriod("custom"); setFrom(e.target.value); }} className="text-xs font-bold outline-none w-[118px] cursor-pointer" />
            <span className="text-[9px] font-bold uppercase">To:</span>
            <input type="date" value={to} onChange={(e) => { setPeriod("custom"); setTo(e.target.value); }} className="text-xs font-bold outline-none w-[118px] cursor-pointer" />
          </div>
          <button
            onClick={() => {
              setLoading(true);
              reload();
            }}
            className="w-9 h-9 rounded-xl bg-white border border-black/10 shadow-sm flex items-center justify-center cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Stat label="Outstanding balance" value={inr(stats.outstanding)} icon={<IndianRupee className="w-5 h-5 text-[#DC2626]" />} tone="bg-[#FEE2E2]" />
        <Stat label="Ready for collection" value={String(stats.ready)} icon={<Package className="w-5 h-5 text-[#2563EB]" />} tone="bg-[#DBEAFE]" />
        <Stat label="Completed deposits" value={String(stats.completed)} icon={<CheckCircle2 className="w-5 h-5 text-[#16A34A]" />} tone="bg-[#DCFCE7]" />
      </div>

      {/* Search + status */}
      <div className="flex flex-col lg:flex-row gap-3 bg-white border border-black/10 rounded-2xl p-3 shadow-sm mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by ID, customer, phone, product or status" className="w-full h-10 pl-9 pr-3 rounded-xl border border-black/10 text-sm outline-none focus:border-[var(--brand-primary)]" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(["ALL", "PENDING", "READY", "COMPLETED", "CANCELLED"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-3.5 h-10 rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer ${
                status === s ? "bg-[var(--brand-primary)] text-[var(--brand-on-primary)]" : "bg-black/[0.04] hover:bg-black/[0.08]"
              }`}
            >
              {s === "ALL" ? "All" : s.toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold">{error}</p>}

      {/* Table */}
      <div className="bg-white border border-black/10 rounded-2xl shadow-sm overflow-x-auto">
        <table className="w-full min-w-[980px] text-left">
          <thead>
            <tr className="border-b border-black/10 bg-black/[0.02] text-[10px] font-black uppercase tracking-wider text-[var(--brand-primary-dark)]">
              <th className="px-4 py-3">Deposit ID</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Products</th>
              <th className="px-4 py-3">Total / Paid / Balance</th>
              <th className="px-4 py-3">Delivery</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders === null ? (
              <tr>
                <td colSpan={7} className="p-10 text-center"><Loader2 className="w-5 h-5 animate-spin inline text-black/40" /></td>
              </tr>
            ) : shown.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-10 text-center text-sm font-semibold text-black/45">
                  No advance orders {status !== "ALL" || query ? "match these filters" : "yet — use “Save as Advance Order” on the billing panel"}.
                </td>
              </tr>
            ) : (
              shown.map((o) => {
                const paid = o.payments.reduce((t, p) => t + p.amount, 0);
                const isOpen = o.status === "PENDING" || o.status === "READY";
                const busy = busyId === o.id;
                return (
                  <tr key={o.id} className="border-b border-black/5 last:border-0 hover:bg-black/[0.015] align-top">
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs font-bold">{o.id}</p>
                      <p className="text-[10px] font-semibold text-[var(--brand-primary-dark)]">{fmtDate(o.created_at)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-bold">{o.customer_name}</p>
                      <p className="text-[11px] text-black/50">{o.customer_phone || "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold max-w-[220px]">
                      {o.items.slice(0, 2).map((i, k) => (
                        <p key={k} className="truncate">{i.qty}× {i.name}</p>
                      ))}
                      {o.items.length > 2 && <p className="text-black/45">+{o.items.length - 2} more</p>}
                    </td>
                    <td className="px-4 py-3 text-xs font-bold leading-5">
                      <p>Total: {inr(o.total_amount)}</p>
                      <p className="text-emerald-700">Paid: {inr(paid)}</p>
                      {o.status !== "COMPLETED" && <p className="text-red-600">Balance: {inr(o.status === "CANCELLED" ? 0 : balanceDue(o))}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs font-bold text-[var(--brand-primary-dark)] whitespace-nowrap">{fmtDate(o.delivery_date)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-md border text-[10px] font-black uppercase tracking-wider ${STATUS_STYLE[o.status]}`}>{o.status}</span>
                      {isOpen && (
                        <button
                          onClick={() => run(o.id, () => actions.setStatus(o.id, o.status === "READY" ? "PENDING" : "READY"))}
                          disabled={busy}
                          className="block mt-1 text-[10px] font-black uppercase tracking-wider text-sky-700 hover:underline cursor-pointer"
                        >
                          {o.status === "READY" ? "Back to pending" : "Mark as ready"}
                        </button>
                      )}
                      {o.finalized_order_id && (
                        <a href={`${branch.invoiceBase}/${o.finalized_order_id}`} target="_blank" rel="noreferrer" className="block mt-1 text-[10px] font-bold text-black/50 hover:underline">
                          Invoice {o.finalized_order_id}
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <IconBtn title="Send on WhatsApp" tone="bg-emerald-50 text-emerald-700" onClick={() => whatsapp(o)}><MessageCircle className="w-4 h-4" /></IconBtn>
                        <IconBtn title={o.status === "COMPLETED" ? "Open final bill" : "Open advance receipt"} tone="bg-[var(--brand-tint)] text-[var(--brand-primary-dark)]" onClick={() => setPreview(o.id)}><FileText className="w-4 h-4" /></IconBtn>
                        <IconBtn title="Print" tone="bg-black/5 text-black/70" onClick={() => setPrintUrl(`${branch.receiptBase}/${o.id}`)}><Printer className="w-4 h-4" /></IconBtn>
                        <IconBtn title="View details" tone="bg-black/5 text-black/70" onClick={() => setViewing(o)}><Eye className="w-4 h-4" /></IconBtn>
                        {isOpen && (
                          <IconBtn title="Receive balance" tone="bg-emerald-100 text-emerald-800" onClick={() => setCollecting(o)}><IndianRupee className="w-4 h-4" /></IconBtn>
                        )}
                        {isOpen && role === "admin" && (
                          <IconBtn
                            title="Cancel order"
                            tone="bg-amber-50 text-amber-700"
                            onClick={() =>
                              setConfirm({
                                title: "Cancel this advance order?",
                                body: `${o.id} for ${o.customer_name} will be marked cancelled. The ${inr(o.deposit_amount)} deposit stays on record — refund it separately if needed.`,
                                label: "Cancel order",
                                run: () => run(o.id, () => actions.cancel(o.id)),
                              })
                            }
                          >
                            <Ban className="w-4 h-4" />
                          </IconBtn>
                        )}
                        {role === "admin" && (
                          <IconBtn
                            title="Delete"
                            tone="bg-red-50 text-red-600"
                            onClick={() =>
                              setConfirm({
                                title: "Delete this advance order?",
                                body: `${o.id} will be permanently removed.${o.finalized_order_id ? ` Its invoice ${o.finalized_order_id} is kept.` : ""} This can't be undone.`,
                                label: "Delete",
                                run: () => run(o.id, () => actions.remove(o.id)),
                              })
                            }
                          >
                            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </IconBtn>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {viewing && (
        <DetailsModal
          order={viewing}
          onClose={() => setViewing(null)}
          onPrint={() => setPrintUrl(`${branch.receiptBase}/${viewing.id}`)}
          onShare={() => whatsapp(viewing)}
        />
      )}
      {collecting && (
        <ReceiveBalanceModal
          order={collecting}
          actions={actions}
          onClose={() => setCollecting(null)}
          onDone={async () => {
            await reload();
            onInvoiceCreated();
          }}
          onPrint={(id) => setPrintUrl(`${branch.receiptBase}/${id}`)}
        />
      )}
      {printUrl && <PrintSettingsModal url={printUrl} onClose={() => setPrintUrl(null)} />}
      {preview && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[400] flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150" onClick={() => setPreview(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[92vh] sm:h-[88vh] flex flex-col overflow-hidden border border-neutral-300" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-2.5 flex justify-between items-center bg-neutral-900 text-white shrink-0">
              <h3 className="font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                <Printer className="w-3.5 h-3.5 text-neutral-300" /> Invoice preview • #{preview}
              </h3>
              <div className="flex items-center gap-2">
                <button onClick={() => setPrintUrl(`${branch.receiptBase}/${preview}`)} className="text-[11px] font-semibold text-neutral-300 hover:text-white px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded cursor-pointer">
                  Print
                </button>
                <a href={`${branch.receiptBase}/${preview}`} target="_blank" rel="noopener noreferrer" className="text-[11px] font-semibold text-neutral-300 hover:text-white px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded">
                  Open full page ↗
                </a>
                <button onClick={() => setPreview(null)} className="w-7 h-7 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded cursor-pointer" aria-label="Close preview">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <iframe src={`${branch.receiptBase}/${preview}`} className="flex-1 w-full border-none bg-neutral-100" title={`Advance ${preview}`} />
          </div>
        </div>
      )}
      {confirm && (
        <div className="fixed inset-0 z-[130] bg-black/50 flex items-center justify-center p-4" onClick={() => setConfirm(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-black">{confirm.title}</h3>
            <p className="mt-2 text-sm text-black/60">{confirm.body}</p>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setConfirm(null)} className="px-4 py-2 rounded-lg text-xs font-bold uppercase hover:bg-black/5 cursor-pointer">Keep</button>
              <button
                onClick={async () => {
                  const c = confirm;
                  setConfirm(null);
                  await c.run();
                }}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-bold uppercase cursor-pointer"
              >
                {confirm.label}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, icon, tone }: { label: string; value: string; icon: React.ReactNode; tone: string }) {
  return (
    <div className="bg-white border border-black/10 rounded-xl p-4 shadow-sm flex justify-between items-center">
      <div>
        <p className="text-[10px] font-bold text-[var(--brand-primary-dark)] uppercase tracking-wider">{label}</p>
        <p className="text-xl font-black text-black tabular-nums">{value}</p>
      </div>
      <span className={`w-10 h-10 rounded-lg flex items-center justify-center ${tone}`}>{icon}</span>
    </div>
  );
}

function IconBtn({ title, tone, onClick, children }: { title: string; tone: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} title={title} aria-label={title} className={`w-9 h-9 rounded-xl flex items-center justify-center hover:brightness-95 transition cursor-pointer ${tone}`}>
      {children}
    </button>
  );
}

function Totals({ o }: { o: AdvanceOrder }) {
  const g = cgstSgst(o.gst_percentage, o.gst_amount);
  return (
    <div className="rounded-xl border border-black/10 p-3 text-xs space-y-1">
      <Line k="Subtotal" v={inr(o.subtotal)} />
      {o.discount_amount > 0 && (
        <Line k={`Discount${o.discount_type === "PERCENT" ? ` (${o.discount_value}%)` : ""}`} v={`− ${inr(o.discount_amount)}`} />
      )}
      {o.is_gst && (
        <>
          <Line k={`CGST (${g.rate}%)`} v={inr(g.amount)} />
          <Line k={`SGST (${g.rate}%)`} v={inr(g.amount)} />
        </>
      )}
      {o.delivery_fee > 0 && <Line k="Delivery" v={inr(o.delivery_fee)} />}
      <div className="flex justify-between pt-1.5 mt-1 border-t border-black/10 font-black text-sm">
        <span>Order total</span>
        <span>{inr(o.total_amount)}</span>
      </div>
    </div>
  );
}

const Line = ({ k, v }: { k: string; v: string }) => (
  <div className="flex justify-between gap-3">
    <span className="text-black/60 font-semibold">{k}</span>
    <span className="font-bold">{v}</span>
  </div>
);

function Header({ o, title, onClose }: { o: AdvanceOrder; title: string; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between pb-4 border-b border-black/5">
      <div>
        <p className="font-mono text-[11px] font-bold text-[var(--brand-primary-dark)]">{o.id}</p>
        <h2 className="text-xl font-black tracking-tight">{title}</h2>
      </div>
      <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-black/5 flex items-center justify-center cursor-pointer" aria-label="Close">
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}

function Customer({ o }: { o: AdvanceOrder }) {
  return (
    <div className="rounded-xl bg-black/[0.03] border border-black/5 p-3">
      <p className="text-[10px] font-black uppercase tracking-wider text-[var(--brand-primary-dark)]">Customer</p>
      <p className="text-sm font-bold">{o.customer_name}</p>
      {o.customer_phone && <p className="text-xs font-semibold text-[var(--brand-primary-dark)]">{o.customer_phone}</p>}
    </div>
  );
}

function Items({ o }: { o: AdvanceOrder }) {
  return (
    <div className="rounded-xl border border-black/10 divide-y divide-black/5">
      {o.items.map((i, k) => (
        <div key={k} className="flex justify-between items-center px-3 py-2">
          <div>
            <p className="text-sm font-bold">{i.name}</p>
            <p className="text-[11px] text-[var(--brand-primary-dark)]">Qty: {i.qty} × {inr(i.price)}</p>
          </div>
          <span className="text-sm font-black">{inr(i.price * i.qty)}</span>
        </div>
      ))}
    </div>
  );
}

function Triple({ total, paid, balance }: { total: number; paid: number; balance: number }) {
  return (
    <div className="grid grid-cols-3 gap-2 text-center">
      <div className="rounded-xl bg-black/[0.04] border border-black/10 py-2.5">
        <p className="text-[10px] font-black uppercase text-black/60">Total</p>
        <p className="text-base font-black">{inr(total)}</p>
      </div>
      <div className="rounded-xl bg-emerald-50 border border-emerald-200 py-2.5">
        <p className="text-[10px] font-black uppercase text-emerald-700">Paid</p>
        <p className="text-base font-black text-emerald-800">{inr(paid)}</p>
      </div>
      <div className="rounded-xl bg-red-50 border border-red-200 py-2.5">
        <p className="text-[10px] font-black uppercase text-red-700">Balance</p>
        <p className="text-base font-black text-red-800">{inr(balance)}</p>
      </div>
    </div>
  );
}

function DetailsModal({ order: o, onClose, onPrint, onShare }: { order: AdvanceOrder; onClose: () => void; onPrint: () => void; onShare: () => void }) {
  const paid = o.payments.reduce((t, p) => t + p.amount, 0);
  return (
    <div className="fixed inset-0 z-[110] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 space-y-4 max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
        <Header o={o} title="Advance order details" onClose={onClose} />
        <Customer o={o} />
        <Items o={o} />
        <Totals o={o} />
        <Triple total={o.total_amount} paid={paid} balance={o.status === "PENDING" || o.status === "READY" ? balanceDue(o) : 0} />
        <div className="rounded-xl border border-black/10 p-3 space-y-2">
          <p className="text-[10px] font-black uppercase tracking-wider text-black/50">Payments</p>
          {o.payments.map((p, k) => (
            <div key={k} className="text-xs">
              <div className="flex justify-between font-bold">
                <span>{p.kind === "DEPOSIT" ? "Advance" : "Balance"} · {describePayment(p)}</span>
                <span>{inr(p.amount)}</span>
              </div>
              <p className="text-[10px] text-black/45">
                {new Date(p.at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                {p.manual_discount > 0 && ` · manual discount ${inr(p.manual_discount)}`}
              </p>
            </div>
          ))}
        </div>
        {(o.delivery_date || o.notes) && (
          <div className="text-xs space-y-1">
            {o.delivery_date && <p className="font-bold text-[var(--brand-primary-dark)]">Delivery: {fmtDate(o.delivery_date)}</p>}
            {o.notes && <p className="text-black/60">Notes: {o.notes}</p>}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button onClick={onPrint} className="h-11 rounded-xl border border-black/15 text-xs font-bold uppercase flex items-center justify-center gap-1.5 hover:bg-black/5 cursor-pointer">
            <Printer className="w-4 h-4" /> Print receipt
          </button>
          <button onClick={onShare} className="h-11 rounded-xl bg-emerald-500 text-white text-xs font-bold uppercase flex items-center justify-center gap-1.5 cursor-pointer">
            <MessageCircle className="w-4 h-4" /> Share receipt
          </button>
        </div>
      </div>
    </div>
  );
}

function ReceiveBalanceModal({
  order: o,
  actions,
  onClose,
  onDone,
  onPrint,
}: {
  order: AdvanceOrder;
  actions: AdvanceActions;
  onClose: () => void;
  onDone: () => Promise<void>;
  onPrint: (id: string) => void;
}) {
  const [dType, setDType] = useState<"FIXED" | "PERCENT">("FIXED");
  const [dValue, setDValue] = useState(0);
  const [pay, setPay] = useState<PayState>(initialPayState);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<string | null>(null);

  const due = balanceDue(o);
  const paidSoFar = o.payments.reduce((t, p) => t + p.amount, 0);
  const disc = balanceDiscount(due, { type: dType, value: dValue });
  const payError = payStateError(pay, disc.payable);

  // keep a split in step with the amount due
  const syncSplit = (payable: number) => {
    if (pay.mode === "SPLIT") setPay({ ...pay, split: { CASH: 0, GPAY: 0, CARD: 0, [pay.splitModes[0]]: payable } });
  };

  const confirm = async () => {
    setError("");
    if (payError) return setError(payError);
    setBusy(true);
    try {
      const r = await actions.finalize(o.id, {
        manual: { type: dType, value: dValue },
        payment: { mode: pay.mode, split: pay.mode === "SPLIT" ? splitParts(pay, disc.payable) : undefined },
      });
      setDone(r.orderId);
      await onDone();
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Could not record the payment.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={done ? onClose : undefined}>
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 space-y-4 max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
        <Header o={o} title={done ? "Balance received" : "Receive remaining payment"} onClose={onClose} />
        {done ? (
          <div className="space-y-4">
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-sm">
              <p className="flex items-center gap-2 font-black text-emerald-800"><CheckCircle2 className="w-5 h-5" /> Paid in full</p>
              <p className="mt-1 text-emerald-900/80">
                Collected {inr(disc.payable)}. Invoice <b>{done}</b> was created for the full order and now counts as revenue.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => onPrint(o.id)} className="h-11 rounded-xl border border-black/15 text-xs font-bold uppercase flex items-center justify-center gap-1.5 hover:bg-black/5 cursor-pointer">
                <Printer className="w-4 h-4" /> Print final bill
              </button>
              <button onClick={onClose} className="h-11 rounded-xl bg-black text-white text-xs font-bold uppercase cursor-pointer">Done</button>
            </div>
          </div>
        ) : (
          <>
            <Customer o={o} />
            <Items o={o} />
            <Triple total={o.total_amount} paid={paidSoFar} balance={due} />
            {o.delivery_date && <p className="flex items-center gap-1.5 text-xs font-bold text-[var(--brand-primary-dark)]"><Clock className="w-3.5 h-3.5" /> Delivery: {fmtDate(o.delivery_date)}</p>}

            <div className="pt-2 border-t border-black/5">
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-black/70 mb-1.5">Manual discount</span>
                <div className="flex gap-1.5">
                  <select
                    value={dType}
                    onChange={(e) => {
                      setDType(e.target.value as "FIXED" | "PERCENT");
                      syncSplit(balanceDiscount(due, { type: e.target.value as "FIXED" | "PERCENT", value: dValue }).payable);
                    }}
                    className="h-10 px-2 rounded-lg border border-black/10 text-xs font-bold cursor-pointer"
                  >
                    <option value="FIXED">₹</option>
                    <option value="PERCENT">%</option>
                  </select>
                  <input
                    type="number"
                    min={0}
                    value={dValue || ""}
                    onWheel={(e) => e.currentTarget.blur()}
                    onChange={(e) => {
                      const v = Math.max(0, parseFloat(e.target.value) || 0);
                      setDValue(v);
                      syncSplit(balanceDiscount(due, { type: dType, value: v }).payable);
                    }}
                    placeholder="0"
                    className="flex-1 min-w-0 h-10 px-3 rounded-lg border border-black/10 text-sm font-bold text-right outline-none focus:border-[var(--brand-primary)]"
                  />
                </div>
              </div>
            </div>

            <PaymentPicker value={pay} onChange={setPay} amount={disc.payable} label="Payment method" />

            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-center">
              {disc.manualAmt > 0 && (
                <p className="text-[11px] font-bold text-emerald-900/70 mb-1">
                  Balance {inr(due)} − discount {inr(disc.manualAmt)}
                </p>
              )}
              <p className="text-[11px] font-black uppercase tracking-wider text-emerald-800">Final amount to collect</p>
              <p className="text-3xl font-black text-emerald-800">{inr(disc.payable)}</p>
            </div>

            <p className="px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] font-semibold text-amber-900">
              Confirming marks the order completed, creates one official invoice and counts the full amount collected ({inr(paidSoFar + disc.payable)}) as revenue.
            </p>

            {error && <p className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">{error}</p>}

            <button
              onClick={confirm}
              disabled={busy}
              className="w-full h-12 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs uppercase tracking-[0.15em] flex items-center justify-center gap-2 shadow-md disabled:opacity-60 cursor-pointer"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Confirm final payment
            </button>
          </>
        )}
      </div>
    </div>
  );
}
