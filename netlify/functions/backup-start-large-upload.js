const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const B2_KEY_ID = process.env.B2_KEY_ID;
const B2_APP_KEY = process.env.B2_APP_KEY;
const B2_BUCKET_ID = process.env.B2_BUCKET_ID;

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
    const { fileName, mimeType } = JSON.parse(event.body);

    if (!fileName) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing fileName' }) };
    }

    const authRes = await axios.get('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
      auth: { username: B2_KEY_ID, password: B2_APP_KEY },
    });

    const { authorizationToken, apiUrl } = authRes.data;

    const uploadPath = `backup/${user.id}/${Date.now()}_${fileName}`;

    const startRes = await axios.post(
      `${apiUrl}/b2api/v2/b2_start_large_file`,
      {
        bucketId: B2_BUCKET_ID,
        fileName: uploadPath,
        contentType: mimeType,
      },
      { headers: { Authorization: authorizationToken } }
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        fileId: startRes.data.fileId,
        uploadPath,
      }),
    };
  } catch (error) {
    console.error('Backup start large upload error:', error.response?.data || error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.response?.data?.message || error.message }),
    };
  }
};
