import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLang } from "../i18n/LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import { StatusBadge } from "../components/StatusBadge";
import { LanguageToggle } from "../components/LanguageToggle";
import { SettingsModal } from "../components/SettingsModal";
import { CommunicationsCenter } from "../components/CommunicationsCenter";
import { CreSupportInbox } from "../components/CreSupportInbox";
import { ShipmentModal, TriageModal } from "../components/CreActionModals";
import { DashboardCustomizer, useDashboardCardPreferences } from "../components/DashboardCustomizer";
import { crePageForAlert } from "../lib/alertRouting";
import {
  useKpiDashboard,
  useAlertasCriticos,
  useRecalls,
  useLotesRecentes,
  usePacientesAguardando,
  useUsuarioAtual,
  useFluxoDispositivosMensal,
  useTriagens,
  useRemessasLogistica,
  useRelatorioMensal,
  useNotificacoes,
  type Triagem,
  type PacienteAguardando,
} from "../hooks/FetchData";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  ArrowRight,
  BadgeCheck,
  BarChart2,
  Bell,
  Box,
  Building2,
  Calendar,
  Camera,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  Download,
  FileText,
  FileWarning,
  Heart,
  Home,
  LogOut,
  Mail,
  MapPin,
  MessageSquare,
  Package,
  PackageCheck,
  Phone,
  QrCode,
  RefreshCw,
  Search,
  Settings,
  Shield,
  Stethoscope,
  TrendingUp,
  Truck,
  User,
  Users,
  X,
  Zap,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// ═══════════════════════════════════════════════════════════════
// TYPES & DATA
// ═══════════════════════════════════════════════════════════════

type Page = "inicio" | "pacientes" | "logistica" | "triagens" | "relatorios" | "atendimentos" | "comunicacoes";

const CRE_HOME_CARD_IDS = ["queue", "stock", "logistics", "matchings"] as const;
type CreHomeCardId = (typeof CRE_HOME_CARD_IDS)[number];

type AttendanceStatus = "waiting" | "in-progress";
type FilterTab = "all" | "waiting" | "in-progress";



// ═══════════════════════════════════════════════════════════════
// SHARED ATOMS
// ═══════════════════════════════════════════════════════════════

function LoteStatusBadge({ status }: { status: "OK" | "ESTOQUE_BAIXO" | "VENCIDO" }) {
  const { t } = useLang();
  const cls: Record<string, string> = {
    OK: "bg-emerald-50 text-emerald-700 border-emerald-200",
    ESTOQUE_BAIXO: "bg-amber-50 text-amber-700 border-amber-200",
    VENCIDO: "bg-red-50 text-red-700 border-red-200",
  };
  const dot: Record<string, string> = {
    OK: "bg-emerald-500",
    ESTOQUE_BAIXO: "bg-amber-500",
    VENCIDO: "bg-red-500",
  };
  const label: Record<string, string> = {
    OK: t("lots.status.ok"),
    ESTOQUE_BAIXO: t("lots.status.low"),
    VENCIDO: t("lots.status.expired"),
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cls[status]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot[status]}`} />
      {label[status]}
    </span>
  );
}

function AttendanceBadge({ status }: { status: AttendanceStatus }) {
  const { t } = useLang();
  if (status === "in-progress") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        {t("patients.badge.inProgress")}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
      {t("patients.badge.waiting")}
    </span>
  );
}

function DeviceTag({ type }: { type: string }) {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border bg-violet-50 text-violet-700 border-violet-200">
      {type}
    </span>
  );
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-slate-700 mb-2">
        {label}
      </p>
      {payload.map((p: any) => (
        <div
          key={p.dataKey}
          className="flex items-center gap-2"
        >
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: p.color }}
          />
          <span className="text-slate-500">{p.name}:</span>
          <span className="font-bold text-slate-800">
            {p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LAYOUT — SIDEBAR
// ═══════════════════════════════════════════════════════════════

interface SidebarProps {
  current: Page;
  onNavigate: (p: Page) => void;
  onOpenSettings: () => void;
}

function Sidebar({ current, onNavigate, onOpenSettings }: SidebarProps) 
{
  const { t, locale } = useLang();
  const { signOut } = useAuth();
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const nav: { icon: any; label: string; page: Page | null }[] = [
    { icon: Home,          label: t("nav.home"),      page: "inicio"    },
    { icon: Users,         label: t("nav.patients"),  page: "pacientes" },
    { icon: RefreshCw,     label: t("nav.logistics"), page: "logistica" },
    { icon: ClipboardList, label: t("nav.triage"),    page: "triagens"  },
    { icon: Activity,      label: t("nav.reports"),   page: "relatorios"},
    { icon: MessageSquare, label: t("nav.supportInbox"), page: "atendimentos"},
    { icon: Bell,          label: t("nav.communications"), page: "comunicacoes"},
  ];

  const handleLogout = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  const normalizedSearch = search.trim().toLocaleLowerCase(locale);
  const filteredNav = nav.filter((item) => !normalizedSearch || item.label.toLocaleLowerCase(locale).includes(normalizedSearch));

  return (
    <aside
      className="w-56 shrink-0 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      {/* logo */}
      <div className="px-5 py-5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-700 flex items-center justify-center">
            <Heart
              className="w-4 h-4 text-white"
              strokeWidth={2.5}
            />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 tracking-tight">REVITA</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-3">
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <Search className="w-3 h-3 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            type="text"
            placeholder={t("nav.search")}
            className="w-full bg-transparent text-xs text-slate-700 placeholder-slate-400 outline-none"
          />
        </div>
      </div>

      {/* nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {filteredNav.map(({ icon: Icon, label, page }) => {
          const active = page !== null && current === page;
          return (
            <button
              key={label}
              onClick={() => page && onNavigate(page)}
              disabled={page === null}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors
                ${
                  active
                    ? "bg-blue-50 text-blue-700 font-semibold"
                    : page === null
                      ? "text-slate-300 cursor-default font-medium"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-700 font-medium"
                }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${active ? "text-blue-600" : page === null ? "text-slate-300" : "text-slate-400"}`}
                strokeWidth={active ? 2.5 : 2}
              />
              {label}
              {active && (
                <ChevronRight className="w-3.5 h-3.5 ml-auto text-blue-400" />
              )}
            </button>
          );
        })}
      </nav>

      {/* bottom */}
      <div className="px-3 pb-4 border-t border-slate-100 pt-3 space-y-0.5">
        <button type="button" onClick={onOpenSettings} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-50 transition-colors">
          <Settings className="w-4 h-4 text-slate-400" /> {t("nav.settings")}
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="w-4 h-4 text-slate-400" /> {t("nav.logout")}
        </button>
      </div>
    </aside>
  );
}

// ═══════════════════════════════════════════════════════════════
// LAYOUT — TOPBAR
// ═══════════════════════════════════════════════════════════════

// PAGE_TITLES is now dynamic — built inside Topbar using t()

function ProfilePopup({ onClose, onOpenSettings }: { onClose: () => void; onOpenSettings: () => void }) {
  const { t } = useLang();
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const { data: usuario } = useUsuarioAtual();

  const iniciais =
    (usuario?.nome_exibicao ?? "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase() || "?";

  const handleLogout = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 top-12 z-50 w-72 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden" style={{ fontFamily: "Inter, sans-serif" }}>
        <div className="px-5 py-4 bg-gradient-to-br from-blue-700 to-blue-800 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center text-white font-bold text-lg">{iniciais}</div>
            <div>
              <p className="text-sm font-bold text-white">{usuario?.nome_exibicao ?? "—"}</p>
              <p className="text-xs text-blue-200 font-medium">{t("profile.role")}</p>
              {usuario?.cnes_vinculo && (
                <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-blue-900 bg-blue-100 px-2 py-0.5 rounded-full">
                  <BadgeCheck className="w-3 h-3" /> #{usuario.cnes_vinculo}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors mt-0.5">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3 border-b border-slate-100">
          {[
            { icon: Mail,      label: t("shell.profile.email"), value: user?.email ?? "—" },
            { icon: Building2, label: t("profile.unit"),        value: usuario?.unidade_nome ?? t("profile.unitValue") },
            { icon: Shield,    label: t("profile.profile"),     value: t("profile.roleValue") },
            { icon: BadgeCheck,label: t("shell.profile.cnes"),  value: usuario?.cnes_vinculo ?? "—" },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                <Icon className="w-3.5 h-3.5 text-slate-500" strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
                <p className="text-xs font-medium text-slate-700 truncate">{value}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="px-4 py-3 flex gap-2">
          <button type="button" onClick={() => { onClose(); onOpenSettings(); }} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">
            <Settings className="w-3.5 h-3.5" /> {t("profile.settings")}
          </button>
          <button
            onClick={handleLogout}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" /> {t("profile.logout")}
          </button>
        </div>
      </div>
    </>
  );
}

function Topbar({ page, onNavigate, onOpenSettings }: { page: Page; onNavigate: (page: Page) => void; onOpenSettings: () => void }) {
  const { t, locale } = useLang();
  const [profileOpen, setProfileOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const { data: usuario } = useUsuarioAtual();
  const { data: criticalAlerts } = useAlertasCriticos();
  const { data: recalls } = useRecalls();
  const { data: notifications, marcarComoLida } = useNotificacoes();
  const recentAlerts = [
    ...(notifications ?? []).map((item) => ({ id: `notification-${item.id}`, title: item.titulo, description: item.mensagem ?? "", time: new Date(item.criado_em).toLocaleString(locale), target: crePageForAlert(item.destino_ui, "notification") as Page, notificationId: item.id })),
    ...(criticalAlerts ?? []).map((item, index) => ({ id: `critical-${index}`, title: t("alerts.title"), description: item.mensagem, time: new Date(item.gerado_em).toLocaleString(locale), target: crePageForAlert(item.target, item.tipo) as Page, notificationId: null as number | null })),
    ...(recalls ?? []).filter((item) => !["ENCERRADO", "CANCELADO"].includes(item.status)).map((item) => ({ id: `recall-${item.id}`, title: t("recalls.title"), description: `${item.codigo_lote} — ${item.nome_produto}`, time: item.data_abertura ? new Date(`${item.data_abertura}T00:00:00`).toLocaleDateString(locale) : "", target: "comunicacoes" as Page, notificationId: null as number | null })),
  ].slice(0, 7);

  const iniciais =
    (usuario?.nome_exibicao ?? "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase() || "?";

  const pageTitleMap: Record<Page, { title: string; sub: string }> = {
    inicio:     { title: t("page.inicio.title"),     sub: t("page.inicio.sub")     },
    pacientes:  { title: t("page.pacientes.title"),  sub: t("page.pacientes.sub")  },
    logistica:  { title: t("page.logistica.title"),  sub: t("page.logistica.sub")  },
    triagens:   { title: t("page.triagens.title"),   sub: t("page.triagens.sub")   },
    relatorios: { title: t("page.relatorios.title"), sub: t("page.relatorios.sub") },
    atendimentos: { title: t("page.atendimentos.title"), sub: t("page.atendimentos.sub") },
    comunicacoes: { title: t("page.comunicacoes.title"), sub: t("page.comunicacoes.sub") },
  };
  const { title, sub } = pageTitleMap[page];

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0 relative">
      <div>
        <h1 className="text-base font-bold text-slate-900">{title}</h1>
        <p className="text-xs text-slate-400 font-medium">{sub}</p>
      </div>
      <div className="flex items-center gap-3">
        <LanguageToggle />
        <div className="relative">
          <button type="button" onClick={() => { setAlertsOpen((value) => !value); setProfileOpen(false); }} className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors" aria-expanded={alertsOpen}>
            <Bell className="w-4 h-4 text-slate-500" />
            {recentAlerts.length > 0 && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500" />}
          </button>
          {alertsOpen && <div className="absolute right-0 top-10 z-50 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><div><p className="text-sm font-bold text-slate-800">{t("shell.navbar.recentAlerts")}</p><p className="text-[11px] text-slate-400">{t("shell.navbar.recentAlertsHint")}</p></div><button type="button" onClick={() => setAlertsOpen(false)} className="text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button></div>
            {recentAlerts.length ? <div className="max-h-72 divide-y divide-slate-100 overflow-y-auto">{recentAlerts.map((alert) => <button key={alert.id} type="button" onClick={() => { if (alert.notificationId) void marcarComoLida(alert.notificationId); setAlertsOpen(false); onNavigate(alert.target); }} className="flex w-full gap-3 px-4 py-3 text-left hover:bg-slate-50"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-500" /><span className="min-w-0"><span className="block text-xs font-bold text-slate-800">{alert.title}</span><span className="mt-0.5 block text-[11px] text-slate-500 line-clamp-2">{alert.description}</span><span className="mt-1 block text-[10px] text-slate-400">{alert.time}</span></span></button>)}</div> : <p className="px-4 py-6 text-center text-xs text-slate-400">{t("shell.navbar.noRecentAlerts")}</p>}
          </div>}
        </div>
        <div className="relative">
          <button
            onClick={() => setProfileOpen((o) => !o)}
            className="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center text-xs font-bold text-white hover:ring-2 hover:ring-blue-400 hover:ring-offset-1 transition-all"
          >
            {iniciais}
          </button>
          {profileOpen && <ProfilePopup onClose={() => setProfileOpen(false)} onOpenSettings={onOpenSettings} />}
        </div>
      </div>
    </header>
  );
}

// ═══════════════════════════════════════════════════════════════
// PAGE: DASHBOARD (Início)
// ═══════════════════════════════════════════════════════════════

function KpiCards({ onNavigate, visibleIds }: { onNavigate: (page: Page) => void; visibleIds: readonly CreHomeCardId[] }) {
  const { t } = useLang();
  const { data: kpi, loading } = useKpiDashboard();

  const cards = [
    { id: "queue" as const, target: "pacientes" as const, label: t("kpi.queue"), value: kpi?.fila_ativa, icon: Users, iconBg: "bg-blue-50", iconColor: "text-blue-600" },
    { id: "stock" as const, target: "logistica" as const, label: t("kpi.stock"), value: kpi?.estoque_proteses, icon: Package, iconBg: "bg-violet-50", iconColor: "text-violet-600" },
    { id: "logistics" as const, target: "logistica" as const, label: t("kpi.logistics"), value: kpi?.em_logistica_reversa, icon: RefreshCw, iconBg: "bg-amber-50", iconColor: "text-amber-600" },
    { id: "matchings" as const, target: "relatorios" as const, label: t("kpi.matchings"), value: kpi?.matchings_mes, icon: Zap, iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
  ].filter((card) => visibleIds.includes(card.id));
  return (
    <div className="grid grid-cols-4 gap-5">
      {cards.map(({ label, value, icon: Icon, iconBg, iconColor, target }) => (
        <button
          type="button"
          key={label}
          onClick={() => onNavigate(target)}
          className="bg-white rounded-xl border border-slate-200 px-5 py-5 hover:shadow-md hover:border-blue-300 transition-all text-left focus:outline-none focus:ring-2 focus:ring-blue-200"
        >
          <div className="flex items-start justify-between mb-4">
            <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}>
              <Icon className={`w-[18px] h-[18px] ${iconColor}`} strokeWidth={2.5} />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900 tracking-tight leading-none mb-1">
            {loading ? "—" : (value ?? 0)}
          </p>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
            {label}
          </p>
        </button>
      ))}
    </div>
  );
}

function FlowChart() {
  const { t, locale } = useLang();
  const [period, setPeriod] = useState(2);
  const slices = [4, 8, 12];
  const { data: fluxo } = useFluxoDispositivosMensal();
  const formatted = (fluxo ?? []).map((f) => ({
    mes: new Date(f.mes).toLocaleDateString(locale, { month: "short" }).replace(".", ""),
    entradas: f.entradas,
    saidas: f.saidas,
  }));
  const data = formatted.slice(Math.max(0, formatted.length - slices[period]));
  return (
    <div className="bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
            <TrendingUp className="w-3.5 h-3.5 text-blue-600" strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">{t("chart.flow.title")}</h2>
            <p className="text-xs text-slate-400">{t("chart.flow.sub")}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {["3M", "6M", "12M"].map((p, i) => (
            <button
              key={p}
              onClick={() => setPeriod(i)}
              className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-colors ${period === i ? "bg-blue-700 text-white" : "text-slate-400 hover:bg-slate-100"}`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 px-4 py-5">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart
            data={data}
            margin={{ top: 4, right: 8, left: -12, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#F1F5F9"
              vertical={false}
            />
            <XAxis
              dataKey="mes"
              tick={{
                fontSize: 11,
                fill: "#94A3B8",
                fontFamily: "Inter",
              }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{
                fontSize: 11,
                fill: "#94A3B8",
                fontFamily: "Inter",
              }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ stroke: "#E2E8F0", strokeWidth: 1 }}
            />
            <Legend
              wrapperStyle={{
                fontSize: 12,
                fontFamily: "Inter",
                paddingTop: 12,
              }}
              formatter={(v) => (
                <span className="text-slate-500 font-medium">
                  {v}
                </span>
              )}
            />
            <Line
              key="entradas"
              type="monotone"
              dataKey="entradas"
              name={t("chart.flow.entries")}
              stroke="#1D4ED8"
              strokeWidth={2.5}
              dot={{ r: 3.5, fill: "#1D4ED8", strokeWidth: 0 }}
              activeDot={{
                r: 5.5,
                fill: "#1D4ED8",
                strokeWidth: 0,
              }}
            />
            <Line
              key="saidas"
              type="monotone"
              dataKey="saidas"
              name={t("chart.flow.exits")}
              stroke="#10B981"
              strokeWidth={2.5}
              dot={{ r: 3.5, fill: "#10B981", strokeWidth: 0 }}
              activeDot={{
                r: 5.5,
                fill: "#10B981",
                strokeWidth: 0,
              }}
              strokeDasharray="5 3"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function AlertsCard({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const { t } = useLang();
  const { data: alertas } = useAlertasCriticos();
  const items = (alertas ?? []).map((a, i) => ({
    id: i,
    msg: a.mensagem,
    level: a.tipo === "ESTOQUE" ? "high" : "medium",
    target: crePageForAlert(a.target, a.tipo) as Page,
  }));
  return (
    <div className="bg-white rounded-xl border border-red-200 overflow-hidden">
      <div className="px-4 py-3.5 border-b border-red-100 flex items-center justify-between bg-red-50/60">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-red-100 flex items-center justify-center">
            <AlertTriangle className="w-3.5 h-3.5 text-red-600" strokeWidth={2.5} />
          </div>
          <h3 className="text-sm font-bold text-red-800">{t("alerts.title")}</h3>
        </div>
        <span className="text-xs font-bold text-white bg-red-500 px-2 py-0.5 rounded-full">{items.length}</span>
      </div>
      <div className="divide-y divide-slate-100">
        {items.length === 0 && (
          <p className="px-4 py-4 text-xs text-slate-400">—</p>
        )}
        {items.map((a) => (
          <button type="button" key={a.id} onClick={() => onNavigate(a.target)} className="w-full px-4 py-3 flex gap-3 hover:bg-red-50/40 transition-colors text-left focus:outline-none focus:bg-red-50/60">
            <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${a.level === "high" ? "bg-red-500" : "bg-amber-400"}`} />
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-700 leading-snug">{a.msg}</p>
            </div>
          </button>
        ))}
      </div>
      <div className="px-4 py-2.5 border-t border-slate-100">
        <button type="button" onClick={() => onNavigate("comunicacoes")} className="text-xs text-red-600 font-semibold hover:underline flex items-center gap-1">
          {t("alerts.viewAll")} <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

function RecallsCard({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const { t, locale } = useLang();
  const { data } = useRecalls();
  const recalls = (data ?? []).filter((item) => !["ENCERRADO", "CANCELADO"].includes(item.status));
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-amber-50 flex items-center justify-center">
            <FileWarning className="w-3.5 h-3.5 text-amber-600" strokeWidth={2.5} />
          </div>
          <h3 className="text-sm font-bold text-slate-800">{t("recalls.title")}</h3>
        </div>
        <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
          {recalls.length} {t("recalls.active")}
        </span>
      </div>
      <div className="divide-y divide-slate-100">
        {recalls.length === 0 && <p className="px-4 py-4 text-xs text-slate-400">—</p>}
        {recalls.map((r) => (
          <button type="button" key={r.id} onClick={() => onNavigate("comunicacoes")} className="w-full px-4 py-3 hover:bg-amber-50/40 transition-colors text-left focus:outline-none focus:bg-amber-50/60">
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className="text-xs font-bold text-slate-800 font-mono">{r.codigo_lote}</p>
              <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 shrink-0">{r.affected_devices} {t("recalls.units")}</span>
            </div>
            <p className="text-[11px] font-semibold text-slate-700 leading-snug">{r.nome_produto}</p>
            <p className="text-[11px] text-slate-500 leading-snug mb-1.5">{r.motivo}</p>
            <p className="text-[11px] text-slate-400">
              {t("recalls.deadline")}: <span className="font-semibold text-red-600">{r.data_limite ? new Intl.DateTimeFormat(locale).format(new Date(`${r.data_limite}T00:00:00`)) : "—"}</span>
            </p>
          </button>
        ))}
      </div>
      <div className="px-4 py-2.5 border-t border-slate-100">
        <button type="button" onClick={() => onNavigate("comunicacoes")} className="text-xs text-amber-600 font-semibold hover:underline flex items-center gap-1">
          {t("recalls.manage")} <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

function LotsTable() {
  const { t, locale } = useLang();
  const { data: lotesReais, loading } = useLotesRecentes();
  const lotes = lotesReais ?? [];
  const [sortCol, setSortCol] = useState<"lote_id" | "data_cadastro" | "tipo_item" | "oficina" | "quantidade" | "status">("data_cadastro");
  const [sortAsc, setSortAsc] = useState(false);
  const [showAll, setShowAll] = useState(false);

  function toggle(col: typeof sortCol) {
    sortCol === col
      ? setSortAsc(!sortAsc)
      : (setSortCol(col), setSortAsc(true));
  }

  const sorted = [...lotes].sort((a, b) =>
    sortAsc
      ? String(a[sortCol]).localeCompare(String(b[sortCol]))
      : String(b[sortCol]).localeCompare(String(a[sortCol])),
  );
  const displayed = showAll ? sorted : sorted.slice(0, 5);

  function Th({ col, label }: { col: typeof sortCol; label: string }) {
    const active = sortCol === col;
    return (
      <th
        onClick={() => toggle(col)}
        className="px-5 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider cursor-pointer select-none hover:text-slate-600 transition-colors"
      >
        <span className="flex items-center gap-1">
          {label}
          <span className={active ? "text-blue-500" : "text-slate-300"}>
            {active ? (sortAsc ? "↑" : "↓") : "↕"}
          </span>
        </span>
      </th>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
            <ClipboardList
              className="w-3.5 h-3.5 text-slate-500"
              strokeWidth={2.5}
            />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">{t("lots.title")}</h2>
            <p className="text-xs text-slate-400">{t("lots.sub")}</p>
          </div>
        </div>
        <button type="button" onClick={() => setShowAll((value) => !value)} className="text-xs text-blue-700 font-semibold bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors border border-blue-200">
          {showAll ? t("lots.showRecent") : t("lots.viewAll")}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <Th col="lote_id" label={t("lots.col.id")} />
              <Th col="data_cadastro" label={t("lots.col.date")} />
              <Th col="tipo_item" label={t("lots.col.type")} />
              <Th col="oficina" label={t("lots.col.maker")} />
              <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{t("lots.col.qty")}</th>
              <Th col="status" label={t("lots.col.status")} />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {!loading && sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-6 text-center text-xs text-slate-400">—</td>
              </tr>
            )}
            {displayed.map((l) => (
              <tr
                key={l.lote_id}
                className={`hover:bg-slate-50/80 transition-colors ${l.status === "VENCIDO" ? "bg-red-50/30" : ""}`}
              >
                <td className="px-5 py-3.5">
                  <span className="font-mono text-xs font-semibold text-slate-700">
                    {l.lote_fabricante ?? `LOTE-${l.lote_id}`}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-xs text-slate-500 font-mono">
                  {new Date(l.data_cadastro).toLocaleDateString(locale)}
                </td>
                <td className="px-5 py-3.5 text-sm font-medium text-slate-700">
                  {l.tipo_item}
                </td>
                <td className="px-5 py-3.5 text-xs text-slate-500">
                  {l.oficina}
                </td>
                <td className="px-5 py-3.5 text-xs font-bold text-slate-700">
                  {l.quantidade}
                </td>
                <td className="px-5 py-3.5">
                  <LoteStatusBadge status={l.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <p className="text-xs text-slate-400">
          {t("lots.showing")} {lotes.length} {t("lots.recent")}
        </p>
      </div>
    </div>
  );
}

function Dashboard({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const { t } = useLang();
  const { user } = useAuth();
  const { visibleIds, toggle, reset } = useDashboardCardPreferences<CreHomeCardId>(
    `umdr:cre:${user?.id ?? "anonymous"}:home-cards`,
    CRE_HOME_CARD_IDS,
  );
  const options = [
    { id: "queue" as const, label: t("kpi.queue") },
    { id: "stock" as const, label: t("kpi.stock") },
    { id: "logistics" as const, label: t("kpi.logistics") },
    { id: "matchings" as const, label: t("kpi.matchings") },
  ];

  return (
    <main className="flex-1 px-8 py-7 space-y-6 overflow-y-auto">
      <div className="flex justify-end"><DashboardCustomizer options={options} visibleIds={visibleIds} onToggle={toggle} onReset={reset} /></div>
      <KpiCards onNavigate={onNavigate} visibleIds={visibleIds} />
      <div className="grid grid-cols-[1fr_300px] gap-5 items-start">
        <FlowChart />
        <div className="flex flex-col gap-4">
          <AlertsCard onNavigate={onNavigate} />
          <RecallsCard onNavigate={onNavigate} />
        </div>
      </div>
      <LotsTable />
    </main>
  );
}

// ═══════════════════════════════════════════════════════════════
// PAGE: PACIENTES AGUARDADOS
// ═══════════════════════════════════════════════════════════════

function PatientRecordsModal({ patients, onClose, onStartTriage }: { patients: PacienteAguardando[]; onClose: () => void; onStartTriage: (patientId: number) => void }) {
  const { t, locale } = useLang();
  return (
    <div className="fixed inset-0 z-[135] flex items-center justify-center bg-slate-950/45 p-5" onClick={onClose}>
      <div className="max-h-[86vh] w-full max-w-6xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-base font-bold text-slate-900">{t("patients.records.title")}</h2>
            <p className="mt-1 text-xs text-slate-500">{patients.length} {t("patients.records.count")}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-4 w-4" /></button>
        </div>
        <div className="max-h-[68vh] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50">
              <tr className="border-b border-slate-200">
                {[t("patients.records.patient"), t("patients.records.request"), t("patients.col.device"), t("patients.records.priority"), t("patients.records.wait"), t("patients.col.status"), t("patients.col.action")].map((head) => (
                  <th key={head} className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">{head}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {patients.map((patient) => (
                <tr key={patient.solicitacao_id} className="hover:bg-slate-50">
                  <td className="px-5 py-3"><p className="font-semibold text-slate-800">{patient.nome_completo}</p><p className="text-[11px] text-slate-400">ID {patient.paciente_id}</p></td>
                  <td className="px-5 py-3 font-mono text-xs text-slate-600">#{patient.solicitacao_id}<br/><span className="font-sans text-[11px] text-slate-400">{new Date(patient.data_solicitacao).toLocaleDateString(locale)}</span></td>
                  <td className="px-5 py-3 text-xs text-slate-700">{patient.dispositivo}</td>
                  <td className="px-5 py-3 text-xs font-semibold text-slate-600">{patient.prioridade_clinica}</td>
                  <td className="px-5 py-3 text-xs text-slate-600">{patient.dias_espera_efetivos ?? 0} {t("patients.records.days")}</td>
                  <td className="px-5 py-3"><AttendanceBadge status={patient.status === "EM_FILA" ? "waiting" : "in-progress"} /></td>
                  <td className="px-5 py-3"><button type="button" onClick={() => { onClose(); onStartTriage(patient.paciente_id); }} className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-700 hover:text-white">{t("patients.triage")}</button></td>
                </tr>
              ))}
              {patients.length === 0 && <tr><td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-400">{t("patients.records.empty")}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PatientsTable({ onStartTriage, refreshKey }: { onStartTriage: (patientId: number) => void; refreshKey: number }) {
  const { t, locale } = useLang();
  const [filter, setFilter] = useState<FilterTab>("all");
  const [recordsOpen, setRecordsOpen] = useState(false);
  const { data: pacientesReais, loading } = usePacientesAguardando(refreshKey);
  const allPatients = pacientesReais ?? [];

  const attendanceOf = (patient: PacienteAguardando): AttendanceStatus =>
    patient.triagem_status && patient.triagem_status !== "CANCELADA" ? "in-progress" : (patient.status === "EM_FILA" ? "waiting" : "in-progress");

  const filtered = filter === "all" ? allPatients : allPatients.filter((p) =>
    filter === "waiting" ? attendanceOf(p) === "waiting" : attendanceOf(p) === "in-progress"
  );

  const counts = {
    all: allPatients.length,
    waiting: allPatients.filter((p) => attendanceOf(p) === "waiting").length,
    "in-progress": allPatients.filter((p) => attendanceOf(p) === "in-progress").length,
  };

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all",         label: `${t("patients.all")} (${counts.all})` },
    { key: "waiting",     label: `${t("patients.waiting")} (${counts.waiting})` },
    { key: "in-progress", label: `${t("patients.inProgress")} (${counts["in-progress"]})` },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
      {/* header */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900">{t("patients.title")}</h2>
          <p className="text-xs text-slate-400 mt-0.5">{allPatients.length} {t("patients.sub")}</p>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${filter === key ? "bg-blue-700 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* table */}
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              {[
                t("patients.col.patient"),
                t("patients.col.device"),
                t("patients.col.type"),
                t("patients.col.date"),
                t("patients.col.status"),
                t("patients.col.action"),
              ].map((h) => (
                <th key={h} className="px-5 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-6 text-center text-xs text-slate-400">—</td>
              </tr>
            )}
            {filtered.map((p) => (
              <tr
                key={p.solicitacao_id}
                className="hover:bg-slate-50/60 transition-colors group"
              >
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                      {p.paciente_mascarado.slice(0, 1)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 font-mono">
                        {p.paciente_mascarado}
                      </p>
                      {p.prioridade_clinica === "URGENTE" && (
                        <span className="text-[10px] font-semibold text-orange-600 flex items-center gap-1">
                          <AlertTriangle className="w-2.5 h-2.5" /> {t("patients.priority")}
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 text-sm font-medium text-slate-700">
                  {p.dispositivo}
                </td>
                <td className="px-5 py-4">
                  <DeviceTag type={p.dispositivo} />
                </td>
                <td className="px-5 py-4 text-sm text-slate-500 font-mono">
                  {new Date(p.data_solicitacao).toLocaleDateString(locale)}
                </td>
                <td className="px-5 py-4">
                  <AttendanceBadge status={attendanceOf(p)} />
                </td>
                <td className="px-5 py-4">
                  <button type="button" onClick={() => onStartTriage(p.paciente_id)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-700 hover:text-white rounded-lg transition-colors border border-blue-200 hover:border-blue-700">
                    {t("patients.triage")} <ChevronRight className="w-3 h-3" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* footer */}
      <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-xs text-slate-400 font-medium">
            {t("patients.showing")} {filtered.length} {t("patients.of")} {allPatients.length}
          </p>
        </div>
        <button type="button" onClick={() => setRecordsOpen(true)} className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors">
          {t("patients.viewAll")} <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
      {recordsOpen && <PatientRecordsModal patients={allPatients} onClose={() => setRecordsOpen(false)} onStartTriage={onStartTriage} />}
    </div>
  );
}

function LogisticsPanel() {
  const { t } = useLang();
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [labelGenerated, setLabelGenerated] = useState(false);
  const { data: remessasReais } = useRemessasLogistica();
  const remessas = remessasReais ?? [];
  const remessaSelecionada = remessas.find((r) => r.status === "AGUARDANDO_COLETA") ?? remessas[0] ?? null;
  const pendentesCount = remessas.filter((r) => r.status === "AGUARDANDO_COLETA").length;

  function handleScan() {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      setScanned(true);
    }, 1800);
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
      {/* header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900">{t("logistics.panel.title")}</h2>
          <p className="text-xs text-slate-400 mt-0.5">{t("logistics.panel.sub")}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 border border-amber-300 bg-amber-50 px-2.5 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          {pendentesCount} {t("logistics.pending")}
        </span>
      </div>

      <div className="flex-1 px-5 py-5 flex flex-col gap-4">
        {!scanned ? (
          <>
            <p className="text-xs text-slate-500 text-center leading-relaxed">{t("logistics.scanInstructions")}</p>

            {/* scanner box */}
            <div className="flex justify-center">
              <div className="relative w-48 h-48 flex items-center justify-center">
                <div className="absolute inset-0 rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50/40" />
                {[
                  "top-0 left-0 border-t-[3px] border-l-[3px] rounded-tl-xl",
                  "top-0 right-0 border-t-[3px] border-r-[3px] rounded-tr-xl",
                  "bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-xl",
                  "bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-xl",
                ].map((cls, i) => (
                  <span
                    key={i}
                    className={`absolute w-6 h-6 border-blue-600 ${cls}`}
                  />
                ))}
                {scanning && (
                  <div
                    className="absolute left-4 right-4 h-0.5 bg-blue-500/70 rounded-full"
                    style={{
                      animation:
                        "scanline 1.8s ease-in-out forwards",
                    }}
                  />
                )}
                <div className="relative flex flex-col items-center gap-2 text-center z-10">
                  <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                    <Camera
                      className={`w-5 h-5 ${scanning ? "text-blue-500" : "text-slate-400"}`}
                      strokeWidth={1.5}
                    />
                  </div>
                  <p className="text-xs text-slate-400 leading-snug max-w-[100px]">
                    {scanning ? t("logistics.reading") : t("logistics.position")}
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleScan}
              disabled={scanning}
              className="w-full flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl bg-blue-700 text-white text-sm font-bold hover:bg-blue-800 active:scale-[0.98] transition-all shadow-md shadow-blue-200 disabled:opacity-60 disabled:cursor-wait"
            >
              <QrCode className="w-4 h-4" strokeWidth={2} />
              {scanning ? t("logistics.scanning") : t("logistics.scanBtn")}
            </button>
          </>
        ) : (
          <>
            {/* scanned result */}
            <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <CheckCircle2
                className="w-4 h-4 text-emerald-600 shrink-0"
                strokeWidth={2.5}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">{t("logistics.scanned.label")}</p>
                <p className="text-sm font-bold text-emerald-900 font-mono truncate">
                  {remessaSelecionada?.codigo_rastreio || (remessaSelecionada ? `REM-${remessaSelecionada.remessa_id}` : "—")}
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200 shrink-0">{t("logistics.scanned.tag")}</span>
            </div>

            {/* destination */}
            <div className="rounded-xl border-2 border-blue-200 overflow-hidden">
              <div className="px-4 py-2.5 bg-blue-700 flex items-center gap-2">
                <Zap
                  className="w-3.5 h-3.5 text-white"
                  strokeWidth={2.5}
                />
                <p className="text-xs font-bold text-white tracking-tight">{t("logistics.dest.title")}</p>
              </div>
              <div className="px-4 py-3.5 bg-blue-50/40 space-y-2.5">
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">{t("logistics.dest.sendTo")}</p>
                  <p className="text-sm font-bold text-slate-900 leading-tight">{remessaSelecionada?.fabricante_destino || t("logistics.dest.factory")}</p>
                </div>
                <div className="flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-slate-600 font-medium">{remessaSelecionada?.endereco_destino || t("logistics.dest.address")}</p>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-blue-200">
                  <div className="flex items-center gap-1.5">
                    <PackageCheck className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                      {labelGenerated ? t("logistics.dest.generated") : t("logistics.dest.waiting")}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {remessaSelecionada ? `#REM-${remessaSelecionada.remessa_id}` : "—"}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setLabelGenerated(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-700 text-white text-sm font-bold hover:bg-blue-800 transition-all shadow-md shadow-blue-200 active:scale-[0.98]"
            >
              <FileText className="w-4 h-4" />
              {labelGenerated ? t("logistics.reprint") : t("logistics.genLabel")}
              <Truck className="w-4 h-4 ml-auto opacity-60" />
            </button>

            {labelGenerated && (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <p className="text-xs font-semibold text-emerald-700">
                  {t("logistics.success")} <span className="font-mono text-emerald-900">{remessaSelecionada?.codigo_rastreio || (remessaSelecionada ? `REM-${remessaSelecionada.remessa_id}` : "—")}</span>
                </p>
              </div>
            )}

            <button
              onClick={() => {
                setScanned(false);
                setLabelGenerated(false);
              }}
              className="text-xs text-slate-400 hover:text-slate-600 font-medium text-center hover:underline transition-colors"
            >
              {t("logistics.scanAnother")}
            </button>
          </>
        )}
      </div>

      {/* alert footer */}
      <div className="mx-4 mb-4 flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
        <AlertTriangle
          className="w-4 h-4 text-amber-600 shrink-0"
          strokeWidth={2.5}
        />
        <p className="text-xs font-semibold text-amber-800 leading-snug">
          {pendentesCount} {t("logistics.alert")}
        </p>
      </div>

      <style>{`
        @keyframes scanline {
          0%   { top: 12%; opacity: 0; }
          8%   { opacity: 1; }
          92%  { opacity: 1; }
          100% { top: 88%; opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function PacientesAguardados({ onStartTriage, refreshKey }: { onStartTriage: (patientId: number) => void; refreshKey: number }) {
  const { t } = useLang();
  const { data: pacientesReais } = usePacientesAguardando(refreshKey);
  const { data: remessasReais } = useRemessasLogistica();
  const { data: kpiReal } = useKpiDashboard(refreshKey);

  const waitingCount = (pacientesReais ?? []).filter((p) => p.status === "EM_FILA" && !p.triagem_status).length;
  const attendingCount = (pacientesReais ?? []).filter((p) => Boolean(p.triagem_status) && p.triagem_status !== "CANCELADA").length;
  const dispatchCount = (remessasReais ?? []).filter((r) => r.status === "AGUARDANDO_COLETA").length;

  return (
    <main className="flex-1 px-8 py-7 overflow-y-auto">
      {/* CRE kpis strip */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { icon: Users,        bg: "bg-blue-50",   color: "text-blue-600",   val: String(waitingCount),   label: t("cre.waiting")   },
          { icon: Activity,     bg: "bg-emerald-50",color: "text-emerald-600",val: String(attendingCount), label: t("cre.attending") },
          { icon: Package,      bg: "bg-orange-50", color: "text-orange-500", val: String(dispatchCount),  label: t("cre.dispatch")  },
          { icon: CheckCircle2, bg: "bg-violet-50", color: "text-violet-600", val: String(kpiReal?.matchings_mes ?? "—"), label: t("cre.monthly")   },
        ].map(({ icon: Icon, bg, color, val, label }) => (
          <div
            key={label}
            className="bg-white rounded-xl border border-slate-200 px-5 py-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div
              className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}
            >
              <Icon
                className={`w-[18px] h-[18px] ${color}`}
                strokeWidth={2.5}
              />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 leading-none">
                {val}
              </p>
              <p className="text-xs font-medium text-slate-400 mt-0.5 leading-tight">
                {label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* two-column */}
      <div className="grid grid-cols-[3fr_2fr] gap-5 items-start">
        <PatientsTable onStartTriage={onStartTriage} refreshKey={refreshKey} />
        <LogisticsPanel />
      </div>
    </main>
  );
}

// ═══════════════════════════════════════════════════════════════
// ROOT APP
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// PAGE: LOGÍSTICA REVERSA
// ═══════════════════════════════════════════════════════════════

function RemessaBadge({ status }: { status: "AGUARDANDO_COLETA" | "EM_TRANSITO" | "ENTREGUE" }) {
  const { t } = useLang();
  const map: Record<string, string> = {
    AGUARDANDO_COLETA: "bg-amber-50 text-amber-700 border-amber-200",
    EM_TRANSITO: "bg-blue-50 text-blue-700 border-blue-200",
    ENTREGUE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };
  const dot: Record<string, string> = {
    AGUARDANDO_COLETA: "bg-amber-500",
    EM_TRANSITO: "bg-blue-500 animate-pulse",
    ENTREGUE: "bg-emerald-500",
  };
  const label: Record<string, string> = {
    AGUARDANDO_COLETA: t("logistics.kpi.waiting"),
    EM_TRANSITO: t("logistics.kpi.transit"),
    ENTREGUE: t("logistics.status.delivered"),
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${map[status]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot[status]}`} />
      {label[status]}
    </span>
  );
}

function LogisticaReversa({ onNewReturn, refreshKey }: { onNewReturn: () => void; refreshKey: number }) {
  const { t, locale } = useLang();
  const [search, setSearch] = useState("");
  const { data: remessasReais, loading } = useRemessasLogistica(refreshKey);
  const remessas = remessasReais ?? [];
  const filtered = remessas.filter(
    (r) => r.tipo_dispositivo.toLowerCase().includes(search.toLowerCase()) || String(r.remessa_id).includes(search)
  );

  const kpis = [
    { icon: Package,      bg: "bg-amber-50",   color: "text-amber-600",  val: remessas.filter(r => r.status === "AGUARDANDO_COLETA").length.toString(), label: t("logistics.kpi.waiting")   },
    { icon: Truck,        bg: "bg-blue-50",    color: "text-blue-600",   val: remessas.filter(r => r.status === "EM_TRANSITO").length.toString(),       label: t("logistics.kpi.transit")   },
    { icon: CheckCircle2, bg: "bg-emerald-50", color: "text-emerald-600",val: remessas.filter(r => r.status === "ENTREGUE").length.toString(),          label: t("logistics.kpi.delivered") },
    { icon: Box,          bg: "bg-violet-50",  color: "text-violet-600", val: remessas.reduce((s, r) => s + r.quantidade, 0).toString(),                label: t("logistics.kpi.total")     },
  ];

  return (
    <main className="flex-1 px-8 py-7 space-y-6 overflow-y-auto">
      {/* kpis */}
      <div className="grid grid-cols-4 gap-5">
        {kpis.map(({ icon: Icon, bg, color, val, label }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 px-5 py-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
              <Icon className={`w-[18px] h-[18px] ${color}`} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-900 leading-none">{val}</p>
              <p className="text-xs font-medium text-slate-400 mt-0.5 leading-tight">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* table card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
              <RefreshCw className="w-3.5 h-3.5 text-amber-600" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">{t("logistics.table.title")}</h2>
              <p className="text-xs text-slate-400">{t("logistics.table.sub")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("logistics.search")}
                className="text-xs bg-transparent outline-none text-slate-700 placeholder-slate-400 w-40"
              />
            </div>
            <button type="button" onClick={() => downloadCreCsv("umdr-cre-remessas.csv", filtered.map((item) => ({ id: item.remessa_id, origem: item.origem, destino: item.fabricante_destino, dispositivo: item.tipo_dispositivo, quantidade: item.quantidade, rastreio: item.codigo_rastreio ?? "", status: item.status, data: item.data_criacao })))} className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors">
              <Download className="w-3.5 h-3.5" /> {t("logistics.export")}
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {[
                  t("logistics.col.lot"),
                  t("logistics.col.origin"),
                  t("logistics.col.dest"),
                  t("logistics.col.type"),
                  t("logistics.col.qty"),
                  t("logistics.col.date"),
                  t("logistics.col.tracking"),
                  t("logistics.col.status"),
                ].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-6 text-center text-xs text-slate-400">—</td>
                </tr>
              )}
              {filtered.map((r) => (
                <tr key={r.remessa_id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-5 py-3.5"><span className="font-mono text-xs font-semibold text-slate-700">#{r.remessa_id}</span></td>
                  <td className="px-5 py-3.5 text-xs text-slate-600 font-medium">{r.origem}</td>
                  <td className="px-5 py-3.5 text-xs text-slate-600">{r.fabricante_destino}</td>
                  <td className="px-5 py-3.5 text-xs font-medium text-slate-700">{r.tipo_dispositivo}</td>
                  <td className="px-5 py-3.5 text-xs font-bold text-slate-700">{r.quantidade}</td>
                  <td className="px-5 py-3.5 text-xs text-slate-500 font-mono">{new Date(r.data_criacao).toLocaleDateString(locale)}</td>
                  <td className="px-5 py-3.5">
                    {!r.codigo_rastreio
                      ? <span className="text-xs text-slate-400">—</span>
                      : <span className="font-mono text-xs text-blue-600 font-semibold">{r.codigo_rastreio}</span>
                    }
                  </td>
                  <td className="px-5 py-3.5"><RemessaBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <p className="text-xs text-slate-400">{t("logistics.showing")} {filtered.length} {t("logistics.of")} {remessas.length} {t("logistics.remessas")}</p>
          <button type="button" onClick={onNewReturn} className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors">
            <QrCode className="w-3.5 h-3.5" /> {t("logistics.scanNew")}
          </button>
        </div>
      </div>
    </main>
  );
}

// ═══════════════════════════════════════════════════════════════
// PAGE: TRIAGENS
// ═══════════════════════════════════════════════════════════════

function TriagemBadge({ status }: { status: "PENDENTE" | "EM_ANDAMENTO" | "CONCLUIDA" | "CANCELADA" }) {
  const { t } = useLang();
  const map: Record<string, string> = {
    PENDENTE: "bg-amber-50 text-amber-700 border-amber-200",
    EM_ANDAMENTO: "bg-blue-50 text-blue-700 border-blue-200",
    CONCLUIDA: "bg-emerald-50 text-emerald-700 border-emerald-200",
    CANCELADA: "bg-red-50 text-red-700 border-red-200",
  };
  const dot: Record<string, string> = {
    PENDENTE: "bg-amber-500", EM_ANDAMENTO: "bg-blue-500 animate-pulse", CONCLUIDA: "bg-emerald-500", CANCELADA: "bg-red-500",
  };
  const label: Record<string, string> = {
    PENDENTE: t("triage.status.pending"),
    EM_ANDAMENTO: t("triage.status.progress"),
    CONCLUIDA: t("triage.status.done"),
    CANCELADA: t("triage.status.cancelled"),
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${map[status]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot[status]}`} />
      {label[status]}
    </span>
  );
}

function Triagens({ onNewTriage, onEditTriage, refreshKey }: { onNewTriage: () => void; onEditTriage: (triage: Triagem) => void; refreshKey: number }) {
  const { t, locale } = useLang();
  const { data: triagensReais, loading } = useTriagens(refreshKey);
  const triagens = triagensReais ?? [];
  const [selected, setSelected] = useState<Triagem | null>(null);
  const [filterStatus, setFilterStatus] = useState<Triagem["status"] | "TODAS">("TODAS");

  const statusOpts: { key: Triagem["status"] | "TODAS"; label: string }[] = [
    { key: "TODAS", label: t("triage.filter.all") },
    { key: "PENDENTE", label: t("triage.status.pending") },
    { key: "EM_ANDAMENTO", label: t("triage.status.progress") },
    { key: "CONCLUIDA", label: t("triage.status.done") },
    { key: "CANCELADA", label: t("triage.status.cancelled") },
  ];
  const filtered = filterStatus === "TODAS" ? triagens : triagens.filter(tr => tr.status === filterStatus);

  const seteDiasAtras = new Date();
  seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
  const estaSemanaCount = triagens.filter(tr => new Date(tr.data_hora) >= seteDiasAtras).length;
  const hojeStr = new Date().toDateString();
  const concluidasHojeCount = triagens.filter(tr => tr.status === "CONCLUIDA" && new Date(tr.data_hora).toDateString() === hojeStr).length;

  const kpis = [
    { icon: Clock,        bg: "bg-amber-50",   color: "text-amber-600",  val: triagens.filter(tr => tr.status === "PENDENTE").length.toString(),     label: t("triage.kpi.pending")    },
    { icon: Stethoscope,  bg: "bg-blue-50",    color: "text-blue-600",   val: triagens.filter(tr => tr.status === "EM_ANDAMENTO").length.toString(), label: t("triage.kpi.inProgress") },
    { icon: CheckCircle2, bg: "bg-emerald-50", color: "text-emerald-600",val: concluidasHojeCount.toString(),                                        label: t("triage.kpi.done")       },
    { icon: Calendar,     bg: "bg-violet-50",  color: "text-violet-600", val: estaSemanaCount.toString(),                                            label: t("triage.kpi.week")       },
  ];

  const avatarOf = (nome: string) => nome.split(" ").filter(Boolean).slice(0, 2).map(p => p[0]).join("").toUpperCase();

  return (
    <main className="flex-1 px-8 py-7 space-y-6 overflow-y-auto">
      {/* kpis */}
      <div className="grid grid-cols-4 gap-5">
        {kpis.map(({ icon: Icon, bg, color, val, label }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 px-5 py-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
              <Icon className={`w-[18px] h-[18px] ${color}`} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-900 leading-none">{val}</p>
              <p className="text-xs font-medium text-slate-400 mt-0.5 leading-tight">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[1fr_340px] gap-5 items-start">
        {/* table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                <ClipboardList className="w-3.5 h-3.5 text-blue-600" strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-800">{t("triage.table.title")}</h2>
                <p className="text-xs text-slate-400">{t("triage.table.sub")}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
              {statusOpts.map(({ key, label }) => (
                <button key={key} onClick={() => setFilterStatus(key)} className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${filterStatus === key ? "bg-blue-700 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>{label}</button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {[t("triage.col.patient"), t("triage.col.professional"), t("triage.col.device"), t("triage.col.datetime"), t("triage.col.status"), ""].map((h, i) => (
                    <th key={i} className="px-5 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-6 text-center text-xs text-slate-400">—</td>
                  </tr>
                )}
                {filtered.map((tr) => (
                  <tr
                    key={tr.triagem_id}
                    onClick={() => setSelected(tr)}
                    className={`hover:bg-blue-50/40 transition-colors cursor-pointer ${selected?.triagem_id === tr.triagem_id ? "bg-blue-50/60" : ""}`}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">{avatarOf(tr.paciente)}</div>
                        <span className="font-mono text-xs font-bold text-slate-800">{tr.paciente}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-600 font-medium">{tr.profissional}</td>
                    <td className="px-5 py-3.5 text-xs text-slate-600">{tr.dispositivo ?? "—"}</td>
                    <td className="px-5 py-3.5 text-xs text-slate-500 font-mono">{new Date(tr.data_hora).toLocaleString(locale)}</td>
                    <td className="px-5 py-3.5"><TriagemBadge status={tr.status} /></td>
                    <td className="px-5 py-3.5">
                      <ChevronRight className={`w-4 h-4 transition-colors ${selected?.triagem_id === tr.triagem_id ? "text-blue-600" : "text-slate-300"}`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <p className="text-xs text-slate-400">{t("triage.showing")} {filtered.length} {t("triage.of")} {triagens.length} {t("triage.triagens")}</p>
            <button type="button" onClick={onNewTriage} className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors">
              {t("triage.new")} <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* detail panel */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {selected ? (
            <>
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800">{t("triage.detail.title")}</h3>
                <button onClick={() => setSelected(null)} className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors">
                  <X className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>
              <div className="px-5 py-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-lg font-bold text-slate-600">{avatarOf(selected.paciente)}</div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 font-mono">{selected.paciente}</p>
                    <TriagemBadge status={selected.status} />
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { icon: Stethoscope, label: t("triage.detail.professional"), val: selected.profissional },
                    { icon: Package,     label: t("triage.detail.device"),       val: selected.dispositivo ?? "—" },
                    { icon: Calendar,    label: t("triage.detail.date"),         val: new Date(selected.data_hora).toLocaleString(locale) },
                  ].map(({ icon: Icon, label, val }) => (
                    <div key={label} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                      <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
                        <Icon className="w-3.5 h-3.5 text-slate-500" strokeWidth={2} />
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
                        <p className="text-xs font-semibold text-slate-700 mt-0.5">{val}</p>
                      </div>
                    </div>
                  ))}
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{t("triage.detail.obs")}</p>
                    <p className="text-xs text-slate-600 leading-relaxed">{selected.observacao_clinica ?? "—"}</p>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => onEditTriage(selected)} className="flex-1 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors">{t("triage.detail.edit")}</button>
                  <button type="button" onClick={() => window.print()} className="flex-1 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">{t("triage.detail.print")}</button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
                <ClipboardList className="w-6 h-6 text-slate-300" strokeWidth={1.5} />
              </div>
              <p className="text-sm font-semibold text-slate-400">{t("triage.detail.empty")}</p>
              <p className="text-xs text-slate-300 mt-1">{t("triage.detail.emptySub")}</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

// ═══════════════════════════════════════════════════════════════
// PAGE: RELATÓRIOS
// ═══════════════════════════════════════════════════════════════

const PIE_COLORS = ["#7C3AED", "#D97706", "#0891B2", "#E11D48", "#1D4ED8", "#059669"];

function downloadCreCsv(filename: string, rows: Array<Record<string, string | number>>) {
  if (!rows.length) return;
  const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const csv = [columns.map(escape).join(","), ...rows.map((row) => columns.map((column) => escape(row[column])).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function Relatorios({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const { t, locale } = useLang();
  const [exportType, setExportType] = useState<"PDF" | "CSV">("PDF");
  const { data: relatorioReal } = useRelatorioMensal();
  const { data: lotesReais } = useLotesRecentes();
  const { data: pacientesRelatorio } = usePacientesAguardando();
  const { data: triagensRelatorio } = useTriagens();
  const { data: remessasRelatorio } = useRemessasLogistica();
  const { data: kpiRelatorio } = useKpiDashboard();
  const { data: recallsRelatorio } = useRecalls();
  const { data: alertasRelatorio } = useAlertasCriticos();

  const barData = (relatorioReal ?? []).map((r) => ({
    mes: new Date(r.mes).toLocaleDateString(locale, { month: "short" }).replace(".", ""),
    triagens: r.triagens,
    matchings: r.matchings,
    devolucoes: r.devolucoes,
  }));

  const totalTriagens = (relatorioReal ?? []).reduce((s, r) => s + r.triagens, 0);
  const totalMatchings = (relatorioReal ?? []).reduce((s, r) => s + r.matchings, 0);
  const totalDevolucoes = (relatorioReal ?? []).reduce((s, r) => s + r.devolucoes, 0);
  const taxaMatching = totalTriagens > 0 ? Math.round((totalMatchings / totalTriagens) * 100) : 0;

  const tipoCounts = new Map<string, number>();
  (lotesReais ?? []).forEach((l) => tipoCounts.set(l.tipo_item, (tipoCounts.get(l.tipo_item) ?? 0) + 1));
  const pieData = [...tipoCounts.entries()].map(([name, value], i) => ({ name, value, color: PIE_COLORS[i % PIE_COLORS.length] }));

  const kpis = [
    { target: "triagens" as const, icon: Users, bg: "bg-blue-50", color: "text-blue-600", val: String(totalTriagens), label: t("reports.kpi.semester") },
    { target: "triagens" as const, icon: Zap, bg: "bg-emerald-50", color: "text-emerald-600", val: String(totalMatchings), label: t("reports.kpi.matchings") },
    { target: "logistica" as const, icon: RefreshCw, bg: "bg-amber-50", color: "text-amber-600", val: String(totalDevolucoes), label: t("reports.kpi.returns") },
    { target: "triagens" as const, icon: BarChart2, bg: "bg-violet-50", color: "text-violet-600", val: `${taxaMatching}%`, label: t("reports.kpi.rate"), sub: t("reports.kpi.goal") },
  ];

  return (
    <main className="flex-1 px-8 py-7 space-y-6 overflow-y-auto">
      {/* kpis */}
      <div className="grid grid-cols-4 gap-5">
        {kpis.map(({ target, icon: Icon, bg, color, val, label, sub }) => (
          <button type="button" onClick={() => onNavigate(target)} key={label} className="bg-white rounded-xl border border-slate-200 px-5 py-5 shadow-sm hover:shadow-md hover:border-blue-300 transition-all text-left focus:outline-none focus:ring-2 focus:ring-blue-200">
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
                <Icon className={`w-[18px] h-[18px] ${color}`} strokeWidth={2.5} />
              </div>
              {sub && <span className="text-xs font-semibold text-slate-400">{sub}</span>}
            </div>
            <p className="text-3xl font-bold text-slate-900 tracking-tight leading-none mb-1">{val}</p>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</p>
          </button>
        ))}
      </div>

      {/* charts row */}
      <div className="grid grid-cols-[1fr_300px] gap-5 items-start">
        {/* bar chart */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                <BarChart2 className="w-3.5 h-3.5 text-blue-600" strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-800">{t("reports.bar.title")}</h2>
                <p className="text-xs text-slate-400">{t("reports.bar.sub")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {(["PDF", "CSV"] as const).map((et) => (
                <button
                  key={et}
                  onClick={() => {
                    setExportType(et);
                    if (et === "CSV") downloadCreCsv("umdr-cre-relatorio-mensal.csv", barData);
                    else window.print();
                  }}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${exportType === et ? "bg-blue-700 text-white border-blue-700" : "text-slate-500 border-slate-200 hover:bg-slate-50"}`}
                >
                  <Download className="w-3.5 h-3.5" /> {et}
                </button>
              ))}
            </div>
          </div>
          <div className="px-4 py-5">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={barData} margin={{ top: 4, right: 8, left: -12, bottom: 0 }} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#94A3B8", fontFamily: "Inter" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94A3B8", fontFamily: "Inter" }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "#F8FAFC" }} />
                <Legend wrapperStyle={{ fontSize: 12, fontFamily: "Inter", paddingTop: 12 }} formatter={(v) => <span className="text-slate-500 font-medium">{v}</span>} />
                <Bar key="triagens"   dataKey="triagens"   name={t("reports.bar.triagens")}  fill="#1D4ED8" radius={[4,4,0,0]} />
                <Bar key="matchings"  dataKey="matchings"  name={t("reports.bar.matchings")} fill="#10B981" radius={[4,4,0,0]} />
                <Bar key="devolucoes" dataKey="devolucoes" name={t("reports.bar.returns")}   fill="#F59E0B" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* pie chart */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
                <Package className="w-3.5 h-3.5 text-violet-600" strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-800">{t("reports.pie.title")}</h2>
                <p className="text-xs text-slate-400">{t("reports.pie.sub")}</p>
              </div>
            </div>
          </div>
          <div className="px-5 py-4 flex flex-col items-center gap-4">
            {pieData.length === 0 ? (
              <p className="text-xs text-slate-400 py-8">—</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3}>
                      {pieData.map((entry, i) => (
                        <Cell key={`cell-${i}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="w-full space-y-2">
                  {pieData.map((d) => (
                    <div key={d.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                        <span className="text-xs text-slate-600 font-medium">{d.name}</span>
                      </div>
                      <span className="text-xs font-bold text-slate-800">{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* export section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
            <FileText className="w-3.5 h-3.5 text-slate-500" strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">{t("reports.export.title")}</h2>
            <p className="text-xs text-slate-400">{t("reports.export.sub")}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 p-5">
          {[
            { kind: "patients", icon: Users, title: t("reports.rep.patients"), sub: t("reports.rep.patientsSub"), color: "text-blue-600", bg: "bg-blue-50" },
            { kind: "triages", icon: Zap, title: t("reports.rep.matchings"), sub: t("reports.rep.matchingsSub"), color: "text-emerald-600", bg: "bg-emerald-50" },
            { kind: "logistics", icon: RefreshCw, title: t("reports.rep.logistics"), sub: t("reports.rep.logisticsSub"), color: "text-amber-600", bg: "bg-amber-50" },
            { kind: "stock", icon: Package, title: t("reports.rep.stock"), sub: t("reports.rep.stockSub"), color: "text-violet-600", bg: "bg-violet-50" },
            { kind: "kpi", icon: Activity, title: t("reports.rep.kpi"), sub: t("reports.rep.kpiSub"), color: "text-rose-600", bg: "bg-rose-50" },
            { kind: "audit", icon: Shield, title: t("reports.rep.audit"), sub: t("reports.rep.auditSub"), color: "text-slate-600", bg: "bg-slate-100" },
          ].map(({ kind, icon: Icon, title, sub, color, bg }) => (
            <button type="button" onClick={() => {
              if (kind === "patients") downloadCreCsv("umdr-cre-pacientes.csv", (pacientesRelatorio ?? []).map((item) => ({ paciente: item.nome_completo, dispositivo: item.dispositivo, prioridade: item.prioridade_clinica, status: item.status, dias_espera: item.dias_espera_efetivos })));
              else if (kind === "triages") downloadCreCsv("umdr-cre-triagens.csv", (triagensRelatorio ?? []).map((item) => ({ paciente: item.paciente, profissional: item.profissional, dispositivo: item.dispositivo ?? "", data: item.data_hora, status: item.status, observacao: item.observacao_clinica ?? "" })));
              else if (kind === "logistics") downloadCreCsv("umdr-cre-logistica.csv", (remessasRelatorio ?? []).map((item) => ({ id: item.remessa_id, origem: item.origem, destino: item.fabricante_destino, dispositivo: item.tipo_dispositivo, quantidade: item.quantidade, status: item.status, rastreio: item.codigo_rastreio ?? "" })));
              else if (kind === "stock") downloadCreCsv("umdr-cre-estoque.csv", (lotesReais ?? []).map((item) => ({ lote: item.lote_fabricante ?? item.lote_id, item: item.tipo_item, oficina: item.oficina, quantidade: item.quantidade, validade: item.data_validade ?? "", status: item.status })));
              else if (kind === "kpi") downloadCreCsv("umdr-cre-kpis.csv", [{ fila_ativa: kpiRelatorio?.fila_ativa ?? 0, estoque_proteses: kpiRelatorio?.estoque_proteses ?? 0, logistica_reversa: kpiRelatorio?.em_logistica_reversa ?? 0, matchings_mes: kpiRelatorio?.matchings_mes ?? 0 }]);
              else downloadCreCsv("umdr-cre-auditoria-alertas.csv", [...(recallsRelatorio ?? []).map((item) => ({ tipo: "RECALL", referencia: item.codigo_lote, descricao: item.motivo, status: item.status, data: item.data_abertura })), ...(alertasRelatorio ?? []).map((item) => ({ tipo: "ALERTA", referencia: item.tipo, descricao: item.mensagem, status: "ATIVO", data: item.gerado_em }))]);
            }} key={title} className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all cursor-pointer group text-left focus:outline-none focus:ring-2 focus:ring-blue-200">
              <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-4 h-4 ${color}`} strokeWidth={2.5} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-800 leading-tight">{title}</p>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{sub}</p>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-500 transition-colors shrink-0 mt-0.5" />
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}

// ═══════════════════════════════════════════════════════════════
// ROOT APP
// ═══════════════════════════════════════════════════════════════

function AppInner() {
  const [page, setPage] = useState<Page>("inicio");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [triageOpen, setTriageOpen] = useState(false);
  const [triagePatientId, setTriagePatientId] = useState<number | null>(null);
  const [editingTriage, setEditingTriage] = useState<Triagem | null>(null);
  const [shipmentOpen, setShipmentOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const openNewTriage = (patientId: number | null = null) => { setEditingTriage(null); setTriagePatientId(patientId); setTriageOpen(true); };
  const openEditTriage = (triage: Triagem) => { setEditingTriage(triage); setTriagePatientId(triage.paciente_id); setTriageOpen(true); };
  const refreshData = () => setRefreshKey((value) => value + 1);
  return (
    <div className="flex min-h-screen bg-[#F8FAFC]" style={{ fontFamily: "Inter, sans-serif" }}>
      <Sidebar current={page} onNavigate={setPage} onOpenSettings={() => setSettingsOpen(true)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar page={page} onNavigate={setPage} onOpenSettings={() => setSettingsOpen(true)} />
        {page === "inicio"     && <Dashboard onNavigate={setPage} />}
        {page === "pacientes"  && <PacientesAguardados onStartTriage={(patientId) => openNewTriage(patientId)} refreshKey={refreshKey} />}
        {page === "logistica"  && <LogisticaReversa onNewReturn={() => setShipmentOpen(true)} refreshKey={refreshKey} />}
        {page === "triagens"   && <Triagens onNewTriage={() => openNewTriage()} onEditTriage={openEditTriage} refreshKey={refreshKey} />}
        {page === "relatorios" && <Relatorios onNavigate={setPage} />}
        {page === "atendimentos" && <CreSupportInbox />}
        {page === "comunicacoes" && <CommunicationsCenter role="FISCAL_CRE" />}
      </div>
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <TriageModal open={triageOpen} onClose={() => setTriageOpen(false)} onSaved={refreshData} initialPatientId={triagePatientId} triage={editingTriage} />
      <ShipmentModal open={shipmentOpen} onClose={() => setShipmentOpen(false)} onSaved={refreshData} />
    </div>
  );
}

export function CREHomePage() {
  return <AppInner />;
}