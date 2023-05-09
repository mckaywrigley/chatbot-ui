create table "public"."user_survey" (
    "id" uuid primary key default gen_random_uuid(),
    "uid" uuid references auth.users on delete cascade,
    "non_login_uid" uuid,
    "created_at" timestamp with time zone default now(),
    "name" text,
    "occupation" text,
    "use_case" jsonb,
    "value_features" jsonb,
    "preferred_choice" jsonb,
    "comments" text,
    unique ("non_login_uid", "uid")
);

-- Enable row level security
alter table "public"."user_survey" enable row level security;

create policy "Enable insert for everyone" 
on "public"."user_survey"
for insert
with check (true);

create policy "Allow access to user's own survey" 
on "public"."user_survey"
for select
using (uid = auth.uid());

-- Drop the specified columns from the profiles table
alter table "public"."profiles" drop column "name";
alter table "public"."profiles" drop column "occupation";
alter table "public"."profiles" drop column "preferred_choice";
alter table "public"."profiles" drop column "use_case";
alter table "public"."profiles" drop column "value_features";