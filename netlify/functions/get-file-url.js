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
    await b2.authorize();

    // Get download authorization
    const downloadAuth = await b2.getDownloadAuthorization({
      bucketId: process.env.B2_BUCKET_ID,
      fileNamePrefix: filePath,
      validDurationInSeconds: 3600,
    });

    // Download file from B2
    const bucketName = process.env.B2_BUCKET_NAME;
    const downloadUrl = `https://f004.backblazeb2.com/file/${bucketName}/${filePath}`;
    
    const fetch = (await import('node-fetch')).default;
    const fileResponse = await fetch(downloadUrl, {
      headers: {
        'Authorization': downloadAuth.data.authorizationToken
      }
    });

    if (!fileResponse.ok) {
      throw new Error(`Failed to download file from B2: ${fileResponse.status} ${fileResponse.statusText}`);
    }

    const fileBuffer = await fileResponse.buffer();
    const contentType = fileResponse.headers.get('content-type') || 'application/octet-stream';

    // Return file with proper headers
    return {
      statusCode: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName || filePath.split('/').pop()}"`,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache'
      },
      body: fileBuffer.toString('base64'),
      isBase64Encoded: true
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
