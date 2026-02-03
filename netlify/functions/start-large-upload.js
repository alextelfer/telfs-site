const axios = require('axios');

const B2_KEY_ID = process.env.B2_KEY_ID;
const B2_APP_KEY = process.env.B2_APP_KEY;
const B2_BUCKET_ID = process.env.B2_BUCKET_ID;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { userId, fileName, fileSize, mimeType, folderId } = JSON.parse(event.body);

    if (!userId || !fileName) {
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

    // 2. Construct file path
    const folder = folderId || 'root';
    const uploadPath = `${userId}/${folder}/${Date.now()}_${fileName}`;

    // 3. Start large file upload
    const startRes = await axios.post(
      `${apiUrl}/b2api/v2/b2_start_large_file`,
      {
        bucketId: B2_BUCKET_ID,
        fileName: uploadPath,
        contentType: mimeType,
      },
      {
        headers: { Authorization: authorizationToken },
      }
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        fileId: startRes.data.fileId,
        uploadPath,
      }),
    };
  } catch (error) {
    console.error('Start large upload error:', error.response?.data || error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.response?.data?.message || error.message }),
    };
  }
};
