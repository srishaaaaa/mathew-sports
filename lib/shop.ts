import "server-only";
import { supabaseAdmin as sb } from "@/lib/supabase";
import { BRANCH as POS1 } from "@/lib/branches/pos1";
import { BRANCH as POS2 } from "@/lib/branches/pos2";
import type { BranchConfig, BranchId } from "@/lib/branches/types";

/** What a branch shows to customers: name, contacts, address, logo. */
export type ShopProfile = {
  shopName: string;
  tagline: string;
  ownerName: string;
  phone: string;
  shopPhone: string;
  email: string;
  address: string;
  instagram: string;
  /** Full logo (URL or data URL). */
  logo: string;
  /** Square logo for tiles (same as `logo` once a custom logo is uploaded). */
  logoMark: string;
  /** Logo for white paper — invoices and A4/A5 receipts. */
  logoOnLight: string;
  logoBackground: string;
};

export const EDITABLE_FIELDS = [
  "shopName",
  "tagline",
  "ownerName",
  "phone",
  "shopPhone",
  "email",
  "address",
  "instagram",
  "logo",
  "logoBackground",
] as const;
export type EditableField = (typeof EDITABLE_FIELDS)[number];
export type ProfileOverrides = Partial<Record<EditableField, string>>;

export const branchConfig = (branch: BranchId): BranchConfig => (branch === "pos2" ? POS2 : POS1);

export function defaultProfile(branch: BranchId): ShopProfile {
  const b = branchConfig(branch);
  return {
    shopName: b.shopName,
    tagline: b.tagline,
    ownerName: b.ownerName,
    phone: b.phone,
    shopPhone: b.shopPhone,
    email: b.email,
    address: b.address,
    instagram: b.instagram,
    logo: b.logo,
    logoMark: b.logoMark,
    logoOnLight: b.logoOnLight,
    logoBackground: b.logoBackground,
  };
}

export function applyOverrides(base: ShopProfile, o: ProfileOverrides): ShopProfile {
  const out = { ...base };
  for (const k of EDITABLE_FIELDS) {
    const v = o[k];
    if (typeof v === "string") out[k] = v;
  }
  // An uploaded logo replaces both the full logo and the square mark.
  if (o.logo) {
    out.logoMark = o.logo;
    out.logoOnLight = o.logo;
  }
  if (!out.shopName.trim()) out.shopName = base.shopName;
  return out;
}

export async function getProfileOverrides(branch: BranchId): Promise<ProfileOverrides> {
  const { data, error } = await sb.from("branch_settings").select("profile").eq("branch", branch).maybeSingle();
  if (error) {
    console.error(`Error reading store details for ${branch}:`, error);
    return {};
  }
  return (data?.profile as ProfileOverrides) ?? {};
}

/** The branch's live store details (defaults + whatever was saved in Settings). */
export async function getShopProfile(branch: BranchId): Promise<ShopProfile> {
  return applyOverrides(defaultProfile(branch), await getProfileOverrides(branch));
}

export async function saveProfileOverrides(branch: BranchId, overrides: ProfileOverrides): Promise<void> {
  const clean: ProfileOverrides = {};
  for (const k of EDITABLE_FIELDS) {
    const v = overrides[k];
    if (typeof v === "string") clean[k] = k === "logo" ? v : v.trim().slice(0, 300);
  }
  if (clean.logo && clean.logo.length > 900_000) throw new Error("Logo is too large — use an image under ~600 KB.");
  if (clean.logo && !/^(data:image\/(png|jpeg|webp|svg\+xml);base64,|\/)/.test(clean.logo)) throw new Error("Unsupported logo format.");
  const { error } = await sb
    .from("branch_settings")
    .upsert({ branch, profile: clean, updated_at: new Date().toISOString() }, { onConflict: "branch" });
  if (error) throw error;
}
