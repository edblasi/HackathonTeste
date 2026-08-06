import { Shield } from "lucide-react";
import { useLang } from "../i18n/LanguageContext";

interface FooterProps {
  copyrightText?: string;
  complianceText?: string;
}

export function Footer({ copyrightText, complianceText }: FooterProps) {
  const { t } = useLang();
  return (
    <footer className="border-t border-border mt-10 py-6">
      <div className="max-w-[1440px] mx-auto px-8 flex items-center justify-between text-xs text-muted-foreground">
        <span>{copyrightText ?? t("shell.footer.copyright")}</span>
        <span className="flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
          {complianceText ?? t("shell.footer.compliance")}
        </span>
      </div>
    </footer>
  );
}