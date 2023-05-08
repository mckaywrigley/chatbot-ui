create table "public"."user_survey" (
    "id" uuid not null,
    "created_at" timestamp with time zone default now(),
    "name" text,
    "occupation" text,
    "use_case" jsonb,
    "value_features" jsonb,
    "preferred_choice" jsonb,
    "comments" text
);


alter table "public"."user_survey" enable row level security;

alter table "public"."profiles" drop column "name";

alter table "public"."profiles" drop column "occupation";

alter table "public"."profiles" drop column "preferred_choice";

alter table "public"."profiles" drop column "use_case";

alter table "public"."profiles" drop column "value_features";

CREATE UNIQUE INDEX user_survey_pkey ON public.user_survey USING btree (id);

alter table "public"."user_survey" add constraint "user_survey_pkey" PRIMARY KEY using index "user_survey_pkey";

alter table "public"."user_survey" add constraint "user_survey_id_fkey" FOREIGN KEY (id) REFERENCES profiles(id) ON DELETE CASCADE not valid;

alter table "public"."user_survey" validate constraint "user_survey_id_fkey";


CREATE POLICY "Enable insert for authenticated users only" ON "public"."user_survey"
AS PERMISSIVE FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable read access for all users" ON "public"."user_survey"
AS PERMISSIVE FOR SELECT
TO public
USING (true);
