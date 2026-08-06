from __future__ import annotations

from datetime import date
import re
from typing import Any

from fastapi import HTTPException


_WHITESPACE = re.compile(r"\s+")


def clean_text(value: Any, *, field: str, required: bool = False, max_length: int | None = None) -> str | None:
    if value is None:
        if required:
            raise ValueError(f"{field} é obrigatório.")
        return None
    text = _WHITESPACE.sub(" ", str(value).strip())
    if not text:
        if required:
            raise ValueError(f"{field} é obrigatório.")
        return None
    if max_length is not None and len(text) > max_length:
        raise ValueError(f"{field} deve ter no máximo {max_length} caracteres.")
    return text


def digits_only(value: Any, *, field: str, length: int, required: bool = True) -> str | None:
    if value is None or str(value).strip() == "":
        if required:
            raise ValueError(f"{field} é obrigatório.")
        return None
    digits = re.sub(r"\D", "", str(value))
    if len(digits) != length:
        raise ValueError(f"{field} deve conter exatamente {length} dígitos.")
    return digits


def normalize_cpf(value: Any, *, required: bool = False) -> str | None:
    cpf = digits_only(value, field="CPF", length=11, required=required)
    if cpf is None:
        return None
    if len(set(cpf)) == 1:
        raise ValueError("CPF inválido.")

    numbers = [int(char) for char in cpf]
    for index, weights in (
        (9, range(10, 1, -1)),
        (10, range(11, 1, -1)),
    ):
        total = sum(numbers[position] * weight for position, weight in enumerate(weights))
        remainder = total % 11
        expected = 0 if remainder < 2 else 11 - remainder
        if numbers[index] != expected:
            raise ValueError("CPF inválido.")
    return cpf


def normalize_cnpj(value: Any, *, required: bool = False) -> str | None:
    cnpj = digits_only(value, field="CNPJ", length=14, required=required)
    if cnpj is None:
        return None
    if len(set(cnpj)) == 1:
        raise ValueError("CNPJ inválido.")

    numbers = [int(char) for char in cnpj]
    checks = (
        (12, (5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2)),
        (13, (6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2)),
    )
    for index, weights in checks:
        total = sum(numbers[position] * weight for position, weight in enumerate(weights))
        remainder = total % 11
        expected = 0 if remainder < 2 else 11 - remainder
        if numbers[index] != expected:
            raise ValueError("CNPJ inválido.")
    return cnpj


def normalize_cns(value: Any) -> str:
    cns = digits_only(value, field="CNS", length=15, required=True)
    assert cns is not None
    if cns[0] not in "12789" or len(set(cns)) == 1:
        raise ValueError("CNS inválido.")
    weighted_sum = sum(int(digit) * weight for digit, weight in zip(cns, range(15, 0, -1)))
    if weighted_sum % 11 != 0:
        raise ValueError("CNS inválido.")
    return cns


def normalize_phone(value: Any) -> str | None:
    if value is None or str(value).strip() == "":
        return None
    digits = re.sub(r"\D", "", str(value))
    if not 10 <= len(digits) <= 13:
        raise ValueError("Telefone deve conter entre 10 e 13 dígitos, incluindo eventual código do país.")
    return digits


def normalize_code(value: Any, *, field: str, length: int, required: bool = True) -> str | None:
    return digits_only(value, field=field, length=length, required=required)


def normalize_cid10(value: Any) -> str:
    if value is None:
        raise ValueError("CID-10 é obrigatório.")
    code = re.sub(r"[^A-Za-z0-9]", "", str(value)).upper()
    if not re.fullmatch(r"[A-Z][0-9]{3}", code):
        raise ValueError("CID-10 deve ter uma letra seguida de três dígitos.")
    return code


def normalize_sigtap(value: Any, *, required: bool = True, opm_only: bool = False) -> str | None:
    code = normalize_code(value, field="Código SIGTAP", length=10, required=required)
    if code is not None and opm_only and not code.startswith("0701"):
        raise ValueError("O procedimento deve pertencer ao grupo SIGTAP 0701 de OPM não cirúrgica.")
    return code


def validate_birth_date(value: date) -> date:
    today = date.today()
    if value > today:
        raise ValueError("A data de nascimento não pode estar no futuro.")
    years = today.year - value.year - ((today.month, today.day) < (value.month, value.day))
    if years > 130:
        raise ValueError("A data de nascimento informada é inválida.")
    return value


def validate_date_range(start: date | None, end: date | None, *, label: str = "período") -> None:
    if start and end and end < start:
        raise ValueError(f"A data final do {label} não pode ser anterior à data inicial.")


def conflict(message: str) -> HTTPException:
    return HTTPException(status_code=409, detail=message)
