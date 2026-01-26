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

  // Extract the token from the Authorization header
  const token = authHeader.replace('Bearer ', '');

  // Verify the user with Supabase
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !user) {
    return {
      statusCode: 401,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Invalid authentication token' }),
    };
  }

  const { fileId } = JSON.parse(event.body || '{}');

  if (!fileId) {
    return { 
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Missing fileId' }) 
    };
  }

  try {
    // Get file metadata from database
    const { data: fileData, error: fetchError } = await supabase
      .from('files')
      .select('id, file_path, file_name, uploaded_by')
      .eq('id', fileId)
      .single();

    if (fetchError || !fileData) {
      return {
        statusCode: 404,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'File not found' })
      };
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    const isAdmin = profile?.is_admin || false;

    // Check permissions: user must be admin OR file owner
    if (!isAdmin && fileData.uploaded_by !== user.id) {
      return {
        statusCode: 403,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'You do not have permission to delete this file' })
      };
    }

    // Authorize with B2
    console.log('Authorizing with B2...');
    await b2.authorize();
    console.log('B2 Auth successful');

    // List file versions to get the fileId
    console.log('Getting file info from B2...');
    const fileVersions = await b2.listFileVersions({
      bucketId: process.env.B2_BUCKET_ID,
      startFileName: fileData.file_path,
      maxFileCount: 1,
      prefix: fileData.file_path
    });

    if (fileVersions.data.files.length === 0) {
      console.warn('File not found in B2, proceeding to delete from database');
    } else {
      const b2File = fileVersions.data.files.find(f => f.fileName === fileData.file_path);
      
      if (b2File) {
        // Delete from B2
        console.log('Deleting file from B2...');
        await b2.deleteFileVersion({
          fileId: b2File.fileId,
          fileName: b2File.fileName
        });
        console.log('File deleted from B2 successfully');
      }
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('files')
      .delete()
      .eq('id', fileId);

    if (deleteError) {
      throw new Error(`Database deletion failed: ${deleteError.message}`);
    }

    console.log('File deleted from database successfully');

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        success: true, 
        message: 'File deleted successfully' 
      })
    };
  } catch (error) {
    console.error('Error deleting file:', error);
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
