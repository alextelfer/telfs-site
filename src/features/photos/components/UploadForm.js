import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient'; // adjust path if needed

const UploadForm = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setMessage('');
  };

  const handleUpload = async () => {
    if (!file) {
      return setMessage('Please select a file first.');
    }

    setUploading(true);
    setMessage('');

    try {
      // Get logged-in user
      const { data: userData, error } = await supabase.auth.getUser();
      const user = userData?.user;

      if (error || !user) {
        setUploading(false);
        return setMessage('You must be signed in to upload.');
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', user.id);

      const response = await fetch('/.netlify/functions/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setMessage('✅ Upload successful!');
        setFile(null);
      } else {
        setMessage(`❌ Upload failed: ${result.error}`);
      }
    } catch (err) {
      console.error('Upload error:', err);
      setMessage('⚠️ Something went wrong during upload.');
    }

    setUploading(false);
  };

  return (
    <div>
      <h2>Upload a Photo</h2>
      <input type="file" accept="image/*" onChange={handleFileChange} />
      <br />
      <button onClick={handleUpload} disabled={uploading}>
        {uploading ? 'Uploading...' : 'Upload'}
      </button>
      {message && <p>{message}</p>}
    </div>
  );
};

export default UploadForm;
