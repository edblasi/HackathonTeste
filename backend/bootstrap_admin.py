from __future__ import annotations

import argparse
import os
import sys

import httpx
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")


def fail(message: str) -> None:
    print(message, file=sys.stderr)
    raise SystemExit(1)


def request(method: str, path: str, *, schema: str | None = None, body=None, params=None):
    headers = {
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    if schema:
        headers["Accept-Profile"] = schema
        headers["Content-Profile"] = schema
        headers["Prefer"] = "return=representation"
    response = httpx.request(method, f"{SUPABASE_URL}{path}", headers=headers, json=body, params=params, timeout=30)
    if response.status_code >= 400:
        fail(f"Erro {response.status_code}: {response.text}")
    return response.json() if response.content else None


def main() -> None:
    parser = argparse.ArgumentParser(description="Cria o primeiro gestor do UMDR.")
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--name", required=True)
    parser.add_argument("--professional-id", type=int, default=2, help="ID do profissional seed (padrão: 2)")
    parser.add_argument("--cnes", default="2077500", help="CNES seed da oficina central")
    args = parser.parse_args()

    if not SUPABASE_URL or not SERVICE_KEY:
        fail("Defina SUPABASE_URL e SUPABASE_SERVICE_KEY no backend/.env.")

    existing = request(
        "GET",
        "/rest/v1/usuario_sistema",
        schema="app",
        params={"select": "id", "papel": "eq.GESTOR", "limit": "1"},
    )
    if existing:
        fail("Já existe um gestor cadastrado. Use o painel para criar novos usuários.")

    auth_user = request(
        "POST",
        "/auth/v1/admin/users",
        body={
            "email": args.email,
            "password": args.password,
            "email_confirm": True,
            "user_metadata": {"display_name": args.name},
        },
    )

    try:
        profile = request(
            "POST",
            "/rest/v1/usuario_sistema",
            schema="app",
            body={
                "auth_user_id": auth_user["id"],
                "papel": "GESTOR",
                "profissional_saude_id": args.professional_id,
                "cnes_vinculo": args.cnes,
                "nome_exibicao": args.name,
                "idioma_preferido": "pt-BR",
            },
        )
    except SystemExit:
        request("DELETE", f"/auth/v1/admin/users/{auth_user['id']}")
        raise

    print(f"Gestor criado: {profile[0]['nome_exibicao']} <{args.email}>")


if __name__ == "__main__":
    main()
