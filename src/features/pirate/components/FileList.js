import React from 'react';
import { useAuth } from '../../../lib/AuthContext';

const FileList = ({ files, onDelete }) => {
  const [downloadingFiles, setDownloadingFiles] = React.useState(new Set());
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
        No files in this folder. Upload some files to get started! 🏴‍☠️
      </div>
    );
  }

  return (
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
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
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
  );
};

export default FileList;
