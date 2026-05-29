-- Estrutura inicial Sistema RN BRS
create table if not exists rn_registros (
  id bigserial primary key,
  numero text unique not null,
  data_abertura timestamp with time zone default now(),
  status text not null default 'Aberto',
  origem text not null,
  setor text,
  cliente text,
  pedido text,
  equipamento text,
  tag text,
  serie text,
  categoria text,
  severidade text,
  problema_relatado text,
  diagnostico_tecnico text,
  causa_raiz text,
  acao_executada text,
  tecnico_responsavel text,
  runrun_id text,
  runrun_link text,
  prazo_resolucao date,
  data_fechamento timestamp with time zone,
  responsavel_financeiro text,
  custo_total numeric default 0,
  created_at timestamp with time zone default now()
);

create table if not exists rn_custos (
  id bigserial primary key,
  rn_id bigint references rn_registros(id) on delete cascade,
  tipo text not null,
  descricao text,
  quantidade numeric default 1,
  valor_unitario numeric default 0,
  valor_total numeric generated always as (quantidade * valor_unitario) stored,
  created_at timestamp with time zone default now()
);

create table if not exists rn_historico (
  id bigserial primary key,
  rn_id bigint references rn_registros(id) on delete cascade,
  data_evento timestamp with time zone default now(),
  usuario text,
  descricao text not null,
  status_novo text
);

create table if not exists rn_fotos (
  id bigserial primary key,
  rn_id bigint references rn_registros(id) on delete cascade,
  tipo text,
  url text not null,
  observacao text,
  created_at timestamp with time zone default now()
);
