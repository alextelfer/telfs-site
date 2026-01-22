import B2 from 'backblaze-b2';

const b2 = new B2({
  applicationKeyId: process.env.B2_KEY_ID,
  applicationKey: process.env.B2_APP_KEY,
});

export const handler = async (event) => {
  const { userId, fileName, mimeType, folderId } = JSON.parse(event.body || '{}');

  if (!userId || !fileName) {
    return { statusCode: 400, body: 'Missing userId or fileName' };
  }

  try {
    await b2.authorize();
    const uploadUrlData = await b2.getUploadUrl({ bucketId: process.env.B2_BUCKET_ID });

    // Create path with folder structure
    const folderPath = folderId ? `${userId}/${folderId}` : userId;
    const uploadPath = `${folderPath}/${Date.now()}-${fileName}`;

    return {
      statusCode: 200,
      body: JSON.stringify({
        uploadUrl: uploadUrlData.data.uploadUrl,
        authorizationToken: uploadUrlData.data.authorizationToken,
        uploadPath,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
