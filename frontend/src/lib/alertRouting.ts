export type AlertTarget =
  | "communications"
  | "manager_lifecycle"
  | "manager_logistics"
  | "manager_reports"
  | "manager_centers"
  | "manager_finance"
  | "manager_equity"
  | "manager_registrations"
  | "cre_patients"
  | "cre_logistics"
  | "cre_triages"
  | "cre_reports"
  | "cre_support"
  | "cre_matching"
  | "patient_orders"
  | "patient_notifications"
  | "patient_support";

const MANAGER_TARGETS: Record<AlertTarget, string> = {
  communications: "comunicacoes",
  manager_lifecycle: "ciclovida",
  manager_logistics: "logistica",
  manager_reports: "relatorios",
  manager_centers: "cres",
  manager_finance: "financas",
  manager_equity: "equidade",
  manager_registrations: "cadastros",
  cre_patients: "cadastros",
  cre_logistics: "logistica",
  cre_triages: "relatorios",
  cre_reports: "relatorios",
  cre_support: "comunicacoes",
  cre_matching: "ciclovida",
  patient_orders: "cadastros",
  patient_notifications: "comunicacoes",
  patient_support: "comunicacoes",
};

const CRE_TARGETS: Record<AlertTarget, string> = {
  communications: "comunicacoes",
  manager_lifecycle: "logistica",
  manager_logistics: "logistica",
  manager_reports: "relatorios",
  manager_centers: "logistica",
  manager_finance: "relatorios",
  manager_equity: "relatorios",
  manager_registrations: "pacientes",
  cre_patients: "pacientes",
  cre_logistics: "logistica",
  cre_triages: "triagens",
  cre_reports: "relatorios",
  cre_support: "atendimentos",
  cre_matching: "matching",
  patient_orders: "pacientes",
  patient_notifications: "comunicacoes",
  patient_support: "comunicacoes",
};

export function managerPageForAlert(target?: string | null, kind?: string | null): string {
  if (target && target in MANAGER_TARGETS) return MANAGER_TARGETS[target as AlertTarget];
  if (kind === "recall") return "ciclovida";
  if (kind === "report") return "relatorios";
  return "logistica";
}

export function crePageForAlert(target?: string | null, kind?: string | null): string {
  if (target && target in CRE_TARGETS) return CRE_TARGETS[target as AlertTarget];
  if (kind === "triage") return "triagens";
  if (kind === "report") return "relatorios";
  return "logistica";
}

export function patientSectionForAlert(target?: string | null): string {
  if (target === "patient_support") return "patient-support-card";
  if (target === "patient_notifications") return "patient-notifications";
  return "patient-request-card";
}
