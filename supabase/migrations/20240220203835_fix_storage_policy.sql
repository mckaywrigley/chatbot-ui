CREATE OR REPLACE FUNCTION public.non_private_assistant_exists(p_name text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM assistants
        -- replacing storage.filename with (storage.foldername(name))[2] since the path is
        -- <user-id>/<assistant-id>/<file-id>
        -- storage.filename(name) returns <file-id> which is icorrect 
        -- while (storage.foldername(name))[2] returns correct <assistant-id>
        WHERE (id::text = (storage.foldername(p_name)[2])) AND sharing <> 'private'
    );
$$;
