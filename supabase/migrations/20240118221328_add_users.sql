-- USERS TABLE
create table public.users (
  id uuid not null primary key, -- UUID from auth.users
  email text
);
 
-- TRIGGERS

create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
  
-- Enable RLS on the users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create a policy that lets all users read all data
CREATE POLICY users_read_all ON public.users
FOR SELECT USING (
  true
);

--- Update public.users with current auth.users
INSERT INTO public.users (id, email)
SELECT id, email FROM auth.users
ON CONFLICT (id) DO NOTHING;