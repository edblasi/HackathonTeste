import { X, Languages, SlidersHorizontal } from "lucide-react";
import { LanguageToggle } from "./LanguageToggle";
import { useLang } from "../i18n/LanguageContext";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
}

export function SettingsModal({ open, onClose, title, subtitle }: SettingsModalProps) {
  const { t } = useLang();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/45 p-4" onClick={onClose}>
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <div className="flex items-center gap-2 text-foreground">
              <SlidersHorizontal size={16} />
              <h2 className="text-sm font-bold">{title ?? t("shell.settings.title")}</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{subtitle ?? t("shell.settings.subtitle")}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={t("shell.settings.close")}>
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Languages size={15} className="text-primary" />
              <div>
                <p className="text-xs font-bold text-foreground">{t("shell.settings.language")}</p>
                <p className="text-[11px] text-muted-foreground">{t("shell.settings.languageHint")}</p>
              </div>
            </div>
            <LanguageToggle />
          </div>

          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <p className="text-xs font-bold text-foreground">{t("shell.settings.dashboard")}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{t("shell.settings.dashboardHint")}</p>
          </div>
        </div>

        <div className="flex justify-end border-t border-border px-5 py-4">
          <button type="button" onClick={onClose} className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white hover:opacity-90">
            {t("shell.settings.done")}
          </button>
        </div>
      </div>
    </div>
  );
}
