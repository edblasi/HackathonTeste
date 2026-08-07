import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, Hospital, MessageSquare, Send, Stethoscope, UserRound, Wrench } from "lucide-react";
import { useLang } from "../i18n/LanguageContext";
import { getCreSupportMessages, replyCreSupport, useCreSupportTickets, type SupportMessage, type SupportTicket } from "../hooks/FetchData";

const statusClasses: Record<SupportTicket["status"], string> = {
  ABERTO: "bg-red-50 text-red-700 border-red-200",
  EM_ATENDIMENTO: "bg-amber-50 text-amber-700 border-amber-200",
  ORIENTADO: "bg-blue-50 text-blue-700 border-blue-200",
  ENCERRADO: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export function CreSupportInbox() {
  const { t, locale } = useLang();
  const [refreshKey, setRefreshKey] = useState(0);
  const { data: tickets, loading, error } = useCreSupportTickets(refreshKey);
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [reply, setReply] = useState("");
  const [orientation, setOrientation] = useState<"SEM_ACAO" | "COMPARECER_CRE" | "PROCURAR_HOSPITAL" | "PERSONALIZADA">("PERSONALIZADA");
  const [closeAfter, setCloseAfter] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [filter, setFilter] = useState<"TODOS" | SupportTicket["status"]>("TODOS");

  const visibleTickets = useMemo(() => (tickets ?? []).filter((ticket) => filter === "TODOS" || ticket.status === filter), [tickets, filter]);
  const openCount = (tickets ?? []).filter((ticket) => ticket.status !== "ENCERRADO").length;
  const painCount = (tickets ?? []).filter((ticket) => ticket.categoria === "DOR" && ticket.status !== "ENCERRADO").length;

  const loadThread = async (ticket: SupportTicket) => {
    setBusy(true); setFeedback(null);
    try { setMessages(await getCreSupportMessages(ticket.id)); setSelected(ticket); }
    catch (err) { setFeedback(err instanceof Error ? err.message : t("cre.support.genericError")); }
    finally { setBusy(false); }
  };

  useEffect(() => {
    if (!selected) return;
    const refreshed = (tickets ?? []).find((ticket) => ticket.id === selected.id);
    if (refreshed) setSelected(refreshed);
  }, [tickets]);

  const applyPreset = (kind: typeof orientation) => {
    setOrientation(kind);
    if (kind === "SEM_ACAO") setReply(t("cre.support.presets.noAction"));
    if (kind === "COMPARECER_CRE") setReply(t("cre.support.presets.maintenance"));
    if (kind === "PROCURAR_HOSPITAL") setReply(t("cre.support.presets.hospital"));
    if (kind === "PERSONALIZADA") setReply("");
  };

  const sendReply = async () => {
    if (!selected || !reply.trim()) return;
    setBusy(true); setFeedback(null);
    try {
      await replyCreSupport(selected.id, { mensagem: reply.trim(), orientacao: orientation, encerrar: closeAfter });
      setMessages(await getCreSupportMessages(selected.id));
      setReply(""); setCloseAfter(false); setOrientation("PERSONALIZADA");
      setRefreshKey((value) => value + 1);
      setFeedback(t("cre.support.replySent"));
    } catch (err) { setFeedback(err instanceof Error ? err.message : t("cre.support.genericError")); }
    finally { setBusy(false); }
  };

  return <main className="flex-1 overflow-y-auto bg-[#F8FAFC] p-8">
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="grid gap-4 md:grid-cols-3"><div className="rounded-xl border border-slate-200 bg-white p-5"><p className="text-xs font-semibold text-slate-400">{t("cre.support.openCases")}</p><p className="mt-1 text-3xl font-bold text-slate-900">{openCount}</p></div><div className="rounded-xl border border-red-100 bg-white p-5"><p className="text-xs font-semibold text-slate-400">{t("cre.support.painCases")}</p><p className="mt-1 text-3xl font-bold text-red-600">{painCount}</p></div><div className="rounded-xl border border-slate-200 bg-white p-5"><p className="text-xs font-semibold text-slate-400">{t("cre.support.totalCases")}</p><p className="mt-1 text-3xl font-bold text-slate-900">{tickets?.length ?? 0}</p></div></div>
      <div className="grid min-h-[620px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[370px_1fr]">
        <section className="border-r border-slate-200"><div className="border-b border-slate-100 p-4"><div className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-blue-700"/><h2 className="text-sm font-bold text-slate-900">{t("cre.support.inbox")}</h2></div><select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"><option value="TODOS">{t("cre.support.filters.all")}</option><option value="ABERTO">{t("cre.support.filters.open")}</option><option value="EM_ATENDIMENTO">{t("cre.support.filters.inProgress")}</option><option value="ORIENTADO">{t("cre.support.filters.guided")}</option><option value="ENCERRADO">{t("cre.support.filters.closed")}</option></select></div>
          {loading ? <p className="p-5 text-sm text-slate-400">…</p> : error ? <p className="p-5 text-sm text-red-600">{error}</p> : visibleTickets.length ? <div className="max-h-[550px] divide-y divide-slate-100 overflow-y-auto">{visibleTickets.map((ticket) => <button type="button" key={ticket.id} onClick={() => void loadThread(ticket)} className={`w-full p-4 text-left hover:bg-slate-50 ${selected?.id === ticket.id ? "bg-blue-50/70" : ""}`}><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-xs font-bold text-slate-900">{ticket.paciente?.nome_completo ?? t("cre.support.patientFallback")}</p><p className="mt-0.5 truncate text-[11px] text-slate-500">{ticket.assunto}</p></div><span className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-bold ${statusClasses[ticket.status]}`}>{t(`cre.support.status.${ticket.status}` as any)}</span></div><p className="mt-2 line-clamp-2 text-[11px] text-slate-500">{ticket.ultima_mensagem?.mensagem ?? "—"}</p><div className="mt-2 flex items-center justify-between text-[9px] text-slate-400"><span>{ticket.categoria === "DOR" ? t("cre.support.pain") : t("cre.support.support")}{ticket.gravidade !== "NAO_INFORMADA" ? ` · ${t(`cre.support.severity.${ticket.gravidade}` as any)}` : ""}</span><span>{new Date(ticket.atualizado_em).toLocaleString(locale)}</span></div></button>)}</div> : <p className="p-8 text-center text-sm text-slate-400">{t("cre.support.empty")}</p>}
        </section>
        <section className="flex min-w-0 flex-col">{selected ? <><div className="border-b border-slate-100 px-6 py-4"><div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><UserRound className="h-4 w-4 text-blue-700"/><h2 className="text-sm font-bold text-slate-900">{selected.paciente?.nome_completo ?? "—"}</h2></div><p className="mt-1 text-xs text-slate-500">CNS {selected.paciente?.cns ?? "—"} · {selected.paciente?.telefone_contato ?? t("cre.support.noPhone")}</p><p className="mt-1 text-[11px] font-semibold text-slate-600">{selected.assunto}</p></div>{selected.categoria === "DOR" && <div className="rounded-lg bg-red-50 px-3 py-2 text-right"><p className="text-[9px] font-bold uppercase text-red-500">{t("cre.support.severityLabel")}</p><p className="text-xs font-bold text-red-700">{t(`cre.support.severity.${selected.gravidade}` as any)}</p></div>}</div></div>
          <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-5">{messages.map((item) => <div key={item.id} className={`max-w-[82%] rounded-xl px-4 py-3 ${item.autor_papel === "PACIENTE" ? "bg-white border border-slate-200 text-slate-800" : "ml-auto bg-blue-700 text-white"}`}><p className="text-[9px] font-bold uppercase tracking-wider opacity-60">{item.autor_papel === "PACIENTE" ? t("cre.support.patient") : t("cre.support.creTeam")}</p><p className="mt-1 whitespace-pre-wrap text-sm">{item.mensagem}</p>{item.orientacao !== "NENHUMA" && <p className="mt-2 text-[9px] font-bold uppercase opacity-75">{t(`cre.support.guidance.${item.orientacao}` as any)}</p>}<p className="mt-1 text-[9px] opacity-50">{new Date(item.criado_em).toLocaleString(locale)}</p></div>)}</div>
          {selected.status !== "ENCERRADO" ? <div className="border-t border-slate-200 bg-white p-5"><p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">{t("cre.support.quickGuidance")}</p><div className="mb-3 flex flex-wrap gap-2"><button type="button" onClick={() => applyPreset("SEM_ACAO")} className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5"/>{t("cre.support.noAction")}</button><button type="button" onClick={() => applyPreset("COMPARECER_CRE")} className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] font-bold text-blue-700"><Wrench className="h-3.5 w-3.5"/>{t("cre.support.maintenance")}</button><button type="button" onClick={() => applyPreset("PROCURAR_HOSPITAL")} className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-bold text-red-700"><Hospital className="h-3.5 w-3.5"/>{t("cre.support.hospital")}</button><button type="button" onClick={() => applyPreset("PERSONALIZADA")} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-600"><Stethoscope className="h-3.5 w-3.5"/>{t("cre.support.custom")}</button></div><textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={4} maxLength={3000} placeholder={t("cre.support.replyPlaceholder")} className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"/><div className="mt-3 flex items-center justify-between gap-3"><label className="flex items-center gap-2 text-xs text-slate-500"><input type="checkbox" checked={closeAfter} onChange={(e) => setCloseAfter(e.target.checked)} />{t("cre.support.closeAfter")}</label><button type="button" onClick={() => void sendReply()} disabled={busy || !reply.trim()} className="flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-800 disabled:opacity-40"><Send className="h-3.5 w-3.5"/>{t("cre.support.sendReply")}</button></div>{feedback && <p className="mt-2 text-xs font-medium text-emerald-700">{feedback}</p>}</div> : <div className="border-t border-slate-200 bg-emerald-50 px-5 py-4 text-xs font-semibold text-emerald-700">{t("cre.support.closedNotice")}</div>}</> : <div className="flex flex-1 flex-col items-center justify-center p-10 text-center"><div className="rounded-full bg-slate-100 p-4"><Clock3 className="h-7 w-7 text-slate-400"/></div><h3 className="mt-4 text-sm font-bold text-slate-800">{t("cre.support.selectTitle")}</h3><p className="mt-1 max-w-sm text-xs text-slate-500">{t("cre.support.selectDesc")}</p>{feedback && <p className="mt-3 text-xs text-red-600">{feedback}</p>}</div>}</section>
      </div>
      <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0"/><p>{t("cre.support.safetyNote")}</p></div>
    </div>
  </main>;
}
