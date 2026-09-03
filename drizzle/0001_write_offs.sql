create table if not exists public.write_offs (
  id bigint generated always as identity primary key,
  transaction_id bigint not null unique references public.transactions(id) on delete cascade,
  client_id bigint references public.clients(id) on delete set null,
  kind text not null check (kind in ('calote', 'prejuizo')),
  amount numeric(12, 2) not null,
  description text not null,
  counterparty text not null default '',
  notes text,
  occurred_on date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists write_offs_occurred_on_idx on public.write_offs (occurred_on);
create index if not exists write_offs_client_id_idx on public.write_offs (client_id);
create index if not exists write_offs_kind_idx on public.write_offs (kind);

alter table public.write_offs enable row level security;
