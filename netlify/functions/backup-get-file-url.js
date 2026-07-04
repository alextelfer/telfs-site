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

  const { fileId } = JSON.parse(event.body || '{}');

  if (!fileId) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Missing fileId' }) };
  }

  try {
    const { data: fileData, error: fetchError } = await supabase
      .from('backup_files')
      .select('id, file_path, file_name, uploaded_by')
      .eq('id', fileId)
      .single();

    if (fetchError || !fileData) {
      return { statusCode: 404, headers: CORS_HEADERS, body: JSON.stringify({ error: 'File not found' }) };
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    const isAdmin = profile?.is_admin || false;

    if (!isAdmin && fileData.uploaded_by !== user.id) {
      return { statusCode: 403, headers: CORS_HEADERS, body: JSON.stringify({ error: 'You do not have permission to view this file' }) };
    }

    const authResponse = await b2.authorize();

    const downloadAuth = await b2.getDownloadAuthorization({
      bucketId: process.env.B2_BUCKET_ID,
      fileNamePrefix: fileData.file_path,
      validDurationInSeconds: 3600,
    });

    const encodedFilePath = fileData.file_path.split('/').map(segment => encodeURIComponent(segment)).join('/');
    const downloadUrl = `${authResponse.data.downloadUrl}/file/${process.env.B2_BUCKET_NAME}/${encodedFilePath}?Authorization=${downloadAuth.data.authorizationToken}`;

    return {
      statusCode: 200,
      headers: { ...CORS_HEADERS, 'Cache-Control': 'no-cache' },
      body: JSON.stringify({ downloadUrl, fileName: fileData.file_name }),
    };
  } catch (error) {
    console.error('Error getting backup file url:', error);
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: error.message }) };
  }
};
