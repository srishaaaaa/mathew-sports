import "server-only";
import { supabaseAdmin as sb } from "@/lib/supabase";
import type { BranchId } from "@/lib/branches/types";

// Saved theme for a branch, or null (→ the branch's default) if none is saved
// yet or the branch_settings table has not been created.
export async function getThemeId(branch: BranchId): Promise<string | null> {
  const { data, error } = await sb
    .from("branch_settings")
    .select("theme_id")
    .eq("branch", branch)
    .maybeSingle();
  if (error) {
    console.error(`Error reading settings for ${branch}:`, error);
    return null;
  }
  return data?.theme_id ?? null;
}

export async function setThemeId(branch: BranchId, themeId: string): Promise<void> {
  const { error } = await sb
    .from("branch_settings")
    .upsert({ branch, theme_id: themeId, updated_at: new Date().toISOString() });
  if (error) throw error;
}
