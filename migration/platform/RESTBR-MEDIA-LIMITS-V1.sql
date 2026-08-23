-- RESTBR MEDIA LIMITS V1
-- Global storage safety ceiling. More specific product/logo compression is
-- enforced client-side by owner/media-policy-v2.js.
update storage.buckets
set file_size_limit = 12582912,
    allowed_mime_types = array[
      'image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm'
    ]::text[]
where id='menu-images';
