const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const B2_KEY_ID = process.env.B2_KEY_ID;
const B2_APP_KEY = process.env.B2_APP_KEY;

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const authHeader = event.headers.authorization;
  if (!authHeader) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid authentication token' }) };
  }

  try {
    const { fileId, sha1Array, fileName, filePath, fileType, fileSize } = JSON.parse(event.body);

    if (!fileId || !sha1Array || !fileName || !filePath) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
    }

    if (!filePath.startsWith(`backup/${user.id}/`)) {
      return { statusCode: 403, body: JSON.stringify({ error: 'Path does not belong to this user' }) };
    }

    const authRes = await axios.get('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
      auth: { username: B2_KEY_ID, password: B2_APP_KEY },
    });

    const { authorizationToken, apiUrl } = authRes.data;

    const finishRes = await axios.post(
      `${apiUrl}/b2api/v2/b2_finish_large_file`,
      { fileId, partSha1Array: sha1Array },
      { headers: { Authorization: authorizationToken } }
    );

    const { error } = await supabase.from('backup_files').insert([
      {
        uploaded_by: user.id,
        file_name: fileName,
        file_path: filePath,
        file_type: fileType,
        file_size: fileSize,
      },
    ]);

    if (error) {
      console.error('Supabase insert error:', error);
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to save file metadata' }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, fileInfo: finishRes.data }),
    };
  } catch (error) {
    console.error('Backup finish large upload error:', error.response?.data || error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.response?.data?.message || error.message }),
    };
  }
};
