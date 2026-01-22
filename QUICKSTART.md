# 🚀 Quick Start Guide - PiratePage

Get your secure file-sharing platform up and running in minutes!

## Step 1: Database Setup (5 minutes)

1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `database-schema.sql`
3. Run the SQL script
4. Verify tables created: `user_profiles`, `folders`, `files`

## Step 2: Create Your First User (2 minutes)

```sql
-- After signing up via Supabase Auth UI, create profile:
INSERT INTO user_profiles (id, username, display_name, is_admin)
VALUES (
  'your-user-id-from-auth-users', 
  'admin',  -- your username
  'Admin User',
  true  -- make yourself admin
);
```

Or use this trigger to auto-create profiles:

```sql
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, username)
  VALUES (NEW.id, split_part(NEW.email, '@', 1));  -- Use email prefix as username
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile();
```

## Step 3: Configure Environment Variables (3 minutes)

### Local Development (.env)
```env
REACT_APP_SUPABASE_URL=https://xxxxx.supabase.co
REACT_APP_SUPABASE_KEY=your_anon_key
REACT_APP_B2_BUCKET_NAME=your-bucket-name
```

### Netlify Environment Variables
Go to Netlify Dashboard → Site Settings → Environment Variables:

```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
B2_KEY_ID=your_b2_application_key_id
B2_APP_KEY=your_b2_application_key
B2_BUCKET_ID=your_b2_bucket_id
B2_BUCKET_NAME=your-bucket-name
```

## Step 4: Configure Backblaze B2 (5 minutes)

1. Create B2 bucket:
   - Name: `your-bucket-name`
   - Privacy: **Private** (important!)
   - Lifecycle: As needed

2. Generate App Key:
   - Go to App Keys
   - Create new key with read/write access
   - Save the Key ID and Application Key

3. Optional - Configure CORS (if needed):
```json
[
  {
    "corsRuleName": "allowFromWebsite",
    "allowedOrigins": ["https://your-site.netlify.app"],
    "allowedOperations": ["s3_get", "s3_put"],
    "allowedHeaders": ["*"],
    "maxAgeSeconds": 3600
  }
]
```

## Step 5: Deploy (2 minutes)

```bash
# Install dependencies
npm install

# Test locally
npm start
# Open http://localhost:3000/signin

# Deploy to Netlify
netlify deploy --prod

# Or connect GitHub repo to Netlify for auto-deployment
```

## Step 6: First Login & Test

1. Go to `/signin`
2. Enter your username (the one you created in user_profiles)
3. Enter OTP sent to email
4. Navigate to `/piracy_is_cool`
5. Create a test folder
6. Upload a test file
7. Download the file to verify secure access works

## Troubleshooting

### Can't log in?
- Verify user exists in `auth.users`
- Verify profile exists in `user_profiles` with matching ID
- Check Supabase logs for auth errors

### Upload fails?
- Check B2 credentials in Netlify environment variables
- Verify B2 bucket is accessible
- Check browser console for errors
- Check Netlify function logs

### Can't download files?
- Verify `get-file-url.js` function is deployed
- Check B2 bucket privacy settings (should be private)
- Check browser console for 401/403 errors

### Files show as public URLs?
- This is a migration issue - old implementation used public URLs
- New uploads will use secure download URLs via `get-file-url.js`

## Default Folder Structure

```
🏴‍☠️ Root
├── 📁 Folder 1
│   ├── 📄 file1.pdf
│   └── 📄 file2.jpg
├── 📁 Folder 2
│   ├── 📁 Subfolder
│   │   └── 📄 file3.zip
│   └── 📄 file4.mp4
└── 📄 file5.docx
```

## Common Tasks

### Add a new user
```sql
-- They sign up via Supabase auth, then:
INSERT INTO user_profiles (id, username, display_name)
VALUES ('user-uuid', 'johndoe', 'John Doe');
```

### Make someone admin
```sql
UPDATE user_profiles 
SET is_admin = true 
WHERE username = 'johndoe';
```

### Check storage usage
```sql
SELECT 
  u.username,
  COUNT(f.id) as file_count,
  SUM(f.file_size) as total_bytes,
  pg_size_pretty(SUM(f.file_size)::bigint) as total_size
FROM files f
JOIN user_profiles u ON f.uploaded_by = u.id
GROUP BY u.username
ORDER BY total_bytes DESC;
```

### List all folders
```sql
SELECT 
  f.name,
  u.username as created_by,
  (SELECT name FROM folders WHERE id = f.parent_id) as parent_folder
FROM folders f
LEFT JOIN user_profiles u ON f.created_by = u.id
ORDER BY f.name;
```

## Security Checklist

- ✅ B2 bucket is set to **private**
- ✅ RLS policies enabled on all tables
- ✅ Service role key only in Netlify (not in frontend)
- ✅ Download URLs expire after 1 hour
- ✅ Authentication required for all file operations
- ✅ Environment variables set correctly
- ✅ HTTPS enforced (via Netlify)

## Performance Tips

1. **Enable B2 CDN**: Use Cloudflare or B2's CDN for faster downloads
2. **Add file size limits**: Prevent huge uploads
3. **Implement pagination**: For folders with many files
4. **Add caching**: Cache folder structure in localStorage
5. **Optimize images**: Compress before upload

## Support & Documentation

- Full docs: `README-PIRATEPAGE.md`
- Migration guide: `MIGRATION.md`
- Implementation details: `IMPLEMENTATION-SUMMARY.md`

---

**You're ready to go! 🏴‍☠️**

Visit `/piracy_is_cool` and start sharing files securely!
