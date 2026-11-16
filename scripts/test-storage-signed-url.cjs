'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { resolveStorageSignedUrl } = require('./lib/resolve-storage-signed-url.cjs');

const origin = 'https://test-project.supabase.co';
const bucket = 'wow-verification-evidence';
const key = 'business-verifications/a-b-c/user_abc/fixture.pdf';
const suffix = '/object/sign/' + bucket + '/' + key + '?token=placeholder-test-value';
const expected = origin + '/storage/v1' + suffix;

test('Raw Supabase Storage signed response has its /storage/v1 prefix restored', () => {
  assert.equal(resolveStorageSignedUrl(suffix, origin, bucket, key).href, expected);
});

test('Already prefixed and full signed URLs remain unchanged', () => {
  assert.equal(resolveStorageSignedUrl('/storage/v1' + suffix, origin, bucket, key).href, expected);
  assert.equal(resolveStorageSignedUrl(expected, origin, bucket, key).href, expected);
});

test('Never follow a signed URL to a different origin, bucket or path', () => {
  for (const input of [
    'https://example.net/storage/v1' + suffix,
    '/object/sign/other-bucket/' + key + '?token=placeholder-test-value',
    '/object/sign/' + bucket + '/different-file.pdf?token=placeholder-test-value',
    '/object/public/' + bucket + '/' + key,
    '/storage/v1/object/sign/' + bucket + '/' + key,
    'object/sign/' + bucket + '/' + key + '?token=placeholder-test-value',
    '',
  ]) assert.throws(() => resolveStorageSignedUrl(input, origin, bucket, key));
});
