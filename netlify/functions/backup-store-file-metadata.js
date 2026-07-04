import { createClient } from '@supabase/supabase-js';

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

  const { fileName, filePath, fileType, fileSize } = JSON.parse(event.body || '{}');

  if (!fileName || !filePath) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Missing required fields' }) };
  }

  // The upload path is namespaced by user id (backup/{userId}/...) - refuse to record
  // metadata for a path that doesn't belong to the caller.
  if (!filePath.startsWith(`backup/${user.id}/`)) {
    return { statusCode: 403, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Path does not belong to this user' }) };
  }

  try {
    const { error } = await supabase.from('backup_files').insert([
      {
        uploaded_by: user.id,
        file_name: fileName,
        file_path: filePath,
        file_type: fileType || 'application/octet-stream',
        file_size: fileSize || 0,
      },
    ]);

    if (error) throw error;

    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ message: 'File metadata stored successfully' }) };
  } catch (err) {
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: err.message }) };
  }
};
