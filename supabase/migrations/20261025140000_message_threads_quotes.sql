-- Conversations that hold the whole story (communication plan, step 3).
--
-- 1. A quote request is a conversation. message_threads.quote_request_id
--    links the two, one thread per request (like order_id), so a question
--    about a quote, the supplier's answer and what follows sit together.
-- 2. The site writes into a conversation too: "the supplier confirmed the
--    order", "a price was quoted". Those rows have sender 'system'. They do not
--    move last_message_at or last_sender, so they never make a thread look
--    unanswered; the bell already tells each side about them.
-- 3. A message is saved, and its thread updated, in one transaction
--    (post_message). Before, the message could be saved while the thread
--    update failed, and the other side's inbox never showed it.
-- 4. client_id makes a resend safe: the browser sends the same id when it
--    retries after a lost answer, and the second insert returns the first row.
--
-- Additive, except the sender check, which is widened. RLS stays on, no policy.

alter table public.message_threads
  add column if not exists quote_request_id uuid references public.quote_requests(id) on delete set null;
create unique index if not exists message_threads_quote_idx
  on public.message_threads(quote_request_id) where quote_request_id is not null;

alter table public.messages drop constraint if exists messages_sender_check;
alter table public.messages add constraint messages_sender_check check (sender in ('carpenter', 'supplier', 'system'));

alter table public.messages add column if not exists client_id uuid;
create unique index if not exists messages_client_idx
  on public.messages(thread_id, client_id) where client_id is not null;

create or replace function public.post_message(p_thread uuid, p_sender text, p_body text, p_client_id uuid default null)
returns public.messages
language plpgsql
security definer
set search_path = public
as $$
declare
  saved public.messages;
begin
  if p_client_id is not null then
    select * into saved from public.messages where thread_id = p_thread and client_id = p_client_id;
    if found then
      return saved;
    end if;
  end if;

  insert into public.messages (thread_id, sender, body, client_id)
  values (p_thread, p_sender, p_body, p_client_id)
  returning * into saved;

  if p_sender <> 'system' then
    update public.message_threads
       set last_message_at = saved.created_at,
           last_sender = p_sender,
           status = 'open',
           carpenter_last_read_at = case when p_sender = 'carpenter' then saved.created_at else carpenter_last_read_at end,
           supplier_last_read_at = case when p_sender = 'supplier' then saved.created_at else supplier_last_read_at end
     where id = p_thread;
  end if;

  return saved;
end;
$$;

revoke all on function public.post_message(uuid, text, text, uuid) from public, anon, authenticated;
grant execute on function public.post_message(uuid, text, text, uuid) to service_role;
