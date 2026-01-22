# 🏴‍☠️ PiratePage - Secure File Sharing System

A secure file-sharing platform with folder management, OTP authentication, and private file access. Built with React, Supabase, and Backblaze B2.

## ✨ Features

- **Username + OTP Authentication**: Secure login with one-time passwords
- **Folder Management**: Create and organize files in folders
- **Any File Type**: Upload images, videos, documents, archives, and more
- **Private Files**: Files are not publicly accessible - only authenticated users can download
- **Secure Downloads**: Time-limited, authenticated download URLs
- **User Permissions**: Track who uploaded what, with admin capabilities
- **Modern UI**: Dark theme with intuitive file explorer

## 🏗️ Project Structure

```
src/
├── features/
│   ├── pirate/
│   │   ├── PiratePage.js                 # Main file sharing page
│   │   └── components/
│   │       ├── FileExplorer.js           # Folder/file navigation
│   │       ├── FileList.js               # File display and download
│   │       ├── CreateFolderModal.js      # Folder creation UI
│   │       └── UploadForm.js             # File upload component
│   └── auth/
│       └── SignIn.js                     # Username + OTP login
├── lib/
│   ├── supabaseClient.js                 # Supabase configuration
│   └── AuthContext.js                    # Authentication state
└── App.js                                 # Routing configuration

netlify/functions/
├── get-presigned-url.js                  # Generate B2 upload URLs
├── store-file-metadata.js                # Save file metadata to database
└── get-file-url.js                       # Generate secure download URLs
```

## 📦 Tech Stack

- **Frontend**: React 18, React Router 6
- **Authentication**: Supabase Auth (OTP)
- **Database**: Supabase (PostgreSQL)
- **File Storage**: Backblaze B2
- **Serverless**: Netlify Functions
- **Deployment**: Netlify

## 🚀 Setup Instructions

### 1. Database Setup

Run the SQL schema in your Supabase project:

```bash
# Execute database-schema.sql in Supabase SQL Editor
```

This creates:
- `user_profiles` table (with username)
- `folders` table (for folder structure)
- `files` table (replaces photos table)
- Row Level Security policies
- Indexes for performance

### 2. Environment Variables

Create a `.env` file:

```env
# Supabase
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_KEY=your_anon_key

# Backblaze B2
REACT_APP_B2_BUCKET_NAME=your_bucket_name
```

Create `netlify.toml` (already configured):

```toml
[build]
  command = "npm run build"
  publish = "build"

[functions]
  directory = "netlify/functions"
  node_bundler = "esbuild"
```

Set these environment variables in Netlify:

```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
B2_KEY_ID=your_b2_key_id
B2_APP_KEY=your_b2_app_key
B2_BUCKET_ID=your_b2_bucket_id
B2_BUCKET_NAME=your_b2_bucket_name
```

### 3. Backblaze B2 Configuration

1. Create a B2 bucket (private, not public)
2. Generate application keys with read/write access
3. Configure CORS if accessing from browser:

```json
[
  {
    "corsRuleName": "allowAuth",
    "allowedOrigins": ["https://your-domain.com"],
    "allowedOperations": ["s3_get", "s3_head", "s3_put"],
    "allowedHeaders": ["*"],
    "maxAgeSeconds": 3600
  }
]
```

### 4. Create User Profiles

After a user signs up via Supabase Auth, create their profile:

```sql
INSERT INTO user_profiles (id, username, display_name, is_admin)
VALUES ('user-uuid-from-auth', 'their-username', 'Display Name', false);
```

Or create a trigger to auto-create profiles:

```sql
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, username)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile();
```

### 5. Install & Run

```bash
# Install dependencies
npm install

# Run locally
npm start

# Build for production
npm run build

# Deploy to Netlify
netlify deploy --prod
```

## 🔐 Authentication Flow

### Current Implementation (Simplified)

The current implementation uses a username-first flow but requires backend work for full OTP functionality:

1. User enters username
2. System looks up username in `user_profiles`
3. Sends OTP to associated email
4. User enters OTP to verify

### Production Implementation Required

For full username-only OTP (without exposing email), you'll need:

1. **Backend Function** to handle username → email lookup securely
2. **Supabase Edge Function** or **Netlify Function** that:
   - Takes username
   - Looks up user in `user_profiles`
   - Retrieves email from `auth.users` (server-side only)
   - Calls `supabase.auth.admin.generateLink()` or sends custom OTP
   - Returns success/failure (never exposes email)

3. **OTP Storage**: Store OTP codes in database with expiration:

```sql
CREATE TABLE otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

4. **Verification Function**: Server-side OTP verification

## 📁 Database Schema

### user_profiles
- `id` (UUID, FK to auth.users)
- `username` (TEXT, unique) - for login
- `display_name` (TEXT)
- `is_admin` (BOOLEAN)

### folders
- `id` (UUID, PK)
- `name` (TEXT)
- `parent_id` (UUID, FK to folders) - null for root
- `created_by` (UUID, FK to auth.users)

### files
- `id` (UUID, PK)
- `folder_id` (UUID, FK to folders) - null for root
- `file_name` (TEXT)
- `file_path` (TEXT) - B2 path
- `file_type` (TEXT) - MIME type
- `file_size` (BIGINT) - bytes
- `uploaded_by` (UUID, FK to auth.users)

## 🔒 Security Features

1. **Private File Storage**: B2 bucket is private, not public
2. **Authenticated Downloads**: Download URLs are time-limited (1 hour) and require authentication
3. **Row Level Security**: Database policies ensure users can only access authorized content
4. **OTP Authentication**: One-time passwords for secure login
5. **No Public URLs**: Files cannot be accessed without authentication

## 🎨 File Type Support

The system supports all file types with appropriate icons:

- 🖼️ Images (jpg, png, gif, etc.)
- 🎬 Videos (mp4, mov, avi, etc.)
- 🎵 Audio (mp3, wav, etc.)
- 📕 PDFs
- 📦 Archives (zip, rar, 7z)
- 📝 Documents (docx, txt)
- 📊 Spreadsheets (xlsx, csv)
- 📽️ Presentations (pptx)
- 📄 Other files

## 🛠️ API Endpoints (Netlify Functions)

### POST /.netlify/functions/get-presigned-url
Generate upload URL for B2
```json
{
  "userId": "uuid",
  "fileName": "file.jpg",
  "mimeType": "image/jpeg",
  "folderId": "uuid|null"
}
```

### POST /.netlify/functions/store-file-metadata
Store file metadata in database
```json
{
  "userId": "uuid",
  "fileName": "file.jpg",
  "filePath": "path/in/b2",
  "fileType": "image/jpeg",
  "fileSize": 12345,
  "folderId": "uuid|null"
}
```

### POST /.netlify/functions/get-file-url
Generate secure download URL
```json
{
  "filePath": "path/in/b2",
  "fileName": "file.jpg"
}
```

## 📝 TODO for Production

- [ ] Implement proper username-only OTP authentication
- [ ] Add OTP verification endpoint
- [ ] Implement file previews (images, videos, PDFs)
- [ ] Add search functionality
- [ ] Implement file sharing permissions
- [ ] Add file versioning
- [ ] Implement bulk operations (multi-select, bulk delete)
- [ ] Add file move/rename capabilities
- [ ] Implement storage quotas per user
- [ ] Add activity logs
- [ ] Create admin dashboard
- [ ] Add email notifications for file sharing
- [ ] Implement real-time updates with Supabase Realtime

## 🐛 Known Issues

1. **OTP Authentication**: Current implementation is simplified and requires backend modifications for production use
2. **File Downloads**: Need to verify B2 authorization token generation works correctly
3. **Username Creation**: Users need manual profile creation after signup

## 📄 License

Private project for friends and family use.

---

Built with 🏴‍☠️ for secure file sharing among pirates!
