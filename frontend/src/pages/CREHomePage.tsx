import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLang } from "../i18n/LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import { StatusBadge } from "../components/StatusBadge";
import { LanguageToggle } from "../components/LanguageToggle";
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
  type Triagem,
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

type Page = "inicio" | "pacientes" | "logistica" | "triagens" | "relatorios";

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
}

function Sidebar({ current, onNavigate }: SidebarProps) 
{
  const { t } = useLang();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const nav: { icon: any; label: string; page: Page | null }[] = [
    { icon: Home,          label: t("nav.home"),      page: "inicio"    },
    { icon: Users,         label: t("nav.patients"),  page: "pacientes" },
    { icon: RefreshCw,     label: t("nav.logistics"), page: "logistica" },
    { icon: ClipboardList, label: t("nav.triage"),    page: "triagens"  },
    { icon: Activity,      label: t("nav.reports"),   page: "relatorios"},
  ];

  const handleLogout = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

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
            <p className="text-sm font-bold text-slate-900 tracking-tight">
              RE-VITA
            </p>
            <p className="text-[10px] text-slate-400 font-medium tracking-widest uppercase">
              {t("nav.system")}
            </p>
          </div>
        </div>
      </div>

      {/* nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {nav.map(({ icon: Icon, label, page }) => {
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
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-50 transition-colors">
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

function ProfilePopup({ onClose }: { onClose: () => void }) {
  const { t } = useLang();
  const { signOut } = useAuth();
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
            { icon: Building2, label: t("profile.unit"),      value: usuario?.unidade_nome ?? t("profile.unitValue") },
            { icon: Shield,    label: t("profile.profile"),   value: t("profile.roleValue") },
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
          <button className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">
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

function Topbar({ page }: { page: Page }) {
  const { t } = useLang();
  const [profileOpen, setProfileOpen] = useState(false);
  const { data: usuario } = useUsuarioAtual();

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
        <span className="text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full font-medium">{t("topbar.date")}</span>
        <button className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors">
          <Bell className="w-4 h-4 text-slate-500" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500" />
        </button>
        <div className="relative">
          <button
            onClick={() => setProfileOpen((o) => !o)}
            className="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center text-xs font-bold text-white hover:ring-2 hover:ring-blue-400 hover:ring-offset-1 transition-all"
          >
            {iniciais}
          </button>
          {profileOpen && <ProfilePopup onClose={() => setProfileOpen(false)} />}
        </div>
      </div>
    </header>
  );
}

// ═══════════════════════════════════════════════════════════════
// PAGE: DASHBOARD (Início)
// ═══════════════════════════════════════════════════════════════

function KpiCards() {
  const { t } = useLang();
  const { data: kpi, loading } = useKpiDashboard();

  const cards = [
    { label: t("kpi.queue"),     value: kpi?.fila_ativa,          icon: Users,     iconBg: "bg-blue-50",   iconColor: "text-blue-600"   },
    { label: t("kpi.stock"),     value: kpi?.estoque_proteses,    icon: Package,   iconBg: "bg-violet-50", iconColor: "text-violet-600" },
    { label: t("kpi.logistics"), value: kpi?.em_logistica_reversa,icon: RefreshCw, iconBg: "bg-amber-50",  iconColor: "text-amber-600"  },
    { label: t("kpi.matchings"), value: kpi?.matchings_mes,       icon: Zap,       iconBg: "bg-emerald-50",iconColor: "text-emerald-600"},
  ];
  return (
    <div className="grid grid-cols-4 gap-5">
      {cards.map(({ label, value, icon: Icon, iconBg, iconColor }) => (
        <div
          key={label}
          className="bg-white rounded-xl border border-slate-200 px-5 py-5 hover:shadow-sm transition-shadow"
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
        </div>
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

function AlertsCard() {
  const { t } = useLang();
  const { data: alertas } = useAlertasCriticos();
  const items = (alertas ?? []).map((a, i) => ({
    id: i,
    msg: a.mensagem,
    level: a.tipo === "ESTOQUE" ? "high" : "medium",
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
          <div key={a.id} className="px-4 py-3 flex gap-3 hover:bg-red-50/40 transition-colors">
            <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${a.level === "high" ? "bg-red-500" : "bg-amber-400"}`} />
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-700 leading-snug">{a.msg}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="px-4 py-2.5 border-t border-slate-100">
        <button className="text-xs text-red-600 font-semibold hover:underline flex items-center gap-1">
          {t("alerts.viewAll")} <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

function RecallsCard() {
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
          <div key={r.id} className="px-4 py-3 hover:bg-amber-50/40 transition-colors">
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className="text-xs font-bold text-slate-800 font-mono">{r.codigo_lote}</p>
              <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 shrink-0">{r.affected_devices} {t("recalls.units")}</span>
            </div>
            <p className="text-[11px] font-semibold text-slate-700 leading-snug">{r.nome_produto}</p>
            <p className="text-[11px] text-slate-500 leading-snug mb-1.5">{r.motivo}</p>
            <p className="text-[11px] text-slate-400">
              {t("recalls.deadline")}: <span className="font-semibold text-red-600">{r.data_limite ? new Intl.DateTimeFormat(locale).format(new Date(`${r.data_limite}T00:00:00`)) : "—"}</span>
            </p>
          </div>
        ))}
      </div>
      <div className="px-4 py-2.5 border-t border-slate-100">
        <button className="text-xs text-amber-600 font-semibold hover:underline flex items-center gap-1">
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
        <button className="text-xs text-blue-700 font-semibold bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors border border-blue-200">
          {t("lots.viewAll")}
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
            {sorted.map((l) => (
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

function Dashboard() {
  return (
    <main className="flex-1 px-8 py-7 space-y-6 overflow-y-auto">
      <KpiCards />
      <div className="grid grid-cols-[1fr_300px] gap-5 items-start">
        <FlowChart />
        <div className="flex flex-col gap-4">
          <AlertsCard />
          <RecallsCard />
        </div>
      </div>
      <LotsTable />
    </main>
  );
}

// ═══════════════════════════════════════════════════════════════
// PAGE: PACIENTES AGUARDADOS
// ═══════════════════════════════════════════════════════════════

function PatientsTable() {
  const { t, locale } = useLang();
  const [filter, setFilter] = useState<FilterTab>("all");
  const { data: pacientesReais, loading } = usePacientesAguardando();
  const allPatients = pacientesReais ?? [];

  const attendanceOf = (status: string): AttendanceStatus => (status === "EM_FILA" ? "waiting" : "in-progress");

  const filtered = filter === "all" ? allPatients : allPatients.filter((p) =>
    filter === "waiting" ? attendanceOf(p.status) === "waiting" : attendanceOf(p.status) === "in-progress"
  );

  const counts = {
    all: allPatients.length,
    waiting: allPatients.filter((p) => attendanceOf(p.status) === "waiting").length,
    "in-progress": allPatients.filter((p) => attendanceOf(p.status) === "in-progress").length,
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
          <p className="text-xs text-slate-400 mt-0.5">{t("patients.sub")}</p>
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
                  <AttendanceBadge status={attendanceOf(p.status)} />
                </td>
                <td className="px-5 py-4">
                  <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-700 hover:text-white rounded-lg transition-colors border border-blue-200 hover:border-blue-700">
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
        <button className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors">
          {t("patients.viewAll")} <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
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

function PacientesAguardados() {
  const { t } = useLang();
  const { data: pacientesReais } = usePacientesAguardando();
  const { data: remessasReais } = useRemessasLogistica();
  const { data: kpiReal } = useKpiDashboard();

  const waitingCount = (pacientesReais ?? []).filter((p) => p.status === "EM_FILA").length;
  const attendingCount = (pacientesReais ?? []).filter((p) => p.status !== "EM_FILA").length;
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
        <PatientsTable />
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

function LogisticaReversa() {
  const { t, locale } = useLang();
  const [search, setSearch] = useState("");
  const { data: remessasReais, loading } = useRemessasLogistica();
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
            <button className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors">
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
          <button className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors">
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

function Triagens() {
  const { t, locale } = useLang();
  const { data: triagensReais, loading } = useTriagens();
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
            <button className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors">
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
                  <button className="flex-1 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors">{t("triage.detail.edit")}</button>
                  <button className="flex-1 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">{t("triage.detail.print")}</button>
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

function Relatorios() {
  const { t, locale } = useLang();
  const [exportType, setExportType] = useState<"PDF" | "CSV">("PDF");
  const { data: relatorioReal } = useRelatorioMensal();
  const { data: lotesReais } = useLotesRecentes();

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
    { icon: Users,        bg: "bg-blue-50",   color: "text-blue-600",   val: String(totalTriagens),      label: t("reports.kpi.semester") },
    { icon: Zap,          bg: "bg-emerald-50",color: "text-emerald-600",val: String(totalMatchings),     label: t("reports.kpi.matchings") },
    { icon: RefreshCw,    bg: "bg-amber-50",  color: "text-amber-600",  val: String(totalDevolucoes),    label: t("reports.kpi.returns") },
    { icon: BarChart2,    bg: "bg-violet-50", color: "text-violet-600", val: `${taxaMatching}%`,         label: t("reports.kpi.rate"), sub: t("reports.kpi.goal") },
  ];

  return (
    <main className="flex-1 px-8 py-7 space-y-6 overflow-y-auto">
      {/* kpis */}
      <div className="grid grid-cols-4 gap-5">
        {kpis.map(({ icon: Icon, bg, color, val, label, sub }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 px-5 py-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
                <Icon className={`w-[18px] h-[18px] ${color}`} strokeWidth={2.5} />
              </div>
              {sub && <span className="text-xs font-semibold text-slate-400">{sub}</span>}
            </div>
            <p className="text-3xl font-bold text-slate-900 tracking-tight leading-none mb-1">{val}</p>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</p>
          </div>
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
                  onClick={() => setExportType(et)}
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
            { icon: Users,     title: t("reports.rep.patients"),  sub: t("reports.rep.patientsSub"),  color: "text-blue-600",   bg: "bg-blue-50"   },
            { icon: Zap,       title: t("reports.rep.matchings"), sub: t("reports.rep.matchingsSub"), color: "text-emerald-600",bg: "bg-emerald-50"},
            { icon: RefreshCw, title: t("reports.rep.logistics"), sub: t("reports.rep.logisticsSub"), color: "text-amber-600",  bg: "bg-amber-50"  },
            { icon: Package,   title: t("reports.rep.stock"),     sub: t("reports.rep.stockSub"),     color: "text-violet-600", bg: "bg-violet-50" },
            { icon: Activity,  title: t("reports.rep.kpi"),       sub: t("reports.rep.kpiSub"),       color: "text-rose-600",   bg: "bg-rose-50"   },
            { icon: Shield,    title: t("reports.rep.audit"),     sub: t("reports.rep.auditSub"),     color: "text-slate-600",  bg: "bg-slate-100" },
          ].map(({ icon: Icon, title, sub, color, bg }) => (
            <div key={title} className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all cursor-pointer group">
              <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-4 h-4 ${color}`} strokeWidth={2.5} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-800 leading-tight">{title}</p>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{sub}</p>
              </div>
              <Download className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-500 transition-colors shrink-0 mt-0.5" />
            </div>
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
  return (
    <div className="flex min-h-screen bg-[#F8FAFC]" style={{ fontFamily: "Inter, sans-serif" }}>
      <Sidebar current={page} onNavigate={setPage} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar page={page} />
        {page === "inicio"     && <Dashboard />}
        {page === "pacientes"  && <PacientesAguardados />}
        {page === "logistica"  && <LogisticaReversa />}
        {page === "triagens"   && <Triagens />}
        {page === "relatorios" && <Relatorios />}
      </div>
    </div>
  );
}

export function CREHomePage() {
  return <AppInner />;
}