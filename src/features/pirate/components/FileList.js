import React from 'react';
import { useAuth } from '../../../lib/AuthContext';
import MediaPlayer from './MediaPlayer';
import CommentSection from './CommentSection';

const FileList = ({ files, onDelete, currentUser, isAdmin }) => {
  const [downloadingFiles, setDownloadingFiles] = React.useState(new Set());
  const [previewFile, setPreviewFile] = React.useState(null);
  const [previewUrl, setPreviewUrl] = React.useState(null);
  const [loadingPreview, setLoadingPreview] = React.useState(false);
  const [playlist, setPlaylist] = React.useState([]);
  const [currentPlaylistIndex, setCurrentPlaylistIndex] = React.useState(0);
  const [expandedComments, setExpandedComments] = React.useState(new Set());
  const [commentCounts, setCommentCounts] = React.useState({});
  const { session } = useAuth();

  // Load comment counts for all files
  React.useEffect(() => {
    const loadCommentCounts = async () => {
      if (!files.length || !session) return;

      try {
        const fileIds = files.map(f => f.id).join(',');
        const response = await fetch(
          `/.netlify/functions/get-comment-counts?fileIds=${fileIds}`,
          {
            headers: {
              'Authorization': `Bearer ${session.access_token}`
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          const counts = {};
          data.counts.forEach(item => {
            counts[item.file_id] = item.count;
          });
          setCommentCounts(counts);
        }
      } catch (err) {
        console.error('Error loading comment counts:', err);
      }
    };

    loadCommentCounts();

    // Listen for comment updates
    const handleCommentUpdate = (event) => {
      const { fileId, count } = event.detail;
      setCommentCounts(prev => ({ ...prev, [fileId]: count }));
    };

    window.addEventListener('comment-updated', handleCommentUpdate);
    return () => window.removeEventListener('comment-updated', handleCommentUpdate);
  }, [files, session]);

  // Toggle comment section
  const toggleComments = (fileId) => {
    setExpandedComments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  };

  // Function to check if user can delete a file
  const canDeleteFile = (file) => {
    if (!currentUser) return false;
    // Admins can delete any file, or users can delete their own files
    return isAdmin || file.uploaded_by === currentUser.id;
  };

  const isMediaFile = (fileType) => {
    if (!fileType) return false;
    return fileType.startsWith('video/') || fileType.startsWith('audio/');
  };

  const getFileIcon = (fileType) => {
    if (!fileType) return '▪';
    
    if (fileType.startsWith('image/')) return '■';
    if (fileType.startsWith('video/')) return '■';
    if (fileType.startsWith('audio/')) return '■';
    if (fileType.includes('pdf')) return '▪';
    if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('7z')) return '■';
    if (fileType.includes('word') || fileType.includes('document')) return '▪';
    if (fileType.includes('sheet') || fileType.includes('excel')) return '▪';
    if (fileType.includes('presentation') || fileType.includes('powerpoint')) return '▪';
    
    return '▪';
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown size';
    
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const closePreview = () => {
    // No need to revoke URL since we're using B2's pre-signed URLs now
    setPreviewFile(null);
    setPreviewUrl(null);
    setPlaylist([]);
    setCurrentPlaylistIndex(0);
  };

  const handlePlay = async (file) => {
    setLoadingPreview(true);
    setPreviewFile(file);
    
    try {
      // Get authorized URL from backend
      const response = await fetch(
        '/.netlify/functions/get-file-url',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            filePath: file.file_path,
            fileName: file.file_name
          })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to get file URL');
      }

      const data = await response.json();
      setPreviewUrl(data.downloadUrl);
      
      // Build playlist from all media files in current folder
      const mediaFiles = files.filter(f => isMediaFile(f.file_type));
      setPlaylist(mediaFiles);
      const currentIndex = mediaFiles.findIndex(f => f.id === file.id);
      setCurrentPlaylistIndex(currentIndex >= 0 ? currentIndex : 0);
    } catch (err) {
      console.error('Error loading file:', err);
      alert(`Failed to load file: ${err.message}`);
      closePreview();
    } finally {
      setLoadingPreview(false);
    }
  };

  const handlePlaylistChange = async (newIndex) => {
    if (newIndex < 0 || newIndex >= playlist.length) return;
    
    const newFile = playlist[newIndex];
    setLoadingPreview(true);
    setPreviewFile(newFile);
    setCurrentPlaylistIndex(newIndex);
    
    try {
      const response = await fetch(
        '/.netlify/functions/get-file-url',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            filePath: newFile.file_path,
            fileName: newFile.file_name
          })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to get file URL');
      }

      const data = await response.json();
      setPreviewUrl(data.downloadUrl);
    } catch (err) {
      console.error('Error loading file:', err);
      alert(`Failed to load file: ${err.message}`);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleDownload = async (file) => {
    setDownloadingFiles(prev => new Set([...prev, file.id]));
    
    try {
      // Get authorized download URL from backend
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

      // Get the download URL from the response
      const data = await response.json();
      
      // Create download link using the pre-signed URL
      const a = document.createElement('a');
      a.href = data.downloadUrl;
      a.download = data.fileName || file.file_name;
      a.target = '_blank'; // Open in new tab to trigger download
      document.body.appendChild(a);
      a.click();
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
      <div style={{ textAlign: 'center', padding: '1.5rem', color: '#000', fontSize: '0.9rem' }}>
        no files in this folder. upload some shit to get started!
      </div>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {files.map((file) => {
          const isCommentsExpanded = expandedComments.has(file.id);
          const commentCount = commentCounts[file.id] || 0;
          
          return (
            <div key={file.id}>
              <div
                style={{
                  background: '#c0c0c0',
                  padding: '0.75rem',
                  borderRadius: '0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  border: '2px solid',
                  borderColor: '#fff #808080 #808080 #fff',
                  boxShadow: 'inset 1px 1px 0 #dfdfdf'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                  <div style={{ fontSize: '1.5rem', color: '#555' }}>{getFileIcon(file.file_type)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '0.25rem', fontSize: '0.85rem', fontFamily: 'MS Sans Serif, Microsoft Sans Serif, Arial, sans-serif' }}>
                      {file.file_name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#555', fontFamily: 'MS Sans Serif, Microsoft Sans Serif, Arial, sans-serif' }}>
                      {formatFileSize(file.file_size)} • Uploaded by {file.uploaded_by_username} • {new Date(file.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {/* Top row: Download and Delete */}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => handleDownload(file)}
                      disabled={downloadingFiles.has(file.id)}
                      style={{
                        padding: '3px 8px',
                        background: downloadingFiles.has(file.id) ? '#808080' : '#c0c0c0',
                        border: '2px solid',
                        borderColor: downloadingFiles.has(file.id) ? '#000 #fff #fff #000' : '#fff #000 #000 #fff',
                        borderRadius: '0',
                        color: '#000',
                        cursor: downloadingFiles.has(file.id) ? 'not-allowed' : 'pointer',
                        fontSize: '0.8rem',
                        fontFamily: 'MS Sans Serif, Microsoft Sans Serif, Arial, sans-serif',
                        fontWeight: 'normal',
                        boxShadow: downloadingFiles.has(file.id) ? 'inset -1px -1px 0 #dfdfdf, inset 1px 1px 0 #000' : 'inset 1px 1px 0 #dfdfdf, inset -1px -1px 0 #808080'
                      }}
                    >
                      {downloadingFiles.has(file.id) ? 'Downloading...' : 'Download'}
                    </button>
                    {canDeleteFile(file) && (
                      <button
                        onClick={() => onDelete(file.id)}
                        style={{
                          padding: '3px 8px',
                          background: '#c0c0c0',
                          border: '2px solid',
                          borderColor: '#fff #000 #000 #fff',
                          borderRadius: '0',
                          color: '#000',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          fontFamily: 'MS Sans Serif, Microsoft Sans Serif, Arial, sans-serif',
                          fontWeight: 'normal',
                          boxShadow: 'inset 1px 1px 0 #dfdfdf, inset -1px -1px 0 #808080'
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                  
                  {/* Bottom row: Play and Comments */}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {isMediaFile(file.file_type) && (
                      <button
                        onClick={() => handlePlay(file)}
                        style={{
                          padding: '3px 8px',
                          background: previewFile?.id === file.id ? '#000080' : '#c0c0c0',
                          border: '2px solid',
                          borderColor: '#fff #000 #000 #fff',
                          borderRadius: '0',
                          color: previewFile?.id === file.id ? '#fff' : '#000',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          fontFamily: 'MS Sans Serif, Microsoft Sans Serif, Arial, sans-serif',
                          fontWeight: 'normal',
                          boxShadow: 'inset 1px 1px 0 #dfdfdf, inset -1px -1px 0 #808080',
                          position: 'relative'
                        }}
                      >
                        {previewFile?.id === file.id && (
                          <span style={{
                            position: 'absolute',
                            left: '2px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            animation: 'pulse 1.5s ease-in-out infinite'
                          }}>▶</span>
                        )}
                        <span style={{ marginLeft: previewFile?.id === file.id ? '12px' : '0' }}>Play</span>
                      </button>
                    )}
                    <button
                      onClick={() => toggleComments(file.id)}
                      style={{
                        padding: '3px 8px',
                        background: isCommentsExpanded ? '#000080' : '#c0c0c0',
                        border: '2px solid',
                        borderColor: isCommentsExpanded ? '#000 #fff #fff #000' : '#fff #000 #000 #fff',
                        borderRadius: '0',
                        color: isCommentsExpanded ? '#fff' : '#000',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontFamily: 'MS Sans Serif, Microsoft Sans Serif, Arial, sans-serif',
                        fontWeight: 'normal',
                        boxShadow: isCommentsExpanded ? 'inset -1px -1px 0 #dfdfdf, inset 1px 1px 0 #000' : 'inset 1px 1px 0 #dfdfdf, inset -1px -1px 0 #808080',
                        position: 'relative'
                      }}
                    >
                      💬 {commentCount > 0 && (
                        <span style={{
                          background: isCommentsExpanded ? '#fff' : '#000080',
                          color: isCommentsExpanded ? '#000080' : '#fff',
                          borderRadius: '10px',
                          padding: '1px 5px',
                          fontSize: '0.7rem',
                          marginLeft: '4px',
                          fontWeight: 'bold'
                        }}>
                          {commentCount}
                        </span>
                      )}
                      {commentCount === 0 && ' Comments'}
                    </button>
                  </div>
                </div>
        </div>
        
        {/* Comment Section */}
        {isCommentsExpanded && (
          <div
            style={{
              background: '#fff',
              border: '2px solid',
              borderColor: '#808080 #fff #fff #808080',
              padding: '0.75rem',
              marginTop: '-0.5rem'
            }}
          >
            <CommentSection
              fileId={file.id}
              currentUserId={currentUser?.id}
              isAdmin={isAdmin}
              onCommentCountChange={(count) => {
                setCommentCounts(prev => ({ ...prev, [file.id]: count }));
              }}
            />
          </div>
        )}
      </div>
    );
  })}
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
            background: 'rgba(0, 0, 0, 0.5)',
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
              background: '#c0c0c0',
              borderRadius: '0',
              padding: '0',
              display: 'flex',
              flexDirection: 'column',
              cursor: 'default',
              border: '2px solid',
              borderColor: '#fff #000 #000 #fff',
              boxShadow: 'inset 1px 1px 0 #dfdfdf, 2px 2px 5px rgba(0,0,0,0.5)'
            }}
          >
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '3px 5px',
              background: '#000080',
              color: '#fff',
              fontFamily: 'MS Sans Serif, Microsoft Sans Serif, Arial, sans-serif',
              fontSize: '0.85rem',
              fontWeight: 'bold'
            }}>
              <h3 style={{ margin: 0, fontSize: '0.85rem' }}>{previewFile.file_name}</h3>
              <button
                onClick={closePreview}
                style={{
                  background: '#c0c0c0',
                  border: '2px solid',
                  borderColor: '#fff #000 #000 #fff',
                  borderRadius: '0',
                  color: '#000',
                  cursor: 'pointer',
                  padding: '1px 6px',
                  fontSize: '0.8rem',
                  fontFamily: 'MS Sans Serif, Microsoft Sans Serif, Arial, sans-serif',
                  fontWeight: 'bold',
                  boxShadow: 'inset 1px 1px 0 #dfdfdf'
                }}
              >
                X
              </button>
            </div>
            
            {loadingPreview ? (
              <div style={{ textAlign: 'center', padding: '2rem', background: '#fff', margin: '2px', color: '#000' }}>Loading preview...</div>
            ) : previewUrl && (
              <div style={{ overflow: 'auto', maxHeight: '80vh', background: '#fff', padding: '4px', margin: '2px', border: '2px solid', borderColor: '#808080 #fff #fff #808080' }}>
                {isMediaFile(previewFile.file_type) ? (
                  <MediaPlayer 
                    file={previewFile}
                    url={previewUrl}
                    playlist={playlist}
                    currentIndex={currentPlaylistIndex}
                    onPlaylistChange={handlePlaylistChange}
                    onClose={closePreview}
                  />
                ) : (
                  <>
                    {previewFile.file_type?.startsWith('image/') && (
                      <img
                        src={previewUrl}
                        alt={previewFile.file_name}
                        style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }}
                      />
                    )}
                    {previewFile.file_type?.includes('pdf') && (
                      <iframe
                        src={previewUrl}
                        style={{ width: '80vw', height: '80vh', border: 'none' }}
                        title={previewFile.file_name}
                      />
                    )}
                  </>
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
