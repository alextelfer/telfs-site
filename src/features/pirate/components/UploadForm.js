import React, { useState } from 'react';
import { useAuth } from '../../../lib/AuthContext';

const UploadForm = ({ currentFolder, onUploadComplete }) => {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setStatus('');
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !userId) return;

    setUploading(true);
    setStatus('Requesting upload URL...');
    setProgress(10);

    try {
      // 1. Request presigned URL from Netlify function
      const res = await fetch('/.netlify/functions/get-presigned-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          fileName: file.name,
          mimeType: file.type,
          folderId: currentFolder,
        }),
      });

      const { uploadUrl, authorizationToken, uploadPath } = await res.json();
      setProgress(30);

      // 2. Upload to B2
      setStatus(`Uploading ${file.name}...`);

      const b2UploadRes = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          Authorization: authorizationToken,
          'X-Bz-File-Name': encodeURIComponent(uploadPath),
          'Content-Type': file.type || 'application/octet-stream',
          'X-Bz-Content-Sha1': 'do_not_verify',
        },
        body: file,
      });

      if (!b2UploadRes.ok) {
        throw new Error(`B2 upload failed: ${b2UploadRes.statusText}`);
      }

      setProgress(70);

      // 3. Store metadata in Supabase
      setStatus('Storing file metadata...');
      const metaRes = await fetch('/.netlify/functions/store-file-metadata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          fileName: file.name,
          filePath: uploadPath,
          fileType: file.type || 'application/octet-stream',
          fileSize: file.size,
          folderId: currentFolder,
        }),
      });

      const metaJson = await metaRes.json();
      if (!metaRes.ok) throw new Error(metaJson.error);

      setProgress(100);
      setStatus(`✅ ${file.name} uploaded successfully!`);
      setFile(null);
      
      // Reset file input
      e.target.reset();
      
      // Notify parent to refresh
      if (onUploadComplete) {
        onUploadComplete();
      }
    } catch (err) {
      console.error(err);
      setStatus(`❌ Upload failed: ${err.message}`);
      setProgress(0);
    } finally {
      setUploading(false);
      setTimeout(() => {
        setProgress(0);
        if (status.includes('✅')) {
          setStatus('');
        }
      }, 3000);
    }
  };

  return (
    <div style={{
      background: '#2d2d2d',
      padding: '1.5rem',
      borderRadius: '8px',
      border: '2px dashed #444'
    }}>
      <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>
        📤 Upload File {currentFolder && '(to current folder)'}
      </h3>
      
      <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <input
            type="file"
            onChange={handleFileChange}
            disabled={uploading}
            style={{
              padding: '0.75rem',
              background: '#1a1a1a',
              border: '1px solid #444',
              borderRadius: '4px',
              color: '#fff',
              width: '100%',
              cursor: uploading ? 'not-allowed' : 'pointer'
            }}
          />
          {file && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#888' }}>
              Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={uploading || !file}
          style={{
            padding: '0.75rem 1.5rem',
            background: uploading || !file ? '#555' : '#007bff',
            border: 'none',
            borderRadius: '4px',
            color: '#fff',
            cursor: uploading || !file ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
            fontWeight: 'bold',
            transition: 'background 0.2s'
          }}
        >
          {uploading ? 'Uploading...' : '⬆️ Upload File'}
        </button>

        {/* Progress Bar */}
        {progress > 0 && (
          <div style={{
            width: '100%',
            height: '8px',
            background: '#1a1a1a',
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${progress}%`,
              height: '100%',
              background: progress === 100 ? '#28a745' : '#007bff',
              transition: 'width 0.3s ease'
            }} />
          </div>
        )}

        {status && (
          <div style={{
            padding: '0.75rem',
            background: status.includes('✅') ? '#1e4620' : status.includes('❌') ? '#4a1f1f' : '#1a3a5a',
            borderRadius: '4px',
            fontSize: '0.9rem'
          }}>
            {status}
          </div>
        )}
      </form>

      <div style={{
        marginTop: '1rem',
        padding: '0.75rem',
        background: '#1a1a1a',
        borderRadius: '4px',
        fontSize: '0.85rem',
        color: '#888'
      }}>
        <strong>📝 Note:</strong> All file types are supported. Files are securely stored and only accessible to authenticated users.
      </div>
    </div>
  );
};

export default UploadForm;
