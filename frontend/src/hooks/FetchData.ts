import { useCallback, useEffect, useRef, useState } from "react";
import { apiGet, apiPatch } from "../lib/api";

interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

function useApiQuery<T>(path: string | null, deps: unknown[] = []): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const requestId = useRef(0);

  const refetch = useCallback(() => setReloadKey((value) => value + 1), []);

  useEffect(() => {
    if (!path) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    const currentId = ++requestId.current;
    setLoading(true);
    setError(null);

    apiGet<T>(path)
      .then((result) => {
        if (requestId.current === currentId) setData(result);
      })
      .catch((err: unknown) => {
        if (requestId.current === currentId) {
          setError(err instanceof Error ? err.message : "Erro ao carregar os dados.");
        }
      })
      .finally(() => {
        if (requestId.current === currentId) setLoading(false);
      });
  }, [path, reloadKey, ...deps]);

  return { data, loading, error, refetch };
}

export interface PedidoAtual {
  solicitacao_id: number;
  paciente_id: number;
  data_solicitacao: string;
  lado_acometido: string | null;
  prioridade_clinica: string;
  status_solicitacao: string;
  nome_procedimento: string;
  procedimento_sigtap: string;
  nome_produto: string | null;
  especificacao_tecnica: string | null;
  ordem_producao_id: number | null;
  status_producao: string | null;
  producao_data_abertura: string | null;
  data_prevista_entrega: string | null;
  producao_data_conclusao: string | null;
  data_entrega: string | null;
  oficina_nome: string | null;
}

export interface HistoricoStatus {
  id: number;
  status_anterior: string | null;
  status_novo: string;
  data_alteracao: string;
  usuario_responsavel: string | null;
  observacao: string | null;
}

export interface PacientePerfil {
  paciente_id: number;
  nome_completo: string;
  cpf: string | null;
  cns: string;
  telefone_contato: string | null;
  idade: number;
  nome_municipio: string | null;
  uf_sigla: string | null;
  ultima_solicitacao_id: number | null;
  unidade_encaminhamento: string | null;
  centro_reabilitacao: string | null;
}

export interface UsuarioSistema {
  id: number;
  auth_user_id: string;
  papel: "PACIENTE" | "FISCAL_CRE" | "GESTOR";
  paciente_id: number | null;
  profissional_saude_id: number | null;
  cnes_vinculo: string | null;
  nome_exibicao: string;
  idioma_preferido: string;
  unidade_nome?: string | null;
}

export interface Notificacao {
  id: number;
  tipo: "INFO" | "ALERTA" | "LEMBRETE" | "URGENTE";
  titulo: string;
  mensagem: string | null;
  lida: boolean;
  criado_em: string;
}

export interface KpiDashboard {
  fila_ativa: number;
  estoque_proteses: number;
  em_logistica_reversa: number;
  matchings_mes: number;
}

export interface AlertaCritico { tipo: string; mensagem: string; gerado_em: string; }
export interface Recall {
  id: number;
  codigo_lote: string;
  nome_produto: string;
  motivo: string;
  data_abertura: string;
  data_limite: string | null;
  affected_devices: number;
  status: "ABERTO" | "EM_ANDAMENTO" | "ENCERRADO" | "CANCELADO";
  orgao_notificador: string | null;
}
export interface FluxoMensal { mes: string; entradas: number; saidas: number; }

export interface PacienteAguardando {
  fila_id: number;
  solicitacao_id: number;
  paciente_mascarado: string;
  nome_completo: string;
  dispositivo: string;
  lado_acometido: string | null;
  data_solicitacao: string;
  prioridade_clinica: string;
  status: string;
  dias_espera_efetivos: number;
}

export interface LoteRecente {
  lote_id: number;
  lote_fabricante: string | null;
  data_cadastro: string;
  tipo_item: string;
  oficina: string;
  quantidade: number;
  data_validade: string | null;
  status: "OK" | "ESTOQUE_BAIXO" | "VENCIDO";
}

export interface Triagem {
  triagem_id: number;
  paciente: string;
  profissional: string;
  dispositivo: string | null;
  data_hora: string;
  status: "PENDENTE" | "EM_ANDAMENTO" | "CONCLUIDA" | "CANCELADA";
  observacao_clinica: string | null;
}

export interface RemessaLogistica {
  remessa_id: number;
  origem: string;
  fabricante_destino: string;
  endereco_destino: string | null;
  tipo_dispositivo: string;
  quantidade: number;
  codigo_rastreio: string | null;
  status: "AGUARDANDO_COLETA" | "EM_TRANSITO" | "ENTREGUE";
  data_criacao: string;
}

export interface RelatorioMensal { mes: string; triagens: number; matchings: number; devolucoes: number; }

export function useUsuarioAtual() { return useApiQuery<UsuarioSistema>("/api/me"); }
export function useUsuarios() { return useApiQuery<UsuarioSistema[]>("/api/admin/users"); }
export function usePacientePerfil() { return useApiQuery<PacientePerfil>("/api/patient/profile"); }
export function usePedidos() { return useApiQuery<PedidoAtual[]>("/api/patient/orders"); }
export function useHistoricoSolicitacao(id: number | null) {
  return useApiQuery<HistoricoStatus[]>(id ? `/api/patient/orders/${id}/history` : null, [id]);
}

export function useNotificacoes() {
  const result = useApiQuery<Notificacao[]>("/api/notifications");
  const naoLidas = (result.data ?? []).filter((item) => !item.lida).length;
  const marcarComoLida = useCallback(async (id: number) => {
    await apiPatch(`/api/notifications/${id}`, { lida: true });
    result.refetch();
  }, [result.refetch]);
  return { ...result, naoLidas, marcarComoLida };
}

export function useKpiDashboard() { return useApiQuery<KpiDashboard>("/api/cre/kpis"); }
export function useAlertasCriticos() { return useApiQuery<AlertaCritico[]>("/api/cre/alerts"); }
export function useRecalls() { return useApiQuery<Recall[]>("/api/cre/recalls"); }
export function useFluxoDispositivosMensal() { return useApiQuery<FluxoMensal[]>("/api/cre/flow"); }
export function usePacientesAguardando() { return useApiQuery<PacienteAguardando[]>("/api/cre/patients"); }
export function useLotesRecentes() { return useApiQuery<LoteRecente[]>("/api/cre/lots"); }
export function useTriagens() { return useApiQuery<Triagem[]>("/api/cre/triages"); }
export function useRemessasLogistica() { return useApiQuery<RemessaLogistica[]>("/api/cre/shipments"); }
export function useRelatorioMensal() { return useApiQuery<RelatorioMensal[]>("/api/cre/reports"); }
