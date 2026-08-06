# UMDR — Unified Medical Device Registry

Projeto integrado com quatro páginas funcionais:

- login e verificação do paciente;
- portal do paciente;
- painel CRE;
- painel nacional do gestor.

O frontend preserva a estrutura React/Vite e o mecanismo de i18n já existente em `frontend/src/i18n`, com traduções em português (`pt-BR`), inglês (`en-US`) e espanhol (`es-419`). O Supabase no navegador é usado somente para autenticação. As consultas e os cadastros passam pelo backend FastAPI.

## Estrutura

```text
SiteSUS/
├── backend/
│   ├── main.py
│   ├── bootstrap_admin.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   ├── package.json
│   ├── Dockerfile
│   └── .env.example
├── supabase/
│   └── schema.sql
└── docker-compose.yml
```

## 1. Criar o banco

Use um projeto Supabase vazio. No **SQL Editor**, execute todo o arquivo:

```text
supabase/schema.sql
```

O script cria os schemas, tabelas, funções, políticas, views, índices e dados demonstrativos necessários às telas.

### Expor os schemas ao PostgREST

No Supabase, abra **Project Settings → API → Exposed schemas** e mantenha `public`, adicionando:

```text
app, dominio, fila, producao, faturamento
```

Essa configuração é necessária porque o backend usa a API REST do próprio Supabase para consultar esses schemas.

## 2. Configurar o backend

Copie `backend/.env.example` para `backend/.env` e preencha:

```env
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_SERVICE_KEY=SUA_CHAVE_SERVICE_ROLE
CORS_ORIGINS=http://localhost:5173,http://localhost:8080,https://seu-frontend.com
```

A chave `service_role` deve existir apenas no backend e nunca deve ser publicada no frontend.

### Criar o primeiro gestor

Depois de executar o SQL, instale as dependências e rode o bootstrap uma única vez:

```bash
cd backend
python -m venv .venv
# Linux/macOS
source .venv/bin/activate
# Windows PowerShell
# .venv\Scripts\Activate.ps1

pip install -r requirements.txt
python bootstrap_admin.py --email gestor@exemplo.com --password "TroqueEstaSenha123!" --name "Gestor Nacional"
```

O script vincula o primeiro login ao profissional demonstrativo do banco. Depois disso, novos pacientes, profissionais, gestores, fiscais CRE, fornecedores e solicitações podem ser cadastrados pelo painel do gestor.

### Executar localmente

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Teste de saúde:

```text
http://localhost:8000/health
```

## 3. Configurar o frontend

Copie `frontend/.env.example` para `frontend/.env` e preencha:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_ANON_PUBLICA
VITE_API_URL=
```

Depois:

```bash
cd frontend
npm ci
npm run dev
```

Acesse `http://localhost:5173`. No modo de desenvolvimento, quando `VITE_API_URL` estiver vazio, o frontend usa `http://localhost:8000` automaticamente.

## 4. Implantação

### Docker Compose

Com os dois arquivos `.env` preenchidos:

```bash
docker compose up --build -d
```

- aplicação completa: `http://localhost:8080`
- backend direto, para diagnóstico: `http://localhost:8000`

No Docker Compose, o Nginx encaminha `/api` internamente para o backend, então `VITE_API_URL` pode permanecer vazio. Para publicar frontend e backend em serviços separados, defina `VITE_API_URL` com a URL HTTPS pública do backend antes do build e ajuste `CORS_ORIGINS` com o domínio público do frontend.

### Serviços separados

O backend pode ser publicado a partir da pasta `backend` em serviços compatíveis com Docker ou Python. O comando de inicialização é:

```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

O frontend pode ser publicado a partir da pasta `frontend` em Vercel, Netlify, Cloudflare Pages, GitHub Pages ou qualquer hospedagem estática. Comando de build:

```bash
npm ci && npm run build
```

Diretório de saída: `frontend/dist`.

## Rotas do frontend

O projeto usa `HashRouter`, evitando configuração especial de redirecionamento na hospedagem:

- `/#/login`
- `/#/` — paciente
- `/#/cre` — fiscal CRE ou gestor
- `/#/manager` — gestor

Após o login, o papel registrado em `app.usuario_sistema` define automaticamente a página correta.

## Cadastros disponíveis

No painel do gestor, em **Cadastros**, é possível criar:

- paciente com login;
- profissional/fiscal CRE/gestor com login;
- fornecedor e contrato;
- solicitação de órtese para paciente existente.

O backend também disponibiliza endpoints simples para triagens e remessas de logística reversa.

## QR Code

O componente visual de QR Code continua propositalmente demonstrativo. Ele não gera, assina nem valida códigos reais, conforme o escopo do projeto.

## Segurança essencial

- Nunca coloque `SUPABASE_SERVICE_KEY` no frontend.
- Troque as credenciais demonstrativas antes de publicar.
- Restrinja `CORS_ORIGINS` aos domínios reais em produção.
- Se este projeto for compartilhado publicamente, rotacione qualquer chave que tenha sido incluída em arquivos `.env`.
