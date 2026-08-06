import { type FormEvent, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Banknote,
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  DollarSign,
  Download,
  Eye,
  FileBarChart,
  FileText,
  Filter,
  HeartHandshake,
  LayoutDashboard,
  Lock,
  LogOut,
  MapPin,
  Package,
  RefreshCw,
  Scale,
  Search,
  Share2,
  ShieldCheck,
  TrendingUp,
  Truck,
  UserPlus,
  Users,
  Wrench,
  XCircle,
} from "lucide-react";
import {
  Area,
  AreaChart,
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
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "../components/Card";
import { LanguageToggle } from "../components/LanguageToggle";
import { EmptyState, ErrorState, LoadingState } from "../components/DataState";
import { useAuth } from "../contexts/AuthContext";
import { useLang } from "../i18n/LanguageContext";
import type { TranslationKey } from "../i18n/translations";
import { apiPost } from "../lib/api";
import { useApiData } from "../lib/useApiData";
import type {
  AdminCatalogs,
  ManagerAlertRow,
  ManagerComplianceRow,
  ManagerDashboardData,
  ManagerDistributionRow,
  ManagerProviderRow,
  ManagerReportRow,
} from "../types/api";

type Page =
  | "inicio"
  | "politicas"
  | "ciclovida"
  | "logistica"
  | "financas"
  | "equidade"
  | "relatorios"
  | "cadastros";

type RegistrationTab = "patient" | "staff" | "provider" | "request";

type KpiCardData = {
  label: string;
  value: string;
  delta: string;
  positive: boolean;
  icon: React.ElementType;
  color: string;
  bg: string;
};

const PIE_COLORS = ["#1565C0", "#1976D2", "#42A5F5", "#90CAF9", "#6A1B9A", "#546E7A"];
const REGION_COLORS: Record<string, string> = {
  N: "#1565C0",
  NE: "#2E7D32",
  CO: "#6A1B9A",
  SE: "#E65100",
  S: "#00838F",
  "—": "#64748B",
};

function numeric(input: unknown): number {
  const parsed = Number(input ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function text(input: unknown): string {
  return input === null || input === undefined || input === "" ? "—" : String(input);
}

function percent(input: unknown, locale: string): string {
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(numeric(input))}%`;
}

function integer(input: unknown, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(numeric(input));
}

function money(input: unknown, locale: string): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(numeric(input));
}

function formatDate(input: unknown, locale: string): string {
  if (!input) return "—";
  const raw = String(input);
  const date = new Date(raw.length === 10 ? `${raw}T00:00:00` : raw);
  if (Number.isNaN(date.getTime())) return raw;
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(date);
}

function formatDateTime(input: unknown, locale: string): string {
  if (!input) return "—";
  const date = new Date(String(input));
  if (Number.isNaN(date.getTime())) return String(input);
  return new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short" }).format(date);
}

function monthLabel(input: string, locale: string): string {
  const [year, month] = input.split("-").map(Number);
  if (!year || !month) return input;
  return new Intl.DateTimeFormat(locale, { month: "short" }).format(new Date(year, month - 1, 1)).replace(".", "");
}

function formatBytes(input: unknown, locale: string): string {
  const bytes = numeric(input);
  if (!bytes) return "—";
  if (bytes < 1024) return `${integer(bytes, locale)} B`;
  if (bytes < 1024 ** 2) return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(bytes / 1024)} KB`;
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(bytes / 1024 ** 2)} MB`;
}

function downloadText(filename: string, content: string, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function downloadCsv<T extends object>(filename: string, rows: T[]) {
  if (!rows.length) {
    downloadText(filename, "", "text/csv;charset=utf-8");
    return;
  }
  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const escape = (value: unknown) => `"${text(value).split('"').join('""')}"`;
  const content = [headers.map(escape).join(","), ...rows.map((row) => { const record = row as Record<string, unknown>; return headers.map((header) => escape(record[header])).join(","); })].join("\n");
  downloadText(filename, `\uFEFF${content}`, "text/csv;charset=utf-8");
}

function statusTone(status: string): string {
  if (["VIGENTE", "ATIVO", "FINAL", "ENCERRADO", "ENTREGUE", "CONCLUIDA", "PAGO", "APROVADO"].includes(status)) {
    return "text-[#2E7D32] bg-green-50";
  }
  if (["EM_ANDAMENTO", "EM_ANALISE", "EM_PRODUCAO", "EM_TRANSITO", "PRONTA_PARA_ENTREGA"].includes(status)) {
    return "text-[#1565C0] bg-blue-50";
  }
  if (["ABERTO", "PENDENTE", "AGUARDANDO_COLETA", "EM_RENOVACAO", "AGUARDANDO_MEDIDAS"].includes(status)) {
    return "text-[#E65100] bg-orange-50";
  }
  return "text-[#C62828] bg-red-50";
}

function translatedStatus(t: (key: TranslationKey) => string, status: string): string {
  const key = `status.${status}` as TranslationKey;
  const translated = t(key);
  return translated === key ? status.split("_").join(" ") : translated;
}

function StatusDot({ type }: { type: string }) {
  const colors: Record<string, string> = {
    critical: "bg-[#C62828]",
    warning: "bg-[#E65100]",
    info: "bg-[#1565C0]",
  };
  return <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${colors[type] ?? "bg-gray-400"}`} />;
}

function ComplianceRow({ item }: { item: ManagerComplianceRow }) {
  const { t, locale } = useLang();
  const icons: Record<string, React.ReactNode> = {
    pass: <CheckCircle2 size={14} className="text-[#2E7D32] shrink-0" />,
    warning: <Clock size={14} className="text-[#E65100] shrink-0" />,
    fail: <XCircle size={14} className="text-[#C62828] shrink-0" />,
  };
  const barColor: Record<string, string> = { pass: "bg-[#2E7D32]", warning: "bg-[#E65100]", fail: "bg-[#C62828]" };
  const labelKey = `manager.standard.compliance.items.${item.key}` as TranslationKey;
  return (
    <div className="flex items-center gap-4 py-3 border-b border-border last:border-0">
      <div className="flex items-center gap-2 w-72 shrink-0">
        {icons[item.status]}
        <span className="text-sm text-foreground">{t(labelKey)}</span>
      </div>
      <div className="flex-1">
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${barColor[item.status]}`} style={{ width: `${Math.min(item.score, 100)}%` }} />
        </div>
      </div>
      <span className="text-sm font-medium tabular-nums w-14 text-right text-foreground">{percent(item.score, locale)}</span>
    </div>
  );
}

function KPICard({ label, value, delta, positive, icon: Icon, color, bg }: KpiCardData) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className={`inline-flex items-center justify-center w-8 h-8 rounded-md ${bg} mb-3`}>
        <Icon size={15} className={color} />
      </div>
      <p className="text-2xl font-semibold text-foreground tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{label}</p>
      <p className={`text-xs font-medium mt-2 ${positive ? "text-[#2E7D32]" : "text-[#E65100]"}`}>{delta}</p>
    </div>
  );
}

function PageHeader({ breadcrumb, title, subtitle, children }: {
  breadcrumb: string;
  title: string;
  subtitle: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between mb-8">
      <div>
        <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase mb-1">{breadcrumb}</p>
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

function regionLabel(region: string, t: (key: TranslationKey) => string): string {
  const key = `manager.standard.regions.${region}` as TranslationKey;
  const translated = t(key);
  return translated === key ? region : translated;
}

function zoneLabel(zone: string, t: (key: TranslationKey) => string): string {
  const key = `manager.standard.zones.${zone}` as TranslationKey;
  const translated = t(key);
  return translated === key ? zone : translated;
}

function describeAlert(alert: ManagerAlertRow, t: (key: TranslationKey, params?: Record<string, string | number>) => string, locale: string) {
  if (alert.kind === "recall") {
    return {
      label: t("manager.standard.alerts.recall"),
      message: t("manager.standard.alerts.recallMessage", { code: text(alert.code), product: text(alert.product) }),
      time: formatDate(alert.date, locale),
    };
  }
  if (alert.kind === "low_stock") {
    return {
      label: t("manager.standard.alerts.lowStock"),
      message: t("manager.standard.alerts.lowStockMessage", { code: text(alert.code), current: numeric(alert.current), minimum: numeric(alert.minimum) }),
      time: t("manager.standard.alerts.current"),
    };
  }
  if (alert.kind === "shipment") {
    return {
      label: t("manager.standard.alerts.shipment"),
      message: t("manager.standard.alerts.shipmentMessage", { count: numeric(alert.count), devices: numeric(alert.devices) }),
      time: t("manager.standard.alerts.current"),
    };
  }
  return {
    label: t("manager.standard.alerts.report"),
    message: t("manager.standard.alerts.reportMessage", { name: text(alert.name) }),
    time: formatDate(alert.date, locale),
  };
}

function PaginaInicio({ data, onRefresh }: { data: ManagerDashboardData; onRefresh: () => void }) {
  const { t, locale } = useLang();
  const healthData = data.health.map((row) => ({ ...row, mes: monthLabel(row.month, locale) }));
  const inventoryData = data.regional.map((row) => ({ ...row, regiao: regionLabel(row.region, t) }));
  const accessData = data.access_distribution.map((row, index) => ({
    ...row,
    name: zoneLabel(row.name, t),
    color: PIE_COLORS[index % PIE_COLORS.length],
  }));
  const alerts = data.alerts.slice(0, 4);
  const kpiCards: KpiCardData[] = [
    {
      label: t("manager.standard.kpi.conformity"),
      value: percent(data.summary.conformity_rate, locale),
      delta: t("manager.standard.kpi.liveDatabase"),
      positive: numeric(data.summary.conformity_rate) >= 90,
      icon: ShieldCheck,
      color: "text-[#1565C0]",
      bg: "bg-blue-50",
    },
    {
      label: t("manager.standard.kpi.efficiency"),
      value: percent(data.summary.efficiency_rate, locale),
      delta: t("manager.standard.kpi.liveDatabase"),
      positive: numeric(data.summary.efficiency_rate) >= 75,
      icon: TrendingUp,
      color: "text-[#2E7D32]",
      bg: "bg-green-50",
    },
    {
      label: t("manager.standard.kpi.recalls"),
      value: integer(data.summary.active_recalls, locale),
      delta: t("manager.standard.kpi.openRecords"),
      positive: numeric(data.summary.active_recalls) === 0,
      icon: AlertTriangle,
      color: "text-[#C62828]",
      bg: "bg-red-50",
    },
    {
      label: t("manager.standard.kpi.logistics"),
      value: integer(data.summary.logistics_alerts, locale),
      delta: t("manager.standard.kpi.requiresAttention"),
      positive: numeric(data.summary.logistics_alerts) === 0,
      icon: Package,
      color: "text-[#E65100]",
      bg: "bg-orange-50",
    },
    {
      label: t("manager.standard.kpi.units"),
      value: integer(data.summary.active_units, locale),
      delta: t("manager.standard.kpi.activeNetwork"),
      positive: true,
      icon: Activity,
      color: "text-[#1565C0]",
      bg: "bg-blue-50",
    },
    {
      label: t("manager.standard.kpi.patients"),
      value: integer(data.summary.patients, locale),
      delta: t("manager.standard.kpi.registeredDatabase"),
      positive: true,
      icon: Users,
      color: "text-[#2E7D32]",
      bg: "bg-green-50",
    },
  ];

  const exportDashboard = () => {
    downloadCsv("umdr-dashboard.csv", [
      { indicator: t("manager.standard.kpi.conformity"), value: data.summary.conformity_rate },
      { indicator: t("manager.standard.kpi.efficiency"), value: data.summary.efficiency_rate },
      { indicator: t("manager.standard.kpi.recalls"), value: data.summary.active_recalls },
      { indicator: t("manager.standard.kpi.logistics"), value: data.summary.logistics_alerts },
      { indicator: t("manager.standard.kpi.units"), value: data.summary.active_units },
      { indicator: t("manager.standard.kpi.patients"), value: data.summary.patients },
    ]);
  };

  return (
    <div className="p-8">
      <PageHeader
        breadcrumb={t("manager.standard.brandFull")}
        title={t("manager.standard.pages.executive.title")}
        subtitle={t("manager.standard.pages.executive.subtitle")}
      >
        <button onClick={onRefresh} className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-card border border-border rounded-lg px-3 py-2 hover:border-[#1565C0] transition-colors">
          <RefreshCw size={13} />{t("manager.standard.actions.refresh")}
        </button>
        <button className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-card border border-border rounded-lg px-3 py-2 hover:border-[#1565C0] transition-colors">
          <Bell size={13} />{t("manager.standard.actions.alertCount", { count: alerts.length })}
        </button>
        <button onClick={exportDashboard} className="flex items-center gap-2 text-xs font-medium text-white bg-[#1565C0] rounded-lg px-4 py-2 hover:bg-[#1976D2] transition-colors">
          <Download size={13} />{t("manager.standard.actions.exportReport")}
        </button>
      </PageHeader>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {kpiCards.map((item) => <KPICard key={item.label} {...item} />)}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        <Card className="xl:col-span-2 p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold text-foreground">{t("manager.standard.executive.trendTitle")}</h2>
              <p className="text-xs text-muted-foreground">{t("manager.standard.executive.trendSubtitle")}</p>
            </div>
            <span className="text-xs font-medium text-[#1565C0] bg-blue-50 px-2 py-0.5 rounded-full">{new Date().getFullYear()}</span>
          </div>
          {healthData.length ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={healthData}>
                  <defs>
                    <linearGradient id="manager-g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1565C0" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#1565C0" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="manager-g2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2E7D32" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#2E7D32" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="conformity" stroke="#1565C0" strokeWidth={2} fill="url(#manager-g1)" name={t("manager.standard.executive.conformity")} />
                  <Area type="monotone" dataKey="efficiency" stroke="#2E7D32" strokeWidth={2} fill="url(#manager-g2)" name={t("manager.standard.executive.efficiency")} />
                </AreaChart>
              </ResponsiveContainer>
              <div className="flex gap-5 mt-2">
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="w-3 h-0.5 bg-[#1565C0] inline-block rounded" />{t("manager.standard.executive.conformity")}</span>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="w-3 h-0.5 bg-[#2E7D32] inline-block rounded" />{t("manager.standard.executive.efficiency")}</span>
              </div>
            </>
          ) : <EmptyState message={t("manager.standard.empty.chart")} />}
        </Card>

        <Card className="p-5">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-foreground">{t("manager.standard.executive.accessTitle")}</h2>
            <p className="text-xs text-muted-foreground">{t("manager.standard.executive.accessSubtitle")}</p>
          </div>
          {accessData.some((item) => item.count > 0) ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={accessData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                    {accessData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-3">
                {accessData.map((item) => (
                  <div key={item.name} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm inline-block shrink-0" style={{ background: item.color }} />
                    <span className="text-xs text-muted-foreground">{item.name}</span>
                    <span className="text-xs font-medium text-foreground ml-auto">{percent(item.value, locale)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : <EmptyState message={t("manager.standard.empty.access")} />}
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2 p-5">
          <div className="mb-5">
            <h2 className="text-sm font-semibold text-foreground">{t("manager.standard.executive.inventoryTitle")}</h2>
            <p className="text-xs text-muted-foreground">{t("manager.standard.executive.inventorySubtitle")}</p>
          </div>
          {inventoryData.length ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={inventoryData} barSize={16}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="regiao" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="stock" fill="#1565C0" radius={[3, 3, 0, 0]} name={t("manager.standard.logistics.stock")} />
                <Bar dataKey="queue" fill="#C62828" radius={[3, 3, 0, 0]} name={t("manager.standard.logistics.queue")} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyState message={t("manager.standard.empty.chart")} />}
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">{t("manager.standard.executive.alertsTitle")}</h2>
            <span className="text-xs font-medium text-[#C62828] bg-red-50 px-2 py-0.5 rounded-full">
              {t("manager.standard.executive.criticalCount", { count: alerts.filter((item) => item.severity === "critical").length })}
            </span>
          </div>
          {alerts.length ? (
            <div className="space-y-3">
              {alerts.map((alert, index) => {
                const description = describeAlert(alert, t, locale);
                return (
                  <div key={`${alert.kind}-${index}`} className="flex gap-3 p-3 rounded-lg bg-muted/50">
                    <StatusDot type={alert.severity} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5 gap-2">
                        <span className="text-xs font-semibold text-foreground">{description.label}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">{description.time}</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-snug">{description.message}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <EmptyState message={t("manager.standard.empty.alerts")} />}
        </Card>
      </div>
    </div>
  );
}

function reportIcon(report: ManagerReportRow) {
  const kind = report.tipo.toUpperCase();
  if (kind.includes("EQUID")) return { icon: Scale, color: "text-[#6A1B9A]" };
  if (kind.includes("CONFORM") || kind.includes("GOV")) return { icon: ShieldCheck, color: "text-[#1565C0]" };
  return { icon: FileBarChart, color: "text-[#E65100]" };
}

function downloadReportMetadata(report: ManagerReportRow) {
  downloadText(`relatorio-${report.id}.json`, JSON.stringify(report, null, 2), "application/json;charset=utf-8");
}

function PaginaPoliticas({ data }: { data: ManagerDashboardData }) {
  const { t, locale } = useLang();
  const [selectedReport, setSelectedReport] = useState<ManagerReportRow | null>(data.reports[0] ?? null);
  const [previewOpen, setPreviewOpen] = useState(Boolean(data.reports.length));
  const reports = data.reports.slice(0, 3);

  return (
    <div className="p-8">
      <PageHeader
        breadcrumb={t("manager.standard.pages.governance.breadcrumb")}
        title={t("manager.standard.pages.governance.title")}
        subtitle={t("manager.standard.pages.governance.subtitle")}
      >
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-card border border-border rounded-lg px-3 py-2">
          <ShieldCheck size={13} className="text-[#2E7D32]" />
          <span>{t("manager.standard.security.managerLevel")}</span>
        </div>
      </PageHeader>

      {reports.length ? (
        <div className="space-y-4 mb-8">
          {reports.map((report) => {
            const iconInfo = reportIcon(report);
            const Icon = iconInfo.icon;
            return (
              <Card key={report.id} className="p-5 hover:shadow-md hover:border-[#1565C0]/30 transition-all group">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-5">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-muted shrink-0">
                    <Icon size={22} className={iconInfo.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3 mb-0.5">
                      <h3 className="text-base font-semibold text-foreground">{report.nome}</h3>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusTone("FINAL")}`}>{report.formato}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{report.tipo}</p>
                    <div className="flex flex-wrap items-center gap-4 mt-2">
                      <span className="text-xs text-muted-foreground font-mono">{formatBytes(report.tamanho_bytes, locale)}</span>
                      <span className="text-xs text-muted-foreground">{t("manager.standard.reports.updated", { date: formatDate(report.gerado_em, locale) })}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => { setSelectedReport(report); setPreviewOpen(true); }} className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-muted border border-border rounded-lg px-3 py-2 hover:text-foreground transition-colors">
                      <Eye size={13} />{t("manager.standard.actions.view")}
                    </button>
                    <button onClick={() => downloadReportMetadata(report)} className="flex items-center gap-2 text-xs font-medium text-white bg-[#1565C0] rounded-lg px-4 py-2 hover:bg-[#1976D2] transition-colors shadow-sm">
                      <Download size={13} />{t("manager.standard.actions.downloadPdf")}
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : <Card className="mb-8"><EmptyState message={t("manager.standard.empty.reports")} /></Card>}

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground">{t("manager.standard.governance.previewTitle")}</h2>
          <button onClick={() => setPreviewOpen((value) => !value)} disabled={!selectedReport} className="text-xs text-[#1565C0] hover:underline flex items-center gap-1 disabled:opacity-50">
            {previewOpen ? t("manager.standard.actions.collapse") : t("manager.standard.actions.expandPreview")}
            <ChevronRight size={12} className={`transition-transform ${previewOpen ? "rotate-90" : ""}`} />
          </button>
        </div>

        <Card className="overflow-hidden">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-6 py-3 bg-[#0A1929] text-white">
            <div className="flex items-center gap-3 min-w-0">
              <FileText size={14} className="text-blue-300 shrink-0" />
              <span className="text-xs font-medium text-blue-100 truncate">{selectedReport?.nome ?? t("manager.standard.governance.noSelectedReport")}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-blue-300 font-mono">{selectedReport ? `${selectedReport.formato} · ${formatBytes(selectedReport.tamanho_bytes, locale)}` : "—"}</span>
              {selectedReport && <button onClick={() => downloadReportMetadata(selectedReport)} className="flex items-center gap-1.5 text-xs font-medium text-white bg-[#1565C0] rounded px-3 py-1.5 hover:bg-[#1976D2] transition-colors"><Download size={11} />{t("manager.standard.actions.save")}</button>}
            </div>
          </div>

          {selectedReport ? (
            <div className="px-10 py-8" style={{ fontFamily: "DM Sans, sans-serif" }}>
              <div className="border-b border-border pb-6 mb-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase mb-2">{t("manager.standard.governance.ministry")}</p>
                    <h1 className="text-xl font-semibold text-foreground leading-tight max-w-lg">{selectedReport.nome}</h1>
                    <p className="text-sm text-muted-foreground mt-1">{selectedReport.tipo}</p>
                  </div>
                  <div className="text-left lg:text-right text-xs text-muted-foreground space-y-0.5">
                    <p>{t("manager.standard.governance.classification")}</p>
                    <p>{t("manager.standard.governance.reportId", { id: selectedReport.id })}</p>
                    <p>{t("manager.standard.governance.issued", { date: formatDate(selectedReport.gerado_em, locale) })}</p>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h2 className="text-sm font-semibold text-foreground mb-3">{t("manager.standard.governance.executiveSummary")}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                  {t("manager.standard.governance.summaryParagraphOne", {
                    conformity: percent(data.summary.conformity_rate, locale),
                    units: integer(data.summary.active_units, locale),
                    efficiency: percent(data.summary.efficiency_rate, locale),
                  })}
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t("manager.standard.governance.summaryParagraphTwo", {
                    recalls: integer(data.summary.active_recalls, locale),
                    alerts: integer(data.summary.logistics_alerts, locale),
                    patients: integer(data.summary.patients, locale),
                  })}
                </p>
              </div>

              <div className="mb-6">
                <h2 className="text-sm font-semibold text-foreground mb-3">{t("manager.standard.governance.complianceSummary")}</h2>
                <div className="border border-border rounded-lg overflow-hidden">
                  <div className="bg-muted/50 px-4 py-2 grid grid-cols-3 gap-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    <span className="col-span-2">{t("manager.standard.governance.domain")}</span>
                    <span className="text-right">{t("manager.standard.governance.score")}</span>
                  </div>
                  <div className="px-4">
                    {data.compliance.length ? data.compliance.map((item) => <ComplianceRow key={item.key} item={item} />) : <EmptyState message={t("manager.standard.empty.compliance")} />}
                  </div>
                </div>
              </div>

              {previewOpen && (
                <div className="border-t border-border pt-6 mt-6 grid grid-cols-1 sm:grid-cols-3 gap-8">
                  <div><p className="text-xs text-muted-foreground mb-1">{t("manager.standard.governance.preparedBy")}</p><p className="text-sm font-medium text-foreground">{t("manager.standard.governance.systemManagement")}</p><p className="text-xs text-muted-foreground">{t("manager.standard.governance.systemManagementRole")}</p></div>
                  <div><p className="text-xs text-muted-foreground mb-1">{t("manager.standard.governance.reviewedBy")}</p><p className="text-sm font-medium text-foreground">{t("manager.standard.governance.complianceTeam")}</p><p className="text-xs text-muted-foreground">{t("manager.standard.governance.complianceTeamRole")}</p></div>
                  <div><p className="text-xs text-muted-foreground mb-1">{t("manager.standard.governance.approvedBy")}</p><p className="text-sm font-medium text-foreground">{t("manager.standard.governance.nationalManagement")}</p><p className="text-xs text-muted-foreground">{t("manager.standard.governance.nationalManagementRole")}</p></div>
                </div>
              )}
            </div>
          ) : <EmptyState message={t("manager.standard.governance.noSelectedReport")} />}
        </Card>
      </div>
    </div>
  );
}

function PaginaCicloVida({ data, onRefresh }: { data: ManagerDashboardData; onRefresh: () => void }) {
  const { t, locale } = useLang();
  const forecast = data.maintenance_forecast.map((row) => ({ ...row, mes: monthLabel(row.month, locale) }));
  const failureRate = numeric(data.summary.active_devices) ? (numeric(data.summary.active_recalls) / numeric(data.summary.active_devices)) * 100 : 0;
  const overdueCount = data.lifecycle_alerts.filter((row) => row.type === "overdue").length;
  const kpis: KpiCardData[] = [
    { label: t("manager.standard.lifecycle.totalActive"), value: integer(data.summary.active_devices, locale), delta: t("manager.standard.kpi.liveDatabase"), positive: true, icon: Activity, color: "text-[#1565C0]", bg: "bg-blue-50" },
    { label: t("manager.standard.lifecycle.preventiveAlerts"), value: integer(data.lifecycle_alerts.length, locale), delta: t("manager.standard.lifecycle.openAlerts"), positive: data.lifecycle_alerts.length === 0, icon: Clock, color: "text-[#E65100]", bg: "bg-orange-50" },
    { label: t("manager.standard.lifecycle.failureRate"), value: percent(failureRate, locale), delta: t("manager.standard.lifecycle.recallBasis"), positive: failureRate < 1, icon: XCircle, color: "text-[#C62828]", bg: "bg-red-50" },
    { label: t("manager.standard.lifecycle.endOfLife"), value: integer(overdueCount, locale), delta: t("manager.standard.lifecycle.urgentReview"), positive: overdueCount === 0, icon: AlertTriangle, color: "text-[#E65100]", bg: "bg-orange-50" },
  ];

  return (
    <div className="p-8">
      <PageHeader breadcrumb={t("manager.standard.pages.lifecycle.breadcrumb")} title={t("manager.standard.pages.lifecycle.title")} subtitle={t("manager.standard.pages.lifecycle.subtitle")}>
        <button onClick={onRefresh} className="flex items-center gap-2 text-xs font-medium text-white bg-[#1565C0] rounded-lg px-4 py-2 hover:bg-[#1976D2] transition-colors"><RefreshCw size={13} />{t("manager.standard.actions.refreshData")}</button>
      </PageHeader>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">{kpis.map((item) => <KPICard key={item.label} {...item} />)}</div>

      <Card className="p-5 mb-6">
        <div className="flex items-center justify-between mb-5"><div><h2 className="text-sm font-semibold text-foreground">{t("manager.standard.lifecycle.forecastTitle")}</h2><p className="text-xs text-muted-foreground">{t("manager.standard.lifecycle.forecastSubtitle")}</p></div></div>
        {forecast.length ? <>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={forecast}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="orthoses" stroke="#1565C0" strokeWidth={2.5} dot={{ r: 4, fill: "#1565C0" }} name={t("manager.standard.lifecycle.orthoses")} />
              <Line type="monotone" dataKey="prostheses" stroke="#E65100" strokeWidth={2.5} strokeDasharray="5 3" dot={{ r: 4, fill: "#E65100" }} name={t("manager.standard.lifecycle.prostheses")} />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex gap-5 mt-2"><span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="w-3 h-0.5 bg-[#1565C0] inline-block rounded" />{t("manager.standard.lifecycle.orthoses")}</span><span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="w-3 h-0.5 bg-[#E65100] inline-block rounded" />{t("manager.standard.lifecycle.prostheses")}</span></div>
        </> : <EmptyState message={t("manager.standard.empty.chart")} />}
      </Card>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border"><h2 className="text-sm font-semibold text-foreground">{t("manager.standard.lifecycle.alertTableTitle")}</h2><span className="text-xs font-medium text-[#C62828] bg-red-50 px-2 py-0.5 rounded-full">{t("manager.standard.lifecycle.activeRecallCount", { count: data.summary.active_recalls })}</span></div>
        {data.lifecycle_alerts.length ? <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="bg-muted/50 border-b border-border">{[t("manager.standard.lifecycle.objectId"), t("manager.standard.lifecycle.patient"), t("manager.standard.lifecycle.date"), t("manager.standard.lifecycle.type"), t("manager.standard.lifecycle.status")].map((heading) => <th key={heading} className="px-4 py-3 text-left font-semibold text-muted-foreground uppercase tracking-wide">{heading}</th>)}</tr></thead><tbody>{data.lifecycle_alerts.map((row) => <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"><td className="px-4 py-3 font-mono font-medium text-foreground">{row.id}</td><td className="px-4 py-3 font-mono text-muted-foreground">{row.patient}</td><td className="px-4 py-3 text-muted-foreground">{formatDate(row.date, locale)}</td><td className="px-4 py-3 text-foreground"><span className="block">{t(`manager.standard.lifecycle.types.${row.type}` as TranslationKey)}</span><span className="text-[10px] text-muted-foreground">{text(row.description)}</span></td><td className="px-4 py-3"><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusTone(row.status)}`}>{translatedStatus(t, row.status)}</span></td></tr>)}</tbody></table></div> : <EmptyState message={t("manager.standard.empty.lifecycle")} />}
      </Card>
    </div>
  );
}

function PaginaLogistica({ data }: { data: ManagerDashboardData }) {
  const { t, locale } = useLang();
  const regional = data.regional.map((row) => ({ ...row, regiao: regionLabel(row.region, t) }));
  const queueTotal = data.regional.reduce((sum, row) => sum + row.queue, 0);
  const transitTotal = data.regional.reduce((sum, row) => sum + row.transit, 0);
  const averageWait = data.equity.length ? data.equity.reduce((sum, row) => sum + row.average_wait_days * row.queue_records, 0) / Math.max(data.equity.reduce((sum, row) => sum + row.queue_records, 0), 1) : 0;
  const ngoTotal = data.centers.reduce((sum, row) => sum + row.ngo_partners, 0);
  const kpis: KpiCardData[] = [
    { label: t("manager.standard.logistics.averageLeadTime"), value: t("manager.standard.equity.dayValue", { value: new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(averageWait) }), delta: t("manager.standard.kpi.liveDatabase"), positive: averageWait <= 60, icon: Clock, color: "text-[#1565C0]", bg: "bg-blue-50" },
    { label: t("manager.standard.logistics.queueSisreg"), value: integer(queueTotal, locale), delta: t("manager.standard.logistics.activeQueue"), positive: queueTotal === 0, icon: Users, color: "text-[#E65100]", bg: "bg-orange-50" },
    { label: t("manager.standard.logistics.devicesTransit"), value: integer(transitTotal, locale), delta: t("manager.standard.logistics.registeredShipments"), positive: true, icon: Truck, color: "text-[#2E7D32]", bg: "bg-green-50" },
    { label: t("manager.standard.logistics.onTimeRate"), value: percent(data.summary.efficiency_rate, locale), delta: t("manager.standard.logistics.deliveryBasis"), positive: numeric(data.summary.efficiency_rate) >= 85, icon: CheckCircle2, color: "text-[#2E7D32]", bg: "bg-green-50" },
  ];

  return (
    <div className="p-8">
      <PageHeader breadcrumb={t("manager.standard.pages.logistics.breadcrumb")} title={t("manager.standard.pages.logistics.title")} subtitle={t("manager.standard.pages.logistics.subtitle")}>
        <button onClick={() => downloadCsv("umdr-sisreg-logistica.csv", data.regional)} className="flex items-center gap-2 text-xs font-medium text-white bg-[#1565C0] rounded-lg px-4 py-2 hover:bg-[#1976D2] transition-colors"><Download size={13} />{t("manager.standard.actions.exportSisreg")}</button>
      </PageHeader>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">{kpis.map((item) => <KPICard key={item.label} {...item} />)}</div>

      <Card className="p-5 mb-6">
        <div className="flex items-center justify-between mb-5"><div><h2 className="text-sm font-semibold text-foreground">{t("manager.standard.logistics.regionalTitle")}</h2><p className="text-xs text-muted-foreground">{t("manager.standard.logistics.regionalSubtitle")}</p></div>{data.regional.some((row) => row.queue > row.stock) && <span className="text-xs font-medium text-[#C62828] bg-red-50 px-2 py-0.5 rounded-full">{t("manager.standard.logistics.criticalRegion")}</span>}</div>
        {regional.length ? <><ResponsiveContainer width="100%" height={220}><BarChart data={regional} barSize={18}><CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" /><XAxis dataKey="regiao" tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8, fontSize: 12 }} /><Bar dataKey="stock" fill="#1565C0" radius={[3, 3, 0, 0]} name={t("manager.standard.logistics.stock")} /><Bar dataKey="queue" fill="#C62828" radius={[3, 3, 0, 0]} name={t("manager.standard.logistics.queue")} /><Bar dataKey="transit" fill="#42A5F5" radius={[3, 3, 0, 0]} name={t("manager.standard.logistics.transit")} /></BarChart></ResponsiveContainer><div className="flex gap-5 mt-2">{[["#1565C0", t("manager.standard.logistics.stock")], ["#C62828", t("manager.standard.logistics.waitingQueue")], ["#42A5F5", t("manager.standard.logistics.transit")]].map(([color, label]) => <span key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: color }} />{label}</span>)}</div></> : <EmptyState message={t("manager.standard.empty.chart")} />}
      </Card>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border"><h2 className="text-sm font-semibold text-foreground">{t("manager.standard.logistics.centersAndNgos")}</h2><div className="flex items-center gap-1.5 text-xs text-muted-foreground"><HeartHandshake size={13} /><span>{t("manager.standard.logistics.ngoPartners", { count: ngoTotal })}</span></div></div>
        {data.centers.length ? <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="bg-muted/50 border-b border-border">{[t("manager.standard.logistics.rehabilitationCenter"), t("manager.standard.logistics.capacityUsed"), t("manager.standard.logistics.waitingQueue"), t("manager.standard.logistics.integratedNgos"), t("manager.standard.lifecycle.status")].map((heading) => <th key={heading} className="px-4 py-3 text-left font-semibold text-muted-foreground uppercase tracking-wide">{heading}</th>)}</tr></thead><tbody>{data.centers.map((center) => {
          const status = center.capacity_used >= 90 ? "saturated" : center.capacity_used >= 75 ? "attention" : "normal";
          return <tr key={center.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"><td className="px-4 py-3 font-medium text-foreground"><span className="flex items-center gap-2"><Building2 size={13} className="text-muted-foreground" />{center.name}</span></td><td className="px-4 py-3"><div className="flex items-center gap-2"><div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden"><div className={`h-full rounded-full ${center.capacity_used >= 90 ? "bg-[#C62828]" : center.capacity_used >= 75 ? "bg-[#E65100]" : "bg-[#2E7D32]"}`} style={{ width: `${Math.min(center.capacity_used, 100)}%` }} /></div><span className="font-medium text-foreground tabular-nums">{percent(center.capacity_used, locale)}</span></div></td><td className="px-4 py-3 tabular-nums text-foreground">{integer(center.queue, locale)}</td><td className="px-4 py-3"><span className="flex items-center gap-1 text-[#1565C0]"><HeartHandshake size={12} />{integer(center.ngo_partners, locale)}</span></td><td className="px-4 py-3"><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${center.capacity_used >= 90 ? "text-[#C62828] bg-red-50" : center.capacity_used >= 75 ? "text-[#E65100] bg-orange-50" : "text-[#2E7D32] bg-green-50"}`}>{t(`manager.standard.logistics.centerStatus.${status}` as TranslationKey)}</span></td></tr>;
        })}</tbody></table></div> : <EmptyState message={t("manager.standard.empty.centers")} />}
      </Card>
    </div>
  );
}

function PaginaFinancas({ data }: { data: ManagerDashboardData }) {
  const { t, locale } = useLang();
  const chart = data.finance_monthly.map((row) => ({ ...row, mes: monthLabel(row.month, locale) }));
  const totalSpending = data.finance_monthly.reduce((sum, row) => sum + row.prostheses + row.orthoses + row.wheelchairs + row.hearing, 0);
  const totalContracts = data.providers.reduce((sum, row) => sum + numeric(row.valor_total), 0);
  const activeProviders = data.providers.filter((row) => ["VIGENTE", "ATIVO", "EM_RENOVACAO"].includes(row.status)).length;
  const providersWithSla = data.providers.filter((row) => row.sla_percentual !== null);
  const averageSla = providersWithSla.length ? providersWithSla.reduce((sum, row) => sum + numeric(row.sla_percentual), 0) / providersWithSla.length : 0;
  const kpis: KpiCardData[] = [
    { label: t("manager.standard.finance.totalSpending"), value: money(totalSpending, locale), delta: t("manager.standard.finance.lastSixMonths"), positive: true, icon: DollarSign, color: "text-[#1565C0]", bg: "bg-blue-50" },
    { label: t("manager.standard.finance.totalContracts"), value: money(totalContracts, locale), delta: t("manager.standard.kpi.liveDatabase"), positive: true, icon: Banknote, color: "text-[#2E7D32]", bg: "bg-green-50" },
    { label: t("manager.standard.finance.activeProviders"), value: integer(activeProviders, locale), delta: t("manager.standard.finance.registeredContracts"), positive: true, icon: Building2, color: "text-[#6A1B9A]", bg: "bg-purple-50" },
    { label: t("manager.standard.finance.averageSla"), value: percent(averageSla, locale), delta: t("manager.standard.finance.auditBasis"), positive: averageSla >= 90, icon: CheckCircle2, color: "text-[#E65100]", bg: "bg-orange-50" },
  ];

  return (
    <div className="p-8">
      <PageHeader breadcrumb={t("manager.standard.pages.finance.breadcrumb")} title={t("manager.standard.pages.finance.title")} subtitle={t("manager.standard.pages.finance.subtitle")}>
        <button onClick={() => downloadCsv("umdr-financeiro.csv", data.finance_monthly)} className="flex items-center gap-2 text-xs font-medium text-white bg-[#1565C0] rounded-lg px-4 py-2 hover:bg-[#1976D2] transition-colors"><Download size={13} />{t("manager.standard.actions.exportFinance")}</button>
      </PageHeader>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">{kpis.map((item) => <KPICard key={item.label} {...item} />)}</div>

      <Card className="p-5 mb-6">
        <div className="flex items-center justify-between mb-5"><div><h2 className="text-sm font-semibold text-foreground">{t("manager.standard.finance.spendingByDevice")}</h2><p className="text-xs text-muted-foreground">{t("manager.standard.finance.spendingByDeviceSubtitle")}</p></div></div>
        {chart.length ? <><ResponsiveContainer width="100%" height={240}><AreaChart data={chart}><defs>{[["manager-p", "#1565C0"], ["manager-o", "#2E7D32"], ["manager-c", "#E65100"], ["manager-a", "#6A1B9A"]].map(([id, color]) => <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={color} stopOpacity={0.2} /><stop offset="95%" stopColor={color} stopOpacity={0} /></linearGradient>)}</defs><CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" /><XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} tickFormatter={(value) => `${Math.round(value / 1000)}k`} /><Tooltip formatter={(value) => money(value, locale)} contentStyle={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8, fontSize: 12 }} /><Area type="monotone" dataKey="prostheses" stackId="1" stroke="#1565C0" fill="url(#manager-p)" name={t("manager.standard.finance.prostheses")} /><Area type="monotone" dataKey="orthoses" stackId="1" stroke="#2E7D32" fill="url(#manager-o)" name={t("manager.standard.finance.orthoses")} /><Area type="monotone" dataKey="wheelchairs" stackId="1" stroke="#E65100" fill="url(#manager-c)" name={t("manager.standard.finance.wheelchairs")} /><Area type="monotone" dataKey="hearing" stackId="1" stroke="#6A1B9A" fill="url(#manager-a)" name={t("manager.standard.finance.hearingAids")} /></AreaChart></ResponsiveContainer><div className="flex gap-5 mt-2 flex-wrap">{[["#1565C0", t("manager.standard.finance.prostheses")], ["#2E7D32", t("manager.standard.finance.orthoses")], ["#E65100", t("manager.standard.finance.wheelchairs")], ["#6A1B9A", t("manager.standard.finance.hearingAids")]].map(([color, label]) => <span key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: color }} />{label}</span>)}</div></> : <EmptyState message={t("manager.standard.empty.finance")} />}
      </Card>

      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-border"><h2 className="text-sm font-semibold text-foreground">{t("manager.standard.finance.providersAudit")}</h2></div>
        {data.providers.length ? <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="bg-muted/50 border-b border-border">{[t("manager.standard.finance.provider"), t("manager.standard.finance.slaAudit"), t("manager.standard.finance.contractValue"), t("manager.standard.finance.expiration"), t("manager.standard.finance.status")].map((heading) => <th key={heading} className="px-4 py-3 text-left font-semibold text-muted-foreground uppercase tracking-wide">{heading}</th>)}</tr></thead><tbody>{data.providers.map((provider) => <tr key={provider.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"><td className="px-4 py-3 font-medium text-foreground">{provider.nome}</td><td className="px-4 py-3"><div className="flex items-center gap-2"><div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden"><div className={`h-full rounded-full ${numeric(provider.sla_percentual) >= 92 ? "bg-[#2E7D32]" : numeric(provider.sla_percentual) >= 85 ? "bg-[#E65100]" : "bg-[#C62828]"}`} style={{ width: `${Math.min(numeric(provider.sla_percentual), 100)}%` }} /></div><span className="font-medium text-foreground tabular-nums">{provider.sla_percentual === null ? "—" : percent(provider.sla_percentual, locale)}</span></div></td><td className="px-4 py-3 font-medium text-foreground tabular-nums">{provider.valor_total === null ? "—" : money(provider.valor_total, locale)}</td><td className="px-4 py-3 text-muted-foreground">{formatDate(provider.data_fim, locale)}</td><td className="px-4 py-3"><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusTone(provider.status)}`}>{translatedStatus(t, provider.status)}</span></td></tr>)}</tbody></table></div> : <EmptyState message={t("manager.standard.empty.providers")} />}
      </Card>
    </div>
  );
}

function PaginaEquidade({ data }: { data: ManagerDashboardData }) {
  const { t, locale } = useLang();
  const distribution = data.access_distribution.map((row, index) => ({ ...row, name: zoneLabel(row.name, t), color: PIE_COLORS[index % PIE_COLORS.length] }));
  const zoneColors: Record<string, string> = { URBANA: "#1565C0", RURAL: "#2E7D32", RIBEIRINHA: "#6A1B9A", REMOTA: "#E65100" };
  const averageWait = data.equity.length ? data.equity.reduce((sum, row) => sum + row.average_wait_days * row.queue_records, 0) / Math.max(data.equity.reduce((sum, row) => sum + row.queue_records, 0), 1) : 0;
  const maxWait = data.equity.length ? Math.max(...data.equity.map((row) => row.average_wait_days)) : 0;
  const minWait = data.equity.length ? Math.min(...data.equity.map((row) => row.average_wait_days)) : 0;
  const disparity = maxWait ? Math.max(0, 100 - ((maxWait - minWait) / maxWait) * 100) : 0;
  const remoteCount = data.access_distribution.filter((row) => ["REMOTA", "RIBEIRINHA"].includes(row.name)).reduce((sum, row) => sum + row.count, 0);
  const ruralCoverage = data.access_distribution.filter((row) => ["RURAL", "RIBEIRINHA", "REMOTA"].includes(row.name)).reduce((sum, row) => sum + row.value, 0);
  const equityIndex = Math.max(0, Math.min(1, (disparity / 100) * (numeric(data.summary.efficiency_rate) / 100)));
  const kpis: KpiCardData[] = [
    { label: t("manager.standard.equity.equityIndex"), value: new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(equityIndex), delta: t("manager.standard.kpi.liveDatabase"), positive: equityIndex >= 0.7, icon: Scale, color: "text-[#1565C0]", bg: "bg-blue-50" },
    { label: t("manager.standard.equity.disparityReduction"), value: percent(disparity, locale), delta: t("manager.standard.equity.comparedRegions"), positive: disparity >= 70, icon: TrendingUp, color: "text-[#2E7D32]", bg: "bg-green-50" },
    { label: t("manager.standard.equity.remotePatients"), value: integer(remoteCount, locale), delta: t("manager.standard.equity.zoneRegistration"), positive: true, icon: MapPin, color: "text-[#6A1B9A]", bg: "bg-purple-50" },
    { label: t("manager.standard.equity.nonUrbanCoverage"), value: percent(ruralCoverage, locale), delta: t("manager.standard.equity.populationBasis"), positive: ruralCoverage >= 25, icon: Users, color: "text-[#E65100]", bg: "bg-orange-50" },
  ];

  return (
    <div className="p-8">
      <PageHeader breadcrumb={t("manager.standard.pages.equity.breadcrumb")} title={t("manager.standard.pages.equity.title")} subtitle={t("manager.standard.pages.equity.subtitle")}>
        <button onClick={() => downloadCsv("umdr-equidade.csv", data.equity_points)} className="flex items-center gap-2 text-xs font-medium text-white bg-[#1565C0] rounded-lg px-4 py-2 hover:bg-[#1976D2] transition-colors"><Download size={13} />{t("manager.standard.actions.equityReport")}</button>
      </PageHeader>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">{kpis.map((item) => <KPICard key={item.label} {...item} />)}</div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2 p-5">
          <div className="mb-4"><h2 className="text-sm font-semibold text-foreground">{t("manager.standard.equity.distanceWaitTitle")}</h2><p className="text-xs text-muted-foreground">{t("manager.standard.equity.distanceWaitSubtitle")}</p></div>
          {data.equity_points.length ? <><ResponsiveContainer width="100%" height={260}><ScatterChart><CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" /><XAxis type="number" dataKey="distance_km" name={t("manager.standard.equity.distanceKm")} tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} label={{ value: t("manager.standard.equity.distanceAxis"), position: "insideBottom", offset: -2, fontSize: 10, fill: "#64748B" }} /><YAxis type="number" dataKey="wait_days" name={t("manager.standard.equity.waitDays")} tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} label={{ value: t("manager.standard.equity.waitAxis"), angle: -90, position: "insideLeft", offset: 10, fontSize: 10, fill: "#64748B" }} /><Tooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8, fontSize: 12 }} />{(["URBANA", "RURAL", "RIBEIRINHA", "REMOTA"] as const).map((zone) => <Scatter key={zone} name={zoneLabel(zone, t)} data={data.equity_points.filter((row) => row.zone === zone)} fill={zoneColors[zone]} fillOpacity={0.7} />)}</ScatterChart></ResponsiveContainer><div className="flex gap-5 mt-3 flex-wrap">{Object.entries(zoneColors).map(([zone, color]) => <span key={zone} className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: color }} />{zoneLabel(zone, t)}</span>)}</div></> : <EmptyState message={t("manager.standard.empty.equity")} />}
        </Card>

        <Card className="p-5">
          <div className="mb-4"><h2 className="text-sm font-semibold text-foreground">{t("manager.standard.equity.zoneDistribution")}</h2><p className="text-xs text-muted-foreground">{t("manager.standard.equity.zoneDistributionSubtitle")}</p></div>
          {distribution.some((row) => row.count > 0) ? <><ResponsiveContainer width="100%" height={180}><PieChart><Pie data={distribution} cx="50%" cy="50%" innerRadius={52} outerRadius={78} paddingAngle={3} dataKey="value">{distribution.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Pie><Tooltip contentStyle={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8, fontSize: 12 }} /></PieChart></ResponsiveContainer><div className="space-y-2 mt-4">{distribution.map((row) => <div key={row.name} className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm inline-block shrink-0" style={{ background: row.color }} /><span className="text-xs text-muted-foreground flex-1">{row.name}</span><div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${Math.min(row.value, 100)}%`, background: row.color }} /></div><span className="text-xs font-medium text-foreground tabular-nums w-10 text-right">{percent(row.value, locale)}</span></div>)}</div></> : <EmptyState message={t("manager.standard.empty.access")} />}

          <div className="mt-5 pt-4 border-t border-border space-y-2"><p className="text-xs font-semibold text-foreground mb-2">{t("manager.standard.equity.goals")}</p>{[
            { label: t("manager.standard.equity.disparityGoal"), target: 80, current: disparity },
            { label: t("manager.standard.equity.ruralCoverageGoal"), target: 35, current: ruralCoverage },
          ].map((goal) => <div key={goal.label}><div className="flex justify-between text-xs text-muted-foreground mb-1"><span>{goal.label}</span><span className="tabular-nums">{percent(goal.current, locale)} / {percent(goal.target, locale)}</span></div><div className="h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-[#1565C0] rounded-full" style={{ width: `${Math.min((goal.current / goal.target) * 100, 100)}%` }} /></div></div>)}</div>
          <div className="mt-4 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">{t("manager.standard.equity.waitSummary", { average: new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(averageWait), maximum: new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(maxWait) })}</div>
        </Card>
      </div>
    </div>
  );
}

function PaginaRelatorios({ data }: { data: ManagerDashboardData }) {
  const { t, locale } = useLang();
  const [filters, setFilters] = useState({ dataInicio: "", dataFim: "", regiao: "ALL", categoria: "ALL", indicador: "ALL" });
  const [preview, setPreview] = useState<ManagerReportRow | null>(null);
  const reports = data.reports.filter((report) => {
    const day = String(report.gerado_em).slice(0, 10);
    return (!filters.dataInicio || day >= filters.dataInicio) && (!filters.dataFim || day <= filters.dataFim);
  });
  const exportRows = () => downloadCsv("umdr-relatorios.csv", reports.map((report) => ({ ...report, region_filter: filters.regiao, category_filter: filters.categoria, indicator_filter: filters.indicador })));
  const shareReport = async (report: ManagerReportRow) => {
    const shareText = `${report.nome} — ${report.tipo} — ${formatDate(report.gerado_em, locale)}`;
    if (navigator.share) await navigator.share({ title: report.nome, text: shareText });
    else await navigator.clipboard.writeText(shareText);
  };
  const typeTone = (type: string) => {
    const normalized = type.toUpperCase();
    if (normalized.includes("LOG")) return "text-[#1565C0] bg-blue-50";
    if (normalized.includes("CONFORM") || normalized.includes("GOV")) return "text-[#2E7D32] bg-green-50";
    if (normalized.includes("EQUIT")) return "text-[#6A1B9A] bg-purple-50";
    return "text-[#E65100] bg-orange-50";
  };

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 bg-[#0A1929]/5 border border-[#0A1929]/10 rounded-lg px-4 py-3 mb-6"><Lock size={13} className="text-[#1565C0] shrink-0" /><p className="text-xs text-muted-foreground"><strong className="text-foreground">{t("manager.standard.security.managerLevel")}</strong>{" "}{t("manager.standard.security.lgpd")}</p></div>
      <PageHeader breadcrumb={t("manager.standard.pages.reports.breadcrumb")} title={t("manager.standard.pages.reports.title")} subtitle={t("manager.standard.pages.reports.subtitle")}><button onClick={exportRows} className="flex items-center gap-2 text-xs font-medium text-white bg-[#1565C0] rounded-lg px-4 py-2 hover:bg-[#1976D2] transition-colors"><BarChart3 size={13} />{t("manager.standard.actions.generateReport")}</button></PageHeader>

      <Card className="p-5 mb-6">
        <div className="flex items-center gap-2 mb-4"><Filter size={14} className="text-[#1565C0]" /><h2 className="text-sm font-semibold text-foreground">{t("manager.standard.reports.filtersTitle")}</h2></div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div><label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("manager.standard.reports.startDate")}</label><input type="date" value={filters.dataInicio} onChange={(event) => setFilters((current) => ({ ...current, dataInicio: event.target.value }))} className="w-full text-xs text-foreground bg-muted border border-border rounded-lg px-3 py-2 outline-none focus:border-[#1565C0] transition-colors" /></div>
          <div><label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("manager.standard.reports.endDate")}</label><input type="date" value={filters.dataFim} onChange={(event) => setFilters((current) => ({ ...current, dataFim: event.target.value }))} className="w-full text-xs text-foreground bg-muted border border-border rounded-lg px-3 py-2 outline-none focus:border-[#1565C0] transition-colors" /></div>
          <div><label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("manager.standard.reports.region")}</label><select value={filters.regiao} onChange={(event) => setFilters((current) => ({ ...current, regiao: event.target.value }))} className="w-full text-xs text-foreground bg-muted border border-border rounded-lg px-3 py-2 outline-none focus:border-[#1565C0] transition-colors appearance-none"><option value="ALL">{t("manager.standard.reports.allRegions")}</option>{["N", "NE", "CO", "SE", "S"].map((region) => <option key={region} value={region}>{regionLabel(region, t)}</option>)}</select></div>
          <div><label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("manager.standard.reports.deviceCategory")}</label><select value={filters.categoria} onChange={(event) => setFilters((current) => ({ ...current, categoria: event.target.value }))} className="w-full text-xs text-foreground bg-muted border border-border rounded-lg px-3 py-2 outline-none focus:border-[#1565C0] transition-colors appearance-none"><option value="ALL">{t("manager.standard.reports.all")}</option><option value="PROSTHESES">{t("manager.standard.finance.prostheses")}</option><option value="ORTHOSES">{t("manager.standard.finance.orthoses")}</option><option value="WHEELCHAIRS">{t("manager.standard.finance.wheelchairs")}</option><option value="HEARING">{t("manager.standard.finance.hearingAids")}</option></select></div>
          <div><label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("manager.standard.reports.qualityIndicator")}</label><select value={filters.indicador} onChange={(event) => setFilters((current) => ({ ...current, indicador: event.target.value }))} className="w-full text-xs text-foreground bg-muted border border-border rounded-lg px-3 py-2 outline-none focus:border-[#1565C0] transition-colors appearance-none"><option value="ALL">{t("manager.standard.reports.all")}</option><option value="CONFORMITY">{t("manager.standard.executive.conformity")}</option><option value="LEAD_TIME">{t("manager.standard.logistics.averageLeadTime")}</option><option value="EQUITY">{t("manager.standard.nav.equity")}</option><option value="SLA">{t("manager.standard.finance.averageSla")}</option></select></div>
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-5 pt-4 border-t border-border"><button onClick={exportRows} className="flex items-center gap-2 text-xs font-medium text-white bg-[#1565C0] rounded-lg px-4 py-2 hover:bg-[#1976D2] transition-colors"><BarChart3 size={13} />{t("manager.standard.actions.generateFullReport")}</button><button onClick={exportRows} className="flex items-center gap-2 text-xs font-medium text-foreground bg-muted border border-border rounded-lg px-4 py-2 hover:bg-muted/80 transition-colors"><Download size={13} />{t("manager.standard.actions.exportCsv")}</button><button onClick={() => window.print()} className="flex items-center gap-2 text-xs font-medium text-foreground bg-muted border border-border rounded-lg px-4 py-2 hover:bg-muted/80 transition-colors"><Download size={13} />{t("manager.standard.actions.exportPdf")}</button></div>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border"><h2 className="text-sm font-semibold text-foreground">{t("manager.standard.reports.recentTitle")}</h2><div className="flex items-center gap-1.5 text-xs text-muted-foreground"><CalendarDays size={13} /><span>{t("manager.standard.reports.lastThirtyDays")}</span></div></div>
        {reports.length ? <div className="divide-y divide-border">{reports.map((report) => <div key={report.id} className="flex flex-col gap-4 px-5 py-4 hover:bg-muted/30 transition-colors lg:flex-row lg:items-center"><div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0"><FileBarChart size={15} className="text-muted-foreground" /></div><div className="flex-1 min-w-0"><p className="text-sm font-medium text-foreground truncate">{report.nome}</p><div className="flex flex-wrap items-center gap-3 mt-0.5"><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeTone(report.tipo)}`}>{report.tipo}</span><span className="text-xs text-muted-foreground">{formatDate(report.gerado_em, locale)}</span><span className="text-xs text-muted-foreground font-mono">{formatBytes(report.tamanho_bytes, locale)}</span></div></div><div className="flex items-center gap-2 shrink-0"><button onClick={() => setPreview(report)} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted border border-border rounded-lg px-3 py-1.5 hover:text-foreground transition-colors"><Eye size={12} />{t("manager.standard.actions.view")}</button><button onClick={() => void shareReport(report)} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted border border-border rounded-lg px-3 py-1.5 hover:text-foreground transition-colors"><Share2 size={12} />{t("manager.standard.actions.share")}</button><button onClick={() => downloadReportMetadata(report)} className="flex items-center gap-1.5 text-xs font-medium text-white bg-[#1565C0] rounded-lg px-3 py-1.5 hover:bg-[#1976D2] transition-colors"><Download size={12} />{t("manager.standard.actions.download")}</button></div></div>)}</div> : <EmptyState message={t("manager.standard.empty.reports")} />}
      </Card>

      {preview && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onClick={() => setPreview(null)}><div className="w-full max-w-xl" onClick={(event: React.MouseEvent<HTMLDivElement>) => event.stopPropagation()}><Card className="p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-widest text-[#1565C0]">{preview.tipo}</p><h3 className="text-lg font-semibold text-foreground mt-1">{preview.nome}</h3></div><button onClick={() => setPreview(null)} className="text-muted-foreground hover:text-foreground"><XCircle size={20} /></button></div><dl className="grid grid-cols-2 gap-4 mt-6 text-xs"><div><dt className="text-muted-foreground">{t("manager.standard.reports.generatedAt")}</dt><dd className="font-medium text-foreground mt-1">{formatDateTime(preview.gerado_em, locale)}</dd></div><div><dt className="text-muted-foreground">{t("manager.standard.reports.format")}</dt><dd className="font-medium text-foreground mt-1">{preview.formato}</dd></div><div><dt className="text-muted-foreground">{t("manager.standard.reports.size")}</dt><dd className="font-medium text-foreground mt-1">{formatBytes(preview.tamanho_bytes, locale)}</dd></div><div><dt className="text-muted-foreground">{t("manager.standard.reports.path")}</dt><dd className="font-medium text-foreground mt-1 break-all">{text(preview.caminho_arquivo)}</dd></div></dl><div className="flex justify-end gap-2 mt-6"><button onClick={() => setPreview(null)} className="text-xs font-medium px-4 py-2 rounded-lg border border-border">{t("manager.standard.actions.close")}</button><button onClick={() => downloadReportMetadata(preview)} className="text-xs font-medium px-4 py-2 rounded-lg bg-[#1565C0] text-white">{t("manager.standard.actions.download")}</button></div></Card></div></div>}
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted-foreground"><span>{label}</span>{children}</label>;
}

const inputClass = "h-10 rounded-lg border border-border bg-muted px-3 text-sm text-foreground outline-none transition focus:border-[#1565C0] focus:ring-2 focus:ring-blue-100";

function RegistrationCenter({ onSaved }: { onSaved: () => void }) {
  const { t } = useLang();
  const [tab, setTab] = useState<RegistrationTab>("patient");
  const { data: catalogs, loading, error, reload } = useApiData<AdminCatalogs>("/api/admin/catalogs");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const tabs = [
    ["patient", t("manager.registration.tabs.patient")],
    ["staff", t("manager.registration.tabs.staff")],
    ["provider", t("manager.registration.tabs.provider")],
    ["request", t("manager.registration.tabs.request")],
  ] as const;

  const submit = async (event: FormEvent<HTMLFormElement>, path: string) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const body: Record<string, unknown> = Object.fromEntries(Array.from(form.entries()).map(([key, raw]) => [key, raw === "" ? null : raw]));
    for (const key of ["valor_total", "sla_percentual", "paciente_id", "distancia_estimada_cre_km"]) {
      if (body[key] !== null && body[key] !== undefined) body[key] = Number(body[key]);
    }
    try {
      await apiPost(path, body);
      event.currentTarget.reset();
      setMessage({ ok: true, text: t("manager.registration.success") });
      reload();
      onSaved();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : t("manager.registration.error") });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8"><LoadingState message={t("manager.common.loading")} /></div>;
  if (error || !catalogs) return <div className="p-8"><ErrorState message={error ?? t("manager.common.error")} retryLabel={t("manager.common.retry")} onRetry={reload} /></div>;

  return (
    <div className="p-8">
      <PageHeader breadcrumb={t("manager.standard.pages.registrations.breadcrumb")} title={t("manager.standard.pages.registrations.title")} subtitle={t("manager.standard.pages.registrations.subtitle")} />
      <Card className="p-2 mb-5"><div className="grid grid-cols-2 gap-2 md:grid-cols-4">{tabs.map(([id, label]) => <button key={id} onClick={() => { setTab(id); setMessage(null); }} className={`rounded-lg px-3 py-2.5 text-xs font-semibold transition ${tab === id ? "bg-[#1565C0] text-white" : "text-muted-foreground hover:bg-muted"}`}>{label}</button>)}</div></Card>
      <Card className="p-6">
        <div className="mb-5"><h2 className="text-lg font-semibold text-foreground">{t(`manager.registration.${tab}.title` as TranslationKey)}</h2><p className="mt-1 text-sm text-muted-foreground">{t(`manager.registration.${tab}.subtitle` as TranslationKey)}</p></div>

        {tab === "patient" && <form className="grid gap-4 md:grid-cols-2" onSubmit={(event) => void submit(event, "/api/admin/patients")}>
          <FormField label={t("manager.registration.fields.name")}><input className={inputClass} name="nome_completo" required /></FormField>
          <FormField label={t("manager.registration.fields.email")}><input className={inputClass} name="email" type="email" required /></FormField>
          <FormField label={t("manager.registration.fields.password")}><input className={inputClass} name="password" type="password" minLength={6} required /></FormField>
          <FormField label={t("manager.registration.fields.cns")}><input className={inputClass} name="cns" inputMode="numeric" minLength={15} maxLength={15} required /></FormField>
          <FormField label={t("manager.registration.fields.cpf")}><input className={inputClass} name="cpf" inputMode="numeric" minLength={11} maxLength={11} /></FormField>
          <FormField label={t("manager.registration.fields.birthDate")}><input className={inputClass} name="data_nascimento" type="date" required /></FormField>
          <FormField label={t("manager.registration.fields.sex")}><select className={inputClass} name="sexo" required><option value="F">{t("manager.registration.values.female")}</option><option value="M">{t("manager.registration.values.male")}</option></select></FormField>
          <FormField label={t("manager.registration.fields.municipality")}><select className={inputClass} name="municipio_residencia_ibge6"><option value="">{t("manager.common.select")}</option>{catalogs.municipalities.map((item) => <option key={item.codigo_ibge6} value={item.codigo_ibge6}>{item.nome_municipio} - {item.uf_sigla}</option>)}</select></FormField>
          <FormField label={t("manager.registration.fields.zone")}><select className={inputClass} name="zona_residencia" defaultValue="URBANA"><option value="URBANA">{t("manager.standard.zones.URBANA")}</option><option value="RURAL">{t("manager.standard.zones.RURAL")}</option><option value="RIBEIRINHA">{t("manager.standard.zones.RIBEIRINHA")}</option><option value="REMOTA">{t("manager.standard.zones.REMOTA")}</option></select></FormField>
          <FormField label={t("manager.registration.fields.phone")}><input className={inputClass} name="telefone_contato" /></FormField>
          <FormField label={t("manager.registration.fields.language")}><select className={inputClass} name="idioma_preferido" defaultValue="pt-BR"><option value="pt-BR">Português</option><option value="en-US">English</option><option value="es-419">Español</option></select></FormField>
          <div className="md:col-span-2"><button disabled={submitting} className="rounded-lg bg-[#1565C0] px-5 py-2.5 text-xs font-semibold text-white disabled:opacity-50">{submitting ? t("manager.registration.saving") : t("manager.registration.save")}</button></div>
        </form>}

        {tab === "staff" && <form className="grid gap-4 md:grid-cols-2" onSubmit={(event) => void submit(event, "/api/admin/staff")}>
          <FormField label={t("manager.registration.fields.name")}><input className={inputClass} name="nome_completo" required /></FormField>
          <FormField label={t("manager.registration.fields.email")}><input className={inputClass} name="email" type="email" required /></FormField>
          <FormField label={t("manager.registration.fields.password")}><input className={inputClass} name="password" type="password" minLength={6} required /></FormField>
          <FormField label={t("manager.registration.fields.role")}><select className={inputClass} name="papel" defaultValue="FISCAL_CRE"><option value="FISCAL_CRE">{t("manager.registration.values.cre")}</option><option value="GESTOR">{t("manager.registration.values.manager")}</option></select></FormField>
          <FormField label={t("manager.registration.fields.cns")}><input className={inputClass} name="cns" inputMode="numeric" minLength={15} maxLength={15} required /></FormField>
          <FormField label={t("manager.registration.fields.cbo")}><input className={inputClass} name="cbo" inputMode="numeric" minLength={6} maxLength={6} required /></FormField>
          <FormField label={t("manager.registration.fields.unit")}><select className={inputClass} name="cnes_vinculo" required><option value="">{t("manager.common.select")}</option>{catalogs.units.map((unit) => <option key={unit.codigo_cnes} value={unit.codigo_cnes}>{unit.nome_fantasia || unit.razao_social}</option>)}</select></FormField>
          <FormField label={t("manager.registration.fields.councilNumber")}><input className={inputClass} name="numero_conselho" /></FormField>
          <FormField label={t("manager.registration.fields.councilType")}><input className={inputClass} name="tipo_conselho" /></FormField>
          <div className="md:col-span-2"><button disabled={submitting} className="rounded-lg bg-[#1565C0] px-5 py-2.5 text-xs font-semibold text-white disabled:opacity-50">{submitting ? t("manager.registration.saving") : t("manager.registration.save")}</button></div>
        </form>}

        {tab === "provider" && <form className="grid gap-4 md:grid-cols-2" onSubmit={(event) => void submit(event, "/api/admin/providers")}>
          <FormField label={t("manager.registration.fields.providerName")}><input className={inputClass} name="nome" required /></FormField>
          <FormField label={t("manager.registration.fields.cnpj")}><input className={inputClass} name="cnpj" inputMode="numeric" maxLength={14} /></FormField>
          <FormField label={t("manager.registration.fields.email")}><input className={inputClass} name="email" type="email" /></FormField>
          <FormField label={t("manager.registration.fields.phone")}><input className={inputClass} name="telefone" /></FormField>
          <FormField label={t("manager.registration.fields.address")}><input className={inputClass} name="endereco" /></FormField>
          <FormField label={t("manager.registration.fields.contractNumber")}><input className={inputClass} name="numero_contrato" /></FormField>
          <FormField label={t("manager.registration.fields.contractValue")}><input className={inputClass} name="valor_total" type="number" min="0" step="0.01" /></FormField>
          <FormField label={t("manager.registration.fields.sla")}><input className={inputClass} name="sla_percentual" type="number" min="0" max="100" step="0.01" /></FormField>
          <FormField label={t("manager.registration.fields.startDate")}><input className={inputClass} name="data_inicio" type="date" /></FormField>
          <FormField label={t("manager.registration.fields.endDate")}><input className={inputClass} name="data_fim" type="date" /></FormField>
          <FormField label={t("manager.registration.fields.status")}><select className={inputClass} name="status" defaultValue="VIGENTE"><option value="VIGENTE">{translatedStatus(t, "VIGENTE")}</option><option value="EM_RENOVACAO">{translatedStatus(t, "EM_RENOVACAO")}</option><option value="ENCERRADO">{translatedStatus(t, "ENCERRADO")}</option><option value="CANCELADO">{translatedStatus(t, "CANCELADO")}</option></select></FormField>
          <div className="md:col-span-2"><button disabled={submitting} className="rounded-lg bg-[#1565C0] px-5 py-2.5 text-xs font-semibold text-white disabled:opacity-50">{submitting ? t("manager.registration.saving") : t("manager.registration.save")}</button></div>
        </form>}

        {tab === "request" && <form className="grid gap-4 md:grid-cols-2" onSubmit={(event) => void submit(event, "/api/cre/requests")}>
          <FormField label={t("manager.registration.fields.patient")}><select className={inputClass} name="paciente_id" required><option value="">{t("manager.common.select")}</option>{catalogs.patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.nome_completo} - {patient.cns}</option>)}</select></FormField>
          <FormField label={t("manager.registration.fields.procedure")}><select className={inputClass} name="procedimento_sigtap" required><option value="">{t("manager.common.select")}</option>{catalogs.procedures.map((procedure) => <option key={procedure.codigo} value={procedure.codigo}>{procedure.codigo} - {procedure.nome_procedimento}</option>)}</select></FormField>
          <FormField label={t("manager.registration.fields.diagnosis")}><select className={inputClass} name="cid10_codigo" required><option value="">{t("manager.common.select")}</option>{catalogs.diagnoses.map((diagnosis) => <option key={diagnosis.codigo} value={diagnosis.codigo}>{diagnosis.codigo} - {diagnosis.descricao}</option>)}</select></FormField>
          <FormField label={t("manager.registration.fields.priority")}><select className={inputClass} name="prioridade_clinica" defaultValue="ROTINA"><option value="ROTINA">{t("manager.registration.values.routine")}</option><option value="PRIORITARIO">{t("manager.registration.values.priority")}</option><option value="URGENTE">{t("manager.registration.values.urgent")}</option></select></FormField>
          <FormField label={t("manager.registration.fields.distance")}><input className={inputClass} name="distancia_estimada_cre_km" type="number" min="0" step="0.1" /></FormField>
          <FormField label={t("manager.registration.fields.side")}><select className={inputClass} name="lado_acometido"><option value="">{t("manager.common.select")}</option><option value="DIREITO">{t("manager.registration.values.right")}</option><option value="ESQUERDO">{t("manager.registration.values.left")}</option><option value="BILATERAL">{t("manager.registration.values.bilateral")}</option><option value="NAO_APLICAVEL">{t("manager.registration.values.notApplicable")}</option></select></FormField>
          <FormField label={t("manager.registration.fields.justification")}><textarea className={`${inputClass} min-h-24 py-2`} name="justificativa_clinica" required /></FormField>
          <div className="md:col-span-2"><button disabled={submitting} className="rounded-lg bg-[#1565C0] px-5 py-2.5 text-xs font-semibold text-white disabled:opacity-50">{submitting ? t("manager.registration.saving") : t("manager.registration.save")}</button></div>
        </form>}

        {message && <div className={`mt-5 rounded-lg border px-4 py-3 text-xs font-semibold ${message.ok ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}`}>{message.text}</div>}
      </Card>
    </div>
  );
}

export function ManagerHomePage() {
  const { t, locale } = useLang();
  const { signOut, user } = useAuth();
  const [activePage, setActivePage] = useState<Page>("inicio");
  const [search, setSearch] = useState("");
  const dashboard = useApiData<ManagerDashboardData>("/api/manager/dashboard");

  const navItems = useMemo(() => [
    { id: "inicio" as const, label: t("manager.standard.nav.executive"), icon: LayoutDashboard },
    { id: "politicas" as const, label: t("manager.standard.nav.governance"), icon: ShieldCheck },
    { id: "ciclovida" as const, label: t("manager.standard.nav.lifecycle"), icon: Wrench },
    { id: "logistica" as const, label: t("manager.standard.nav.logistics"), icon: Truck },
    { id: "financas" as const, label: t("manager.standard.nav.finance"), icon: Banknote },
    { id: "equidade" as const, label: t("manager.standard.nav.equity"), icon: Scale },
    { id: "relatorios" as const, label: t("manager.standard.nav.reports"), icon: BarChart3 },
    { id: "cadastros" as const, label: t("manager.standard.nav.registrations"), icon: UserPlus },
  ], [t]);

  const filteredNavItems = navItems.filter((item) => item.label.toLocaleLowerCase(locale).includes(search.toLocaleLowerCase(locale)));
  const pageTitles = Object.fromEntries(navItems.map((item) => [item.id, item.label])) as Record<Page, string>;

  if (dashboard.loading && !dashboard.data) return <LoadingState message={t("manager.common.loading")} />;
  if (dashboard.error || !dashboard.data) return <ErrorState message={dashboard.error ?? t("manager.common.error")} retryLabel={t("manager.common.retry")} onRetry={dashboard.reload} />;

  const data = dashboard.data;
  const initials = (user?.email ?? "GM").slice(0, 2).toUpperCase();

  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ fontFamily: "Inter, DM Sans, sans-serif", background: "#F8F9FA" }}>
      <aside className="flex flex-col w-60 shrink-0 h-full" style={{ background: "#0A1929" }}>
        <div className="px-5 pt-6 pb-5 border-b border-white/8">
          <div className="flex items-center gap-2.5"><div className="w-8 h-8 rounded-lg bg-[#1565C0] flex items-center justify-center shrink-0"><Activity size={15} className="text-white" /></div><div><p className="text-white text-xs font-semibold leading-tight">{t("manager.standard.brand")}</p><p className="text-blue-400/60 text-[10px] leading-tight">{t("manager.standard.brandFull")}</p></div></div>
        </div>

        <div className="px-4 py-3"><div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2"><Search size={12} className="text-blue-300/60" /><input value={search} onChange={(event) => setSearch(event.target.value)} type="text" placeholder={t("manager.standard.search")} className="bg-transparent text-xs text-blue-100/80 placeholder-blue-300/40 outline-none w-full" /></div></div>

        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          <p className="text-[10px] font-semibold tracking-widest text-blue-400/50 uppercase px-2 py-2">{t("manager.standard.mainMenu")}</p>
          {filteredNavItems.map((item) => {
            const isActive = activePage === item.id;
            return <button key={item.id} onClick={() => setActivePage(item.id)} className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors text-xs font-medium ${isActive ? "bg-[#1565C0] text-white" : "text-blue-200/70 hover:bg-white/5 hover:text-blue-100"}`}><item.icon size={14} className={isActive ? "text-white" : "text-blue-300/60"} /><span className="leading-tight">{item.label}</span>{isActive && <ChevronRight size={11} className="ml-auto opacity-60" />}</button>;
          })}
        </nav>

        <div className="px-4 py-4 border-t border-white/8 space-y-3">
          <div className="rounded-lg bg-white/5 p-1"><LanguageToggle /></div>
          <div className="flex items-center gap-2.5"><div className="w-7 h-7 rounded-full bg-[#1565C0] flex items-center justify-center shrink-0 text-white text-xs font-semibold">{initials}</div><div className="flex-1 min-w-0"><p className="text-white text-xs font-medium truncate">{user?.email ?? t("manager.standard.manager")}</p><p className="text-blue-400/60 text-[10px] truncate">{t("manager.standard.executiveAccess")}</p></div><button onClick={() => void signOut()} title={t("manager.standard.actions.logout")} className="text-blue-300/60 hover:text-red-300 transition"><LogOut size={14} /></button></div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex flex-col gap-2 px-8 py-3.5 bg-card border-b border-border shrink-0 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><span>{t("manager.standard.brand")}</span><ChevronRight size={11} /><span className="text-foreground font-medium">{pageTitles[activePage]}</span></div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground"><span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32] inline-block" />{t("manager.standard.allSystems")}</span><span>{t("manager.standard.updated", { date: formatDateTime(data.generated_at, locale) })}</span></div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {activePage === "inicio" && <PaginaInicio data={data} onRefresh={dashboard.reload} />}
          {activePage === "politicas" && <PaginaPoliticas data={data} />}
          {activePage === "ciclovida" && <PaginaCicloVida data={data} onRefresh={dashboard.reload} />}
          {activePage === "logistica" && <PaginaLogistica data={data} />}
          {activePage === "financas" && <PaginaFinancas data={data} />}
          {activePage === "equidade" && <PaginaEquidade data={data} />}
          {activePage === "relatorios" && <PaginaRelatorios data={data} />}
          {activePage === "cadastros" && <RegistrationCenter onSaved={dashboard.reload} />}
        </div>
      </main>
    </div>
  );
}
