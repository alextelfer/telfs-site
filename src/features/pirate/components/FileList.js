import React from 'react';
import { useAuth } from '../../../lib/AuthContext';

const FileList = ({ files, onDelete }) => {
  const [downloadingFiles, setDownloadingFiles] = React.useState(new Set());
  const [previewFile, setPreviewFile] = React.useState(null);
  const [previewUrl, setPreviewUrl] = React.useState(null);
  const [loadingPreview, setLoadingPreview] = React.useState(false);
  const { session } = useAuth();

  const getFileIcon = (fileType) => {
    if (!fileType) return '📄';
    
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType.startsWith('video/')) return '🎬';
    if (fileType.startsWith('audio/')) return '🎵';
    if (fileType.includes('pdf')) return '📕';
    if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('7z')) return '📦';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    if (fileType.includes('sheet') || fileType.includes('excel')) return '📊';
    if (fileType.includes('presentation') || fileType.includes('powerpoint')) return '📽️';
    
    return '📄';
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown size';
    
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handlePreview = async (file) => {
    if (!file.file_type?.startsWith('image/') && !file.file_type?.startsWith('video/') && !file.file_type?.startsWith('audio/') && !file.file_type?.includes('pdf')) {
      alert('Preview is only available for images, videos, audio, and PDF files.');
      return;
    }

    setLoadingPreview(true);
    setPreviewFile(file);
    
    try {
      const response = await fetch('/.netlify/functions/get-file-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          filePath: file.file_path,
          fileName: file.file_name
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to load preview');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      setPreviewUrl(url);
    } catch (err) {
      console.error('Preview error:', err);
      alert(`Failed to preview file: ${err.message}`);
      setPreviewFile(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  const closePreview = () => {
    if (previewUrl) {
      window.URL.revokeObjectURL(previewUrl);
    }
    setPreviewFile(null);
    setPreviewUrl(null);
  };

  const handleDownload = async (file) => {
    setDownloadingFiles(prev => new Set([...prev, file.id]));
    
    try {
      // Request file download through backend (proxied)
      const response = await fetch('/.netlify/functions/get-file-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          filePath: file.file_path,
          fileName: file.file_name
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Download failed');
      }

      // Get the file blob from the response
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.file_name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download error:', err);
      alert(`Failed to download file: ${err.message}`);
    } finally {
      setDownloadingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(file.id);
        return newSet;
      });
    }
  };

  if (files.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
        no files in this folder. upload some shit to get started! 🏴‍☠️
      </div>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {files.map((file) => (
        <div
          key={file.id}
          style={{
            background: '#3a3a3a',
            padding: '1rem',
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            border: '1px solid #444'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
            <div style={{ fontSize: '2rem' }}>{getFileIcon(file.file_type)}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>
                {file.file_name}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#888' }}>
                {formatFileSize(file.file_size)} • Uploaded by {file.uploaded_by_username} • {new Date(file.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {(file.file_type?.startsWith('image/') || file.file_type?.startsWith('video/') || file.file_type?.startsWith('audio/') || file.file_type?.includes('pdf')) && (
              <button
                onClick={() => handlePreview(file)}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#6c757d',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                👁️ View
              </button>
            )}
            <button
              onClick={() => handleDownload(file)}
              disabled={downloadingFiles.has(file.id)}
              style={{
                padding: '0.5rem 1rem',
                background: '#007bff',
                border: 'none',
                borderRadius: '4px',
                color: '#fff',
                cursor: downloadingFiles.has(file.id) ? 'not-allowed' : 'pointer',
                fontSize: '0.9rem',
                opacity: downloadingFiles.has(file.id) ? 0.6 : 1
              }}
            >
              {downloadingFiles.has(file.id) ? 'Downloading...' : '⬇️ Download'}
            </button>
            <button
              onClick={() => onDelete(file.id)}
              style={{
                padding: '0.5rem 1rem',
                background: '#dc3545',
                border: 'none',
                borderRadius: '4px',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              🗑️
            </button>
          </div>
        </div>
      ))}
    </div>

      {/* Preview Modal */}
      {previewFile && (
        <div
          onClick={closePreview}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '2rem',
            cursor: 'pointer'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              background: '#2d2d2d',
              borderRadius: '8px',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              cursor: 'default'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>{previewFile.file_name}</h3>
              <button
                onClick={closePreview}
                style={{
                  background: '#dc3545',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#fff',
                  cursor: 'pointer',
                  padding: '0.5rem 1rem',
                  fontSize: '1rem'
                }}
              >
                ✕ Close
              </button>
            </div>
            
            {loadingPreview ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>Loading preview...</div>
            ) : previewUrl && (
              <div style={{ overflow: 'auto', maxHeight: '80vh' }}>
                {previewFile.file_type?.startsWith('image/') && (
                  <img
                    src={previewUrl}
                    alt={previewFile.file_name}
                    style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }}
                  />
                )}
                {previewFile.file_type?.startsWith('video/') && (
                  <video
                    src={previewUrl}
                    controls
                    style={{ maxWidth: '100%', maxHeight: '80vh' }}
                  >
                    Your browser does not support the video tag.
                  </video>
                )}
                {previewFile.file_type?.startsWith('audio/') && (
                  <audio
                    src={previewUrl}
                    controls
                    style={{ width: '100%' }}
                  >
                    Your browser does not support the audio tag.
                  </audio>
                )}
                {previewFile.file_type?.includes('pdf') && (
                  <iframe
                    src={previewUrl}
                    style={{ width: '80vw', height: '80vh', border: 'none' }}
                    title={previewFile.file_name}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default FileList;
