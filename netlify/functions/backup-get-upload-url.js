import B2 from 'backblaze-b2';
import { createClient } from '@supabase/supabase-js';

const b2 = new B2({
  applicationKeyId: process.env.B2_KEY_ID,
  applicationKey: process.env.B2_APP_KEY,
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  }

  const authHeader = event.headers.authorization;
  if (!authHeader) {
    return { statusCode: 401, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return { statusCode: 401, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Invalid authentication token' }) };
  }

  const { fileName } = JSON.parse(event.body || '{}');

  if (!fileName) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Missing fileName' }) };
  }

  try {
    await b2.authorize();
    const uploadUrlData = await b2.getUploadUrl({ bucketId: process.env.B2_BUCKET_ID });

    const uploadPath = `backup/${user.id}/${Date.now()}-${fileName}`;

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        uploadUrl: uploadUrlData.data.uploadUrl,
        authorizationToken: uploadUrlData.data.authorizationToken,
        uploadPath,
      }),
    };
  } catch (error) {
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: error.message }) };
  }
};
