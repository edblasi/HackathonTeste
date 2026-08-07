import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, ClipboardPlus, PackagePlus, X } from "lucide-react";
import { apiGet, apiPatch, apiPost } from "../lib/api";
import type { AdminCatalogs } from "../types/api";
import type { Triagem } from "../hooks/FetchData";
import { useLang } from "../i18n/LanguageContext";
import type { TranslationKey } from "../i18n/translations";

const inputClass = "mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

interface TriageModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialPatientId?: number | null;
  triage?: Triagem | null;
}

export function TriageModal({ open, onClose, onSaved, initialPatientId = null, triage = null }: TriageModalProps) {
  const { t } = useLang();
  const tr = (key: string) => t(key as TranslationKey);
  const [catalogs, setCatalogs] = useState<AdminCatalogs | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setMessage(null);
    apiGet<AdminCatalogs>("/api/admin/catalogs")
      .then(setCatalogs)
      .catch((error: unknown) => setMessage({ ok: false, text: error instanceof Error ? error.message : tr("cre.actions.genericError") }))
      .finally(() => setLoading(false));
  }, [open]);

  if (!open) return null;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setMessage(null);
    try {
      const body = {
        paciente_id: Number(form.get("paciente_id")),
        procedimento_sigtap_proposto: String(form.get("procedimento_sigtap_proposto") || "") || null,
        status: String(form.get("status")),
        observacao_clinica: String(form.get("observacao_clinica") || "") || null,
      };
      if (triage) {
        await apiPatch(`/api/cre/triages/${triage.triagem_id}`, {
          procedimento_sigtap_proposto: body.procedimento_sigtap_proposto,
          status: body.status,
          observacao_clinica: body.observacao_clinica,
        });
      } else {
        await apiPost("/api/cre/triages", body);
      }
      setMessage({ ok: true, text: triage ? tr("cre.actions.triageUpdated") : tr("cre.actions.triageCreated") });
      onSaved();
      window.setTimeout(onClose, 650);
    } catch (error) {
      setMessage({ ok: false, text: error instanceof Error ? error.message : tr("cre.actions.genericError") });
    } finally {
      setSaving(false);
    }
  };

  const selectedPatient = triage?.paciente_id ?? initialPatientId ?? undefined;
  const selectedProcedure = triage?.procedimento_sigtap_proposto ?? "";

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/45 p-4" onClick={onClose}>
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4"><div className="flex items-start gap-3"><div className="rounded-lg bg-blue-50 p-2 text-blue-700"><ClipboardPlus size={17} /></div><div><h2 className="text-sm font-bold text-slate-900">{triage ? tr("cre.actions.editTriage") : tr("cre.actions.newTriage")}</h2><p className="mt-0.5 text-xs text-slate-500">{tr("cre.actions.triageHint")}</p></div></div><button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={16} /></button></div>
        {loading && !catalogs ? <div className="p-8 text-center text-sm text-slate-400">…</div> : (
          <form onSubmit={submit}>
            <div className="space-y-4 p-5">
              {message && <div className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-semibold ${message.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>{message.ok && <CheckCircle2 size={15} />}{message.text}</div>}
              <label className="block text-xs font-semibold text-slate-600">{tr("cre.actions.patient")}<select name="paciente_id" required defaultValue={selectedPatient ?? ""} disabled={Boolean(triage)} className={inputClass}><option value="">{tr("cre.actions.select")}</option>{(catalogs?.patients ?? []).map((patient) => <option key={patient.id} value={patient.id}>{patient.nome_completo} · {patient.cns}</option>)}</select></label>
              <label className="block text-xs font-semibold text-slate-600">{tr("cre.actions.procedure")}<select name="procedimento_sigtap_proposto" defaultValue={selectedProcedure} className={inputClass}><option value="">{tr("cre.actions.select")}</option>{(catalogs?.procedures ?? []).map((procedure) => <option key={procedure.codigo} value={procedure.codigo}>{procedure.codigo} · {procedure.nome_procedimento}</option>)}</select></label>
              <label className="block text-xs font-semibold text-slate-600">{tr("cre.actions.status")}<select name="status" defaultValue={triage?.status ?? "PENDENTE"} className={inputClass}><option value="PENDENTE">{tr("triage.status.pending")}</option><option value="EM_ANDAMENTO">{tr("triage.status.progress")}</option><option value="CONCLUIDA">{tr("triage.status.done")}</option><option value="CANCELADA">{tr("triage.status.cancelled")}</option></select></label>
              <label className="block text-xs font-semibold text-slate-600">{tr("cre.actions.notes")}<textarea name="observacao_clinica" defaultValue={triage?.observacao_clinica ?? ""} rows={5} className={`${inputClass} resize-y`} /></label>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4"><button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">{tr("cre.actions.cancel")}</button><button disabled={saving} className="rounded-lg bg-blue-700 px-5 py-2 text-xs font-bold text-white hover:bg-blue-800 disabled:opacity-50">{saving ? tr("cre.actions.saving") : tr("cre.actions.saveTriage")}</button></div>
          </form>
        )}
      </div>
    </div>
  );
}

interface ShipmentModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function ShipmentModal({ open, onClose, onSaved }: ShipmentModalProps) {
  const { t } = useLang();
  const tr = (key: string) => t(key as TranslationKey);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  if (!open) return null;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setMessage(null);
    try {
      await apiPost("/api/cre/shipments", {
        tipo_dispositivo: form.get("tipo_dispositivo"),
        quantidade: Number(form.get("quantidade") || 1),
        fabricante_destino: form.get("fabricante_destino"),
        endereco_destino: form.get("endereco_destino") || null,
        codigo_rastreio: form.get("codigo_rastreio") || null,
        status: form.get("status"),
      });
      setMessage({ ok: true, text: tr("cre.actions.returnCreated") });
      onSaved();
      window.setTimeout(onClose, 650);
    } catch (error) {
      setMessage({ ok: false, text: error instanceof Error ? error.message : tr("cre.actions.genericError") });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/45 p-4" onClick={onClose}>
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4"><div className="flex items-start gap-3"><div className="rounded-lg bg-amber-50 p-2 text-amber-700"><PackagePlus size={17} /></div><div><h2 className="text-sm font-bold text-slate-900">{tr("cre.actions.newReturn")}</h2><p className="mt-0.5 text-xs text-slate-500">{tr("cre.actions.returnHint")}</p></div></div><button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={16} /></button></div>
        <form onSubmit={submit}>
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            {message && <div className={`sm:col-span-2 flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-semibold ${message.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>{message.ok && <CheckCircle2 size={15} />}{message.text}</div>}
            <label className="text-xs font-semibold text-slate-600 sm:col-span-2">{tr("cre.actions.deviceType")}<input name="tipo_dispositivo" required className={inputClass} /></label>
            <label className="text-xs font-semibold text-slate-600">{tr("cre.actions.quantity")}<input name="quantidade" type="number" min="1" defaultValue="1" required className={inputClass} /></label>
            <label className="text-xs font-semibold text-slate-600">{tr("cre.actions.shipmentStatus")}<select name="status" defaultValue="AGUARDANDO_COLETA" className={inputClass}><option value="AGUARDANDO_COLETA">AGUARDANDO COLETA</option><option value="EM_TRANSITO">EM TRÂNSITO</option><option value="ENTREGUE">ENTREGUE</option></select></label>
            <label className="text-xs font-semibold text-slate-600 sm:col-span-2">{tr("cre.actions.destinationManufacturer")}<input name="fabricante_destino" required className={inputClass} /></label>
            <label className="text-xs font-semibold text-slate-600 sm:col-span-2">{tr("cre.actions.destinationAddress")}<input name="endereco_destino" className={inputClass} /></label>
            <label className="text-xs font-semibold text-slate-600 sm:col-span-2">{tr("cre.actions.trackingCode")}<input name="codigo_rastreio" className={inputClass} /></label>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4"><button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">{tr("cre.actions.cancel")}</button><button disabled={saving} className="rounded-lg bg-blue-700 px-5 py-2 text-xs font-bold text-white hover:bg-blue-800 disabled:opacity-50">{saving ? tr("cre.actions.saving") : tr("cre.actions.saveReturn")}</button></div>
        </form>
      </div>
    </div>
  );
}
