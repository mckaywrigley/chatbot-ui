create policy "Public Access for read"
on storage.objects for select
using ( bucket_id = 'public' );

alter table storage.buckets enable row level security;