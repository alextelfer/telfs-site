# 🔄 Migration Guide: PhotoPage → PiratePage

## Quick Migration Steps

### 1. Database Migration

Execute this SQL in Supabase to migrate from the old `photos` table to the new structure:

```sql
-- Step 1: Create new tables (run database-schema.sql first)

-- Step 2: Migrate existing photo data to files table (if you have existing data)
INSERT INTO files (id, file_name, file_path, file_type, file_size, uploaded_by, created_at, folder_id)
SELECT 
  id,
  file_name,
  file_path,
  'image/jpeg' AS file_type,  -- Adjust based on your data
  NULL AS file_size,
  user_id AS uploaded_by,
  created_at,
  NULL AS folder_id
FROM photos;

-- Step 3: Create user profiles for existing users
INSERT INTO user_profiles (id, username, display_name)
SELECT 
  id,
  email AS username,  -- Use email as initial username
  email AS display_name
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.users.id
);

-- Step 4: (Optional) Drop old photos table after verification
-- DROP TABLE photos;
```

### 2. Environment Variables

No changes needed to environment variables - they remain the same.

### 3. Code Changes

All code changes are already implemented:

- ✅ `App.js` - Updated routing to use PiratePage
- ✅ `SignIn.js` - Updated for username + OTP authentication
- ✅ New `features/pirate/` folder with all components
- ✅ Netlify functions updated for files instead of photos
- ✅ Added `get-file-url.js` for secure downloads

### 4. Testing Checklist

After deployment:

- [ ] Test user login with username
- [ ] Test OTP delivery
- [ ] Create a test folder
- [ ] Upload a test file to root
- [ ] Upload a test file to folder
- [ ] Navigate folder structure
- [ ] Download a file
- [ ] Delete a file
- [ ] Delete a folder
- [ ] Test with multiple users
- [ ] Verify files are not publicly accessible

### 5. User Communication

Inform your users about:

1. **New Login Method**: Now using username instead of email
2. **Folder Organization**: They can now create folders
3. **Any File Type**: Not just photos anymore
4. **Secure Downloads**: Files are now fully private

### 6. Cleanup (After Verification)

Once you've verified everything works:

```sql
-- Remove old photos table
DROP TABLE IF EXISTS photos;

-- Remove any unused functions or triggers related to photos
```

### 7. Set First Admin

Make yourself an admin:

```sql
UPDATE user_profiles 
SET is_admin = true 
WHERE username = 'your-username';
```

## Rollback Plan

If you need to rollback:

1. Change routing in `App.js` back to `PhotoPage`
2. Revert Netlify functions to previous versions
3. Keep database as-is (old photos table if not dropped)

## Support

See README-PIRATEPAGE.md for full documentation and setup instructions.
