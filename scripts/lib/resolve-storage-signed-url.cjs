'use strict';

/**
 * Raw Supabase Storage signing may return /object/sign/... relative to
 * the /storage/v1 API. Resolve without dropping that API prefix.
 * Never log signed URLs or tokens.
 */
function resolveStorageSignedUrl(raw, projectUrl, bucket, objectKey) {
  if (typeof raw !== 'string' || !raw) throw Error('Missing Storage signed URL.');
  const project = new URL(projectUrl);
  let url;
  if (raw.startsWith('/object/sign/')) {
    url = new URL('/storage/v1' + raw, project);
  } else if (raw.startsWith('/storage/v1/object/sign/')) {
    url = new URL(raw, project);
  } else if (raw.startsWith('https://')) {
    url = new URL(raw);
  } else {
    throw Error('Unexpected Storage signed URL format.');
  }
  if (url.origin !== project.origin || url.protocol !== 'https:') {
    throw Error('Unexpected Storage signed URL origin.');
  }
  const expected = '/storage/v1/object/sign/' + bucket + '/' + objectKey;
  if (url.pathname !== expected || !url.searchParams.get('token')) {
    throw Error('Unexpected Storage signed URL path or missing token.');
  }
  return url;
}

module.exports = { resolveStorageSignedUrl };
