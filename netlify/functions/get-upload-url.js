import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use Service Role Key ONLY in Netlify Functions
);

const B2 = require('backblaze-b2');
const { v4: uuidv4 } = require('uuid');

const b2 = new B2({
  applicationKeyId: process.env.B2_KEY_ID,
  applicationKey: process.env.B2_APP_KEY,
});

const file = files.file[0];
const userId = body.userId;

const uploadPath = `${userId}/${file.originalFilename}`; // <- Key line

await b2.uploadFile({
  uploadUrl: uploadData.uploadUrl,
  uploadAuthToken: uploadData.authorizationToken,
  fileName: uploadPath,
  data: file.stream,
  contentType: file.mimetype,
});

exports.handler = async function () {
  try {
    await b2.authorize(); // Get auth token

    const uploadData = await b2.getUploadUrl({
      bucketId: process.env.B2_BUCKET_ID,
    });

    const fileName = `${uuidv4()}.jpg`;

    return {
      statusCode: 200,
      body: JSON.stringify({
        uploadUrl: uploadData.data.uploadUrl,
        authToken: uploadData.data.authorizationToken,
        fileName,
      }),
    };
  } catch (error) {
    console.error('Upload URL error:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to get upload URL' }),
    };
  }
};
