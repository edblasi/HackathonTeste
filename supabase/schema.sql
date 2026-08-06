-- EXTENSÃO E SCHEMAS
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS dominio;
CREATE SCHEMA IF NOT EXISTS fila;
CREATE SCHEMA IF NOT EXISTS producao;
CREATE SCHEMA IF NOT EXISTS faturamento;

-- SCHEMA DOMINIO: CATÁLOGOS E REFERÊNCIAS
CREATE TABLE dominio.municipio_ibge (
    codigo_ibge6      CHAR(6)  PRIMARY KEY,
    codigo_ibge7      CHAR(7)  UNIQUE,
    nome_municipio    VARCHAR(100) NOT NULL,
    uf_sigla          CHAR(2)  NOT NULL,
    CONSTRAINT ck_municipio_codigo6 CHECK (codigo_ibge6 ~ '^[0-9]{6}$'),
    CONSTRAINT ck_municipio_codigo7 CHECK (codigo_ibge7 IS NULL OR codigo_ibge7 ~ '^[0-9]{7}$')
);

CREATE TABLE dominio.cid10 (
    codigo            CHAR(4)  PRIMARY KEY,
    codigo_categoria  CHAR(3)  NOT NULL,
    descricao         VARCHAR(255) NOT NULL,
    capitulo_numero   SMALLINT,
    restricao_sexo    CHAR(1),
    CONSTRAINT ck_cid10_formato CHECK (codigo ~ '^[A-Z][0-9]{2}[0-9 ]$'),
    CONSTRAINT ck_cid10_sexo CHECK (restricao_sexo IS NULL OR restricao_sexo IN ('M','F'))
);

CREATE TABLE dominio.cbo (
    codigo            CHAR(6)  PRIMARY KEY,
    familia_ocupacional CHAR(4) NOT NULL,
    descricao         VARCHAR(255) NOT NULL,
    grande_grupo      CHAR(1),
    CONSTRAINT ck_cbo_formato CHECK (codigo ~ '^[0-9]{6}$')
);

CREATE TABLE dominio.catmat_item (
    codigo_catmat     CHAR(9)  PRIMARY KEY,
    descricao         VARCHAR(500) NOT NULL,
    grupo_catmat      CHAR(2),
    classe_catmat     CHAR(4),
    pdm_catmat        CHAR(5),
    unidade_fornecimento VARCHAR(30),
    ativo             BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT ck_catmat_formato CHECK (codigo_catmat ~ '^BR[0-9]{7}$')
);

CREATE TABLE dominio.sigtap_procedimento (
    codigo                  CHAR(10) PRIMARY KEY,
    grupo                   CHAR(2)  NOT NULL,
    subgrupo                CHAR(2)  NOT NULL,
    forma_organizacao       CHAR(2)  NOT NULL,
    sequencial              CHAR(3)  NOT NULL,
    digito_verificador      CHAR(1)  NOT NULL,
    nome_procedimento       VARCHAR(250) NOT NULL,
    descricao_detalhada     TEXT,
    complexidade            CHAR(1),
    sexo_compativel         CHAR(1) NOT NULL DEFAULT 'I',
    idade_minima_meses      INTEGER,
    idade_maxima_meses      INTEGER,
    quantidade_maxima_execucao SMALLINT,
    instrumento_registro    VARCHAR(20),
    valor_sh                NUMERIC(10,2) NOT NULL DEFAULT 0,
    valor_sa                NUMERIC(10,2) NOT NULL DEFAULT 0,
    valor_sp                NUMERIC(10,2) NOT NULL DEFAULT 0,
    competencia_inicio      CHAR(6),
    competencia_fim         CHAR(6),
    ativo                   BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT ck_sigtap_formato CHECK (codigo ~ '^[0-9]{10}$'),
    CONSTRAINT ck_sigtap_decomposicao CHECK (
        codigo = grupo || subgrupo || forma_organizacao || sequencial || digito_verificador
    ),
    CONSTRAINT ck_sigtap_sexo CHECK (sexo_compativel IN ('M','F','I'))
);

CREATE TABLE dominio.estabelecimento_cnes (
    codigo_cnes       CHAR(7)  PRIMARY KEY,
    cnpj_mantenedora  CHAR(14),
    razao_social      VARCHAR(255) NOT NULL,
    nome_fantasia     VARCHAR(255),
    tipo_estabelecimento VARCHAR(100),
    municipio_ibge6   CHAR(6) NOT NULL REFERENCES dominio.municipio_ibge(codigo_ibge6),
    logradouro        VARCHAR(255),
    telefone          VARCHAR(20),
    habilitado_opm    BOOLEAN NOT NULL DEFAULT FALSE,
    ativo             BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT ck_cnes_formato CHECK (codigo_cnes ~ '^[0-9]{7}$'),
    CONSTRAINT ck_cnpj_formato CHECK (cnpj_mantenedora IS NULL OR cnpj_mantenedora ~ '^[0-9]{14}$')
);

-- SCHEMA FILA: PACIENTES, TRIAGENS E SOLICITAÇÕES
CREATE TABLE fila.paciente (
    id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    cns                     CHAR(15) NOT NULL UNIQUE,
    cpf                     CHAR(11) UNIQUE,
    nome_completo           VARCHAR(255) NOT NULL,
    nome_social             VARCHAR(255),
    nome_mae                VARCHAR(255),
    data_nascimento         DATE NOT NULL,
    sexo                    CHAR(1) NOT NULL,
    raca_cor                CHAR(2),
    municipio_residencia_ibge6 CHAR(6) REFERENCES dominio.municipio_ibge(codigo_ibge6),
    zona_residencia         VARCHAR(20) NOT NULL DEFAULT 'URBANA',
    logradouro              VARCHAR(255),
    numero_endereco         VARCHAR(20),
    bairro                  VARCHAR(100),
    cep                     CHAR(8),
    telefone_contato        VARCHAR(20),
    email_contato           VARCHAR(255),
    data_cadastro           TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT ck_paciente_cns_formato CHECK (cns ~ '^[0-9]{15}$'),
    CONSTRAINT ck_paciente_cpf_formato CHECK (cpf IS NULL OR cpf ~ '^[0-9]{11}$'),
    CONSTRAINT ck_paciente_sexo CHECK (sexo IN ('M','F')),
    CONSTRAINT ck_paciente_raca CHECK (raca_cor IS NULL OR raca_cor IN ('01','02','03','04','05','99')),
    CONSTRAINT ck_paciente_zona CHECK (zona_residencia IN ('URBANA','RURAL','RIBEIRINHA','REMOTA')),
    CONSTRAINT ck_paciente_cep CHECK (cep IS NULL OR cep ~ '^[0-9]{8}$')
);
CREATE TABLE fila.profissional_saude (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    cns                 CHAR(15) NOT NULL UNIQUE,
    cpf                 CHAR(11) UNIQUE,
    nome_completo       VARCHAR(255) NOT NULL,
    cbo                 CHAR(6) NOT NULL REFERENCES dominio.cbo(codigo),
    cnes_vinculo        CHAR(7) REFERENCES dominio.estabelecimento_cnes(codigo_cnes),
    numero_conselho     VARCHAR(20),
    tipo_conselho       VARCHAR(10),
    ativo               BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT ck_profissional_cns_formato CHECK (cns ~ '^[0-9]{15}$'),
    CONSTRAINT ck_profissional_cpf_formato CHECK (cpf IS NULL OR cpf ~ '^[0-9]{11}$')
);
CREATE TABLE fila.solicitacao_ortese (
    id                          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    paciente_id                 BIGINT NOT NULL REFERENCES fila.paciente(id),
    procedimento_sigtap         CHAR(10) NOT NULL REFERENCES dominio.sigtap_procedimento(codigo),
    cid10_codigo                CHAR(4)  NOT NULL REFERENCES dominio.cid10(codigo),
    profissional_solicitante_id BIGINT NOT NULL REFERENCES fila.profissional_saude(id),
    estabelecimento_solicitante_cnes CHAR(7) NOT NULL REFERENCES dominio.estabelecimento_cnes(codigo_cnes),
    data_solicitacao            DATE NOT NULL DEFAULT CURRENT_DATE,
    justificativa_clinica       TEXT NOT NULL,
    lado_acometido              VARCHAR(20),
    prioridade_clinica          VARCHAR(20) NOT NULL DEFAULT 'ROTINA',
    distancia_estimada_cre_km   NUMERIC(8,2),
    quantidade_solicitada       SMALLINT NOT NULL DEFAULT 1,
    status                      VARCHAR(30) NOT NULL DEFAULT 'AGUARDANDO_AUTORIZACAO',
    data_ultima_atualizacao     TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT ck_solicitacao_prioridade CHECK (prioridade_clinica IN ('ROTINA','PRIORITARIO','URGENTE')),
    CONSTRAINT ck_solicitacao_distancia CHECK (distancia_estimada_cre_km IS NULL OR distancia_estimada_cre_km >= 0),
    CONSTRAINT ck_solicitacao_lado CHECK (lado_acometido IS NULL OR lado_acometido IN ('DIREITO','ESQUERDO','BILATERAL','NAO_APLICAVEL')),
    CONSTRAINT ck_solicitacao_status CHECK (status IN (
        'AGUARDANDO_AUTORIZACAO','AUTORIZADA','NEGADA','EM_FILA',
        'EM_PRODUCAO','ENTREGUE','CANCELADA')),
    CONSTRAINT ck_solicitacao_quantidade CHECK (quantidade_solicitada > 0)
);
CREATE TABLE fila.fila_espera (
    id                       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    solicitacao_id           BIGINT NOT NULL UNIQUE REFERENCES fila.solicitacao_ortese(id),
    data_entrada_fila        TIMESTAMP NOT NULL DEFAULT now(),
    data_prevista_atendimento DATE,
    clock_pausado            BOOLEAN NOT NULL DEFAULT FALSE,
    data_inicio_pausa        TIMESTAMP,
    motivo_pausa             VARCHAR(255),
    dias_pausados_acumulados INTEGER NOT NULL DEFAULT 0,
    posicao_prioridade       INTEGER,
    data_convocacao          TIMESTAMP,
    data_saida_fila          TIMESTAMP,
    motivo_saida             VARCHAR(50),
    CONSTRAINT ck_fila_motivo_saida CHECK (motivo_saida IS NULL OR motivo_saida IN (
        'ENCAMINHADO_PRODUCAO','CANCELADO_PACIENTE','OBITO','TRANSFERIDO','OUTRO'))
);
CREATE TABLE fila.historico_status_solicitacao (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    solicitacao_id    BIGINT NOT NULL REFERENCES fila.solicitacao_ortese(id),
    status_anterior   VARCHAR(30),
    status_novo       VARCHAR(30) NOT NULL,
    data_alteracao    TIMESTAMP NOT NULL DEFAULT now(),
    usuario_responsavel VARCHAR(100),
    observacao        TEXT
);
CREATE INDEX idx_paciente_cpf ON fila.paciente(cpf);
CREATE INDEX idx_solicitacao_paciente ON fila.solicitacao_ortese(paciente_id);
CREATE INDEX idx_solicitacao_status ON fila.solicitacao_ortese(status);
CREATE INDEX idx_solicitacao_sigtap ON fila.solicitacao_ortese(procedimento_sigtap);
CREATE INDEX idx_fila_espera_prioridade ON fila.fila_espera(posicao_prioridade) WHERE data_saida_fila IS NULL;
CREATE INDEX idx_historico_solicitacao ON fila.historico_status_solicitacao(solicitacao_id);

-- SCHEMA PRODUCAO: OFICINAS, ESTOQUE E LOGÍSTICA
CREATE TABLE producao.oficina_ortopedica (
    id                          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    cnes                        CHAR(7) NOT NULL UNIQUE REFERENCES dominio.estabelecimento_cnes(codigo_cnes),
    nome                        VARCHAR(255) NOT NULL,
    capacidade_producao_mensal  INTEGER,
    responsavel_tecnico_id      BIGINT REFERENCES fila.profissional_saude(id),
    ativo                       BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE producao.produto_ortese (
    id                          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    procedimento_sigtap         CHAR(10) NOT NULL REFERENCES dominio.sigtap_procedimento(codigo),
    nome_produto                VARCHAR(255) NOT NULL,
    especificacao_tecnica       TEXT,
    tempo_producao_estimado_dias INTEGER,
    ativo                       BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE producao.material_estoque (
    id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    oficina_id            BIGINT NOT NULL REFERENCES producao.oficina_ortopedica(id),
    codigo_catmat         CHAR(9) NOT NULL REFERENCES dominio.catmat_item(codigo_catmat),
    quantidade_atual      NUMERIC(12,3) NOT NULL DEFAULT 0,
    quantidade_minima     NUMERIC(12,3) NOT NULL DEFAULT 0,
    unidade_medida        VARCHAR(20),
    custo_unitario_medio  NUMERIC(12,4),
    UNIQUE (oficina_id, codigo_catmat),
    CONSTRAINT ck_estoque_quantidade CHECK (quantidade_atual >= 0)
);
CREATE TABLE producao.ordem_producao (
    id                          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    solicitacao_id              BIGINT NOT NULL UNIQUE REFERENCES fila.solicitacao_ortese(id),
    oficina_id                  BIGINT NOT NULL REFERENCES producao.oficina_ortopedica(id),
    produto_id                  BIGINT NOT NULL REFERENCES producao.produto_ortese(id),
    tecnico_responsavel_id      BIGINT REFERENCES fila.profissional_saude(id),
    data_abertura               TIMESTAMP NOT NULL DEFAULT now(),
    data_prevista_entrega       DATE,
    data_conclusao              TIMESTAMP,
    status                      VARCHAR(30) NOT NULL DEFAULT 'AGUARDANDO_MEDIDAS',
    medidas_antropometricas     JSONB,
    observacoes_tecnicas        TEXT,
    CONSTRAINT ck_ordemproducao_status CHECK (status IN (
        'AGUARDANDO_MEDIDAS','EM_PRODUCAO','CONTROLE_QUALIDADE',
        'PRONTA_PARA_ENTREGA','ENTREGUE','CANCELADA'))
);
CREATE TABLE producao.ordem_producao_item (
    id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ordem_producao_id       BIGINT NOT NULL REFERENCES producao.ordem_producao(id),
    material_estoque_id     BIGINT NOT NULL REFERENCES producao.material_estoque(id),
    quantidade_utilizada    NUMERIC(12,3) NOT NULL,
    CONSTRAINT ck_item_quantidade CHECK (quantidade_utilizada > 0)
);
CREATE TABLE producao.movimentacao_estoque (
    id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    material_estoque_id     BIGINT NOT NULL REFERENCES producao.material_estoque(id),
    tipo_movimento          VARCHAR(20) NOT NULL,
    quantidade              NUMERIC(12,3) NOT NULL,
    data_movimento          TIMESTAMP NOT NULL DEFAULT now(),
    ordem_producao_id       BIGINT REFERENCES producao.ordem_producao(id),
    documento_referencia    VARCHAR(100),
    lote_fabricante         VARCHAR(50),
    data_validade           DATE,
    observacao              TEXT,
    CONSTRAINT ck_mov_tipo CHECK (tipo_movimento IN (
        'ENTRADA','SAIDA_PRODUCAO','AJUSTE_POSITIVO','AJUSTE_NEGATIVO','DEVOLUCAO')),
    CONSTRAINT ck_mov_quantidade CHECK (quantidade > 0),
    CONSTRAINT ck_mov_ordem_obrigatoria CHECK (
        (tipo_movimento = 'SAIDA_PRODUCAO' AND ordem_producao_id IS NOT NULL)
        OR (tipo_movimento != 'SAIDA_PRODUCAO')
    )
);
CREATE TABLE producao.entrega_ortese (
    id                          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ordem_producao_id           BIGINT NOT NULL UNIQUE REFERENCES producao.ordem_producao(id),
    data_entrega                TIMESTAMP NOT NULL DEFAULT now(),
    recebedor_nome               VARCHAR(255),
    recebedor_documento          VARCHAR(20),
    termo_recebimento_assinado  BOOLEAN NOT NULL DEFAULT FALSE,
    profissional_entrega_id     BIGINT REFERENCES fila.profissional_saude(id),
    orientacoes_fornecidas      TEXT
);
CREATE INDEX idx_material_oficina ON producao.material_estoque(oficina_id);
CREATE INDEX idx_material_estoque_baixo ON producao.material_estoque(oficina_id) WHERE quantidade_atual <= quantidade_minima;
CREATE INDEX idx_mov_estoque_material ON producao.movimentacao_estoque(material_estoque_id);
CREATE INDEX idx_mov_estoque_ordem ON producao.movimentacao_estoque(ordem_producao_id);
CREATE INDEX idx_ordemproducao_status ON producao.ordem_producao(status);
CREATE INDEX idx_ordemproducao_oficina ON producao.ordem_producao(oficina_id);

-- SCHEMA FATURAMENTO: APAC, BPA-I E PAGAMENTOS
CREATE TABLE faturamento.apac (
    id                              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    numero_apac                    CHAR(13) NOT NULL UNIQUE,
    uf_codigo                      CHAR(2)  NOT NULL,
    ano_competencia                CHAR(2)  NOT NULL,
    tipo_registro                  CHAR(1)  NOT NULL,
    sequencial                     CHAR(7)  NOT NULL,
    digito_verificador             CHAR(1)  NOT NULL,
    solicitacao_id                  BIGINT NOT NULL REFERENCES fila.solicitacao_ortese(id),
    procedimento_sigtap            CHAR(10) NOT NULL REFERENCES dominio.sigtap_procedimento(codigo),
    cid10_codigo                   CHAR(4)  NOT NULL REFERENCES dominio.cid10(codigo),
    profissional_solicitante_id     BIGINT REFERENCES fila.profissional_saude(id),
    profissional_autorizador_id     BIGINT REFERENCES fila.profissional_saude(id),
    estabelecimento_executante_cnes CHAR(7) NOT NULL REFERENCES dominio.estabelecimento_cnes(codigo_cnes),
    data_solicitacao                DATE NOT NULL,
    data_autorizacao                DATE,
    data_validade                   DATE,
    quantidade_autorizada            SMALLINT NOT NULL DEFAULT 1,
    status                          VARCHAR(20) NOT NULL DEFAULT 'SOLICITADA',
    CONSTRAINT ck_apac_formato CHECK (numero_apac ~ '^[0-9]{13}$'),
    CONSTRAINT ck_apac_decomposicao CHECK (
        numero_apac = uf_codigo || ano_competencia || tipo_registro || sequencial || digito_verificador
    ),
    CONSTRAINT ck_apac_tipo CHECK (tipo_registro IN ('2','4','6')),
    CONSTRAINT ck_apac_status CHECK (status IN ('SOLICITADA','AUTORIZADA','NEGADA','ENCERRADA','CANCELADA'))
);

CREATE TABLE faturamento.lote_bpa (
    id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    cnes_estabelecimento    CHAR(7) NOT NULL REFERENCES dominio.estabelecimento_cnes(codigo_cnes),
    competencia             CHAR(6) NOT NULL,
    tipo_lote               CHAR(1) NOT NULL DEFAULT 'I',
    data_geracao            TIMESTAMP NOT NULL DEFAULT now(),
    quantidade_folhas       INTEGER NOT NULL DEFAULT 0,
    quantidade_registros    INTEGER NOT NULL DEFAULT 0,
    nome_arquivo_gerado     VARCHAR(255),
    situacao                VARCHAR(20) NOT NULL DEFAULT 'GERADO',
    data_envio              TIMESTAMP,
    CONSTRAINT ck_lote_competencia CHECK (competencia ~ '^[0-9]{6}$'),
    CONSTRAINT ck_lote_tipo CHECK (tipo_lote IN ('I','C')),
    CONSTRAINT ck_lote_situacao CHECK (situacao IN ('GERADO','ENVIADO','PROCESSADO','REJEITADO'))
);

CREATE TABLE faturamento.bpa_individualizado (
    id                       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    lote_id                  BIGINT NOT NULL REFERENCES faturamento.lote_bpa(id),
    numero_folha             CHAR(3) NOT NULL,
    numero_sequencial_folha  CHAR(2) NOT NULL,
    cnes                     CHAR(7) NOT NULL REFERENCES dominio.estabelecimento_cnes(codigo_cnes),
    competencia              CHAR(6) NOT NULL,
    cns_profissional         CHAR(15) NOT NULL,
    cbo                      CHAR(6) NOT NULL REFERENCES dominio.cbo(codigo),
    data_atendimento         DATE NOT NULL,
    codigo_procedimento      CHAR(10) NOT NULL REFERENCES dominio.sigtap_procedimento(codigo),
    cns_paciente             CHAR(15) NOT NULL,
    sexo_paciente            CHAR(1) NOT NULL,
    ibge_municipio           CHAR(6) NOT NULL REFERENCES dominio.municipio_ibge(codigo_ibge6),
    cid10_codigo             CHAR(4) NOT NULL REFERENCES dominio.cid10(codigo),
    idade_paciente           SMALLINT NOT NULL,
    quantidade_produzida     SMALLINT NOT NULL DEFAULT 1,
    carater_atendimento      CHAR(2) NOT NULL DEFAULT '01',
    numero_autorizacao_apac  CHAR(13) REFERENCES faturamento.apac(numero_apac),
    origem_informacao        CHAR(3) NOT NULL DEFAULT 'BPA',
    nome_paciente            VARCHAR(30) NOT NULL,
    data_nascimento_paciente DATE NOT NULL,
    raca_cor                 CHAR(2),
    ordem_producao_id        BIGINT REFERENCES producao.ordem_producao(id),
    UNIQUE (lote_id, numero_folha, numero_sequencial_folha),
    CONSTRAINT ck_bpai_cns_prof CHECK (cns_profissional ~ '^[0-9]{15}$'),
    CONSTRAINT ck_bpai_cns_pac CHECK (cns_paciente ~ '^[0-9]{15}$'),
    CONSTRAINT ck_bpai_folha CHECK (numero_folha ~ '^[0-9]{3}$'),
    CONSTRAINT ck_bpai_seq CHECK (numero_sequencial_folha ~ '^[0-9]{2}$'),
    CONSTRAINT ck_bpai_competencia CHECK (competencia ~ '^[0-9]{6}$'),
    CONSTRAINT ck_bpai_sexo CHECK (sexo_paciente IN ('M','F')),
    CONSTRAINT ck_bpai_idade CHECK (idade_paciente BETWEEN 0 AND 110),
    CONSTRAINT ck_bpai_opm_escopo CHECK (left(codigo_procedimento,4) = '0701'),
    CONSTRAINT ck_bpai_raca CHECK (raca_cor IS NULL OR raca_cor IN ('01','02','03','04','05','99'))
);

CREATE TABLE faturamento.guia_pagamento (
    id                          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    bpa_individualizado_id      BIGINT REFERENCES faturamento.bpa_individualizado(id),
    apac_id                     BIGINT REFERENCES faturamento.apac(id),
    competencia_faturamento     CHAR(6) NOT NULL,
    valor_procedimento          NUMERIC(10,2) NOT NULL,
    data_processamento_datasus  DATE,
    status_pagamento            VARCHAR(20) NOT NULL DEFAULT 'PENDENTE',
    motivo_glosa                VARCHAR(255),
    CONSTRAINT ck_guia_origem CHECK (bpa_individualizado_id IS NOT NULL OR apac_id IS NOT NULL),
    CONSTRAINT ck_guia_status CHECK (status_pagamento IN ('PENDENTE','APROVADO','GLOSADO','PAGO')),
    CONSTRAINT ck_guia_competencia CHECK (competencia_faturamento ~ '^[0-9]{6}$')
);
CREATE INDEX idx_apac_solicitacao ON faturamento.apac(solicitacao_id);
CREATE INDEX idx_apac_status ON faturamento.apac(status);
CREATE INDEX idx_lote_bpa_competencia ON faturamento.lote_bpa(competencia, cnes_estabelecimento);
CREATE INDEX idx_bpai_lote ON faturamento.bpa_individualizado(lote_id);
CREATE INDEX idx_bpai_apac ON faturamento.bpa_individualizado(numero_autorizacao_apac);
CREATE INDEX idx_bpai_ordem_producao ON faturamento.bpa_individualizado(ordem_producao_id);
CREATE INDEX idx_guia_status ON faturamento.guia_pagamento(status_pagamento);

-- VIEWS OPERACIONAIS
CREATE OR REPLACE VIEW fila.vw_fila_espera_atual AS
SELECT
    fe.id AS fila_id,
    s.id AS solicitacao_id,
    p.nome_completo AS paciente,
    p.cns AS paciente_cns,
    sp.nome_procedimento,
    s.prioridade_clinica,
    fe.data_entrada_fila,
    EXTRACT(DAY FROM (now() - fe.data_entrada_fila))::INT - fe.dias_pausados_acumulados AS dias_espera_efetivos,
    fe.data_prevista_atendimento,
    fe.clock_pausado,
    fe.posicao_prioridade
FROM fila.fila_espera fe
JOIN fila.solicitacao_ortese s ON s.id = fe.solicitacao_id
JOIN fila.paciente p ON p.id = s.paciente_id
JOIN dominio.sigtap_procedimento sp ON sp.codigo = s.procedimento_sigtap
WHERE fe.data_saida_fila IS NULL
ORDER BY fe.posicao_prioridade NULLS LAST, fe.data_entrada_fila;

CREATE OR REPLACE VIEW producao.vw_estoque_abaixo_minimo AS
SELECT
    o.nome AS oficina,
    ci.codigo_catmat,
    ci.descricao,
    me.quantidade_atual,
    me.quantidade_minima,
    me.unidade_medida
FROM producao.material_estoque me
JOIN producao.oficina_ortopedica o ON o.id = me.oficina_id
JOIN dominio.catmat_item ci ON ci.codigo_catmat = me.codigo_catmat
WHERE me.quantidade_atual <= me.quantidade_minima;

CREATE OR REPLACE VIEW producao.vw_painel_producao AS
SELECT
    op.id AS ordem_producao_id,
    of.nome AS oficina,
    p.nome_completo AS paciente,
    pr.nome_produto,
    op.status,
    op.data_abertura,
    op.data_prevista_entrega,
    op.data_conclusao
FROM producao.ordem_producao op
JOIN producao.oficina_ortopedica of ON of.id = op.oficina_id
JOIN fila.solicitacao_ortese s ON s.id = op.solicitacao_id
JOIN fila.paciente p ON p.id = s.paciente_id
JOIN producao.produto_ortese pr ON pr.id = op.produto_id;

CREATE OR REPLACE VIEW faturamento.vw_resumo_faturamento_competencia AS
SELECT
    b.competencia,
    b.cnes,
    COUNT(*) AS total_registros,
    SUM(g.valor_procedimento) FILTER (WHERE g.status_pagamento = 'PAGO') AS valor_pago,
    SUM(g.valor_procedimento) FILTER (WHERE g.status_pagamento = 'GLOSADO') AS valor_glosado,
    SUM(g.valor_procedimento) FILTER (WHERE g.status_pagamento = 'PENDENTE') AS valor_pendente
FROM faturamento.bpa_individualizado b
LEFT JOIN faturamento.guia_pagamento g ON g.bpa_individualizado_id = b.id
GROUP BY b.competencia, b.cnes;

-- CARGA INICIAL DE REFERÊNCIA E DADOS DEMONSTRATIVOS
INSERT INTO dominio.municipio_ibge (codigo_ibge6, codigo_ibge7, nome_municipio, uf_sigla) VALUES
('355030','3550308','Sao Paulo','SP'),
('330455','3304557','Rio de Janeiro','RJ'),
('410690','4106902','Curitiba','PR');

INSERT INTO dominio.cid10 (codigo, codigo_categoria, descricao, capitulo_numero, restricao_sexo) VALUES
('M545','M54','Dorsalgia nao especificada',13,NULL),
('S720','S72','Fratura do colo do femur',19,NULL),
('G800','G80','Paralisia cerebral tetraplegica espastica',6,NULL);

INSERT INTO dominio.cbo (codigo, familia_ocupacional, descricao, grande_grupo) VALUES
('223805','2238','Medico ortopedista e traumatologista','2'),
('223905','2239','Fisioterapeuta geral','2'),
('516210','5162','Tecnico em ortopedia (tecnico ortesista/protesista)','5');

INSERT INTO dominio.catmat_item (codigo_catmat, descricao, grupo_catmat, classe_catmat, pdm_catmat, unidade_fornecimento) VALUES
('BR0439626','SERINGA, POLIPROPILENO, 10 ML (formato real - exemplo generico, nao ortopedico)','65','1234','56789','UNIDADE'),
('BR0000001','POLIPROPILENO PARA ORTESE, chapa (FICTICIO - validar codigo real no Catmat)','65','0001','00001','QUILOGRAMA'),
('BR0000002','VELCRO ADESIVO PARA ORTESE, rolo (FICTICIO - validar codigo real no Catmat)','65','0002','00002','METRO');

INSERT INTO dominio.estabelecimento_cnes (codigo_cnes, cnpj_mantenedora, razao_social, nome_fantasia, tipo_estabelecimento, municipio_ibge6, habilitado_opm) VALUES
('2077469','46374500000194','PREFEITURA MUNICIPAL DE SAO PAULO','UBS CENTRO','UNIDADE BASICA DE SAUDE','355030',FALSE),
('2077500','46374500000275','SECRETARIA MUNICIPAL DE SAUDE SP','OFICINA ORTOPEDICA MUNICIPAL','OFICINA ORTOPEDICA','355030',TRUE);

INSERT INTO dominio.sigtap_procedimento
(codigo, grupo, subgrupo, forma_organizacao, sequencial, digito_verificador, nome_procedimento, complexidade, sexo_compativel, quantidade_maxima_execucao, instrumento_registro, valor_sa, competencia_inicio) VALUES
('0701020040','07','01','02','004','0','ORTESE / COLETE TIPO WILLIAMS','2','I',1,'BPA-I',85.00,'202601'),
('0701100010','07','01','10','001','0','MALHA COMPRESSIVA','2','I',2,'BPA-I',60.00,'202601'),
('0701070102','07','01','07','010','2','PROTESE PARCIAL MAXILAR REMOVIVEL','2','I',1,'APAC',450.00,'202601');

INSERT INTO fila.paciente (cns, cpf, nome_completo, data_nascimento, sexo, raca_cor, municipio_residencia_ibge6) VALUES
('700000000000005','52998224725','Maria da Silva Souza','1980-04-12','F','03','355030'),
('700000000000013',NULL,'Joao Pereira Lima','2015-09-30','M','01','355030');

INSERT INTO fila.profissional_saude (cns, cpf, nome_completo, cbo, cnes_vinculo, numero_conselho, tipo_conselho) VALUES
('700000000000102','11144477735','Dr. Carlos Andrade','223805','2077469','123456','CRM'),
('700000000000110',NULL,'Tecnica Ana Ribeiro','516210','2077500','98765','CREFITO');

INSERT INTO producao.oficina_ortopedica (cnes, nome, capacidade_producao_mensal, responsavel_tecnico_id) VALUES
('2077500','Oficina Ortopedica Municipal - Central',120,2);

INSERT INTO producao.produto_ortese (procedimento_sigtap, nome_produto, especificacao_tecnica, tempo_producao_estimado_dias) VALUES
('0701020040','Colete Williams sob medida','Termoplastico de baixa temperatura, tiras em velcro',10);

INSERT INTO producao.material_estoque (oficina_id, codigo_catmat, quantidade_atual, quantidade_minima, unidade_medida, custo_unitario_medio) VALUES
(1,'BR0000001', 50.000, 10.000,'KG', 45.90),
(1,'BR0000002', 200.000, 30.000,'M', 3.20);

-- SCHEMA APP: AUTENTICAÇÃO, NOTIFICAÇÕES E APOIO À INTERFACE
CREATE SCHEMA IF NOT EXISTS app;

CREATE TABLE app.usuario_sistema (
    id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    auth_user_id            UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    papel                   VARCHAR(20) NOT NULL,
    paciente_id             BIGINT REFERENCES fila.paciente(id),
    profissional_saude_id   BIGINT REFERENCES fila.profissional_saude(id),
    cnes_vinculo            CHAR(7) REFERENCES dominio.estabelecimento_cnes(codigo_cnes),
    nome_exibicao           VARCHAR(255) NOT NULL,
    idioma_preferido        VARCHAR(10) NOT NULL DEFAULT 'pt-BR',
    ativo                   BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em               TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT ck_usuario_papel CHECK (papel IN ('PACIENTE', 'FISCAL_CRE', 'GESTOR')),
    CONSTRAINT ck_usuario_idioma CHECK (idioma_preferido IN ('pt-BR', 'en-US', 'es-419')),

    CONSTRAINT ck_usuario_paciente_papel CHECK (
        (papel = 'PACIENTE' AND paciente_id IS NOT NULL)
        OR (papel != 'PACIENTE')
    ),

    CONSTRAINT ck_usuario_staff_papel CHECK (
        (papel IN ('FISCAL_CRE', 'GESTOR') AND profissional_saude_id IS NOT NULL)
        OR (papel = 'PACIENTE')
    )
);
CREATE INDEX idx_usuario_auth ON app.usuario_sistema(auth_user_id);
CREATE INDEX idx_usuario_paciente ON app.usuario_sistema(paciente_id);
CREATE INDEX idx_usuario_papel ON app.usuario_sistema(papel);

-- FUNÇÕES E POLÍTICAS DE SEGURANÇA
CREATE OR REPLACE FUNCTION app.fn_papel_atual()
RETURNS VARCHAR AS $$
    SELECT papel FROM app.usuario_sistema WHERE auth_user_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION app.fn_paciente_id_atual()
RETURNS BIGINT AS $$
    SELECT paciente_id FROM app.usuario_sistema WHERE auth_user_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION app.fn_e_staff()
RETURNS BOOLEAN AS $$
    SELECT COALESCE(app.fn_papel_atual() IN ('FISCAL_CRE', 'GESTOR'), FALSE);
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE TABLE app.notificacao (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    auth_user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tipo                VARCHAR(20) NOT NULL DEFAULT 'INFO',
    titulo              VARCHAR(255) NOT NULL,
    mensagem            VARCHAR(500),
    lida                BOOLEAN NOT NULL DEFAULT FALSE,
    referencia_tabela   VARCHAR(100),
    referencia_id       BIGINT,
    criado_em           TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT ck_notificacao_tipo CHECK (tipo IN ('INFO', 'ALERTA', 'LEMBRETE', 'URGENTE'))
);
CREATE INDEX idx_notificacao_usuario ON app.notificacao(auth_user_id, lida);
CREATE INDEX idx_notificacao_data ON app.notificacao(criado_em DESC);

CREATE TABLE fila.triagem_clinica (
    id                              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    paciente_id                     BIGINT NOT NULL REFERENCES fila.paciente(id),
    profissional_id                 BIGINT NOT NULL REFERENCES fila.profissional_saude(id),
    solicitacao_id                  BIGINT REFERENCES fila.solicitacao_ortese(id),
    procedimento_sigtap_proposto    CHAR(10) REFERENCES dominio.sigtap_procedimento(codigo),
    data_hora                       TIMESTAMP NOT NULL DEFAULT now(),
    status                          VARCHAR(20) NOT NULL DEFAULT 'PENDENTE',
    observacao_clinica              TEXT,
    criado_em                       TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT ck_triagem_status CHECK (status IN ('PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA'))
);
CREATE INDEX idx_triagem_paciente ON fila.triagem_clinica(paciente_id);
CREATE INDEX idx_triagem_status ON fila.triagem_clinica(status);
CREATE INDEX idx_triagem_data ON fila.triagem_clinica(data_hora DESC);

CREATE TABLE producao.remessa_logistica_reversa (
    id                          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    oficina_id                  BIGINT NOT NULL REFERENCES producao.oficina_ortopedica(id),
    ordem_producao_origem_id    BIGINT REFERENCES producao.ordem_producao(id),
    tipo_dispositivo            VARCHAR(255) NOT NULL,
    quantidade                  INTEGER NOT NULL DEFAULT 1,
    fabricante_destino          VARCHAR(255) NOT NULL,
    endereco_destino            VARCHAR(255),
    codigo_rastreio             VARCHAR(100),
    status                      VARCHAR(20) NOT NULL DEFAULT 'AGUARDANDO_COLETA',
    data_criacao                TIMESTAMP NOT NULL DEFAULT now(),
    data_atualizacao            TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT ck_remessa_status CHECK (status IN ('AGUARDANDO_COLETA', 'EM_TRANSITO', 'ENTREGUE')),
    CONSTRAINT ck_remessa_quantidade CHECK (quantidade > 0)
);
CREATE INDEX idx_remessa_oficina ON producao.remessa_logistica_reversa(oficina_id);
CREATE INDEX idx_remessa_status ON producao.remessa_logistica_reversa(status);

ALTER TABLE fila.paciente ENABLE ROW LEVEL SECURITY;
CREATE POLICY paciente_select ON fila.paciente FOR SELECT
    USING (id = app.fn_paciente_id_atual() OR app.fn_e_staff());

ALTER TABLE fila.solicitacao_ortese ENABLE ROW LEVEL SECURITY;
CREATE POLICY solicitacao_select ON fila.solicitacao_ortese FOR SELECT
    USING (paciente_id = app.fn_paciente_id_atual() OR app.fn_e_staff());

ALTER TABLE fila.fila_espera ENABLE ROW LEVEL SECURITY;
CREATE POLICY fila_espera_select ON fila.fila_espera FOR SELECT
    USING (
        app.fn_e_staff()
        OR solicitacao_id IN (SELECT id FROM fila.solicitacao_ortese WHERE paciente_id = app.fn_paciente_id_atual())
    );

ALTER TABLE fila.triagem_clinica ENABLE ROW LEVEL SECURITY;
CREATE POLICY triagem_select ON fila.triagem_clinica FOR SELECT
    USING (paciente_id = app.fn_paciente_id_atual() OR app.fn_e_staff());
CREATE POLICY triagem_staff_write ON fila.triagem_clinica FOR ALL
    USING (app.fn_e_staff()) WITH CHECK (app.fn_e_staff());

ALTER TABLE producao.ordem_producao ENABLE ROW LEVEL SECURITY;
CREATE POLICY ordem_producao_select ON producao.ordem_producao FOR SELECT
    USING (
        app.fn_e_staff()
        OR solicitacao_id IN (SELECT id FROM fila.solicitacao_ortese WHERE paciente_id = app.fn_paciente_id_atual())
    );

ALTER TABLE producao.entrega_ortese ENABLE ROW LEVEL SECURITY;
CREATE POLICY entrega_select ON producao.entrega_ortese FOR SELECT
    USING (
        app.fn_e_staff()
        OR ordem_producao_id IN (
            SELECT op.id FROM producao.ordem_producao op
            JOIN fila.solicitacao_ortese s ON s.id = op.solicitacao_id
            WHERE s.paciente_id = app.fn_paciente_id_atual()
        )
    );

ALTER TABLE producao.remessa_logistica_reversa ENABLE ROW LEVEL SECURITY;
CREATE POLICY remessa_staff_all ON producao.remessa_logistica_reversa FOR ALL
    USING (app.fn_e_staff()) WITH CHECK (app.fn_e_staff());

ALTER TABLE app.notificacao ENABLE ROW LEVEL SECURITY;
CREATE POLICY notificacao_self ON app.notificacao FOR SELECT
    USING (auth_user_id = auth.uid());
CREATE POLICY notificacao_self_update ON app.notificacao FOR UPDATE
    USING (auth_user_id = auth.uid()) WITH CHECK (auth_user_id = auth.uid());

ALTER TABLE app.usuario_sistema ENABLE ROW LEVEL SECURITY;
CREATE POLICY usuario_self_select ON app.usuario_sistema FOR SELECT
    USING (auth_user_id = auth.uid() OR app.fn_e_staff());

-- VIEWS DA APLICAÇÃO
CREATE OR REPLACE VIEW fila.vw_kpi_dashboard WITH (security_invoker = true) AS
SELECT
    (SELECT COUNT(*) FROM fila.fila_espera WHERE data_saida_fila IS NULL) AS fila_ativa,
    (SELECT COUNT(*) FROM producao.material_estoque me
        JOIN producao.movimentacao_estoque mv ON mv.material_estoque_id = me.id) AS estoque_proteses,
    (SELECT COUNT(*) FROM producao.remessa_logistica_reversa WHERE status != 'ENTREGUE') AS em_logistica_reversa,
    (SELECT COUNT(*) FROM producao.ordem_producao
        WHERE date_trunc('month', data_abertura) = date_trunc('month', now())) AS matchings_mes;

CREATE OR REPLACE VIEW fila.vw_alertas_criticos WITH (security_invoker = true) AS
SELECT 'ESTOQUE' AS tipo,
       'Estoque critico: ' || ci.descricao || ' < ' || me.quantidade_minima || ' ' || me.unidade_medida || ' em ' || o.nome AS mensagem,
       now() AS gerado_em
FROM producao.vw_estoque_abaixo_minimo me
JOIN producao.oficina_ortopedica o ON o.nome = me.oficina
JOIN dominio.catmat_item ci ON ci.codigo_catmat = me.codigo_catmat
UNION ALL
SELECT 'FILA_LONGA' AS tipo,
       COUNT(*) || ' pacientes sem matching ha mais de 30 dias' AS mensagem,
       now() AS gerado_em
FROM fila.vw_fila_espera_atual
WHERE dias_espera_efetivos > 30
HAVING COUNT(*) > 0;

CREATE OR REPLACE VIEW fila.vw_fluxo_dispositivos_mensal WITH (security_invoker = true) AS
SELECT
    meses.mes,
    COALESCE(ent.total, 0) AS entradas,
    COALESCE(sai.total, 0) AS saidas
FROM (
    SELECT date_trunc('month', d)::DATE AS mes
    FROM generate_series(date_trunc('month', now()) - INTERVAL '11 months', date_trunc('month', now()), INTERVAL '1 month') d
) meses
LEFT JOIN (
    SELECT date_trunc('month', data_solicitacao)::DATE AS mes, COUNT(*) AS total
    FROM fila.solicitacao_ortese GROUP BY 1
) ent ON ent.mes = meses.mes
LEFT JOIN (
    SELECT date_trunc('month', data_entrega)::DATE AS mes, COUNT(*) AS total
    FROM producao.entrega_ortese GROUP BY 1
) sai ON sai.mes = meses.mes
ORDER BY meses.mes;

CREATE OR REPLACE VIEW fila.vw_pacientes_aguardando WITH (security_invoker = true) AS
SELECT
    fe.fila_id,
    fe.solicitacao_id,
    left(p.nome_completo, 1) || repeat('*', greatest(length(p.nome_completo) - 2, 1)) || right(p.nome_completo, 1) AS paciente_mascarado,
    p.nome_completo,
    sp.nome_procedimento AS dispositivo,
    s.lado_acometido,
    s.data_solicitacao,
    s.prioridade_clinica,
    s.status,
    fe.dias_espera_efetivos
FROM fila.vw_fila_espera_atual fe
JOIN fila.solicitacao_ortese s ON s.id = fe.solicitacao_id
JOIN fila.paciente p ON p.id = s.paciente_id
JOIN dominio.sigtap_procedimento sp ON sp.codigo = s.procedimento_sigtap;


CREATE OR REPLACE VIEW producao.vw_lotes_recentes WITH (security_invoker = true) AS
SELECT
    mv.id AS lote_id,
    mv.lote_fabricante,
    mv.data_movimento AS data_cadastro,
    ci.descricao AS tipo_item,
    o.nome AS oficina,
    mv.quantidade,
    mv.data_validade,
    CASE WHEN mv.data_validade IS NOT NULL AND mv.data_validade < CURRENT_DATE THEN 'VENCIDO'
         WHEN me.quantidade_atual <= me.quantidade_minima THEN 'ESTOQUE_BAIXO'
         ELSE 'OK' END AS status
FROM producao.movimentacao_estoque mv
JOIN producao.material_estoque me ON me.id = mv.material_estoque_id
JOIN dominio.catmat_item ci ON ci.codigo_catmat = me.codigo_catmat
JOIN producao.oficina_ortopedica o ON o.id = me.oficina_id
WHERE mv.tipo_movimento = 'ENTRADA'
ORDER BY mv.data_movimento DESC;

CREATE OR REPLACE VIEW fila.vw_triagens WITH (security_invoker = true) AS
SELECT
    t.id AS triagem_id,
    p.nome_completo AS paciente,
    prof.nome_completo AS profissional,
    sp.nome_procedimento AS dispositivo,
    t.data_hora,
    t.status,
    t.observacao_clinica
FROM fila.triagem_clinica t
JOIN fila.paciente p ON p.id = t.paciente_id
JOIN fila.profissional_saude prof ON prof.id = t.profissional_id
LEFT JOIN dominio.sigtap_procedimento sp ON sp.codigo = t.procedimento_sigtap_proposto
ORDER BY t.data_hora DESC;

CREATE OR REPLACE VIEW producao.vw_remessas_logistica WITH (security_invoker = true) AS
SELECT
    r.id AS remessa_id,
    o.nome AS origem,
    r.fabricante_destino,
    r.endereco_destino,
    r.tipo_dispositivo,
    r.quantidade,
    r.codigo_rastreio,
    r.status,
    r.data_criacao
FROM producao.remessa_logistica_reversa r
JOIN producao.oficina_ortopedica o ON o.id = r.oficina_id
ORDER BY r.data_criacao DESC;

CREATE OR REPLACE VIEW fila.vw_relatorio_mensal WITH (security_invoker = true) AS
SELECT
    meses.mes,
    COALESCE(tri.total, 0) AS triagens,
    COALESCE(match.total, 0) AS matchings,
    COALESCE(dev.total, 0) AS devolucoes
FROM (
    SELECT date_trunc('month', d)::DATE AS mes
    FROM generate_series(date_trunc('month', now()) - INTERVAL '5 months', date_trunc('month', now()), INTERVAL '1 month') d
) meses
LEFT JOIN (SELECT date_trunc('month', data_hora)::DATE AS mes, COUNT(*) AS total FROM fila.triagem_clinica GROUP BY 1) tri ON tri.mes = meses.mes
LEFT JOIN (SELECT date_trunc('month', data_abertura)::DATE AS mes, COUNT(*) AS total FROM producao.ordem_producao GROUP BY 1) match ON match.mes = meses.mes
LEFT JOIN (SELECT date_trunc('month', data_criacao)::DATE AS mes, COUNT(*) AS total FROM producao.remessa_logistica_reversa GROUP BY 1) dev ON dev.mes = meses.mes
ORDER BY meses.mes;

CREATE OR REPLACE VIEW fila.vw_pedido_atual WITH (security_invoker = true) AS
SELECT
    s.id AS solicitacao_id,
    s.paciente_id,
    s.data_solicitacao,
    s.lado_acometido,
    s.prioridade_clinica,
    s.status AS status_solicitacao,
    sp.nome_procedimento,
    sp.codigo AS procedimento_sigtap,
    pr.nome_produto,
    pr.especificacao_tecnica,
    op.id AS ordem_producao_id,
    op.status AS status_producao,
    op.data_abertura AS producao_data_abertura,
    op.data_prevista_entrega,
    op.data_conclusao AS producao_data_conclusao,
    ent.data_entrega,
    ofi.nome AS oficina_nome
FROM fila.solicitacao_ortese s
JOIN dominio.sigtap_procedimento sp ON sp.codigo = s.procedimento_sigtap
LEFT JOIN producao.produto_ortese pr ON pr.procedimento_sigtap = s.procedimento_sigtap
LEFT JOIN producao.ordem_producao op ON op.solicitacao_id = s.id
LEFT JOIN producao.oficina_ortopedica ofi ON ofi.id = op.oficina_id
LEFT JOIN producao.entrega_ortese ent ON ent.ordem_producao_id = op.id
ORDER BY s.data_solicitacao DESC;

CREATE OR REPLACE VIEW fila.vw_paciente_perfil WITH (security_invoker = true) AS
SELECT
    p.id AS paciente_id,
    p.nome_completo,
    p.cpf,
    p.cns,
    p.telefone_contato,
    date_part('year', age(p.data_nascimento))::INT AS idade,
    m.nome_municipio,
    m.uf_sigla,
    s.id AS ultima_solicitacao_id,
    enc.nome_fantasia AS unidade_encaminhamento,
    ofi.nome AS centro_reabilitacao
FROM fila.paciente p
LEFT JOIN dominio.municipio_ibge m ON m.codigo_ibge6 = p.municipio_residencia_ibge6
LEFT JOIN LATERAL (
    SELECT * FROM fila.solicitacao_ortese s2
    WHERE s2.paciente_id = p.id
    ORDER BY s2.data_solicitacao DESC
    LIMIT 1
) s ON TRUE
LEFT JOIN dominio.estabelecimento_cnes enc ON enc.codigo_cnes = s.estabelecimento_solicitante_cnes
LEFT JOIN producao.ordem_producao op ON op.solicitacao_id = s.id
LEFT JOIN producao.oficina_ortopedica ofi ON ofi.id = op.oficina_id;

GRANT USAGE ON SCHEMA fila, producao, dominio, faturamento, app TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA fila, producao, dominio, faturamento TO authenticated;
GRANT SELECT, UPDATE ON app.notificacao TO authenticated;
GRANT SELECT ON app.usuario_sistema TO authenticated;
GRANT SELECT, INSERT, UPDATE ON fila.triagem_clinica TO authenticated;
GRANT SELECT, INSERT, UPDATE ON producao.remessa_logistica_reversa TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA fila, producao, app TO authenticated;

INSERT INTO fila.triagem_clinica (paciente_id, profissional_id, procedimento_sigtap_proposto, status, observacao_clinica) VALUES
(1, 1, '0701020040', 'CONCLUIDA', 'Indicacao de colete tipo Williams para dorsalgia. Paciente encaminhada para solicitacao formal.'),
(2, 2, '0701100010', 'PENDENTE', 'Avaliacao inicial para malha compressiva - aguardando confirmacao de horario com responsavel.');

INSERT INTO producao.remessa_logistica_reversa (oficina_id, tipo_dispositivo, quantidade, fabricante_destino, endereco_destino, codigo_rastreio, status) VALUES
(1, 'Colete tipo Williams (substituido)', 1, 'OrthoTech Brasil', 'Av. Industrial, 1200 - Mogi das Cruzes / SP', 'BR2026060001', 'AGUARDANDO_COLETA');

INSERT INTO fila.solicitacao_ortese
(paciente_id, procedimento_sigtap, cid10_codigo, profissional_solicitante_id, estabelecimento_solicitante_cnes, justificativa_clinica, lado_acometido, prioridade_clinica, status) VALUES
(1, '0701020040', 'M545', 1, '2077469', 'Dorsalgia persistente com indicacao de colete tipo Williams, conforme avaliacao clinica registrada na triagem.', 'NAO_APLICAVEL', 'PRIORITARIO', 'EM_FILA');

INSERT INTO fila.fila_espera (solicitacao_id, data_prevista_atendimento, posicao_prioridade) VALUES
(1, CURRENT_DATE + INTERVAL '15 days', 1);

INSERT INTO producao.movimentacao_estoque
(material_estoque_id, tipo_movimento, quantidade, documento_referencia, lote_fabricante, data_validade) VALUES
(1, 'ENTRADA', 20.000, 'NE-2026-000451', 'LOTE-PP-2026-06', CURRENT_DATE + INTERVAL '18 months');

-- CADASTROS ADMINISTRATIVOS
CREATE TABLE app.fornecedor (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome        VARCHAR(255) NOT NULL,
    cnpj        CHAR(14) UNIQUE,
    email       VARCHAR(255),
    telefone    VARCHAR(30),
    endereco    VARCHAR(500),
    ativo       BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em   TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT ck_fornecedor_cnpj CHECK (cnpj IS NULL OR cnpj ~ '^[0-9]{14}$')
);

CREATE TABLE app.contrato_fornecedor (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    fornecedor_id   BIGINT NOT NULL REFERENCES app.fornecedor(id) ON DELETE CASCADE,
    numero_contrato VARCHAR(100) NOT NULL UNIQUE,
    valor_total     NUMERIC(14,2),
    data_inicio     DATE,
    data_fim        DATE,
    sla_percentual  NUMERIC(5,2),
    status          VARCHAR(30) NOT NULL DEFAULT 'VIGENTE',
    criado_em       TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT ck_contrato_status CHECK (status IN ('VIGENTE','EM_RENOVACAO','ENCERRADO','CANCELADO')),
    CONSTRAINT ck_contrato_valor CHECK (valor_total IS NULL OR valor_total >= 0),
    CONSTRAINT ck_contrato_sla CHECK (sla_percentual IS NULL OR (sla_percentual >= 0 AND sla_percentual <= 100)),
    CONSTRAINT ck_contrato_periodo CHECK (data_inicio IS NULL OR data_fim IS NULL OR data_fim >= data_inicio)
);

CREATE TABLE app.parceria_ong (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    oficina_id      BIGINT NOT NULL REFERENCES producao.oficina_ortopedica(id) ON DELETE CASCADE,
    nome_ong        VARCHAR(255) NOT NULL,
    tipo_parceria   VARCHAR(100),
    data_inicio     DATE,
    data_fim        DATE,
    ativa           BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em       TIMESTAMP NOT NULL DEFAULT now()
);
CREATE TABLE app.recall (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo_lote         VARCHAR(100) NOT NULL,
    nome_produto        VARCHAR(255) NOT NULL,
    motivo              TEXT NOT NULL,
    data_abertura       DATE NOT NULL DEFAULT CURRENT_DATE,
    data_limite         DATE,
    affected_devices    INTEGER NOT NULL DEFAULT 0,
    status              VARCHAR(30) NOT NULL DEFAULT 'ABERTO',
    orgao_notificador   VARCHAR(100),
    criado_em           TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT ck_recall_status CHECK (status IN ('ABERTO','EM_ANDAMENTO','ENCERRADO','CANCELADO')),
    CONSTRAINT ck_recall_affected CHECK (affected_devices >= 0)
);

CREATE TABLE app.relatorio_gerado (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome            VARCHAR(255) NOT NULL,
    tipo            VARCHAR(100) NOT NULL,
    formato         VARCHAR(10) NOT NULL DEFAULT 'PDF',
    tamanho_bytes   BIGINT,
    caminho_arquivo VARCHAR(500),
    gerado_em       TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT ck_relatorio_formato CHECK (formato IN ('PDF','CSV','XLSX','JSON'))
);

CREATE INDEX idx_fornecedor_nome ON app.fornecedor(nome);
CREATE INDEX idx_contrato_fornecedor ON app.contrato_fornecedor(fornecedor_id);
CREATE INDEX idx_parceria_ong_oficina ON app.parceria_ong(oficina_id);
CREATE INDEX idx_recall_status ON app.recall(status);
CREATE INDEX idx_relatorio_data ON app.relatorio_gerado(gerado_em DESC);

INSERT INTO app.fornecedor (nome, cnpj, email, telefone, endereco) VALUES
('OrthoTech Brasil', '12345678000195', 'contato@orthotech.example', '+55 11 3333-1000', 'São Paulo - SP'),
('Mobilidade Médica Nacional', '98765432000198', 'contratos@mobilidade.example', '+55 21 3333-2000', 'Rio de Janeiro - RJ');

INSERT INTO app.contrato_fornecedor
(fornecedor_id, numero_contrato, valor_total, data_inicio, data_fim, sla_percentual, status) VALUES
(1, 'CT-UMDR-2026-001', 850000.00, '2026-01-01', '2026-12-31', 97.50, 'VIGENTE'),
(2, 'CT-UMDR-2026-002', 420000.00, '2026-03-01', '2027-02-28', 95.00, 'VIGENTE');

INSERT INTO app.recall
(codigo_lote, nome_produto, motivo, data_abertura, data_limite, affected_devices, status, orgao_notificador) VALUES
('LOT-2026-0839', 'Colete Williams sob medida', 'Revisão preventiva do sistema de fechamento.', CURRENT_DATE - INTERVAL '12 days', CURRENT_DATE + INTERVAL '18 days', 14, 'ABERTO', 'ANVISA');

INSERT INTO app.relatorio_gerado (nome, tipo, formato, tamanho_bytes) VALUES
('Relatório mensal de fluxo', 'OPERACIONAL', 'PDF', 184320),
('Auditoria de fornecedores', 'CONFORMIDADE', 'CSV', 82944);

-- PERMISSÕES
GRANT SELECT ON app.fornecedor, app.contrato_fornecedor, app.parceria_ong, app.recall, app.relatorio_gerado TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA app TO authenticated;

GRANT USAGE ON SCHEMA app, dominio, fila, producao, faturamento TO service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA app, dominio, fila, producao, faturamento TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA app, dominio, fila, producao, faturamento TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app, dominio, fila, producao, faturamento TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA app, dominio, fila, producao, faturamento
    GRANT ALL PRIVILEGES ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA app, dominio, fila, producao, faturamento
    GRANT ALL PRIVILEGES ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA app, dominio, fila, producao, faturamento
    GRANT EXECUTE ON FUNCTIONS TO service_role;