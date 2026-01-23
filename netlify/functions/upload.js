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
        'Access-Control-Allow-Headers': 'Content-Type',
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
    // Parse multipart form data (Netlify automatically parses it)
    const { userId, fileName, folderId, fileData, fileType, fileSize } = JSON.parse(event.body);

    if (!userId || !fileName || !fileData) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }

    // Authorize with B2
    await b2.authorize();
    const uploadUrlData = await b2.getUploadUrl({
      bucketId: process.env.B2_BUCKET_ID,
    });

    // Create path with folder structure
    const folderPath = folderId ? `${userId}/${folderId}` : userId;
    const uploadPath = `${folderPath}/${Date.now()}-${fileName}`;

    // Convert base64 to buffer
    const fileBuffer = Buffer.from(fileData, 'base64');

    // Upload to B2
    await b2.uploadFile({
      uploadUrl: uploadUrlData.data.uploadUrl,
      uploadAuthToken: uploadUrlData.data.authorizationToken,
      fileName: uploadPath,
      data: fileBuffer,
      contentType: fileType || 'application/octet-stream',
    });

    // Store metadata in Supabase
    const { error } = await supabase.from('files').insert([
      {
        uploaded_by: userId,
        file_name: fileName,
        file_path: uploadPath,
        file_type: fileType || 'application/octet-stream',
        file_size: fileSize || 0,
        folder_id: folderId || null,
      },
    ]);

    if (error) throw error;

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
    console.error('Upload failed:', err);
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
