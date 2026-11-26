"use client";

import { useRef, useState } from "react";
import {
  AtSign,
  Check,
  ImagePlus,
  Loader2,
  Mail,
  MapPin,
  Palette,
  Phone,
  RotateCcw,
  Save,
  Store,
  User,
  X,
} from "lucide-react";
import type { BranchConfig } from "@/lib/branches/types";
import type { ProfileOverrides, ShopProfile } from "@/lib/shop";

export type SettingsActions = {
  getOverrides: () => Promise<ProfileOverrides>;
  saveProfile: (o: ProfileOverrides) => Promise<ShopProfile>;
};

type Tab = "store" | "theme";

/** Admin settings for ONE branch: store details and theme. */
export default function SettingsModal({
  branch,
  shop,
  actions,
  themeId,
  onPreviewTheme,
  onSaveTheme,
  onShopSaved,
  onClose,
}: {
  branch: BranchConfig;
  shop: ShopProfile;
  actions: SettingsActions;
  themeId: string;
  onPreviewTheme: (id: string) => void;
  onSaveTheme: (id: string) => Promise<void>;
  onShopSaved: (p: ShopProfile) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("store");
  const [originalTheme] = useState(themeId);

  const close = () => {
    onPreviewTheme(originalTheme); // drop an unsaved theme preview
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={close}>
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/10">
          <div>
            <h2 className="font-black text-lg">Settings</h2>
            <p className="text-[11px] font-semibold text-[var(--brand-text-muted)]">
              {shop.shopName} — changes apply to this branch only
            </p>
          </div>
          <button onClick={close} className="w-8 h-8 rounded-lg hover:bg-black/5 flex items-center justify-center cursor-pointer" aria-label="Close settings">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-1 px-6 pt-3 border-b border-black/5">
          {(
            [
              ["store", "Store details", <Store key="s" className="w-4 h-4" />],
              ["theme", "Theme", <Palette key="t" className="w-4 h-4" />],
            ] as const
          ).map(([id, label, icon]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 -mb-px cursor-pointer ${
                tab === id ? "border-[var(--brand-primary)] text-[var(--brand-primary-dark)]" : "border-transparent text-black/50 hover:text-black"
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {tab === "store" && <StoreTab branch={branch} shop={shop} actions={actions} onSaved={onShopSaved} />}
          {tab === "theme" && (
            <ThemeTab branch={branch} themeId={themeId} onPreview={onPreviewTheme} onSave={onSaveTheme} />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Store details ──────────────────────────────────────────────────
const FIELDS: { key: keyof ProfileOverrides; label: string; icon: React.ReactNode; placeholder: string; wide?: boolean; type?: string }[] = [
  { key: "shopName", label: "Shop name", icon: <Store className="w-4 h-4" />, placeholder: "Shop name" },
  { key: "ownerName", label: "Full name (owner)", icon: <User className="w-4 h-4" />, placeholder: "Owner's full name" },
  { key: "phone", label: "Phone number", icon: <Phone className="w-4 h-4" />, placeholder: "+91 …", type: "tel" },
  { key: "shopPhone", label: "Shop contact number", icon: <Phone className="w-4 h-4" />, placeholder: "+91 …", type: "tel" },
  { key: "email", label: "Email ID", icon: <Mail className="w-4 h-4" />, placeholder: "shop@example.com", type: "email" },
  { key: "instagram", label: "Instagram ID", icon: <AtSign className="w-4 h-4" />, placeholder: "yourshop (without @)" },
  { key: "address", label: "Shop address", icon: <MapPin className="w-4 h-4" />, placeholder: "Street, area, city - PIN", wide: true },
  { key: "tagline", label: "Location line (shown under the name)", icon: <MapPin className="w-4 h-4" />, placeholder: "Area, City", wide: true },
];

/** Shrinks an uploaded logo to ≤ 512 px and returns a PNG data URL. */
async function resizeLogo(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("That file isn't an image we can read."));
      i.src = url;
    });
    const scale = Math.min(1, 512 / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}

function StoreTab({ branch, shop, actions, onSaved }: { branch: BranchConfig; shop: ShopProfile; actions: SettingsActions; onSaved: (p: ShopProfile) => void }) {
  const [form, setForm] = useState<Record<string, string>>({
    shopName: shop.shopName,
    ownerName: shop.ownerName,
    phone: shop.phone,
    shopPhone: shop.shopPhone,
    email: shop.email,
    instagram: shop.instagram,
    address: shop.address,
    tagline: shop.tagline,
    logoBackground: shop.logoBackground,
  });
  const [logo, setLogo] = useState<string | null>(null); // newly chosen logo (data URL)
  const [resetLogo, setResetLogo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const preview = logo ?? (resetLogo ? branch.logoMark : shop.logoMark);

  const pick = async (file?: File) => {
    if (!file) return;
    try {
      setLogo(await resizeLogo(file));
      setResetLogo(false);
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Couldn't read that image." });
    }
  };

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const current = await actions.getOverrides();
      const next: ProfileOverrides = { ...current };
      for (const k of Object.keys(form)) (next as Record<string, string>)[k] = form[k];
      if (logo) next.logo = logo;
      if (resetLogo) delete next.logo;
      const saved = await actions.saveProfile(next);
      onSaved(saved);
      setLogo(null);
      setResetLogo(false);
      setMsg({ ok: true, text: "Saved. Invoices, receipts, WhatsApp messages and the login page now use these details." });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Couldn't save the store details." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-wrap items-center gap-5">
        <div className="w-28 h-28 rounded-2xl border border-black/10 overflow-hidden flex items-center justify-center p-1.5" style={{ backgroundColor: form.logoBackground }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Logo" className="max-w-full max-h-full object-contain" />
        </div>
        <div className="space-y-2">
          <p className="text-[11px] font-black uppercase tracking-wider">Company / shop logo</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-black text-white text-xs font-bold cursor-pointer">
              <ImagePlus className="w-4 h-4" /> Upload logo
            </button>
            <button
              onClick={() => {
                setLogo(null);
                setResetLogo(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-black/15 text-xs font-bold cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Use original
            </button>
          </div>
          <label className="flex items-center gap-2 text-[11px] font-semibold text-black/60">
            Logo background
            <input type="color" value={form.logoBackground} onChange={(e) => setForm({ ...form, logoBackground: e.target.value })} className="w-8 h-6 rounded cursor-pointer" />
          </label>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {FIELDS.map((f) => (
          <label key={f.key} className={`block ${f.wide ? "sm:col-span-2" : ""}`}>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-black/60 mb-1.5">{f.label}</span>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-black/35">{f.icon}</span>
              <input
                type={f.type ?? "text"}
                value={form[f.key] ?? ""}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                placeholder={f.placeholder}
                className="w-full h-11 pl-9 pr-3 rounded-xl border border-black/10 text-sm font-semibold outline-none focus:border-[var(--brand-primary)]"
              />
            </div>
          </label>
        ))}
      </div>

      {msg && <p className={`px-3 py-2 rounded-lg text-xs font-semibold ${msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{msg.text}</p>}

      <div className="flex justify-end">
        <button onClick={save} disabled={busy} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--brand-primary)] text-[var(--brand-on-primary)] text-xs font-bold uppercase tracking-wider shadow-md disabled:opacity-60 cursor-pointer">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save store details
        </button>
      </div>
    </div>
  );
}

// ── Theme ─────────────────────────────────────────────────────────
function ThemeTab({ branch, themeId, onPreview, onSave }: { branch: BranchConfig; themeId: string; onPreview: (id: string) => void; onSave: (id: string) => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  return (
    <div className="p-6 space-y-3">
      {branch.themes.map((t) => {
        const selected = t.id === themeId;
        return (
          <button
            key={t.id}
            onClick={() => {
              onPreview(t.id);
              setMsg("");
            }}
            className={`w-full flex items-center gap-4 p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${selected ? "border-black shadow-md" : "border-black/10 hover:border-black/30"}`}
          >
            <div className="w-16 h-12 rounded-lg overflow-hidden flex shrink-0 border border-black/10" style={{ backgroundColor: t.colors.background }}>
              <div className="w-1/2 h-full flex items-center justify-center text-sm font-black" style={{ backgroundColor: t.colors.primary, color: t.colors.onPrimary }}>Aa</div>
              <div className="w-1/2 h-full flex flex-col justify-center gap-1 px-1.5">
                <span className="h-1.5 rounded" style={{ backgroundColor: t.colors.primaryLight }} />
                <span className="h-1.5 rounded" style={{ backgroundColor: t.colors.border }} />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm">
                {t.name}
                {t.id === branch.defaultThemeId && <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-black/40">Default</span>}
              </p>
              <p className="text-xs text-black/60">{t.description}</p>
            </div>
            {selected && <Check className="w-5 h-5 shrink-0" />}
          </button>
        );
      })}
      {msg && <p className="text-xs font-semibold text-emerald-700">{msg}</p>}
      <div className="flex justify-end pt-2">
        <button
          onClick={async () => {
            setBusy(true);
            try {
              await onSave(themeId);
              setMsg("Theme saved for every device and this branch's invoices.");
            } catch {
              setMsg("Couldn't save the theme.");
            } finally {
              setBusy(false);
            }
          }}
          disabled={busy}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--brand-primary)] text-[var(--brand-on-primary)] text-xs font-bold uppercase tracking-wider shadow-md disabled:opacity-60 cursor-pointer"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Palette className="w-4 h-4" />} Save theme
        </button>
      </div>
    </div>
  );
}
