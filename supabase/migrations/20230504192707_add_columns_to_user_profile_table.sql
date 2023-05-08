alter table "public"."profiles" add column "occupation" text;

alter table "public"."profiles" add column "preferred_choice" jsonb;

alter table "public"."profiles" add column "use_case" jsonb;

alter table "public"."profiles" add column "value_features" jsonb;