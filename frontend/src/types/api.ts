export interface ManagerMonthlyRow {
  month: string;
  requests: number;
  deliveries: number;
  cancelled: number;
}

export interface ManagerHealthRow {
  month: string;
  conformity: number;
  efficiency: number;
}

export interface ManagerRegionalRow {
  region: string;
  stock: number;
  queue: number;
  transit: number;
  units: number;
}

export interface ManagerDistributionRow {
  name: string;
  value: number;
  count: number;
}

export interface ManagerAlertRow {
  kind: "recall" | "low_stock" | "shipment" | "report" | string;
  severity: "critical" | "warning" | "info" | string;
  code?: string | null;
  product?: string | null;
  date?: string | null;
  status?: string | null;
  current?: number | null;
  minimum?: number | null;
  count?: number | null;
  devices?: number | null;
  name?: string | null;
}

export interface ManagerComplianceRow {
  key: "inventory" | "privacy" | "billing" | "traceability" | "delivery_docs" | "sla" | string;
  status: "pass" | "warning" | "fail";
  score: number;
}

export interface ManagerForecastRow {
  month: string;
  orthoses: number;
  prostheses: number;
}

export interface ManagerLifecycleAlertRow {
  id: string;
  patient: string;
  date: string | null;
  type: "recall" | "overdue" | string;
  status: string;
  description?: string | null;
}

export interface ManagerLogisticsRow {
  status: string;
  count: number;
  devices: number;
}

export interface ManagerCenterRow {
  id: number;
  name: string;
  cnes: string;
  region: string;
  capacity: number;
  capacity_used: number;
  queue: number;
  active_shipments: number;
  ngo_partners: number;
  active: boolean;
}

export interface ManagerFinanceRow {
  month: string;
  prostheses: number;
  orthoses: number;
  wheelchairs: number;
  hearing: number;
}

export interface ManagerProviderRow {
  id: number;
  nome: string;
  numero_contrato: string | null;
  valor_total: number | null;
  data_inicio: string | null;
  data_fim: string | null;
  status: string;
  sla_percentual: number | null;
}

export interface ManagerEquityRow {
  region: string;
  average_wait_days: number;
  queue_records: number;
}

export interface ManagerEquityPointRow {
  region: string;
  zone: "URBANA" | "RURAL" | "RIBEIRINHA" | "REMOTA" | string;
  distance_km: number;
  wait_days: number;
}

export interface ManagerRecallRow {
  id: number;
  codigo_lote: string;
  nome_produto: string;
  motivo: string;
  data_abertura: string;
  data_limite: string | null;
  affected_devices: number;
  status: string;
  orgao_notificador: string | null;
}

export interface ManagerReportRow {
  id: number;
  nome: string;
  tipo: string;
  formato: string;
  tamanho_bytes: number | null;
  caminho_arquivo: string | null;
  gerado_em: string;
}

export interface ManagerDashboardData {
  summary: Record<string, number>;
  monthly: ManagerMonthlyRow[];
  health: ManagerHealthRow[];
  regional: ManagerRegionalRow[];
  access_distribution: ManagerDistributionRow[];
  alerts: ManagerAlertRow[];
  compliance: ManagerComplianceRow[];
  maintenance_forecast: ManagerForecastRow[];
  lifecycle_alerts: ManagerLifecycleAlertRow[];
  logistics: ManagerLogisticsRow[];
  centers: ManagerCenterRow[];
  finance_monthly: ManagerFinanceRow[];
  providers: ManagerProviderRow[];
  equity: ManagerEquityRow[];
  equity_points: ManagerEquityPointRow[];
  recalls: ManagerRecallRow[];
  reports: ManagerReportRow[];
  generated_at: string;
}

export interface AdminCatalogs {
  patients: Array<{ id: number; nome_completo: string; cns: string; cpf: string | null }>;
  professionals: Array<{ id: number; nome_completo: string; cns: string; cbo: string; cnes_vinculo: string }>;
  units: Array<{ codigo_cnes: string; nome_fantasia: string | null; razao_social: string }>;
  municipalities: Array<{ codigo_ibge6: string; nome_municipio: string; uf_sigla: string }>;
  procedures: Array<{ codigo: string; nome_procedimento: string }>;
  diagnoses: Array<{ codigo: string; descricao: string }>;
  workshops: Array<{ id: number; cnes: string; nome: string }>;
  materials: Array<Record<string, string | number | null>>;
  providers: Array<Record<string, string | number | null>>;
}
