import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Netlify Function: Add a comment to a file
 * 
 * Request body:
 * - fileId: The file ID to comment on
 * - comment: The comment text (max 1000 chars)
 */
export const handler = async (event) => {
  // Handle CORS
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

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    // Authenticate user
    const authHeader = event.headers.authorization;
    if (!authHeader) {
      return {
        statusCode: 401,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Missing authorization header' })
      };
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return {
        statusCode: 401,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }

    // Parse request body
    const { fileId, comment } = JSON.parse(event.body || '{}');

    // Validate input
    if (!fileId) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Missing fileId' })
      };
    }

    if (!comment || !comment.trim()) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Comment cannot be empty' })
      };
    }

    if (comment.length > 1000) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Comment too long (max 1000 characters)' })
      };
    }

    // Verify file exists
    const { data: fileData, error: fileError } = await supabase
      .from('files')
      .select('id')
      .eq('id', fileId)
      .single();

    if (fileError || !fileData) {
      return {
        statusCode: 404,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'File not found' })
      };
    }

    // Insert comment
    const { data, error } = await supabase
      .from('file_comments')
      .insert([{
        file_id: fileId,
        user_id: user.id,
        comment: comment.trim()
      }])
      .select(`
        id,
        comment,
        created_at,
        user_id,
        user_profiles (
          username
        )
      `)
      .single();

    if (error) {
      console.error('Error inserting comment:', error);
      return {
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Failed to add comment' })
      };
    }

    // Format response
    const formattedComment = {
      id: data.id,
      comment: data.comment,
      created_at: data.created_at,
      user_id: data.user_id,
      username: data.user_profiles?.username || 'Unknown'
    };

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ 
        success: true,
        comment: formattedComment
      })
    };

  } catch (error) {
    console.error('Unexpected error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
