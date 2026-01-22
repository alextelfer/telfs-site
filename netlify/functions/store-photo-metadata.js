import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const handler = async (event) => {
  const { userId, fileName, filePath, fileType, fileSize, folderId } = JSON.parse(event.body || '{}');

  if (!userId || !fileName || !filePath) {
    return { 
      statusCode: 400, 
      body: JSON.stringify({ error: 'Missing required fields' })
    };
  }

  try {
    const { error } = await supabase.from('files').insert([
      { 
        uploaded_by: userId, 
        file_name: fileName, 
        file_path: filePath,
        file_type: fileType || 'application/octet-stream',
        file_size: fileSize || 0,
        folder_id: folderId || null
      },
    ]);

    if (error) throw error;

    return { 
      statusCode: 200, 
      body: JSON.stringify({ message: 'File metadata stored successfully' }) 
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
