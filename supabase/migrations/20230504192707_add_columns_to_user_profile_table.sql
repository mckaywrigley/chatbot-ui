alter table "public"."profiles" add column "occupation" text;

alter table "public"."profiles" add column "preferred_choice" jsonb;

alter table "public"."profiles" add column "use_case" jsonb;

alter table "public"."profiles" add column "value_features" jsonb;


CREATE POLICY "Allow user to insert survey form information into their row" ON "public"."profiles"
AS PERMISSIVE FOR UPDATE
TO public
USING ((auth.uid() = id))
WITH CHECK (true);