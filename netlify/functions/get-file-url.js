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

export const handler = async (event) => {
  // Verify user is authenticated
  const authHeader = event.headers.authorization;
  if (!authHeader) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized' }),
    };
  }

  const { filePath, fileName } = JSON.parse(event.body || '{}');

  if (!filePath) {
    return { 
      statusCode: 400, 
      body: JSON.stringify({ error: 'Missing filePath' }) 
    };
  }

  try {
    // Authorize with B2
    await b2.authorize();

    // Get download authorization
    const downloadAuth = await b2.getDownloadAuthorization({
      bucketId: process.env.B2_BUCKET_ID,
      fileNamePrefix: filePath,
      validDurationInSeconds: 3600, // URL valid for 1 hour
    });

    // Generate secure download URL
    const bucketName = process.env.B2_BUCKET_NAME;
    const downloadUrl = `https://f004.backblazeb2.com/file/${bucketName}/${filePath}?Authorization=${downloadAuth.data.authorizationToken}`;

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        downloadUrl,
        fileName: fileName || filePath.split('/').pop()
      }),
    };
  } catch (error) {
    console.error('Error generating download URL:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
