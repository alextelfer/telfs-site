import { createClient } from '@supabase/supabase-js';
import B2 from 'backblaze-b2';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const b2 = new B2({
  applicationKeyId: process.env.B2_KEY_ID,
  applicationKey: process.env.B2_APP_KEY,
});

export const handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, X-File-Name, X-File-Type, X-File-Size, X-User-Id, X-Folder-Id',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    // Get metadata from headers
    const userId = event.headers['x-user-id'];
    const fileName = event.headers['x-file-name'];
    const fileType = event.headers['x-file-type'] || 'application/octet-stream';
    const fileSize = parseInt(event.headers['x-file-size'] || '0');
    const folderId = event.headers['x-folder-id'] || null;

    console.log('Upload proxy invoked:', { userId, fileName, fileType, fileSize, folderId });

    if (!userId || !fileName) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'Missing userId or fileName in headers' }),
      };
    }

    // Check if body is base64 or binary
    const isBase64 = event.isBase64Encoded;
    const fileBuffer = isBase64 ? Buffer.from(event.body, 'base64') : Buffer.from(event.body, 'binary');

    console.log('File buffer size:', fileBuffer.length);

    // Authorize with B2
    await b2.authorize();
    
    const uploadUrlData = await b2.getUploadUrl({
      bucketId: process.env.B2_BUCKET_ID,
    });

    // Create path with folder structure
    const folderPath = folderId ? `${userId}/${folderId}` : userId;
    const uploadPath = `${folderPath}/${Date.now()}-${fileName}`;

    console.log('Uploading to B2:', uploadPath);

    // Upload to B2
    await b2.uploadFile({
      uploadUrl: uploadUrlData.data.uploadUrl,
      uploadAuthToken: uploadUrlData.data.authorizationToken,
      fileName: uploadPath,
      data: fileBuffer,
      contentType: fileType,
    });

    console.log('B2 upload successful');

    // Store metadata in Supabase
    const { error } = await supabase.from('files').insert([
      {
        uploaded_by: userId,
        file_name: fileName,
        file_path: uploadPath,
        file_type: fileType,
        file_size: fileSize,
        folder_id: folderId || null,
      },
    ]);

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    console.log('Metadata stored successfully');

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        message: 'Upload successful', 
        path: uploadPath 
      }),
    };
  } catch (err) {
    console.error('Upload proxy failed:', err);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
