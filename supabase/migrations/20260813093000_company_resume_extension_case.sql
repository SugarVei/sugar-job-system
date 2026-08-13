-- Files selected by Windows may have an upper-case extension (for example PDF).
-- Treat the extension case-insensitively while keeping the private user folder rule.
drop policy if exists "company_resumes_insert_own" on storage.objects;
create policy "company_resumes_insert_own" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'company-resumes'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and lower(storage.extension(name)) in ('pdf', 'docx')
  );
