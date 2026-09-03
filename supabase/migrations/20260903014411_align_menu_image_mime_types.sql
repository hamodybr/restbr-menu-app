-- Keep the Storage bucket aligned with the image types accepted by admin.html.
-- AVIF remains limited to the same authenticated admin upload policy and 10 MB cap.
update storage.buckets
set allowed_mime_types = array[
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif'
]::text[]
where id = 'menu-images';
