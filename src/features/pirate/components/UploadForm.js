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
      // Use multipart for files over 100MB
      if (file.size > 100 * 1024 * 1024) {
        await uploadMultipart();
      } else {
        // Try direct upload first for smaller files
        try {
          await uploadDirect();
        } catch (err) {
          console.log('Direct upload failed:', err.message);
          
          // Only fallback to proxy for small files (under 6MB - Netlify's function payload limit)
          if (file.size < 6 * 1024 * 1024) {
            console.log('Falling back to proxy upload...');
            setProgress(10); // Reset progress
            await uploadViaProxy();
          } else {
            throw new Error(`Direct upload failed and file is too large for proxy (${(file.size / 1024 / 1024).toFixed(1)}MB). Error: ${err.message}`);
          }
        }
      }
      
      e.target.reset();
      setFile(null);

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

  const uploadMultipart = async () => {
    const CHUNK_SIZE = 100 * 1024 * 1024; // 100MB chunks
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    
    setStatus(`Preparing large file upload (${totalChunks} parts)...`);
    
    // Step 1: Start large file upload
    const startRes = await fetch('/.netlify/functions/start-large-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || 'application/octet-stream',
        folderId: currentFolder,
      }),
    });

    if (!startRes.ok) {
      const error = await startRes.json();
      throw new Error(error.error || 'Failed to start large upload');
    }

    const { fileId, uploadPath } = await startRes.json();
    const sha1Array = [];
    
    // Step 2: Upload each part
    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);
      
      setStatus(`Uploading part ${i + 1} of ${totalChunks}...`);
      setProgress(20 + ((i / totalChunks) * 60));
      
      // Calculate SHA1 for the chunk
      const chunkBuffer = await chunk.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-1', chunkBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const sha1 = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      // Get upload URL for this part
      const partUrlRes = await fetch('/.netlify/functions/get-part-upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, partNumber: i + 1 }),
      });

      if (!partUrlRes.ok) {
        throw new Error(`Failed to get upload URL for part ${i + 1}`);
      }

      const { uploadUrl, authorizationToken } = await partUrlRes.json();
      
      // Upload the chunk with calculated SHA1
      const uploadRes = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': authorizationToken,
          'X-Bz-Part-Number': String(i + 1),
          'X-Bz-Content-Sha1': sha1,
        },
        body: chunk,
      });

      if (!uploadRes.ok) {
        const errorText = await uploadRes.text();
        throw new Error(`Failed to upload part ${i + 1}: ${errorText}`);
      }

      sha1Array.push(sha1);
    }
    
    // Step 3: Finish large file
    setStatus('Finalizing upload...');
    setProgress(85);
    
    const finishRes = await fetch('/.netlify/functions/finish-large-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileId,
        sha1Array,
        userId,
        fileName: file.name,
        filePath: uploadPath,
        fileType: file.type || 'application/octet-stream',
        fileSize: file.size,
        folderId: currentFolder,
      }),
    });

    if (!finishRes.ok) {
      const error = await finishRes.json();
      throw new Error(error.error || 'Failed to finalize upload');
    }

    setProgress(100);
    setStatus(`✅ ${file.name} uploaded successfully!`);
    
    if (onUploadComplete) {
      onUploadComplete();
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
        'X-Bz-File-Name': encodeURIComponent(uploadPath),
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
    // Netlify functions have a 6MB payload limit for synchronous function calls
    const maxProxySize = 6 * 1024 * 1024;
    if (file.size > maxProxySize) {
      throw new Error(`File is too large for proxy upload (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum is ${(maxProxySize / 1024 / 1024)}MB. Please enable CORS on your B2 bucket for direct uploads.`);
    }

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
      const contentType = uploadRes.headers.get('content-type');
      
      try {
        // Read the response body only once
        const responseText = await uploadRes.text();
        
        if (contentType && contentType.includes('application/json')) {
          try {
            const result = JSON.parse(responseText);
            errorMessage = result.error || errorMessage;
          } catch (parseError) {
            errorMessage = responseText || `Server error (${uploadRes.status})`;
          }
        } else {
          errorMessage = responseText || `Server error (${uploadRes.status})`;
        }
      } catch (parseError) {
        errorMessage = `Server error (${uploadRes.status})`;
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
      background: '#c0c0c0',
      borderRadius: '0',
      border: '2px solid',
      borderColor: '#fff #808080 #808080 #fff',
      overflow: 'hidden',
      boxShadow: 'inset 1px 1px 0 #dfdfdf'
    }}>
      {/* Collapsible Header */}
      <div 
        onClick={onToggle}
        style={{
          padding: '3px 8px',
          background: '#000080',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          userSelect: 'none',
          color: '#fff',
          fontFamily: 'MS Sans Serif, Microsoft Sans Serif, Arial, sans-serif',
          fontSize: '0.85rem',
          fontWeight: 'bold'
        }}
      >
        <h3 style={{ margin: 0, fontSize: '0.85rem' }}>
          Upload File {currentFolder && '(to current folder)'}
        </h3>
        <span style={{ fontSize: '0.8rem', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
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
              padding: '4px',
              background: '#fff',
              border: '2px solid',
              borderColor: '#808080 #fff #fff #808080',
              borderRadius: '0',
              color: '#000',
              width: '100%',
              maxWidth: '100%',
              boxSizing: 'border-box',
              cursor: uploading ? 'not-allowed' : 'pointer',
              fontFamily: 'MS Sans Serif, Microsoft Sans Serif, Arial, sans-serif',
              fontSize: '0.85rem'
            }}
          />
          {file && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#000', fontFamily: 'MS Sans Serif, Microsoft Sans Serif, Arial, sans-serif' }}>
              Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={uploading || !file}
          style={{
            padding: '4px 12px',
            background: uploading || !file ? '#808080' : '#c0c0c0',
            border: '2px solid',
            borderColor: uploading || !file ? '#000 #fff #fff #000' : '#fff #000 #000 #fff',
            borderRadius: '0',
            color: '#000',
            cursor: uploading || !file ? 'not-allowed' : 'pointer',
            fontSize: '0.85rem',
            fontWeight: 'bold',
            fontFamily: 'MS Sans Serif, Microsoft Sans Serif, Arial, sans-serif',
            boxShadow: uploading || !file ? 'inset -1px -1px 0 #dfdfdf, inset 1px 1px 0 #000' : 'inset 1px 1px 0 #dfdfdf, inset -1px -1px 0 #808080'
          }}
        >
          {uploading ? 'Uploading...' : 'Upload File'}
        </button>

        {/* Progress Bar */}
        {progress > 0 && (
          <div style={{
            width: '100%',
            height: '20px',
            background: '#fff',
            border: '2px solid',
            borderColor: '#808080 #fff #fff #808080',
            borderRadius: '0',
            overflow: 'hidden',
            boxShadow: 'inset -1px -1px 0 #dfdfdf, inset 1px 1px 0 #000'
          }}>
            <div style={{
              width: `${progress}%`,
              height: '100%',
              background: progress === 100 ? '#008000' : '#000080',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '0.7rem',
              fontFamily: 'MS Sans Serif, Microsoft Sans Serif, Arial, sans-serif',
              fontWeight: 'bold'
            }}>
              {progress > 15 && `${Math.round(progress)}%`}
            </div>
          </div>
        )}

        {status && (
          <div style={{
            padding: '6px',
            background: status.includes('✅') ? '#c0c0c0' : status.includes('❌') ? '#c0c0c0' : '#c0c0c0',
            border: '2px solid',
            borderColor: '#808080 #fff #fff #808080',
            borderRadius: '0',
            fontSize: '0.8rem',
            color: status.includes('✅') ? '#008000' : status.includes('❌') ? '#c00' : '#000',
            fontFamily: 'MS Sans Serif, Microsoft Sans Serif, Arial, sans-serif',
            boxShadow: 'inset -1px -1px 0 #dfdfdf, inset 1px 1px 0 #000'
          }}>
            {status}
          </div>
        )}
      </form>

      <div style={{
        marginTop: '1rem',
        padding: '6px',
        background: '#fff',
        border: '2px solid',
        borderColor: '#808080 #fff #fff #808080',
        borderRadius: '0',
        fontSize: '0.75rem',
        color: '#000',
        fontFamily: 'MS Sans Serif, Microsoft Sans Serif, Arial, sans-serif',
        boxShadow: 'inset -1px -1px 0 #dfdfdf, inset 1px 1px 0 #000'
      }}>
        <strong>note for the homies:</strong> files are securely stored and only accessible to authenticated users.
      </div>
        </div>
      )}
    </div>
  );
};

export default UploadForm;
