import React, { useState } from 'react';

const UploadForm = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setMessage('');
  };

  const handleUpload = async (file) => {
    if (!file) {
      return setMessage('Please select a file first.');
    }
    const user = supabase.auth.getUser(); // or pass `userId` from props

    if (!user?.id) return alert('Not signed in!');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', user.id); // Used by the Netlify Function
    setUploading(true);
    setMessage('');

    const response = await fetch('/.netlify/functions/upload', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    console.log(result);

    try {
      // 1. Call serverless function to get upload URL and token
      const res = await fetch('/.netlify/functions/get-upload-url');
      const { uploadUrl, authToken, fileName } = await res.json();

      // 2. Upload file directly to Backblaze
      const b2Res = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          Authorization: authToken,
          'X-Bz-File-Name': encodeURIComponent(fileName),
          'Content-Type': file.type,
          'X-Bz-Content-Sha1': 'do_not_verify',
        },
        body: file,
      });
      // After upload success:
      await supabase.from('photos').insert([
        {
          user_id: userId,
          file_name: file.originalFilename,
          file_path: uploadPath,
        },
      ]);
      if (b2Res.ok) {
        setMessage('Upload successful!');
      } else {
        setMessage('Upload failed.');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setMessage('Something went wrong.');
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
