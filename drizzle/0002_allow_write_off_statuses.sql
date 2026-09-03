alter table public.transactions drop constraint if exists transactions_status_check;

alter table public.transactions
  add constraint transactions_status_check
  check (status = any (array[
    'receivable'::text,
    'payable'::text,
    'expected'::text,
    'paid'::text,
    'defaulted'::text,
    'loss'::text
  ]));
