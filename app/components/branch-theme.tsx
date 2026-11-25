"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, Palette, X } from "lucide-react";
import {
  resolveTheme,
  themeVarEntries,
  type BranchConfig,
  type ThemePreset,
} from "@/lib/branches/types";

const storageKey = (branch: BranchConfig) => `${branch.id}_theme`;

function applyTheme(theme: ThemePreset) {
  const root = document.documentElement;
  for (const [k, v] of themeVarEntries(theme)) root.style.setProperty(k, v);
  root.style.backgroundColor = theme.colors.background;
}

/**
 * Applies the branch's saved theme to the page. Uses the last theme seen on
 * this device immediately (no flash), then confirms with the server copy so
 * every device follows what the admin chose.
 */
export function useBranchTheme(
  branch: BranchConfig,
  loadThemeId: () => Promise<string | null>,
) {
  const [themeId, setThemeIdState] = useState<string>(() => {
    if (typeof window === "undefined") return branch.defaultThemeId;
    return resolveTheme(branch, localStorage.getItem(storageKey(branch))).id;
  });

  const setThemeId = useCallback(
    (id: string) => {
      const theme = resolveTheme(branch, id);
      localStorage.setItem(storageKey(branch), theme.id);
      setThemeIdState(theme.id);
    },
    [branch],
  );

  useEffect(() => {
    applyTheme(resolveTheme(branch, themeId));
  }, [branch, themeId]);

  useEffect(() => {
    let cancelled = false;
    loadThemeId()
      .then((id) => {
        if (!cancelled) setThemeId(id ?? branch.defaultThemeId);
      })
      .catch((err) => console.error("Could not load theme setting:", err));
    return () => {
      cancelled = true;
    };
  }, [branch, loadThemeId, setThemeId]);

  return { themeId, setThemeId };
}

/** Settings dialog: pick the branch's colour theme (admin only). */
export function ThemeSettingsModal({
  branch,
  themeId,
  onPreview,
  onSave,
  onClose,
}: {
  branch: BranchConfig;
  themeId: string;
  onPreview: (id: string) => void;
  onSave: (id: string) => Promise<void>;
  onClose: () => void;
}) {
  const [original] = useState(themeId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const cancel = () => {
    onPreview(original);
    onClose();
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await onSave(themeId);
      onClose();
    } catch (err) {
      console.error(err);
      setError("Could not save the theme. Check the connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={cancel}
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/10">
          <div className="flex items-center gap-3">
            <Palette className="w-5 h-5 text-[var(--brand-primary)]" />
            <div>
              <h2 className="font-black text-base text-black">Settings</h2>
              <p className="text-[11px] font-semibold text-[var(--brand-text-muted)]">
                Theme colour for {branch.shopName}
              </p>
            </div>
          </div>
          <button
            onClick={cancel}
            className="w-8 h-8 rounded-lg hover:bg-black/5 flex items-center justify-center cursor-pointer"
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 grid gap-3 max-h-[60vh] overflow-y-auto">
          {branch.themes.map((t) => {
            const selected = t.id === themeId;
            return (
              <button
                key={t.id}
                onClick={() => onPreview(t.id)}
                className={`w-full flex items-center gap-4 p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                  selected ? "border-black shadow-md" : "border-black/10 hover:border-black/30"
                }`}
              >
                <div
                  className="w-16 h-12 rounded-lg overflow-hidden flex shrink-0 border border-black/10"
                  style={{ backgroundColor: t.colors.background }}
                >
                  <div
                    className="w-1/2 h-full flex items-center justify-center text-sm font-black"
                    style={{ backgroundColor: t.colors.primary, color: t.colors.onPrimary }}
                  >
                    Aa
                  </div>
                  <div className="w-1/2 h-full flex flex-col justify-center gap-1 px-1.5">
                    <span className="h-1.5 rounded" style={{ backgroundColor: t.colors.primaryLight }} />
                    <span className="h-1.5 rounded" style={{ backgroundColor: t.colors.border }} />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-black">
                    {t.name}
                    {t.id === branch.defaultThemeId && (
                      <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-black/40">
                        Default
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-black/60">{t.description}</p>
                </div>
                {selected && <Check className="w-5 h-5 text-black shrink-0" />}
              </button>
            );
          })}
        </div>

        {error && <p className="px-6 pb-2 text-xs font-semibold text-red-600">{error}</p>}

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-black/10 bg-black/[0.02]">
          <button
            onClick={cancel}
            className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider text-black hover:bg-black/5 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-[var(--brand-primary)] text-[var(--brand-on-primary)] hover:bg-[var(--brand-primary-dark)] disabled:opacity-60 flex items-center gap-2 cursor-pointer"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save theme
          </button>
        </div>
      </div>
    </div>
  );
}
