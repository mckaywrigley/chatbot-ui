drop trigger if exists "update_design_workspaces_updated_at" on "public"."design_workspaces";

drop trigger if exists "update_designs_updated_at" on "public"."designs";

drop policy "Allow full access to own design_workspaces" on "public"."design_workspaces";

drop policy "Allow full access to own designs" on "public"."designs";

drop policy "Allow view access to non-private designs" on "public"."designs";

revoke delete on table "public"."design_workspaces" from "anon";

revoke insert on table "public"."design_workspaces" from "anon";

revoke references on table "public"."design_workspaces" from "anon";

revoke select on table "public"."design_workspaces" from "anon";

revoke trigger on table "public"."design_workspaces" from "anon";

revoke truncate on table "public"."design_workspaces" from "anon";

revoke update on table "public"."design_workspaces" from "anon";

revoke delete on table "public"."design_workspaces" from "authenticated";

revoke insert on table "public"."design_workspaces" from "authenticated";

revoke references on table "public"."design_workspaces" from "authenticated";

revoke select on table "public"."design_workspaces" from "authenticated";

revoke trigger on table "public"."design_workspaces" from "authenticated";

revoke truncate on table "public"."design_workspaces" from "authenticated";

revoke update on table "public"."design_workspaces" from "authenticated";

revoke delete on table "public"."design_workspaces" from "service_role";

revoke insert on table "public"."design_workspaces" from "service_role";

revoke references on table "public"."design_workspaces" from "service_role";

revoke select on table "public"."design_workspaces" from "service_role";

revoke trigger on table "public"."design_workspaces" from "service_role";

revoke truncate on table "public"."design_workspaces" from "service_role";

revoke update on table "public"."design_workspaces" from "service_role";

revoke delete on table "public"."designs" from "anon";

revoke insert on table "public"."designs" from "anon";

revoke references on table "public"."designs" from "anon";

revoke select on table "public"."designs" from "anon";

revoke trigger on table "public"."designs" from "anon";

revoke truncate on table "public"."designs" from "anon";

revoke update on table "public"."designs" from "anon";

revoke delete on table "public"."designs" from "authenticated";

revoke insert on table "public"."designs" from "authenticated";

revoke references on table "public"."designs" from "authenticated";

revoke select on table "public"."designs" from "authenticated";

revoke trigger on table "public"."designs" from "authenticated";

revoke truncate on table "public"."designs" from "authenticated";

revoke update on table "public"."designs" from "authenticated";

revoke delete on table "public"."designs" from "service_role";

revoke insert on table "public"."designs" from "service_role";

revoke references on table "public"."designs" from "service_role";

revoke select on table "public"."designs" from "service_role";

revoke trigger on table "public"."designs" from "service_role";

revoke truncate on table "public"."designs" from "service_role";

revoke update on table "public"."designs" from "service_role";

alter table "public"."design_workspaces" drop constraint "design_workspaces_design_id_fkey";

alter table "public"."design_workspaces" drop constraint "design_workspaces_user_id_fkey";

alter table "public"."design_workspaces" drop constraint "design_workspaces_workspace_id_fkey";

alter table "public"."designs" drop constraint "designs_description_check";

alter table "public"."designs" drop constraint "designs_folder_id_fkey";

alter table "public"."designs" drop constraint "designs_name_check";

alter table "public"."designs" drop constraint "designs_user_id_fkey";

alter table "public"."design_workspaces" drop constraint "design_workspaces_pkey";

alter table "public"."designs" drop constraint "designs_pkey";

drop index if exists "public"."design_workspaces_design_id_idx";

drop index if exists "public"."design_workspaces_pkey";

drop index if exists "public"."design_workspaces_user_id_idx";

drop index if exists "public"."design_workspaces_workspace_id_idx";

drop index if exists "public"."designs_pkey";

drop index if exists "public"."designs_user_id_idx";

drop index if exists "public"."report_collections_collection_id_idx";

drop index if exists "public"."report_collections_user_id_idx";

drop index if exists "public"."report_files_file_id_idx";

drop index if exists "public"."report_files_report_id_idx";

drop index if exists "public"."report_files_user_id_idx";

drop index if exists "public"."report_workspaces_user_id_idx";

drop index if exists "public"."report_workspaces_workspace_id_idx";

drop index if exists "public"."reports_user_id_idx";

drop table "public"."design_workspaces";

drop table "public"."designs";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.delete_storage_object(bucket text, object text, OUT status integer, OUT content text)
 RETURNS record
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  project_url TEXT := 'https://qcimhigugrhkabavqfgz.supabase.co';
  service_role_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjaW1oaWd1Z3Joa2FiYXZxZmd6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTA3MDM0OSwiZXhwIjoyMDY0NjQ2MzQ5fQ.PYBkksLTZ-Orwod-fuZMCuzoJWSZKXCkpepTfaNMM1A';
  url TEXT := project_url || '/storage/v1/object/' || bucket || '/' || object;
BEGIN
  SELECT
      INTO status, content
           result.status::INT, result.content::TEXT
      FROM extensions.http((
    'DELETE',
    url,
    ARRAY[extensions.http_header('authorization','Bearer ' || service_role_key)],
    NULL,
    NULL)::extensions.http_request) AS result;
END;
$function$
;


