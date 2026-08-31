DO $$
BEGIN
  -- These tables exist only on newer Supabase Storage schemas.
  -- Make grants conditional so local dev doesn't fail when they're absent.
  IF to_regclass('storage.s3_multipart_uploads') IS NOT NULL THEN
    EXECUTE 'grant delete on table "storage"."s3_multipart_uploads" to "postgres"';
    EXECUTE 'grant insert on table "storage"."s3_multipart_uploads" to "postgres"';
    EXECUTE 'grant references on table "storage"."s3_multipart_uploads" to "postgres"';
    EXECUTE 'grant select on table "storage"."s3_multipart_uploads" to "postgres"';
    EXECUTE 'grant trigger on table "storage"."s3_multipart_uploads" to "postgres"';
    EXECUTE 'grant truncate on table "storage"."s3_multipart_uploads" to "postgres"';
    EXECUTE 'grant update on table "storage"."s3_multipart_uploads" to "postgres"';
  END IF;

  IF to_regclass('storage.s3_multipart_uploads_parts') IS NOT NULL THEN
    EXECUTE 'grant delete on table "storage"."s3_multipart_uploads_parts" to "postgres"';
    EXECUTE 'grant insert on table "storage"."s3_multipart_uploads_parts" to "postgres"';
    EXECUTE 'grant references on table "storage"."s3_multipart_uploads_parts" to "postgres"';
    EXECUTE 'grant select on table "storage"."s3_multipart_uploads_parts" to "postgres"';
    EXECUTE 'grant trigger on table "storage"."s3_multipart_uploads_parts" to "postgres"';
    EXECUTE 'grant truncate on table "storage"."s3_multipart_uploads_parts" to "postgres"';
    EXECUTE 'grant update on table "storage"."s3_multipart_uploads_parts" to "postgres"';
  END IF;
END $$;
