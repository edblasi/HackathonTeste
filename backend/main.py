from __future__ import annotations

from collections import Counter, defaultdict
from datetime import date, datetime
from decimal import Decimal
import os
from typing import Any, Literal

import httpx
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

from validation import (
    clean_text,
    normalize_cid10,
    normalize_cnpj,
    normalize_cns,
    normalize_code,
    normalize_cpf,
    normalize_phone,
    normalize_sigtap,
    validate_birth_date,
    validate_date_range,
)

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
CORS_ORIGINS = [item.strip() for item in os.getenv("CORS_ORIGINS", "*").split(",") if item.strip()]

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    raise RuntimeError("Defina SUPABASE_URL e SUPABASE_SERVICE_KEY no arquivo .env do backend.")

app = FastAPI(title="UMDR API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer(auto_error=False)


# -----------------------------------------------------------------------------
# Utilitários pequenos: o backend apenas autentica, consulta e repassa dados.
# -----------------------------------------------------------------------------

async def _request(
    method: str,
    url: str,
    *,
    headers: dict[str, str] | None = None,
    params: dict[str, Any] | None = None,
    json: Any = None,
) -> httpx.Response:
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.request(method, url, headers=headers, params=params, json=json)
    return response


def _db_headers(schema: str, write: bool = False, return_representation: bool = False) -> dict[str, str]:
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Accept": "application/json",
        "Accept-Profile": schema,
    }
    if write:
        headers["Content-Type"] = "application/json"
        headers["Content-Profile"] = schema
    if return_representation:
        headers["Prefer"] = "return=representation"
    return headers


async def db_request(
    method: str,
    schema: str,
    resource: str,
    *,
    params: dict[str, Any] | None = None,
    body: Any = None,
    return_representation: bool = False,
) -> Any:
    response = await _request(
        method,
        f"{SUPABASE_URL}/rest/v1/{resource}",
        headers=_db_headers(schema, method != "GET", return_representation),
        params=params,
        json=body,
    )
    if response.status_code >= 400:
        detail = response.text
        database_code = None
        try:
            payload = response.json()
            database_code = payload.get("code")
            detail = payload.get("message") or payload.get("details") or payload.get("hint") or detail
        except ValueError:
            pass
        if database_code == "23505":
            raise HTTPException(status_code=409, detail="Já existe um registro com um dos identificadores informados.")
        if database_code in {"23502", "23503", "23514", "22P02"} or 400 <= response.status_code < 500:
            raise HTTPException(status_code=422, detail=f"Os dados não puderam ser gravados: {detail}")
        raise HTTPException(status_code=502, detail="O banco de dados não respondeu corretamente.")
    if response.status_code == 204 or not response.content:
        return None
    return response.json()


async def db_select(
    schema: str,
    resource: str,
    *,
    select: str = "*",
    filters: dict[str, Any] | None = None,
    order: str | None = None,
    limit: int | None = None,
) -> list[dict[str, Any]]:
    params: dict[str, Any] = {"select": select}
    if filters:
        params.update(filters)
    if order:
        params["order"] = order
    if limit is not None:
        params["limit"] = str(limit)
    result = await db_request("GET", schema, resource, params=params)
    return result or []


async def db_insert(schema: str, resource: str, body: dict[str, Any] | list[dict[str, Any]]) -> list[dict[str, Any]]:
    result = await db_request("POST", schema, resource, body=body, return_representation=True)
    return result or []


async def db_update(
    schema: str,
    resource: str,
    filters: dict[str, Any],
    body: dict[str, Any],
) -> list[dict[str, Any]]:
    result = await db_request(
        "PATCH",
        schema,
        resource,
        params=filters,
        body=body,
        return_representation=True,
    )
    return result or []


async def db_delete(schema: str, resource: str, filters: dict[str, Any]) -> None:
    await db_request("DELETE", schema, resource, params=filters)


async def ensure_record_exists(
    schema: str,
    resource: str,
    field: str,
    value: Any,
    message: str,
    *,
    extra_filters: dict[str, Any] | None = None,
) -> None:
    filters = {field: f"eq.{value}"}
    if extra_filters:
        filters.update(extra_filters)
    rows = await db_select(schema, resource, select=field, filters=filters, limit=1)
    if not rows:
        raise HTTPException(status_code=422, detail=message)


async def ensure_unique(
    schema: str,
    resource: str,
    field: str,
    value: Any,
    message: str,
) -> None:
    if value is None:
        return
    rows = await db_select(schema, resource, select=field, filters={field: f"eq.{value}"}, limit=1)
    if rows:
        raise HTTPException(status_code=409, detail=message)


async def create_auth_user(email: str, password: str, display_name: str) -> dict[str, Any]:
    response = await _request(
        "POST",
        f"{SUPABASE_URL}/auth/v1/admin/users",
        headers={
            "apikey": SUPABASE_SERVICE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "email": email,
            "password": password,
            "email_confirm": True,
            "user_metadata": {"display_name": display_name},
        },
    )
    if response.status_code >= 400:
        detail = response.text
        try:
            detail = response.json().get("msg") or response.json().get("message") or detail
        except ValueError:
            pass
        raise HTTPException(status_code=422, detail=f"Não foi possível criar o login: {detail}")
    return response.json()


async def delete_auth_user(user_id: str) -> None:
    await _request(
        "DELETE",
        f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}",
        headers={
            "apikey": SUPABASE_SERVICE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        },
    )


class Identity(BaseModel):
    auth_user_id: str
    email: str | None = None
    id: int
    papel: Literal["PACIENTE", "FISCAL_CRE", "GESTOR"]
    paciente_id: int | None = None
    profissional_saude_id: int | None = None
    cnes_vinculo: str | None = None
    nome_exibicao: str
    idioma_preferido: str = "pt-BR"


async def current_identity(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> Identity:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sessão não autenticada.")

    response = await _request(
        "GET",
        f"{SUPABASE_URL}/auth/v1/user",
        headers={
            "apikey": SUPABASE_SERVICE_KEY,
            "Authorization": f"Bearer {credentials.credentials}",
        },
    )
    if response.status_code >= 400:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido ou expirado.")

    auth_user = response.json()
    rows = await db_select(
        "app",
        "usuario_sistema",
        filters={"auth_user_id": f"eq.{auth_user['id']}", "ativo": "eq.true"},
        limit=1,
    )
    if not rows:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="O login existe, mas ainda não possui um perfil vinculado no sistema.",
        )
    row = dict(rows[0])
    row["auth_user_id"] = auth_user["id"]
    row["email"] = auth_user.get("email")
    return Identity(**row)


def require_roles(identity: Identity, *roles: str) -> None:
    if identity.papel not in roles:
        raise HTTPException(status_code=403, detail="Este perfil não possui permissão para esta operação.")


def number(value: Any) -> float:
    if value is None or value == "":
        return 0
    if isinstance(value, (int, float)):
        return value
    if isinstance(value, Decimal):
        return float(value)
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0


def date_key(value: Any) -> str:
    if not value:
        return ""
    return str(value)[:7]


# -----------------------------------------------------------------------------
# Saúde, sessão e perfil
# -----------------------------------------------------------------------------

@app.get("/")
async def root() -> dict[str, str]:
    return {"name": "UMDR API", "status": "online"}


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/me")
async def get_me(identity: Identity = Depends(current_identity)) -> dict[str, Any]:
    result = identity.model_dump(exclude={"email"})
    result["unidade_nome"] = None
    if identity.cnes_vinculo:
        units = await db_select(
            "dominio",
            "estabelecimento_cnes",
            select="nome_fantasia,razao_social",
            filters={"codigo_cnes": f"eq.{identity.cnes_vinculo}"},
            limit=1,
        )
        if units:
            result["unidade_nome"] = units[0].get("nome_fantasia") or units[0].get("razao_social")
    return result


# -----------------------------------------------------------------------------
# Página do paciente
# -----------------------------------------------------------------------------

@app.get("/api/patient/profile")
async def patient_profile(identity: Identity = Depends(current_identity)) -> dict[str, Any] | None:
    require_roles(identity, "PACIENTE")
    if not identity.paciente_id:
        return None
    rows = await db_select(
        "fila",
        "vw_paciente_perfil",
        filters={"paciente_id": f"eq.{identity.paciente_id}"},
        limit=1,
    )
    return rows[0] if rows else None


@app.get("/api/patient/orders")
async def patient_orders(identity: Identity = Depends(current_identity)) -> list[dict[str, Any]]:
    require_roles(identity, "PACIENTE")
    if not identity.paciente_id:
        return []
    return await db_select(
        "fila",
        "vw_pedido_atual",
        filters={"paciente_id": f"eq.{identity.paciente_id}"},
        order="data_solicitacao.desc",
    )


@app.get("/api/patient/orders/{request_id}/history")
async def patient_order_history(request_id: int, identity: Identity = Depends(current_identity)) -> list[dict[str, Any]]:
    require_roles(identity, "PACIENTE")
    if not identity.paciente_id:
        return []
    allowed = await db_select(
        "fila",
        "solicitacao_ortese",
        select="id",
        filters={"id": f"eq.{request_id}", "paciente_id": f"eq.{identity.paciente_id}"},
        limit=1,
    )
    if not allowed:
        raise HTTPException(status_code=404, detail="Solicitação não encontrada.")
    return await db_select(
        "fila",
        "historico_status_solicitacao",
        filters={"solicitacao_id": f"eq.{request_id}"},
        order="data_alteracao.asc",
    )


@app.get("/api/notifications")
async def notifications(identity: Identity = Depends(current_identity)) -> list[dict[str, Any]]:
    return await db_select(
        "app",
        "notificacao",
        filters={"auth_user_id": f"eq.{identity.auth_user_id}"},
        order="criado_em.desc",
        limit=20,
    )


class NotificationPatch(BaseModel):
    lida: bool


@app.patch("/api/notifications/{notification_id}")
async def patch_notification(
    notification_id: int,
    payload: NotificationPatch,
    identity: Identity = Depends(current_identity),
) -> dict[str, Any]:
    rows = await db_update(
        "app",
        "notificacao",
        {"id": f"eq.{notification_id}", "auth_user_id": f"eq.{identity.auth_user_id}"},
        {"lida": payload.lida},
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Notificação não encontrada.")
    return rows[0]


# -----------------------------------------------------------------------------
# Painel CRE: as views já deixam as respostas prontas para o frontend.
# -----------------------------------------------------------------------------

async def cre_identity(identity: Identity) -> Identity:
    require_roles(identity, "FISCAL_CRE", "GESTOR")
    return identity


@app.get("/api/cre/kpis")
async def cre_kpis(identity: Identity = Depends(current_identity)) -> dict[str, Any]:
    await cre_identity(identity)
    rows = await db_select("fila", "vw_kpi_dashboard", limit=1)
    return rows[0] if rows else {"fila_ativa": 0, "estoque_proteses": 0, "em_logistica_reversa": 0, "matchings_mes": 0}


@app.get("/api/cre/alerts")
async def cre_alerts(identity: Identity = Depends(current_identity)) -> list[dict[str, Any]]:
    await cre_identity(identity)
    return await db_select("fila", "vw_alertas_criticos", order="gerado_em.desc")


@app.get("/api/cre/recalls")
async def cre_recalls(identity: Identity = Depends(current_identity)) -> list[dict[str, Any]]:
    await cre_identity(identity)
    return await db_select("app", "recall", order="data_abertura.desc", limit=100)


@app.get("/api/cre/flow")
async def cre_flow(identity: Identity = Depends(current_identity)) -> list[dict[str, Any]]:
    await cre_identity(identity)
    return await db_select("fila", "vw_fluxo_dispositivos_mensal", order="mes.asc")


@app.get("/api/cre/patients")
async def cre_patients(identity: Identity = Depends(current_identity)) -> list[dict[str, Any]]:
    await cre_identity(identity)
    return await db_select("fila", "vw_pacientes_aguardando", order="dias_espera_efetivos.desc")


@app.get("/api/cre/lots")
async def cre_lots(identity: Identity = Depends(current_identity)) -> list[dict[str, Any]]:
    await cre_identity(identity)
    return await db_select("producao", "vw_lotes_recentes", order="data_cadastro.desc", limit=50)


@app.get("/api/cre/triages")
async def cre_triages(identity: Identity = Depends(current_identity)) -> list[dict[str, Any]]:
    await cre_identity(identity)
    return await db_select("fila", "vw_triagens", order="data_hora.desc", limit=200)


@app.get("/api/cre/shipments")
async def cre_shipments(identity: Identity = Depends(current_identity)) -> list[dict[str, Any]]:
    await cre_identity(identity)
    return await db_select("producao", "vw_remessas_logistica", order="data_criacao.desc", limit=200)


@app.get("/api/cre/reports")
async def cre_reports(identity: Identity = Depends(current_identity)) -> list[dict[str, Any]]:
    await cre_identity(identity)
    return await db_select("fila", "vw_relatorio_mensal", order="mes.asc")


# -----------------------------------------------------------------------------
# Catálogos e cadastros
# -----------------------------------------------------------------------------

@app.get("/api/admin/catalogs")
async def catalogs(identity: Identity = Depends(current_identity)) -> dict[str, Any]:
    require_roles(identity, "FISCAL_CRE", "GESTOR")
    patients, professionals, units, municipalities, procedures, diagnoses, workshops, materials, providers = await _gather_catalogs()
    return {
        "patients": patients,
        "professionals": professionals,
        "units": units,
        "municipalities": municipalities,
        "procedures": procedures,
        "diagnoses": diagnoses,
        "workshops": workshops,
        "materials": materials,
        "providers": providers,
    }


async def _gather_catalogs() -> tuple[list[dict[str, Any]], ...]:
    import asyncio

    return tuple(await asyncio.gather(
        db_select("fila", "paciente", select="id,nome_completo,cns,cpf", order="nome_completo.asc", limit=500),
        db_select("fila", "profissional_saude", select="id,nome_completo,cns,cbo,cnes_vinculo", order="nome_completo.asc", limit=500),
        db_select("dominio", "estabelecimento_cnes", select="codigo_cnes,nome_fantasia,razao_social", order="nome_fantasia.asc", limit=500),
        db_select("dominio", "municipio_ibge", select="codigo_ibge6,nome_municipio,uf_sigla", order="nome_municipio.asc", limit=1000),
        db_select("dominio", "sigtap_procedimento", select="codigo,nome_procedimento", filters={"ativo": "eq.true"}, order="nome_procedimento.asc", limit=500),
        db_select("dominio", "cid10", select="codigo,descricao", order="descricao.asc", limit=1000),
        db_select("producao", "oficina_ortopedica", select="id,cnes,nome", order="nome.asc", limit=500),
        db_select("producao", "material_estoque", select="id,oficina_id,codigo_catmat,quantidade_atual,quantidade_minima,unidade_medida", order="id.asc", limit=500),
        db_select("app", "fornecedor", order="nome.asc", limit=500),
    ))


@app.get("/api/admin/users")
async def admin_users(identity: Identity = Depends(current_identity)) -> list[dict[str, Any]]:
    require_roles(identity, "GESTOR")
    return await db_select("app", "usuario_sistema", order="nome_exibicao.asc", limit=1000)


class PatientCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    nome_completo: str
    cns: str
    cpf: str | None = None
    data_nascimento: date
    sexo: Literal["M", "F"]
    municipio_residencia_ibge6: str | None = None
    zona_residencia: Literal["URBANA", "RURAL", "RIBEIRINHA", "REMOTA"] = "URBANA"
    telefone_contato: str | None = None
    idioma_preferido: Literal["pt-BR", "en-US", "es-419"] = "pt-BR"

    @field_validator("nome_completo", mode="before")
    @classmethod
    def validate_name(cls, value: Any) -> str:
        result = clean_text(value, field="Nome completo", required=True, max_length=255)
        assert result is not None
        return result

    @field_validator("cns", mode="before")
    @classmethod
    def validate_cns(cls, value: Any) -> str:
        return normalize_cns(value)

    @field_validator("cpf", mode="before")
    @classmethod
    def validate_cpf(cls, value: Any) -> str | None:
        return normalize_cpf(value)

    @field_validator("municipio_residencia_ibge6", mode="before")
    @classmethod
    def validate_municipality(cls, value: Any) -> str | None:
        return normalize_code(value, field="Código IBGE do município", length=6, required=False)

    @field_validator("telefone_contato", mode="before")
    @classmethod
    def validate_phone(cls, value: Any) -> str | None:
        return normalize_phone(value)

    @field_validator("data_nascimento")
    @classmethod
    def validate_birth(cls, value: date) -> date:
        return validate_birth_date(value)


@app.post("/api/admin/patients", status_code=201)
async def create_patient(payload: PatientCreate, identity: Identity = Depends(current_identity)) -> dict[str, Any]:
    require_roles(identity, "GESTOR")
    await ensure_unique("fila", "paciente", "cns", payload.cns, "Já existe um paciente com este CNS.")
    await ensure_unique("fila", "paciente", "cpf", payload.cpf, "Já existe um paciente com este CPF.")
    if payload.municipio_residencia_ibge6:
        await ensure_record_exists(
            "dominio",
            "municipio_ibge",
            "codigo_ibge6",
            payload.municipio_residencia_ibge6,
            "O município informado não existe no catálogo IBGE carregado.",
        )
    patient_rows = await db_insert("fila", "paciente", {
        "cns": payload.cns,
        "cpf": payload.cpf or None,
        "nome_completo": payload.nome_completo,
        "data_nascimento": payload.data_nascimento.isoformat(),
        "sexo": payload.sexo,
        "municipio_residencia_ibge6": payload.municipio_residencia_ibge6 or None,
        "zona_residencia": payload.zona_residencia,
        "telefone_contato": payload.telefone_contato or None,
        "email_contato": payload.email,
    })
    patient = patient_rows[0]
    auth_user: dict[str, Any] | None = None
    try:
        auth_user = await create_auth_user(payload.email, payload.password, payload.nome_completo)
        profile_rows = await db_insert("app", "usuario_sistema", {
            "auth_user_id": auth_user["id"],
            "papel": "PACIENTE",
            "paciente_id": patient["id"],
            "nome_exibicao": payload.nome_completo,
            "idioma_preferido": payload.idioma_preferido,
        })
        return {"patient": patient, "profile": profile_rows[0]}
    except Exception:
        await db_delete("fila", "paciente", {"id": f"eq.{patient['id']}"})
        if auth_user:
            await delete_auth_user(auth_user["id"])
        raise


class StaffCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    nome_completo: str
    cns: str
    cpf: str | None = None
    cbo: str
    cnes_vinculo: str
    papel: Literal["FISCAL_CRE", "GESTOR"]
    numero_conselho: str | None = None
    tipo_conselho: str | None = None
    idioma_preferido: Literal["pt-BR", "en-US", "es-419"] = "pt-BR"

    @field_validator("nome_completo", mode="before")
    @classmethod
    def validate_name(cls, value: Any) -> str:
        result = clean_text(value, field="Nome completo", required=True, max_length=255)
        assert result is not None
        return result

    @field_validator("cns", mode="before")
    @classmethod
    def validate_cns(cls, value: Any) -> str:
        return normalize_cns(value)

    @field_validator("cpf", mode="before")
    @classmethod
    def validate_cpf(cls, value: Any) -> str | None:
        return normalize_cpf(value)

    @field_validator("cbo", mode="before")
    @classmethod
    def validate_cbo(cls, value: Any) -> str:
        result = normalize_code(value, field="CBO", length=6)
        assert result is not None
        return result

    @field_validator("cnes_vinculo", mode="before")
    @classmethod
    def validate_cnes(cls, value: Any) -> str:
        result = normalize_code(value, field="CNES", length=7)
        assert result is not None
        return result

    @field_validator("numero_conselho", "tipo_conselho", mode="before")
    @classmethod
    def clean_optional_fields(cls, value: Any) -> str | None:
        return clean_text(value, field="Dados do conselho", max_length=50)


@app.post("/api/admin/staff", status_code=201)
async def create_staff(payload: StaffCreate, identity: Identity = Depends(current_identity)) -> dict[str, Any]:
    require_roles(identity, "GESTOR")
    await ensure_unique("fila", "profissional_saude", "cns", payload.cns, "Já existe um profissional com este CNS.")
    await ensure_unique("fila", "profissional_saude", "cpf", payload.cpf, "Já existe um profissional com este CPF.")
    await ensure_record_exists(
        "dominio",
        "cbo",
        "codigo",
        payload.cbo,
        "O CBO informado não existe no catálogo carregado.",
    )
    await ensure_record_exists(
        "dominio",
        "estabelecimento_cnes",
        "codigo_cnes",
        payload.cnes_vinculo,
        "A unidade CNES informada não existe no catálogo carregado.",
        extra_filters={"ativo": "eq.true"},
    )
    professional_rows = await db_insert("fila", "profissional_saude", {
        "cns": payload.cns,
        "cpf": payload.cpf or None,
        "nome_completo": payload.nome_completo,
        "cbo": payload.cbo,
        "cnes_vinculo": payload.cnes_vinculo,
        "numero_conselho": payload.numero_conselho or None,
        "tipo_conselho": payload.tipo_conselho or None,
    })
    professional = professional_rows[0]
    auth_user: dict[str, Any] | None = None
    try:
        auth_user = await create_auth_user(payload.email, payload.password, payload.nome_completo)
        profile_rows = await db_insert("app", "usuario_sistema", {
            "auth_user_id": auth_user["id"],
            "papel": payload.papel,
            "profissional_saude_id": professional["id"],
            "cnes_vinculo": payload.cnes_vinculo,
            "nome_exibicao": payload.nome_completo,
            "idioma_preferido": payload.idioma_preferido,
        })
        return {"professional": professional, "profile": profile_rows[0]}
    except Exception:
        await db_delete("fila", "profissional_saude", {"id": f"eq.{professional['id']}"})
        if auth_user:
            await delete_auth_user(auth_user["id"])
        raise


class ProviderCreate(BaseModel):
    nome: str
    cnpj: str | None = None
    email: EmailStr | None = None
    telefone: str | None = None
    endereco: str | None = None
    numero_contrato: str | None = None
    valor_total: float | None = Field(default=None, ge=0)
    data_inicio: date | None = None
    data_fim: date | None = None
    sla_percentual: float | None = Field(default=None, ge=0, le=100)
    status: Literal["VIGENTE", "EM_RENOVACAO", "ENCERRADO", "CANCELADO"] = "VIGENTE"

    @field_validator("nome", mode="before")
    @classmethod
    def validate_name(cls, value: Any) -> str:
        result = clean_text(value, field="Nome do fornecedor", required=True, max_length=255)
        assert result is not None
        return result

    @field_validator("cnpj", mode="before")
    @classmethod
    def validate_cnpj(cls, value: Any) -> str | None:
        return normalize_cnpj(value)

    @field_validator("telefone", mode="before")
    @classmethod
    def validate_phone(cls, value: Any) -> str | None:
        return normalize_phone(value)

    @field_validator("endereco", mode="before")
    @classmethod
    def validate_address(cls, value: Any) -> str | None:
        return clean_text(value, field="Endereço", max_length=500)

    @field_validator("numero_contrato", mode="before")
    @classmethod
    def validate_contract_number(cls, value: Any) -> str | None:
        return clean_text(value, field="Número do contrato", max_length=100)

    @model_validator(mode="after")
    def validate_contract(self) -> "ProviderCreate":
        validate_date_range(self.data_inicio, self.data_fim, label="contrato")
        has_contract_data = any(
            value is not None
            for value in (self.valor_total, self.data_inicio, self.data_fim, self.sla_percentual)
        ) or self.status != "VIGENTE"
        if has_contract_data and not self.numero_contrato:
            raise ValueError("Informe o número do contrato para cadastrar os dados contratuais.")
        return self


@app.post("/api/admin/providers", status_code=201)
async def create_provider(payload: ProviderCreate, identity: Identity = Depends(current_identity)) -> dict[str, Any]:
    require_roles(identity, "GESTOR")
    await ensure_unique("app", "fornecedor", "cnpj", payload.cnpj, "Já existe um fornecedor com este CNPJ.")
    await ensure_unique(
        "app",
        "contrato_fornecedor",
        "numero_contrato",
        payload.numero_contrato,
        "Já existe um contrato com este número.",
    )
    provider_rows = await db_insert("app", "fornecedor", {
        "nome": payload.nome,
        "cnpj": payload.cnpj or None,
        "email": payload.email or None,
        "telefone": payload.telefone or None,
        "endereco": payload.endereco or None,
    })
    provider = provider_rows[0]
    contract = None
    try:
        if payload.numero_contrato:
            contract_rows = await db_insert("app", "contrato_fornecedor", {
                "fornecedor_id": provider["id"],
                "numero_contrato": payload.numero_contrato,
                "valor_total": payload.valor_total,
                "data_inicio": payload.data_inicio.isoformat() if payload.data_inicio else None,
                "data_fim": payload.data_fim.isoformat() if payload.data_fim else None,
                "sla_percentual": payload.sla_percentual,
                "status": payload.status,
            })
            contract = contract_rows[0]
        return {"provider": provider, "contract": contract}
    except Exception:
        await db_delete("app", "fornecedor", {"id": f"eq.{provider['id']}"})
        raise


class TriageCreate(BaseModel):
    paciente_id: int = Field(ge=1)
    procedimento_sigtap_proposto: str | None = None
    status: Literal["PENDENTE", "EM_ANDAMENTO", "CONCLUIDA", "CANCELADA"] = "PENDENTE"
    observacao_clinica: str | None = None

    @field_validator("procedimento_sigtap_proposto", mode="before")
    @classmethod
    def validate_procedure(cls, value: Any) -> str | None:
        return normalize_sigtap(value, required=False, opm_only=True)

    @field_validator("observacao_clinica", mode="before")
    @classmethod
    def validate_notes(cls, value: Any) -> str | None:
        return clean_text(value, field="Observação clínica")


@app.post("/api/cre/triages", status_code=201)
async def create_triage(payload: TriageCreate, identity: Identity = Depends(current_identity)) -> dict[str, Any]:
    require_roles(identity, "FISCAL_CRE", "GESTOR")
    if not identity.profissional_saude_id:
        raise HTTPException(status_code=422, detail="O usuário não está vinculado a um profissional de saúde.")
    await ensure_record_exists(
        "fila",
        "paciente",
        "id",
        payload.paciente_id,
        "O paciente informado não existe.",
    )
    if payload.procedimento_sigtap_proposto:
        await ensure_record_exists(
            "dominio",
            "sigtap_procedimento",
            "codigo",
            payload.procedimento_sigtap_proposto,
            "O procedimento SIGTAP informado não existe ou está inativo.",
            extra_filters={"ativo": "eq.true"},
        )
    rows = await db_insert("fila", "triagem_clinica", {
        "paciente_id": payload.paciente_id,
        "profissional_id": identity.profissional_saude_id,
        "procedimento_sigtap_proposto": payload.procedimento_sigtap_proposto or None,
        "status": payload.status,
        "observacao_clinica": payload.observacao_clinica or None,
    })
    return rows[0]


class ShipmentCreate(BaseModel):
    oficina_id: int = Field(ge=1)
    tipo_dispositivo: str
    quantidade: int = Field(default=1, ge=1)
    fabricante_destino: str
    endereco_destino: str | None = None
    codigo_rastreio: str | None = None
    status: Literal["AGUARDANDO_COLETA", "EM_TRANSITO", "ENTREGUE"] = "AGUARDANDO_COLETA"

    @field_validator("tipo_dispositivo", mode="before")
    @classmethod
    def validate_device_type(cls, value: Any) -> str:
        result = clean_text(value, field="Tipo de dispositivo", required=True, max_length=100)
        assert result is not None
        return result

    @field_validator("fabricante_destino", mode="before")
    @classmethod
    def validate_manufacturer(cls, value: Any) -> str:
        result = clean_text(value, field="Fabricante de destino", required=True, max_length=255)
        assert result is not None
        return result

    @field_validator("endereco_destino", mode="before")
    @classmethod
    def validate_destination(cls, value: Any) -> str | None:
        return clean_text(value, field="Endereço de destino", max_length=500)

    @field_validator("codigo_rastreio", mode="before")
    @classmethod
    def validate_tracking(cls, value: Any) -> str | None:
        return clean_text(value, field="Código de rastreio", max_length=100)


@app.post("/api/cre/shipments", status_code=201)
async def create_shipment(payload: ShipmentCreate, identity: Identity = Depends(current_identity)) -> dict[str, Any]:
    require_roles(identity, "FISCAL_CRE", "GESTOR")
    await ensure_record_exists(
        "producao",
        "oficina_ortopedica",
        "id",
        payload.oficina_id,
        "A oficina informada não existe ou está inativa.",
        extra_filters={"ativo": "eq.true"},
    )
    rows = await db_insert("producao", "remessa_logistica_reversa", payload.model_dump())
    return rows[0]


class RequestCreate(BaseModel):
    paciente_id: int = Field(ge=1)
    procedimento_sigtap: str
    cid10_codigo: str
    justificativa_clinica: str
    lado_acometido: Literal["DIREITO", "ESQUERDO", "BILATERAL", "NAO_APLICAVEL"] | None = None
    prioridade_clinica: Literal["ROTINA", "PRIORITARIO", "URGENTE"] = "ROTINA"
    distancia_estimada_cre_km: float | None = Field(default=None, ge=0)

    @field_validator("procedimento_sigtap", mode="before")
    @classmethod
    def validate_procedure(cls, value: Any) -> str:
        result = normalize_sigtap(value, opm_only=True)
        assert result is not None
        return result

    @field_validator("cid10_codigo", mode="before")
    @classmethod
    def validate_diagnosis(cls, value: Any) -> str:
        return normalize_cid10(value)

    @field_validator("justificativa_clinica", mode="before")
    @classmethod
    def validate_justification(cls, value: Any) -> str:
        result = clean_text(value, field="Justificativa clínica", required=True)
        assert result is not None
        return result


@app.post("/api/cre/requests", status_code=201)
async def create_request(payload: RequestCreate, identity: Identity = Depends(current_identity)) -> dict[str, Any]:
    require_roles(identity, "FISCAL_CRE", "GESTOR")
    if not identity.profissional_saude_id or not identity.cnes_vinculo:
        raise HTTPException(status_code=422, detail="O usuário precisa estar vinculado a um profissional e a uma unidade CNES.")
    await ensure_record_exists(
        "fila",
        "paciente",
        "id",
        payload.paciente_id,
        "O paciente informado não existe.",
    )
    await ensure_record_exists(
        "dominio",
        "sigtap_procedimento",
        "codigo",
        payload.procedimento_sigtap,
        "O procedimento SIGTAP informado não existe ou está inativo.",
        extra_filters={"ativo": "eq.true"},
    )
    await ensure_record_exists(
        "dominio",
        "cid10",
        "codigo",
        payload.cid10_codigo,
        "O diagnóstico CID-10 informado não existe no catálogo carregado.",
    )
    requests = await db_insert("fila", "solicitacao_ortese", {
        "paciente_id": payload.paciente_id,
        "procedimento_sigtap": payload.procedimento_sigtap,
        "cid10_codigo": payload.cid10_codigo,
        "profissional_solicitante_id": identity.profissional_saude_id,
        "estabelecimento_solicitante_cnes": identity.cnes_vinculo,
        "justificativa_clinica": payload.justificativa_clinica,
        "lado_acometido": payload.lado_acometido or None,
        "prioridade_clinica": payload.prioridade_clinica,
        "distancia_estimada_cre_km": payload.distancia_estimada_cre_km,
        "status": "EM_FILA",
    })
    request_row = requests[0]
    await db_insert("fila", "fila_espera", {"solicitacao_id": request_row["id"]})
    await db_insert("fila", "historico_status_solicitacao", {
        "solicitacao_id": request_row["id"],
        "status_anterior": None,
        "status_novo": "EM_FILA",
        "usuario_responsavel": identity.auth_user_id,
        "observacao": "Solicitação cadastrada pelo portal UMDR.",
    })
    return request_row


# -----------------------------------------------------------------------------
# Painel gestor. A agregação é feita aqui para o banco continuar simples.
# -----------------------------------------------------------------------------

@app.get("/api/manager/dashboard")
async def manager_dashboard(identity: Identity = Depends(current_identity)) -> dict[str, Any]:
    """Entrega os dados consolidados usados pela interface padrão do gestor.

    A rota continua deliberadamente simples: lê as tabelas do Supabase,
    agrega os valores necessários para os gráficos e devolve JSON ao frontend.
    """
    require_roles(identity, "GESTOR")
    import asyncio

    (
        units,
        patients,
        requests,
        queue,
        orders,
        deliveries,
        stock,
        shipments,
        recalls,
        providers,
        contracts,
        reports,
        municipalities,
        workshops,
        products,
        procedures,
        payments,
        partnerships,
        bpa_rows,
        apac_rows,
    ) = await asyncio.gather(
        db_select(
            "dominio",
            "estabelecimento_cnes",
            select="codigo_cnes,municipio_ibge6,razao_social,nome_fantasia,tipo_estabelecimento,habilitado_opm,ativo",
        ),
        db_select("fila", "paciente", select="id,municipio_residencia_ibge6,zona_residencia,data_cadastro,cns"),
        db_select(
            "fila",
            "solicitacao_ortese",
            select="id,status,data_solicitacao,estabelecimento_solicitante_cnes,paciente_id,procedimento_sigtap,prioridade_clinica,distancia_estimada_cre_km",
        ),
        db_select(
            "fila",
            "fila_espera",
            select="id,solicitacao_id,data_entrada_fila,data_prevista_atendimento,data_saida_fila,posicao_prioridade,clock_pausado",
        ),
        db_select(
            "producao",
            "ordem_producao",
            select="id,solicitacao_id,oficina_id,produto_id,status,data_abertura,data_prevista_entrega,data_conclusao",
        ),
        db_select(
            "producao",
            "entrega_ortese",
            select="id,ordem_producao_id,data_entrega,termo_recebimento_assinado",
        ),
        db_select(
            "producao",
            "material_estoque",
            select="id,oficina_id,codigo_catmat,quantidade_atual,quantidade_minima,custo_unitario_medio",
        ),
        db_select(
            "producao",
            "remessa_logistica_reversa",
            select="id,oficina_id,status,quantidade,data_criacao,codigo_rastreio,tipo_dispositivo,fabricante_destino",
        ),
        db_select("app", "recall", order="data_abertura.desc", limit=100),
        db_select("app", "fornecedor", order="nome.asc"),
        db_select("app", "contrato_fornecedor", order="data_fim.desc"),
        db_select("app", "relatorio_gerado", order="gerado_em.desc", limit=100),
        db_select("dominio", "municipio_ibge", select="codigo_ibge6,uf_sigla,nome_municipio"),
        db_select(
            "producao",
            "oficina_ortopedica",
            select="id,cnes,nome,capacidade_producao_mensal,ativo",
        ),
        db_select("producao", "produto_ortese", select="id,procedimento_sigtap,nome_produto"),
        db_select("dominio", "sigtap_procedimento", select="codigo,nome_procedimento"),
        db_select(
            "faturamento",
            "guia_pagamento",
            select="id,bpa_individualizado_id,apac_id,competencia_faturamento,valor_procedimento,status_pagamento,data_processamento_datasus",
        ),
        db_select("app", "parceria_ong", select="id,oficina_id,nome_ong,tipo_parceria,data_inicio,data_fim,ativa"),
        db_select("faturamento", "bpa_individualizado", select="id,codigo_procedimento"),
        db_select("faturamento", "apac", select="id,procedimento_sigtap"),
    )

    region_by_uf = {
        "AC": "N", "AP": "N", "AM": "N", "PA": "N", "RO": "N", "RR": "N", "TO": "N",
        "AL": "NE", "BA": "NE", "CE": "NE", "MA": "NE", "PB": "NE", "PE": "NE", "PI": "NE", "RN": "NE", "SE": "NE",
        "DF": "CO", "GO": "CO", "MT": "CO", "MS": "CO",
        "ES": "SE", "MG": "SE", "RJ": "SE", "SP": "SE",
        "PR": "S", "RS": "S", "SC": "S",
    }
    region_order = ["N", "NE", "CO", "SE", "S", "—"]
    municipality_to_uf = {item.get("codigo_ibge6"): item.get("uf_sigla") or "—" for item in municipalities}
    municipality_to_region = {
        code: region_by_uf.get(uf, "—") for code, uf in municipality_to_uf.items()
    }
    unit_to_region = {
        item.get("codigo_cnes"): municipality_to_region.get(item.get("municipio_ibge6"), "—")
        for item in units
    }
    patient_to_region = {
        item.get("id"): municipality_to_region.get(item.get("municipio_residencia_ibge6"), "—")
        for item in patients
    }
    patient_to_zone = {
        item.get("id"): (item.get("zona_residencia") or "URBANA")
        for item in patients
    }
    workshop_by_id = {item.get("id"): item for item in workshops}
    workshop_to_region = {
        item.get("id"): unit_to_region.get(item.get("cnes"), "—") for item in workshops
    }
    product_by_id = {item.get("id"): item for item in products}
    procedure_name = {item.get("codigo"): item.get("nome_procedimento") or "" for item in procedures}
    request_by_id = {item.get("id"): item for item in requests}
    order_by_id = {item.get("id"): item for item in orders}
    delivery_by_order = {item.get("ordem_producao_id"): item for item in deliveries}

    active_recalls = [item for item in recalls if item.get("status") not in {"ENCERRADO", "CANCELADO"}]
    active_orders = [item for item in orders if item.get("status") not in {"ENTREGUE", "CANCELADA"}]
    active_units = [item for item in units if item.get("ativo") is not False]
    low_stock = [item for item in stock if number(item.get("quantidade_atual")) <= number(item.get("quantidade_minima"))]
    active_shipments = [item for item in shipments if item.get("status") != "ENTREGUE"]

    completed_orders = [item for item in orders if item.get("status") == "ENTREGUE" or item.get("id") in delivery_by_order]
    signed_deliveries = [item for item in deliveries if item.get("termo_recebimento_assinado") is True]
    cancelled_requests = [item for item in requests if item.get("status") in {"CANCELADA", "NEGADA"}]
    delivered_requests = [item for item in requests if item.get("status") == "ENTREGUE"]

    conformity_rate = round(100 * (len(requests) - len(cancelled_requests)) / len(requests), 1) if requests else 0
    efficiency_rate = round(100 * len(delivered_requests) / len(requests), 1) if requests else 0
    summary = {
        "conformity_rate": conformity_rate,
        "efficiency_rate": efficiency_rate,
        "active_units": len(active_units),
        "patients": len(patients),
        "active_recalls": len(active_recalls),
        "logistics_alerts": len(active_shipments) + len(low_stock),
        "active_devices": len(active_orders),
        "delivered_requests": len(deliveries),
    }

    # Série mensal dos últimos 12 meses.
    months: dict[str, dict[str, Any]] = {}
    today = date.today()
    for offset in range(11, -1, -1):
        year = today.year
        month = today.month - offset
        while month <= 0:
            year -= 1
            month += 12
        key = f"{year:04d}-{month:02d}"
        months[key] = {"month": key, "requests": 0, "deliveries": 0, "cancelled": 0}
    for item in requests:
        key = date_key(item.get("data_solicitacao"))
        if key in months:
            months[key]["requests"] += 1
            if item.get("status") in {"CANCELADA", "NEGADA"}:
                months[key]["cancelled"] += 1
    for item in deliveries:
        key = date_key(item.get("data_entrega"))
        if key in months:
            months[key]["deliveries"] += 1
    monthly = list(months.values())
    health = []
    for row in monthly[-6:]:
        request_count = int(row["requests"])
        health.append({
            "month": row["month"],
            "conformity": round(100 * (request_count - int(row["cancelled"])) / request_count, 1) if request_count else 0,
            "efficiency": round(min(100 * int(row["deliveries"]) / request_count, 100), 1) if request_count else 0,
        })

    # Estoque, fila e trânsito por macrorregião.
    regional_map: dict[str, dict[str, Any]] = defaultdict(lambda: {"stock": 0, "queue": 0, "transit": 0, "units": 0})
    for unit in active_units:
        regional_map[unit_to_region.get(unit.get("codigo_cnes"), "—")]["units"] += 1
    for item in queue:
        request_item = request_by_id.get(item.get("solicitacao_id"), {})
        region = unit_to_region.get(request_item.get("estabelecimento_solicitante_cnes")) or patient_to_region.get(request_item.get("paciente_id")) or "—"
        if not item.get("data_saida_fila"):
            regional_map[region]["queue"] += 1
    for item in stock:
        region = workshop_to_region.get(item.get("oficina_id"), "—")
        regional_map[region]["stock"] += number(item.get("quantidade_atual"))
    for item in shipments:
        if item.get("status") != "ENTREGUE":
            region = workshop_to_region.get(item.get("oficina_id"), "—")
            regional_map[region]["transit"] += number(item.get("quantidade"))
    regional = [
        {"region": region, **regional_map[region]}
        for region in region_order
        if region in regional_map
    ]

    # Distribuição de pacientes por tipo de zona, como na interface padrão.
    zone_order = ["URBANA", "RURAL", "RIBEIRINHA", "REMOTA"]
    access_counts = Counter(patient_to_zone.get(item.get("id"), "URBANA") for item in patients)
    total_access = sum(access_counts.values())
    access_distribution = [
        {
            "name": zone,
            "value": round(100 * access_counts.get(zone, 0) / total_access, 1) if total_access else 0,
            "count": access_counts.get(zone, 0),
        }
        for zone in zone_order
    ]

    logistics_counter: dict[str, dict[str, float]] = defaultdict(lambda: {"count": 0, "devices": 0})
    for item in shipments:
        key = item.get("status") or "PENDENTE"
        logistics_counter[key]["count"] += 1
        logistics_counter[key]["devices"] += number(item.get("quantidade"))
    logistics = [{"status": key, **values} for key, values in logistics_counter.items()]

    contracts_by_provider: dict[Any, dict[str, Any]] = {}
    for item in contracts:
        provider_id = item.get("fornecedor_id")
        if provider_id not in contracts_by_provider:
            contracts_by_provider[provider_id] = item
    provider_rows = []
    for provider in providers:
        contract = contracts_by_provider.get(provider.get("id"), {})
        provider_rows.append({
            "id": provider.get("id"),
            "nome": provider.get("nome"),
            "numero_contrato": contract.get("numero_contrato"),
            "valor_total": contract.get("valor_total"),
            "data_inicio": contract.get("data_inicio"),
            "data_fim": contract.get("data_fim"),
            "status": contract.get("status") or ("ATIVO" if provider.get("ativo", True) else "INATIVO"),
            "sla_percentual": contract.get("sla_percentual"),
        })

    # Tempo de espera por região e pontos individuais de distância x espera.
    wait_days: dict[str, list[float]] = defaultdict(list)
    equity_points: list[dict[str, Any]] = []
    now = datetime.now()
    for item in queue:
        request_item = request_by_id.get(item.get("solicitacao_id"), {})
        patient_id = request_item.get("paciente_id")
        region = unit_to_region.get(request_item.get("estabelecimento_solicitante_cnes")) or patient_to_region.get(patient_id) or "—"
        start_raw = item.get("data_entrada_fila")
        end_raw = item.get("data_saida_fila")
        if not start_raw:
            continue
        try:
            start = datetime.fromisoformat(str(start_raw).replace("Z", "+00:00")).replace(tzinfo=None)
            end_date = datetime.fromisoformat(str(end_raw).replace("Z", "+00:00")).replace(tzinfo=None) if end_raw else now
            elapsed = max((end_date - start).total_seconds() / 86400, 0)
        except ValueError:
            continue
        wait_days[region].append(elapsed)
        distance = request_item.get("distancia_estimada_cre_km")
        if distance is not None:
            equity_points.append({
                "region": region,
                "zone": patient_to_zone.get(patient_id, "URBANA"),
                "distance_km": round(number(distance), 2),
                "wait_days": round(elapsed, 1),
            })
    equity = [
        {"region": region, "average_wait_days": round(sum(values) / len(values), 1), "queue_records": len(values)}
        for region, values in sorted(wait_days.items())
        if values
    ]

    # Indicadores de conformidade derivados de registros reais.
    payment_ok = [item for item in payments if item.get("status_pagamento") in {"PAGO", "APROVADO"}]
    on_time_orders = []
    for item in completed_orders:
        deadline = item.get("data_prevista_entrega")
        delivered = delivery_by_order.get(item.get("id"), {}).get("data_entrega") or item.get("data_conclusao")
        if not deadline or not delivered or str(delivered)[:10] <= str(deadline)[:10]:
            on_time_orders.append(item)
    compliance_scores = {
        "inventory": round(100 * (len(stock) - len(low_stock)) / len(stock), 1) if stock else 0,
        "privacy": round(100 * sum(1 for item in patients if item.get("cns")) / len(patients), 1) if patients else 0,
        "billing": round(100 * len(payment_ok) / len(payments), 1) if payments else 0,
        "traceability": round(100 * sum(1 for item in orders if item.get("solicitacao_id") and item.get("produto_id")) / len(orders), 1) if orders else 0,
        "delivery_docs": round(100 * len(signed_deliveries) / len(deliveries), 1) if deliveries else 0,
        "sla": round(100 * len(on_time_orders) / len(completed_orders), 1) if completed_orders else 0,
    }
    compliance = []
    for key, score in compliance_scores.items():
        status_value = "pass" if score >= 90 else "warning" if score >= 75 else "fail"
        compliance.append({"key": key, "status": status_value, "score": score})

    # Alertas nacionais estruturados para o frontend traduzir.
    alerts: list[dict[str, Any]] = []
    for item in active_recalls[:3]:
        alerts.append({
            "kind": "recall",
            "severity": "critical",
            "code": item.get("codigo_lote"),
            "product": item.get("nome_produto"),
            "date": item.get("data_abertura"),
            "status": item.get("status"),
        })
    for item in low_stock[:3]:
        alerts.append({
            "kind": "low_stock",
            "severity": "warning",
            "code": item.get("codigo_catmat"),
            "current": number(item.get("quantidade_atual")),
            "minimum": number(item.get("quantidade_minima")),
        })
    if active_shipments:
        alerts.append({
            "kind": "shipment",
            "severity": "warning",
            "count": len(active_shipments),
            "devices": int(sum(number(item.get("quantidade")) for item in active_shipments)),
        })
    if reports:
        alerts.append({
            "kind": "report",
            "severity": "info",
            "name": reports[0].get("nome"),
            "date": reports[0].get("gerado_em"),
        })

    # Previsão simples de carga para os próximos seis meses, baseada na média real dos seis anteriores.
    request_type_counts: dict[str, dict[str, int]] = defaultdict(lambda: {"orthoses": 0, "prostheses": 0})
    for item in requests:
        month_key = date_key(item.get("data_solicitacao"))
        name = str(procedure_name.get(item.get("procedimento_sigtap"), "")).upper()
        category = "prostheses" if "PROTESE" in name or "PRÓTESE" in name else "orthoses"
        request_type_counts[month_key][category] += 1
    past_keys = [row["month"] for row in monthly[-6:]]
    avg_orthoses = round(sum(request_type_counts[key]["orthoses"] for key in past_keys) / max(len(past_keys), 1))
    avg_prostheses = round(sum(request_type_counts[key]["prostheses"] for key in past_keys) / max(len(past_keys), 1))
    maintenance_forecast = []
    for offset in range(1, 7):
        year = today.year
        month = today.month + offset
        while month > 12:
            year += 1
            month -= 12
        seasonal = 1 + ((offset % 3) - 1) * 0.04
        maintenance_forecast.append({
            "month": f"{year:04d}-{month:02d}",
            "orthoses": max(round(avg_orthoses * seasonal), 0),
            "prostheses": max(round(avg_prostheses * seasonal), 0),
        })

    lifecycle_alerts: list[dict[str, Any]] = []
    for item in active_recalls:
        lifecycle_alerts.append({
            "id": f"REC-{item.get('id')}",
            "patient": "—",
            "date": item.get("data_abertura"),
            "type": "recall",
            "status": item.get("status"),
            "description": item.get("nome_produto"),
        })
    for item in active_orders:
        deadline = item.get("data_prevista_entrega")
        if deadline and str(deadline)[:10] < today.isoformat():
            request_item = request_by_id.get(item.get("solicitacao_id"), {})
            lifecycle_alerts.append({
                "id": f"OP-{item.get('id')}",
                "patient": f"PAC-{request_item.get('paciente_id') or '—'}",
                "date": deadline,
                "type": "overdue",
                "status": item.get("status"),
                "description": product_by_id.get(item.get("produto_id"), {}).get("nome_produto"),
            })
    lifecycle_alerts = lifecycle_alerts[:100]

    # Capacidade das oficinas/CREs e uso atual.
    active_orders_by_workshop = Counter(item.get("oficina_id") for item in active_orders)
    queue_by_cnes = Counter()
    for item in queue:
        if item.get("data_saida_fila"):
            continue
        request_item = request_by_id.get(item.get("solicitacao_id"), {})
        queue_by_cnes[request_item.get("estabelecimento_solicitante_cnes")] += 1
    shipments_by_workshop = Counter(item.get("oficina_id") for item in active_shipments)
    ngos_by_workshop = Counter(item.get("oficina_id") for item in partnerships if item.get("ativa") is not False)
    centers = []
    for workshop in workshops:
        capacity = int(number(workshop.get("capacidade_producao_mensal")))
        active_count = active_orders_by_workshop.get(workshop.get("id"), 0)
        centers.append({
            "id": workshop.get("id"),
            "name": workshop.get("nome"),
            "cnes": workshop.get("cnes"),
            "region": workshop_to_region.get(workshop.get("id"), "—"),
            "capacity": capacity,
            "capacity_used": round(min(100 * active_count / capacity, 100), 1) if capacity else 0,
            "queue": queue_by_cnes.get(workshop.get("cnes"), 0),
            "active_shipments": shipments_by_workshop.get(workshop.get("id"), 0),
            "ngo_partners": ngos_by_workshop.get(workshop.get("id"), 0),
            "active": workshop.get("ativo") is not False,
        })

    # Série financeira por tipo de tecnologia assistiva, preservando o gráfico padrão.
    finance_months: dict[str, dict[str, Any]] = {}
    for row in monthly[-6:]:
        key = str(row["month"])
        finance_months[key] = {"month": key, "prostheses": 0, "orthoses": 0, "wheelchairs": 0, "hearing": 0}
    bpa_procedure = {item.get("id"): item.get("codigo_procedimento") for item in bpa_rows}
    apac_procedure = {item.get("id"): item.get("procedimento_sigtap") for item in apac_rows}
    for item in payments:
        raw = str(item.get("competencia_faturamento") or "")
        key = f"{raw[:4]}-{raw[4:6]}" if len(raw) >= 6 else ""
        if key not in finance_months:
            continue
        code = bpa_procedure.get(item.get("bpa_individualizado_id")) or apac_procedure.get(item.get("apac_id"))
        name = str(procedure_name.get(code, "")).upper()
        amount = number(item.get("valor_procedimento"))
        if "AUDIT" in name or "AUDITIVO" in name:
            category = "hearing"
        elif "CADEIRA" in name or "RODAS" in name:
            category = "wheelchairs"
        elif "PROTESE" in name or "PRÓTESE" in name:
            category = "prostheses"
        else:
            category = "orthoses"
        finance_months[key][category] += amount


    return {
        "summary": summary,
        "monthly": monthly,
        "health": health,
        "regional": regional,
        "access_distribution": access_distribution,
        "alerts": alerts,
        "compliance": compliance,
        "maintenance_forecast": maintenance_forecast,
        "lifecycle_alerts": lifecycle_alerts,
        "logistics": logistics,
        "centers": centers,
        "finance_monthly": list(finance_months.values()),
        "providers": provider_rows,
        "equity": equity,
        "equity_points": equity_points,
        "recalls": recalls,
        "reports": reports,
        "generated_at": datetime.now().isoformat(),
    }
