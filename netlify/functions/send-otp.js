import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Netlify Function: Send OTP to user by username
 * 
 * This function handles the username -> email lookup securely on the server side,
 * then triggers Supabase OTP email.
 */
export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { username } = JSON.parse(event.body || '{}');

  if (!username) {
    return { 
      statusCode: 400, 
      body: JSON.stringify({ error: 'Username is required' }) 
    };
  }

  try {
    // 1. Look up user profile by username
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('username', username)
      .single();

    if (profileError || !profile) {
      // Don't reveal if username exists or not (security)
      return { 
        statusCode: 200, 
        body: JSON.stringify({ 
          message: 'If this username exists, an OTP has been sent.' 
        }) 
      };
    }

    // 2. Get user's email from auth.users (server-side only)
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(profile.id);

    if (userError || !user) {
      console.error('Error fetching user:', userError);
      return { 
        statusCode: 200, 
        body: JSON.stringify({ 
          message: 'If this username exists, an OTP has been sent.' 
        }) 
      };
    }

    // 3. Send OTP via Supabase Auth
    const { error: otpError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: user.email,
      options: {
        redirectTo: `${process.env.URL || 'http://localhost:3000'}/piracy_is_cool`
      }
    });

    if (otpError) {
      console.error('Error sending OTP:', otpError);
      // Still return success to prevent username enumeration
    }

    return { 
      statusCode: 200, 
      body: JSON.stringify({ 
        message: 'If this username exists, an OTP has been sent to the associated email.',
        success: true
      }) 
    };

  } catch (error) {
    console.error('Unexpected error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
