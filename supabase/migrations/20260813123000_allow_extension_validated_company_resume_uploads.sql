-- Browser-provided MIME metadata is not reliable for otherwise valid PDF/DOCX
-- files. Keep the private bucket, 10MB cap and extension/ownership RLS policy;
-- remove only the Storage MIME allow-list that rejects those browser uploads.
update storage.buckets
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = null
where id = 'company-resumes';
