import B2 from 'backblaze-b2';

const b2 = new B2({
  applicationKeyId: process.env.B2_KEY_ID,
  applicationKey: process.env.B2_APP_KEY,
});

export const handler = async (event) => {
  const { userId, fileName, mimeType } = JSON.parse(event.body || '{}');

  if (!userId || !fileName) {
    return { statusCode: 400, body: 'Missing userId or fileName' };
  }

  try {
    await b2.authorize();
    const uploadUrlData = await b2.getUploadUrl({ bucketId: process.env.B2_BUCKET_ID });

    return {
      statusCode: 200,
      body: JSON.stringify({
        uploadUrl: uploadUrlData.data.uploadUrl,
        authorizationToken: uploadUrlData.data.authorizationToken,
        uploadPath: `${userId}/${Date.now()}-${fileName}`,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
