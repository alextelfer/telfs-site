import React, { useState } from 'react';
import { useAuth } from '../../../lib/AuthContext';

const UploadForm = ({ currentFolder, onUploadComplete, isExpanded, onToggle }) => {
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
    setStatus(`Uploading ${file.name}...`);
    setProgress(10);

    try {
      // For files under 10MB, try direct upload (requires B2 CORS config)
      // For larger files, or if direct fails, use proxy
      const useDirectUpload = file.size < 10 * 1024 * 1024; // 10MB threshold

      if (useDirectUpload) {
        try {
          await uploadDirect();
          e.target.reset(); // Reset form after successful upload
          return;
        } catch (err) {
          console.log('Direct upload failed, falling back to proxy:', err.message);
          setProgress(10); // Reset progress
        }
      }

      // Fallback or default: Upload via proxy
      await uploadViaProxy();
      e.target.reset(); // Reset form after successful upload

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

  const uploadDirect = async () => {
    // Step 1: Get presigned URL from backend
    setStatus('Preparing upload...');
    const presignedRes = await fetch('/.netlify/functions/get-presigned-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        folderId: currentFolder,
      }),
    });

    if (!presignedRes.ok) {
      const error = await presignedRes.json();
      throw new Error(error.error || 'Failed to prepare upload');
    }

    const { uploadUrl, authorizationToken, uploadPath } = await presignedRes.json();
    setProgress(20);

    // Step 2: Upload file directly to B2
    setStatus(`Uploading ${file.name} directly to storage...`);
    
    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': authorizationToken,
        'Content-Type': file.type || 'application/octet-stream',
        'X-Bz-File-Name': uploadPath,
        'X-Bz-Content-Sha1': 'do_not_verify',
      },
      body: file,
    });

    if (!uploadRes.ok) {
      const errorText = await uploadRes.text();
      throw new Error(`Direct upload failed: ${errorText}`);
    }

    setProgress(80);

    // Step 3: Store metadata in database
    setStatus('Saving file information...');
    const metadataRes = await fetch('/.netlify/functions/store-file-metadata', {
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

    if (!metadataRes.ok) {
      const error = await metadataRes.json();
      throw new Error(error.error || 'Failed to save file information');
    }

    setProgress(100);
    setStatus(`✅ ${file.name} uploaded successfully!`);
    setFile(null);
    
    // Notify parent to refresh
    if (onUploadComplete) {
      onUploadComplete();
    }
  };

  const uploadViaProxy = async () => {
    setStatus(`Uploading ${file.name} via proxy (may take longer for large files)...`);
    setProgress(20);

    // For files under 5MB, use direct binary upload
    // For larger files, we need chunking (not implemented here, but proxy handles up to Netlify's limit)
    if (file.size > 5 * 1024 * 1024) {
      setStatus(`⚠️ Large file detected. This may take several minutes...`);
    }

    const uploadRes = await fetch('/.netlify/functions/upload-proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-User-Id': userId,
        'X-File-Name': file.name,
        'X-File-Type': file.type || 'application/octet-stream',
        'X-File-Size': file.size.toString(),
        'X-Folder-Id': currentFolder || '',
      },
      body: file,
    });

    if (!uploadRes.ok) {
      let errorMessage = 'Upload failed';
      try {
        const result = await uploadRes.json();
        errorMessage = result.error || errorMessage;
      } catch (parseError) {
        const textError = await uploadRes.text();
        errorMessage = textError || `Server error (${uploadRes.status})`;
      }
      throw new Error(errorMessage);
    }

    setProgress(100);
    setStatus(`✅ ${file.name} uploaded successfully!`);
    setFile(null);
    
    // Notify parent to refresh
    if (onUploadComplete) {
      onUploadComplete();
    }
  };

  return (
    <div style={{
      background: '#2d2d2d',
      borderRadius: '8px',
      border: '2px solid #444',
      overflow: 'hidden'
    }}>
      {/* Collapsible Header */}
      <div 
        onClick={onToggle}
        style={{
          padding: '1rem 1.5rem',
          background: '#353535',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          userSelect: 'none'
        }}
      >
        <h3 style={{ margin: 0 }}>
          📤 Upload File {currentFolder && '(to current folder)'}
        </h3>
        <span style={{ fontSize: '1.5rem', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          ▼
        </span>
      </div>

      {/* Expandable Content */}
      {isExpanded && (
        <div style={{ padding: '1.5rem' }}>
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
              maxWidth: '100%',
              boxSizing: 'border-box',
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
        <strong>📝 note for the homies:</strong> files are securely stored and only accessible to authenticated users.
      </div>
        </div>
      )}
    </div>
  );
};

export default UploadForm;
