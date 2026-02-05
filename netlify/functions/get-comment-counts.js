import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Netlify Function: Get comment counts for multiple files
 * 
 * Query params:
 * - fileIds: Comma-separated list of file IDs
 * 
 * Returns: Array of { file_id, count } objects
 */
export const handler = async (event) => {
  // Handle CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'GET') {
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

    // Parse query parameters
    const params = event.queryStringParameters || {};
    const fileIdsParam = params.fileIds;

    if (!fileIdsParam) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Missing fileIds parameter' })
      };
    }

    // Parse file IDs
    const fileIds = fileIdsParam.split(',').map(id => id.trim()).filter(id => id);

    if (fileIds.length === 0) {
      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ counts: [] })
      };
    }

    // Fetch comment counts using PostgreSQL COUNT and GROUP BY
    const { data, error } = await supabase
      .from('file_comments')
      .select('file_id')
      .in('file_id', fileIds);

    if (error) {
      console.error('Error fetching comment counts:', error);
      return {
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Failed to fetch comment counts' })
      };
    }

    // Count comments per file
    const counts = {};
    data.forEach(row => {
      counts[row.file_id] = (counts[row.file_id] || 0) + 1;
    });

    // Convert to array format
    const result = fileIds.map(fileId => ({
      file_id: fileId,
      count: counts[fileId] || 0
    }));

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ counts: result })
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
