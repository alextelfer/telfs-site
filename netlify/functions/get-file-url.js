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
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  // Verify user is authenticated
  const authHeader = event.headers.authorization;
  if (!authHeader) {
    return {
      statusCode: 401,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Unauthorized' }),
    };
  }

  const { filePath, fileName } = JSON.parse(event.body || '{}');

  if (!filePath) {
    return { 
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Missing filePath' }) 
    };
  }

  try {
    // Authorize with B2
    console.log('Authorizing with B2...');
    const authResponse = await b2.authorize();
    console.log('B2 Auth successful, downloadUrl:', authResponse.data.downloadUrl);

    // Get download authorization token
    console.log('Getting download authorization for filePath:', filePath);
    const downloadAuth = await b2.getDownloadAuthorization({
      bucketId: process.env.B2_BUCKET_ID,
      fileNamePrefix: filePath,
      validDurationInSeconds: 3600,
    });
    console.log('Download auth successful');

    // Generate the download URL with authorization token
    const downloadUrl = `${authResponse.data.downloadUrl}/file/${process.env.B2_BUCKET_NAME}/${filePath}?Authorization=${downloadAuth.data.authorizationToken}`;
    
    console.log('Generated download URL (without token for security)');

    // Return the authorized download URL instead of proxying the file
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify({ 
        downloadUrl,
        fileName: fileName || filePath.split('/').pop()
      })
    };
  } catch (error) {
    console.error('Error downloading file:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: error.message }),
    };
  }
};
