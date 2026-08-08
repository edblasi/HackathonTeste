/**
 * Operational identification used inside CRE screens.
 * We keep the first name visible so staff can distinguish people during care,
 * while avoiding exposing the full civil name in routine tables.
 */
export function patientFirstName(fullName: string | null | undefined): string {
  const normalized = String(fullName ?? "").trim();
  return normalized.split(/\s+/)[0] || "Paciente";
}

export function patientOperationalLabel(
  fullName: string | null | undefined,
  device?: string | null,
): string {
  const firstName = patientFirstName(fullName);
  const product = String(device ?? "").trim();
  return product ? `${firstName} · ${product}` : firstName;
}
