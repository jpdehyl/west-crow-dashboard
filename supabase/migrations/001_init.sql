create table if not exists bids (
  id text primary key,
  project_name text not null,
  client text,
  client_id text,
  bid_value numeric default 0,
  deadline date,
  status text default 'active',
  estimator text,
  notes text,
  source text,
  dropbox_folder text,
  documents jsonb default '[]',
  estimate_data text,
  timeline jsonb default '[]',
  margin_pct numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists clients (
  id text primary key,
  name text not null,
  contact_name text,
  phone text,
  email text,
  notes text,
  created_at timestamptz default now()
);

create table if not exists projects (
  id text primary key,
  bid_id text references bids(id),
  project_name text,
  client text,
  status text,
  start_date date,
  end_date date,
  foreman text,
  total numeric,
  gp numeric,
  created_at timestamptz default now()
);
