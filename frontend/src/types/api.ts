export interface ManagerDashboardData {
  summary: Record<string, number>;
  monthly: Array<Record<string, string | number | null>>;
  regional: Array<Record<string, string | number | null>>;
  recalls: Array<Record<string, string | number | null>>;
  logistics: Array<Record<string, string | number | null>>;
  providers: Array<Record<string, string | number | null>>;
  equity: Array<Record<string, string | number | null>>;
  reports: Array<Record<string, string | number | null>>;
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
