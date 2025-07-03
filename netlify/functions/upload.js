import { createClient } from '@supabase/supabase-js';
import B2 from 'backblaze-b2';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const b2 = new B2({
  applicationKeyId: process.env.B2_KEY_ID,
  applicationKey: process.env.B2_APP_KEY,
});

// Netlify function expects a handler like this
export const handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: 'Method Not Allowed',
    };
  }

  try {
    const form = formidable({ keepExtensions: true });
    const data = await new Promise((resolve, reject) => {
      form.parse(event, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    const file = data.files.file[0];
    const userId = data.fields.userId[0];

    await b2.authorize();
    const uploadUrlData = await b2.getUploadUrl({
      bucketId: process.env.B2_BUCKET_ID,
    });

    const fileStream = fs.createReadStream(file.filepath);
    const uploadPath = `${userId}/${uuidv4()}-${file.originalFilename}`;

    await b2.uploadFile({
      uploadUrl: uploadUrlData.data.uploadUrl,
      uploadAuthToken: uploadUrlData.data.authorizationToken,
      fileName: uploadPath,
      data: fileStream,
      contentType: file.mimetype,
    });

    await supabase.from('photos').insert([
      {
        user_id: userId,
        file_name: file.originalFilename,
        file_path: uploadPath,
      },
    ]);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Upload successful', path: uploadPath }),
    };
  } catch (err) {
    console.error('Upload failed:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
