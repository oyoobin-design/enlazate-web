-- 유저별 일일 API 사용량
create table if not exists public.api_usage (
  user_id  uuid    not null references auth.users(id) on delete cascade,
  date     date    not null default current_date,
  endpoint text    not null,
  count    integer not null default 0,
  primary key (user_id, date, endpoint)
);

alter table public.api_usage enable row level security;

create policy "본인 사용량만 조회/수정"
  on public.api_usage for all
  using (auth.uid() = user_id);

-- IP별 일일 API 사용량 (어뷰저 차단용)
create table if not exists public.ip_usage (
  ip       text    not null,
  date     date    not null default current_date,
  endpoint text    not null,
  count    integer not null default 0,
  primary key (ip, date, endpoint)
);

-- ip_usage는 서버에서만 접근 (RLS로 일반 유저 접근 차단)
alter table public.ip_usage enable row level security;
-- 아무 정책도 없으면 anon/authenticated 모두 접근 불가 → service_role만 가능
