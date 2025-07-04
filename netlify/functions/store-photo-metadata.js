import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const handler = async (event) => {
  const { userId, fileName, filePath } = JSON.parse(event.body || '{}');

  if (!userId || !fileName || !filePath) {
    return { statusCode: 400, body: 'Missing required fields' };
  }

  try {
    const { error } = await supabase.from('photos').insert([
      { user_id: userId, file_name: fileName, file_path: filePath },
    ]);

    if (error) throw error;

    return { statusCode: 200, body: JSON.stringify({ message: 'Metadata stored.' }) };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
