import React, { useState } from 'react';
// import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../lib/AuthContext';

const UploadForm = () => {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState('');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !userId) return;

    setUploading(true);
    setStatus('Requesting upload URL...');

    try {
      // 1. Request presigned URL from Netlify function
      const res = await fetch('/.netlify/functions/get-presigned-url', {
        method: 'POST',
        body: JSON.stringify({
          userId,
          fileName: file.name,
          mimeType: file.type,
        }),
      });

      const { uploadUrl, authorizationToken, uploadPath } = await res.json();

      // 2. Upload to B2
      setStatus('Uploading to B2...');

      const b2UploadRes = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          Authorization: authorizationToken,
          'X-Bz-File-Name': encodeURIComponent(uploadPath),
          'Content-Type': file.type,
          'X-Bz-Content-Sha1': 'do_not_verify', // Simplifies client-side uploads
        },
        body: file,
      });

      if (!b2UploadRes.ok) {
        throw new Error(`B2 upload failed: ${b2UploadRes.statusText}`);
      }

      // 3. Store metadata in Supabase
      setStatus('Storing metadata...');
      const metaRes = await fetch('/.netlify/functions/store-photo-metadata', {
        method: 'POST',
        body: JSON.stringify({
          userId,
          fileName: file.name,
          filePath: uploadPath,
        }),
      });

      const metaJson = await metaRes.json();
      if (!metaRes.ok) throw new Error(metaJson.error);

      setStatus('Upload complete!');
    } catch (err) {
      console.error(err);
      setStatus(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleUpload} className="p-4">
      <input type="file" onChange={handleFileChange} />
      <button type="submit" disabled={uploading || !file}>
        {uploading ? 'Uploading...' : 'Upload'}
      </button>
      <p>{status}</p>
    </form>
  );
};

export default UploadForm;
