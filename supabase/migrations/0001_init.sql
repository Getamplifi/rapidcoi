-- RapidCOI initial schema
-- Run this once in the Supabase SQL Editor on a fresh project.

-- ============================================================
-- TABLES
-- ============================================================

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('contractor', 'agent', 'admin')),
  business_name text,
  contact_name text,
  phone text,
  agent_id uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_profiles_agent_id on profiles(agent_id);

create table policies (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references profiles(id) on delete cascade,
  policy_type text not null check (policy_type in ('general_liability', 'auto', 'umbrella', 'workers_comp')),
  carrier_name text,
  naic_number text,
  policy_number text,
  effective_date date,
  expiration_date date,
  each_occurrence_limit numeric,
  general_aggregate_limit numeric,
  products_completed_ops_limit numeric,
  personal_injury_limit numeric,
  combined_single_limit numeric,
  umbrella_each_occurrence numeric,
  umbrella_aggregate numeric,
  wc_each_accident numeric,
  wc_disease_policy_limit numeric,
  wc_disease_each_employee numeric,
  additional_insured boolean not null default false,
  waiver_of_subrogation boolean not null default false,
  primary_noncontributory boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_policies_contractor_id on policies(contractor_id);

create table certificate_holders (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references profiles(id) on delete cascade,
  holder_name text not null,
  holder_address text,
  holder_city text,
  holder_state text,
  holder_zip text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_certificate_holders_contractor_id on certificate_holders(contractor_id);

create table coi_requests (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references profiles(id) on delete cascade,
  agent_id uuid not null references profiles(id),
  certificate_holder_id uuid references certificate_holders(id),
  certificate_holder_name text not null,
  certificate_holder_address text not null,
  description_of_operations text,
  has_exceptions boolean not null default false,
  exception_details text,
  status text not null default 'ready_for_review' check (status in ('ready_for_review', 'flagged', 'sent', 'rejected')),
  pdf_url text,
  sent_at timestamptz,
  sent_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_coi_requests_contractor_id on coi_requests(contractor_id);
create index idx_coi_requests_agent_id on coi_requests(agent_id);
create index idx_coi_requests_status on coi_requests(status);

-- ============================================================
-- updated_at TRIGGERS
-- ============================================================

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_profiles_updated_at before update on profiles
  for each row execute function set_updated_at();
create trigger trg_policies_updated_at before update on policies
  for each row execute function set_updated_at();
create trigger trg_certificate_holders_updated_at before update on certificate_holders
  for each row execute function set_updated_at();
create trigger trg_coi_requests_updated_at before update on coi_requests
  for each row execute function set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- RLS blocks all access by default the moment it's enabled below.
-- Every table gets policies in the same statement batch so nothing
-- is ever left wide open (or fully locked) in between.
-- ============================================================

alter table profiles enable row level security;
alter table policies enable row level security;
alter table certificate_holders enable row level security;
alter table coi_requests enable row level security;

-- profiles: you can see yourself, your agent can see you, admin sees all.
-- No insert policy on purpose — contractor accounts are created server-side
-- (via the service role key) by their agent. No self-signup.
create policy "profiles_select_own" on profiles for select
  using (id = auth.uid());
create policy "profiles_select_agent_contractors" on profiles for select
  using (agent_id = auth.uid());
create policy "profiles_select_admin_all" on profiles for select
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy "profiles_update_own" on profiles for update
  using (id = auth.uid());

-- policies: contractor owns their own policy data, their agent can view it, admin sees all.
create policy "policies_select_own" on policies for select
  using (contractor_id = auth.uid());
create policy "policies_select_agent" on policies for select
  using (exists (select 1 from profiles p where p.id = contractor_id and p.agent_id = auth.uid()));
create policy "policies_select_admin" on policies for select
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy "policies_insert_own" on policies for insert
  with check (contractor_id = auth.uid());
create policy "policies_update_own" on policies for update
  using (contractor_id = auth.uid());
create policy "policies_delete_own" on policies for delete
  using (contractor_id = auth.uid());

-- certificate_holders: same shape as policies.
create policy "holders_select_own" on certificate_holders for select
  using (contractor_id = auth.uid());
create policy "holders_select_agent" on certificate_holders for select
  using (exists (select 1 from profiles p where p.id = contractor_id and p.agent_id = auth.uid()));
create policy "holders_select_admin" on certificate_holders for select
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy "holders_insert_own" on certificate_holders for insert
  with check (contractor_id = auth.uid());
create policy "holders_update_own" on certificate_holders for update
  using (contractor_id = auth.uid());
create policy "holders_delete_own" on certificate_holders for delete
  using (contractor_id = auth.uid());

-- coi_requests: contractor can see + create their own requests, but only into
-- their own assigned agent's queue. Agent can see + update requests assigned
-- to them (this is how they mark a request "sent"). Admin sees all.
-- Status/pdf_url changes from auto-generation happen via the service role key
-- in the /api serverless functions, which bypasses RLS entirely.
create policy "requests_select_own" on coi_requests for select
  using (contractor_id = auth.uid());
create policy "requests_select_agent" on coi_requests for select
  using (agent_id = auth.uid());
create policy "requests_select_admin" on coi_requests for select
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy "requests_insert_own" on coi_requests for insert
  with check (
    contractor_id = auth.uid()
    and agent_id = (select agent_id from profiles where id = auth.uid())
  );
create policy "requests_update_agent" on coi_requests for update
  using (agent_id = auth.uid());
