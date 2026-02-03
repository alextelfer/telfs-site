const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const B2_KEY_ID = process.env.B2_KEY_ID;
const B2_APP_KEY = process.env.B2_APP_KEY;
const B2_PUBLIC_URL = process.env.B2_BUCKET_PUBLIC_URL;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { fileId, sha1Array, userId, fileName, filePath, fileType, fileSize, folderId } = JSON.parse(event.body);

    if (!fileId || !sha1Array || !userId || !fileName || !filePath) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }

    // 1. Authorize with B2
    const authRes = await axios.get('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
      auth: {
        username: B2_KEY_ID,
        password: B2_APP_KEY,
      },
    });

    const { authorizationToken, apiUrl } = authRes.data;

    // 2. Finish large file upload
    const finishRes = await axios.post(
      `${apiUrl}/b2api/v2/b2_finish_large_file`,
      {
        fileId,
        partSha1Array: sha1Array,
      },
      {
        headers: { Authorization: authorizationToken },
      }
    );

    // 3. Store metadata in Supabase
    const publicUrl = `${B2_PUBLIC_URL}/${filePath}`;

    const { data, error } = await supabase.from('files').insert([
      {
        uploaded_by: userId,
        file_name: fileName,
        file_path: filePath,
        file_type: fileType,
        file_size: fileSize,
        folder_id: folderId || null,
      },
    ]);

    if (error) {
      console.error('Supabase insert error:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to save file metadata' }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true,
        publicUrl,
        fileInfo: finishRes.data 
      }),
    };
  } catch (error) {
    console.error('Finish large upload error:', error.response?.data || error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.response?.data?.message || error.message }),
    };
  }
};
