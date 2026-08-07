import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  Clock,
  Package,
  QrCode,
  FileDown,
  History,
  AlertTriangle,
  Phone,
  HelpCircle,
  Shield,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useLang } from "../i18n/LanguageContext";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { SettingsModal } from "../components/SettingsModal";
import { Card } from "../components/Card";
import { DashboardCustomizer, useDashboardCardPreferences } from "../components/DashboardCustomizer";
import { Avatar } from "../components/Avatar";
import { StatusBadge } from "../components/StatusBadge";
import { QRCodePlaceholder } from "../components/QRCode";
import {
  usePedidos,
  useHistoricoSolicitacao,
  useUsuarioAtual,
  usePacientePerfil,
  useNotificacoes,
  type PedidoAtual,
  type HistoricoStatus,
} from "../hooks/FetchData";
import type { TranslationKey } from "../i18n/translations";
import { patientSectionForAlert } from "../lib/alertRouting";

const USER_HOME_CARD_IDS = ["request", "timeline", "digitalId", "support"] as const;
type UserHomeCardId = (typeof USER_HOME_CARD_IDS)[number];

// Devolve a chave de tradução do status (funciona tanto pra status de
// solicitacao_ortese quanto de ordem_producao — os dois compartilham o
// mesmo namespace home.pedido.status.*, ver src/i18n/locales/*.json).
function statusKey(status: string): TranslationKey {
  return `home.pedido.status.${status}` as TranslationKey;
}

function statusColor(status: string): "green" | "blue" | "amber" | "red" {
  if (status === "ENTREGUE") return "green";
  if (status === "NEGADA" || status === "CANCELADA") return "red";
  if (status === "EM_PRODUCAO" || status === "CONTROLE_QUALIDADE" || status === "PRONTA_PARA_ENTREGA") return "blue";
  return "amber";
}

function OrteseIcon() {
  return (
    <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center" aria-hidden="true">
      <Package className="w-9 h-9 text-primary" strokeWidth={1.6} />
    </div>
  );
}

function WelcomeSection({ nomeExibicao }: { nomeExibicao: string }) {
  const { t, locale } = useLang();
  const now = new Date();
  const dateStr = now.toLocaleDateString(locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const hour = now.getHours();
  const greeting =
    hour < 12 ? t("home.welcome.morning") : hour < 18 ? t("home.welcome.afternoon") : t("home.welcome.evening");
  const firstName = nomeExibicao.split(" ")[0];

  return (
    <div className="flex items-end justify-between">
      <div>
        <p className="text-sm text-muted-foreground font-medium mb-1 capitalize">{dateStr}</p>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">
          {greeting}, <span className="text-primary">{firstName}</span>
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">{t("home.welcome.subtitle")}</p>
      </div>
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Shield className="w-4 h-4 text-accent" aria-hidden="true" />
      </div>
    </div>
  );
}

function PedidoStatusCard({ pedido, onOpenTimeline }: { pedido: PedidoAtual; onOpenTimeline: () => void }) {
  const { t, locale } = useLang();
  const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(locale) : null);

  const details = [
    { label: t("home.pedido.procedureLabel"), value: pedido.nome_procedimento },
    { label: t("home.pedido.productLabel"), value: pedido.nome_produto ?? t("home.pedido.productPending") },
    { label: t("home.pedido.workshopLabel"), value: pedido.oficina_nome ?? t("home.pedido.workshopPending") },
    { label: t("home.pedido.requestedOn"), value: fmtDate(pedido.data_solicitacao) ?? "—" },
  ];

  return (
    <button type="button" onClick={onOpenTimeline} className="block w-full text-left rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30">
      <Card className="hover:border-primary/30 hover:shadow-md transition-all">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                {t("home.pedido.title")}
              </span>
            </div>
            <h2 className="text-xl font-bold text-foreground">{pedido.nome_procedimento}</h2>
          </div>
          <StatusBadge label={t(statusKey(pedido.status_solicitacao))} color={statusColor(pedido.status_solicitacao)} />
        </div>

        <div className="flex gap-6">
          <div className="flex-shrink-0 flex flex-col items-center justify-center bg-secondary rounded-xl px-5 py-4 border border-blue-100">
            <OrteseIcon />
          </div>

          <div className="flex-1 grid grid-cols-2 gap-x-6 gap-y-4 content-center">
            {details.map(({ label, value }) => (
              <div key={label}>
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
                  {label}
                </dt>
                <dd className="text-sm font-medium text-foreground">{value}</dd>
              </div>
            ))}

            {pedido.data_entrega ? (
              <div className="col-span-2 mt-2 pt-4 border-t border-border">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-accent" aria-hidden="true" />
                  <span className="text-sm text-emerald-700 font-medium">
                    {t("home.pedido.deliveredOn")} {fmtDate(pedido.data_entrega)}
                  </span>
                </div>
              </div>
            ) : pedido.data_prevista_entrega ? (
              <div className="col-span-2 mt-2 pt-4 border-t border-border">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-500" aria-hidden="true" />
                  <span className="text-sm text-amber-700 font-medium">
                    {t("home.pedido.expectedDelivery")}: {fmtDate(pedido.data_prevista_entrega)}
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      </Card>
    </button>
  );
}

function TimelineCard({ pedido, historico }: { pedido: PedidoAtual; historico: HistoricoStatus[] }) {
  const { t, locale } = useLang();

  // A trilha de auditoria (fila.historico_status_solicitacao) so registra
  // MUDANCAS de status; o primeiro evento ("solicitacao criada") e
  // sintetizado aqui a partir da propria data_solicitacao.
  const steps = [
    { key: "created", date: pedido.data_solicitacao, label: t("home.timeline.created") },
    ...historico.map((h) => ({
      key: String(h.id),
      date: h.data_alteracao,
      label: `${t("home.timeline.statusChangedTo")}: ${t(statusKey(h.status_novo))}`,
    })),
  ];

  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-foreground">{t("home.timeline.title")}</h2>
          <span className="text-xs text-muted-foreground">{t("home.timeline.updated")}</span>
        </div>

        {steps.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("home.timeline.noHistory")}</p>
        ) : (
          <div className="relative">
            <div className="absolute left-[18px] top-6 bottom-6 w-px bg-border" aria-hidden="true" />
            <ol className="space-y-0">
              {steps.map((step, idx) => (
                <li key={step.key} className="relative flex gap-4">
                  <div className="relative z-10 flex-shrink-0 mt-1">
                    <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center shadow-sm">
                      <CheckCircle2 className="w-4.5 h-4.5 text-white" aria-hidden="true" />
                    </div>
                  </div>
                  <div className={`flex-1 ${idx < steps.length - 1 ? "pb-6" : "pb-0"}`}>
                    <span className="text-sm font-semibold text-foreground">{step.label}</span>
                    <p className="text-xs font-mono text-muted-foreground mt-0.5">
                      {new Date(step.date).toLocaleString(locale)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </Card>
  );
}

function DigitalIDCard({ pedido, nomeExibicao, iniciais, onViewHistory }: { pedido: PedidoAtual; nomeExibicao: string; iniciais: string; onViewHistory: () => void }) {
  const { t } = useLang();
  const [copied, setCopied] = useState(false);
  const idValue = `SOL-${pedido.solicitacao_id}`;

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <div className="p-5">
        <div className="flex items-center gap-2 mb-1">
          <QrCode className="w-4 h-4 text-primary" aria-hidden="true" />
          <h2 className="text-sm font-bold text-foreground">{t("home.id.title")}</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">{t("home.id.subtitle")}</p>

        <div className="flex flex-col items-center gap-3 py-2">
          <QRCodePlaceholder />
          <button
            onClick={handleCopy}
            className="text-xs text-muted-foreground hover:text-primary transition-colors font-mono"
            aria-label={t("home.id.copyAria")}
          >
            {copied ? t("home.id.copied") : idValue}
          </button>
        </div>

        <div className="mt-4 space-y-2">
          <button type="button" onClick={onViewHistory} className="w-full flex items-center justify-center gap-2 h-9 rounded-lg bg-secondary text-primary text-sm font-semibold hover:bg-blue-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30">
            <History className="w-4 h-4" aria-hidden="true" />
            {t("home.id.viewHistory")}
          </button>
          <button type="button" onClick={() => window.print()} className="w-full flex items-center justify-center gap-2 h-9 rounded-lg bg-[#0B5394] text-white text-sm font-semibold hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30">
            <FileDown className="w-4 h-4" aria-hidden="true" />
            {t("home.id.exportPdf")}
          </button>
        </div>

        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center gap-2.5">
            <Avatar initials={iniciais} size="sm" />
            <div>
              <p className="text-xs font-semibold text-foreground leading-none">{nomeExibicao}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                {t("home.id.idLabel")} {idValue}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function SupportCard() {
  const { t } = useLang();
  const links = [
    {
      icon: AlertTriangle,
      label: t("home.support.report.label"),
      description: t("home.support.report.desc"),
      color: "text-destructive",
      bg: "hover:bg-red-50 focus:ring-destructive/30",
      action: () => { window.location.href = "tel:136"; },
    },
    {
      icon: Phone,
      label: t("home.support.contact.label"),
      description: t("home.support.contact.desc"),
      color: "text-primary",
      bg: "hover:bg-secondary focus:ring-primary/30",
      action: () => { window.location.href = "tel:136"; },
    },
    {
      icon: HelpCircle,
      label: t("home.support.faq.label"),
      description: t("home.support.faq.desc"),
      color: "text-muted-foreground",
      bg: "hover:bg-secondary focus:ring-primary/30",
      action: () => window.open("https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/p/pessoa-com-deficiencia", "_blank", "noopener,noreferrer"),
    },
  ];

  return (
    <Card>
      <div className="p-5">
        <h2 className="text-sm font-bold text-foreground mb-1">{t("home.support.title")}</h2>
        <p className="text-xs text-muted-foreground mb-4">{t("home.support.subtitle")}</p>

        <ul className="space-y-2" role="list">
          {links.map(({ icon: Icon, label, description, color, bg, action }) => (
            <li key={label}>
              <button
                type="button"
                onClick={action}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border border-border text-left transition-colors focus:outline-none focus:ring-2 ${bg}`}
                aria-label={label}
              >
                <div className={`flex-shrink-0 w-8 h-8 rounded-lg bg-border/40 flex items-center justify-center ${color}`}>
                  <Icon className="w-4 h-4" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-none">{label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{description}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-start gap-2">
            <Shield className="w-3.5 h-3.5 text-accent mt-0.5 flex-shrink-0" aria-hidden="true" />
            <p className="text-[10px] text-muted-foreground leading-relaxed">{t("home.support.privacyNote")}</p>
          </div>
        </div>
      </div>
    </Card>
  );
}

export function UserHomePage() {
  const { signOut, user } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { t, locale } = useLang();
  const navigate = useNavigate();
  const { visibleIds, toggle, reset, isVisible } = useDashboardCardPreferences<UserHomeCardId>(
    `umdr:patient:${user?.id ?? "anonymous"}:home-cards`,
    USER_HOME_CARD_IDS,
  );

  const { data: usuario, loading: loadingUsuario } = useUsuarioAtual();
  const { data: perfil } = usePacientePerfil();
  const { data: pedidos, loading: loadingPedidos, error: erroPedidos } = usePedidos();
  const pedidoAtivo = pedidos?.[0] ?? null;
  const { data: historico } = useHistoricoSolicitacao(pedidoAtivo?.solicitacao_id ?? null);
  const { data: notificacoes, marcarComoLida } = useNotificacoes();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  const nomeExibicao = usuario?.nome_exibicao ?? "";
  const iniciais =
    nomeExibicao
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase() || "?";

  const alertasRecentes = (notificacoes ?? []).slice(0, 5).map((n) => ({
    id: n.id,
    title: n.titulo,
    description: n.mensagem ?? "",
    time: new Date(n.criado_em).toLocaleString(locale),
    unread: !n.lida,
    onClick: () => {
      if (!n.lida) void marcarComoLida(n.id);
      const target = patientSectionForAlert(n.destino_ui);
      if (target === "patient-notifications") window.scrollTo({ top: 0, behavior: "smooth" });
      else document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
  }));

  const loading = loadingUsuario || loadingPedidos;
  const cardOptions = [
    { id: "request" as const, label: t("home.pedido.title") },
    { id: "timeline" as const, label: t("home.timeline.title") },
    { id: "digitalId" as const, label: t("home.id.title") },
    { id: "support" as const, label: t("home.support.title") },
  ];
  const scrollToSection = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const hasLeftColumn = isVisible("request") || isVisible("timeline");
  const hasRightColumn = isVisible("digitalId") || isVisible("support");

  return (
    <div className="min-h-screen bg-background font-[Inter,_system-ui,_sans-serif]">
      <Navbar
        userName={nomeExibicao || "—"}
        userInitials={iniciais}
        userEmail={user?.email}
        notifications={alertasRecentes}
        profileDetails={[
          { label: t("shell.profile.role"), value: t("shell.navbar.userRoleLabel") },
          { label: t("shell.profile.cns"), value: perfil?.cns ?? "—" },
          { label: t("shell.profile.cpf"), value: perfil?.cpf ?? "—" },
          { label: t("shell.profile.phone"), value: perfil?.telefone_contato ?? "—" },
          { label: t("shell.profile.location"), value: [perfil?.nome_municipio, perfil?.uf_sigla].filter(Boolean).join(" / ") || "—" },
        ]}
        onOpenSettings={() => setSettingsOpen(true)}
        onSignOut={handleSignOut}
      />

      <main className="max-w-[1440px] mx-auto px-8 py-8">
        <section className="mb-5" aria-labelledby="welcome-heading">
          <WelcomeSection nomeExibicao={nomeExibicao || "—"} />
        </section>
        <div className="mb-5 flex justify-end">
          <DashboardCustomizer options={cardOptions} visibleIds={visibleIds} onToggle={toggle} onReset={reset} />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">…</div>
        ) : erroPedidos ? (
          <Card>
            <p className="p-6 text-sm text-destructive">{erroPedidos}</p>
          </Card>
        ) : !pedidoAtivo ? (
          <Card>
            <p className="p-6 text-sm text-muted-foreground">{t("home.pedido.noPedido")}</p>
          </Card>
        ) : (
          <div className={`grid gap-5 ${hasLeftColumn && hasRightColumn ? "lg:grid-cols-[65fr_35fr]" : "grid-cols-1"}`}>
            {hasLeftColumn && <div className="space-y-5">
              {isVisible("request") && <section id="patient-request-card" aria-labelledby="pedido-status-heading" className="scroll-mt-24">
                <h2 id="pedido-status-heading" className="sr-only">{t("home.pedido.title")}</h2>
                <PedidoStatusCard pedido={pedidoAtivo} onOpenTimeline={() => scrollToSection("patient-timeline-card")} />
              </section>}
              {isVisible("timeline") && <section id="patient-timeline-card" aria-labelledby="timeline-heading" className="scroll-mt-24">
                <h2 id="timeline-heading" className="sr-only">{t("home.timeline.title")}</h2>
                <TimelineCard pedido={pedidoAtivo} historico={historico ?? []} />
              </section>}
            </div>}

            {hasRightColumn && <div className="space-y-5">
              {isVisible("digitalId") && <section id="patient-digital-id-card" aria-labelledby="digital-id-heading" className="scroll-mt-24">
                <h2 id="digital-id-heading" className="sr-only">{t("home.id.title")}</h2>
                <DigitalIDCard pedido={pedidoAtivo} nomeExibicao={nomeExibicao || "—"} iniciais={iniciais} onViewHistory={() => scrollToSection("patient-timeline-card")} />
              </section>}
              {isVisible("support") && <section id="patient-support-card" aria-labelledby="support-heading" className="scroll-mt-24">
                <h2 id="support-heading" className="sr-only">{t("home.support.title")}</h2>
                <SupportCard />
              </section>}
            </div>}
          </div>
        )}
      </main>

      <Footer />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}