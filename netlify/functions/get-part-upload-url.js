const axios = require('axios');

const B2_KEY_ID = process.env.B2_KEY_ID;
const B2_APP_KEY = process.env.B2_APP_KEY;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { fileId, partNumber } = JSON.parse(event.body);

    if (!fileId || !partNumber) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing fileId or partNumber' }),
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

    // 2. Get upload URL for this part
    const uploadUrlRes = await axios.post(
      `${apiUrl}/b2api/v2/b2_get_upload_part_url`,
      { fileId },
      {
        headers: { Authorization: authorizationToken },
      }
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        uploadUrl: uploadUrlRes.data.uploadUrl,
        authorizationToken: uploadUrlRes.data.authorizationToken,
      }),
    };
  } catch (error) {
    console.error('Get part upload URL error:', error.response?.data || error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.response?.data?.message || error.message }),
    };
  }
};
