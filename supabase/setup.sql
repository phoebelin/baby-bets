-- ============================================================
-- Baby Bets — full Supabase setup (run once)
--
-- How to run:
--   1. Change the admin passcode below (search for CHANGE_ME).
--   2. Optionally edit the trivia questions at the bottom.
--   3. Supabase dashboard → SQL Editor → paste this whole file → Run.
--
-- Safe to re-run: tables are create-if-missing, functions are
-- replaced, and the passcode/questions sections say what they do.
-- ============================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------- tables ----------

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_key text not null unique,          -- lowercased/trimmed, for resume-by-name
  coins int not null default 2 check (coins >= 0),
  reveal_winnings int not null default 0, -- profit credited at the reveal
  created_at timestamptz not null default now()
);

create table if not exists bets (
  id bigint generated always as identity primary key,
  player_id uuid not null references players(id),
  side text not null check (side in ('boy','girl')),
  amount int not null check (amount > 0),
  created_at timestamptz not null default now()
);

create table if not exists trivia_questions (
  id bigint generated always as identity primary key,
  sort int not null,
  question text not null,
  options jsonb not null,   -- array of option strings
  correct_index int not null
);

create table if not exists trivia_answers (
  id bigint generated always as identity primary key,
  player_id uuid not null references players(id),
  question_id bigint not null references trivia_questions(id),
  answer_index int not null,
  is_correct boolean not null,
  created_at timestamptz not null default now(),
  unique (player_id, question_id)
);

create table if not exists game_state (
  id int primary key check (id = 1),
  betting_open boolean not null default true,
  trivia_open boolean not null default false,
  revealed boolean not null default false,
  actual_gender text check (actual_gender in ('boy','girl')),
  payouts_settled boolean not null default false
);

create table if not exists admin_config (
  id int primary key check (id = 1),
  passcode_hash text not null
);

insert into game_state (id) values (1) on conflict do nothing;

-- vvvvvvvvvv CHANGE_ME: pick your admin passcode vvvvvvvvvv
insert into admin_config (id, passcode_hash)
values (1, extensions.crypt('babybets', extensions.gen_salt('bf')))
on conflict (id) do update set passcode_hash = excluded.passcode_hash;
-- ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

-- ---------- row-level security ----------
-- Guests (anon key) may READ the public tables; every write goes through
-- the RPCs below. trivia_questions (holds answers) and admin_config have
-- no policies, so they are unreadable from the client.

alter table players enable row level security;
alter table bets enable row level security;
alter table trivia_questions enable row level security;
alter table trivia_answers enable row level security;
alter table game_state enable row level security;
alter table admin_config enable row level security;

drop policy if exists "public read" on players;
create policy "public read" on players for select to anon, authenticated using (true);
drop policy if exists "public read" on bets;
create policy "public read" on bets for select to anon, authenticated using (true);
drop policy if exists "public read" on trivia_answers;
create policy "public read" on trivia_answers for select to anon, authenticated using (true);
drop policy if exists "public read" on game_state;
create policy "public read" on game_state for select to anon, authenticated using (true);

-- Questions without the answer key, for the client.
create or replace view trivia_public as
  select id, sort, question, options from trivia_questions;
grant select on trivia_public to anon, authenticated;

-- ---------- functions (all writes) ----------

create or replace function verify_admin(p_passcode text)
returns boolean
language sql security definer set search_path = public as $$
  select exists (
    select 1 from admin_config
    where passcode_hash = extensions.crypt(p_passcode, passcode_hash)
  );
$$;

-- Create a player, or resume the existing one with the same name.
create or replace function join_game(p_name text)
returns players
language plpgsql security definer set search_path = public as $$
declare
  v_key text := lower(trim(p_name));
  v_player players;
begin
  if v_key = '' or v_key is null then
    raise exception 'Please enter a name';
  end if;
  if length(v_key) > 40 then
    raise exception 'That name is a bit long';
  end if;
  select * into v_player from players where name_key = v_key;
  if found then
    return v_player;
  end if;
  begin
    insert into players (name, name_key)
    values (trim(p_name), v_key)
    returning * into v_player;
  exception when unique_violation then
    select * into v_player from players where name_key = v_key;
  end;
  return v_player;
end;
$$;

-- Atomically deduct coins and record a bet.
create or replace function place_bet(p_player_id uuid, p_side text, p_amount int)
returns players
language plpgsql security definer set search_path = public as $$
declare
  v_state game_state;
  v_player players;
begin
  select * into v_state from game_state where id = 1;
  if v_state.revealed or not v_state.betting_open then
    raise exception 'Betting is closed';
  end if;
  if p_side not in ('boy','girl') then
    raise exception 'Invalid side';
  end if;
  if p_amount is null or p_amount < 1 then
    raise exception 'Bet at least 1 coin';
  end if;
  update players
     set coins = coins - p_amount
   where id = p_player_id and coins >= p_amount
   returning * into v_player;
  if not found then
    raise exception 'Not enough coins';
  end if;
  insert into bets (player_id, side, amount) values (p_player_id, p_side, p_amount);
  return v_player;
end;
$$;

-- Grade an answer server-side; +1 coin when correct. One try per question.
create or replace function submit_answer(p_player_id uuid, p_question_id bigint, p_answer_index int)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_state game_state;
  v_q trivia_questions;
  v_correct boolean;
begin
  select * into v_state from game_state where id = 1;
  if not v_state.trivia_open then
    raise exception 'Trivia is closed';
  end if;
  select * into v_q from trivia_questions where id = p_question_id;
  if not found then
    raise exception 'Unknown question';
  end if;
  v_correct := (p_answer_index = v_q.correct_index);
  begin
    insert into trivia_answers (player_id, question_id, answer_index, is_correct)
    values (p_player_id, p_question_id, p_answer_index, v_correct);
  exception when unique_violation then
    raise exception 'Already answered';
  end;
  if v_correct then
    update players set coins = coins + 1 where id = p_player_id;
  end if;
  return jsonb_build_object('is_correct', v_correct, 'correct_index', v_q.correct_index);
end;
$$;

-- Admin: open/close betting and trivia (null = leave unchanged).
create or replace function admin_update_state(
  p_passcode text,
  p_betting_open boolean default null,
  p_trivia_open boolean default null
)
returns game_state
language plpgsql security definer set search_path = public as $$
declare
  v_state game_state;
begin
  if not verify_admin(p_passcode) then
    raise exception 'Wrong passcode';
  end if;
  update game_state
     set betting_open = coalesce(p_betting_open, betting_open),
         trivia_open  = coalesce(p_trivia_open, trivia_open)
   where id = 1
   returning * into v_state;
  return v_state;
end;
$$;

-- Admin: THE moment. Locks the game, records the gender, and settles the
-- parimutuel pool: winners get their stake back plus a pro-rata share of
-- the losing pool (integer floors; leftover coins go one-each to the
-- biggest backers). If nobody bet the winning side, all stakes are refunded.
-- Idempotent via the payouts_settled guard.
create or replace function settle_reveal(p_passcode text, p_gender text)
returns game_state
language plpgsql security definer set search_path = public as $$
declare
  v_state game_state;
  v_win_pool int;
  v_lose_pool int;
  v_paid int;
  v_remainder int;
  r record;
begin
  if not verify_admin(p_passcode) then
    raise exception 'Wrong passcode';
  end if;
  if p_gender not in ('boy','girl') then
    raise exception 'Invalid gender';
  end if;

  select * into v_state from game_state where id = 1 for update;
  if v_state.payouts_settled then
    return v_state;
  end if;

  update game_state
     set revealed = true,
         actual_gender = p_gender,
         betting_open = false,
         trivia_open = false
   where id = 1;

  select coalesce(sum(amount) filter (where side = p_gender), 0),
         coalesce(sum(amount) filter (where side <> p_gender), 0)
    into v_win_pool, v_lose_pool
    from bets;

  if v_win_pool = 0 then
    -- No winners to pay: refund every stake.
    update players p
       set coins = coins + s.total
      from (select player_id, sum(amount) as total from bets group by player_id) s
     where p.id = s.player_id;
  else
    create temp table winner_stakes on commit drop as
      select player_id, sum(amount)::int as stake
        from bets where side = p_gender group by player_id;

    update players p
       set coins = coins + w.stake + (w.stake * v_lose_pool / v_win_pool),
           reveal_winnings = (w.stake * v_lose_pool / v_win_pool)
      from winner_stakes w
     where p.id = w.player_id;

    select coalesce(sum(stake * v_lose_pool / v_win_pool), 0)
      into v_paid from winner_stakes;
    v_remainder := v_lose_pool - v_paid;

    for r in
      select player_id from winner_stakes
       order by stake desc, player_id
       limit greatest(v_remainder, 0)
    loop
      update players
         set coins = coins + 1,
             reveal_winnings = reveal_winnings + 1
       where id = r.player_id;
    end loop;
  end if;

  update game_state set payouts_settled = true where id = 1
    returning * into v_state;
  return v_state;
end;
$$;

-- Admin: wipe every player/bet/answer and reset betting & trivia to their
-- starting state. For clearing out testing data before the real party.
create or replace function admin_reset_game(p_passcode text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not verify_admin(p_passcode) then
    raise exception 'Wrong passcode';
  end if;
  delete from trivia_answers where true;
  delete from bets where true;
  delete from players where true;
  update game_state
     set betting_open = true,
         trivia_open = false,
         revealed = false,
         actual_gender = null,
         payouts_settled = false
   where id = 1;
end;
$$;

grant execute on function
  verify_admin(text),
  join_game(text),
  place_bet(uuid, text, int),
  submit_answer(uuid, bigint, int),
  admin_update_state(text, boolean, boolean),
  settle_reveal(text, text),
  admin_reset_game(text)
to anon, authenticated;

-- ---------- realtime ----------
-- Push game-state flips, new bets, and coin changes to every open phone.

do $$
begin
  alter publication supabase_realtime add table game_state;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table bets;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table players;
exception when duplicate_object then null;
end $$;

-- ---------- trivia questions ----------
-- Placeholder set. Replace with your own about the parents-to-be!
-- Format: sort order, question, JSON array of options, index (0-based)
-- of the correct option. Only inserts when the table is empty, so
-- edit + re-run won't duplicate. To start over:  delete from trivia_questions;

insert into trivia_questions (sort, question, options, correct_index)
select * from (values
  (1,  'How many bones does a newborn baby have?',
       '["About 100","About 206","About 300","About 450"]'::jsonb, 2),
  (2,  'Within hours of being born, a newborn can already do which of these?',
       '["Smile at Mom","Copy you sticking out your tongue","Follow a toy with their eyes","Reach for something"]'::jsonb, 1),
  (3,  'Roughly how many diapers does a baby go through in the first year?',
       '["800","1,500","2,500","5,000"]'::jsonb, 2),
  (4,  'Which sense is fully developed at birth?',
       '["Sight","Hearing","Taste","None of them"]'::jsonb, 1),
  (5,  'Compared to adults, where do newborns have taste buds that adults don''t?',
       '["Inside of cheeks and throat","Tip of the tongue only","Lips and gums","Same as adults"]'::jsonb, 0),
  (6,  'Roughly how many babies born in the U.S. are twins?',
       '["About 3 in 1,000","About 12 in 1,000","About 33 in 1,000","About 60 in 1,000"]'::jsonb, 2),
  (7,  'What color will most babies'' eyes be at birth?',
       '["Brown","Green","Gray-blue","Purple"]'::jsonb, 2),
  (8,  'A newborn''s stomach on day one is about the size of a…',
       '["Cherry","Egg","Orange","Grapefruit"]'::jsonb, 0),
  (9,  'Believe it or not, babies can do this while still in the womb:',
       '["Yawn","Get the hiccups","Suck their thumb","All of the above"]'::jsonb, 3),
  (10, 'Which of these is a real newborn reflex?',
       '["Curl their toes tight when tickled","Fan their toes out when the sole of their foot is stroked","Cross their eyes when startled","Wrinkle their nose when a light turns on"]'::jsonb, 1),
  (11, 'What was Phoebe''s first food craving?',
       '["Quesadilla","Hot Cheetos","None","Kimchi"]'::jsonb, 2),
  (12, 'What video game was David obsessed with during the pregnancy?',
       '["Tennis Clash","Stardew Valley","FIFA","Pokopia"]'::jsonb, 0)
) as seed(sort, question, options, correct_index)
where not exists (select 1 from trivia_questions);
