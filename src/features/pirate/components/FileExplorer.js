import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import FileList from './FileList';
import CreateFolderModal from './CreateFolderModal';

const FileExplorer = ({ currentFolder, onFolderChange, isAdmin }) => {
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  const buildBreadcrumbs = React.useCallback(async () => {
    if (!currentFolder) {
      setBreadcrumbs([]);
      return;
    }

    const crumbs = [];
    let folderId = currentFolder;
    
    while (folderId) {
      const { data } = await supabase
        .from('folders')
        .select('id, name, parent_id')
        .eq('id', folderId)
        .single();
      
      if (data) {
        crumbs.unshift(data);
        folderId = data.parent_id;
      } else {
        break;
      }
    }
    
    setBreadcrumbs(crumbs);
  }, [currentFolder]);

  const fetchFoldersAndFiles = React.useCallback(async () => {
    setLoading(true);
    
    // Fetch folders in current directory
    let foldersQuery = supabase
      .from('folders')
      .select('*');
    
    if (currentFolder) {
      foldersQuery = foldersQuery.eq('parent_id', currentFolder);
    } else {
      foldersQuery = foldersQuery.is('parent_id', null);
    }
    
    const { data: foldersData, error: foldersError } = await foldersQuery.order('name');

    if (foldersError) {
      console.error('Error fetching folders:', foldersError);
    } else {
      // Fetch usernames for folders
      const foldersWithUsernames = await Promise.all(
        (foldersData || []).map(async (folder) => {
          if (folder.created_by) {
            const { data: profile } = await supabase
              .from('user_profiles')
              .select('username')
              .eq('id', folder.created_by)
              .single();
            return { ...folder, created_by_username: profile?.username || 'Unknown' };
          }
          return { ...folder, created_by_username: 'Unknown' };
        })
      );
      setFolders(foldersWithUsernames);
    }

    // Fetch files in current directory
    let filesQuery = supabase
      .from('files')
      .select('*');
    
    if (currentFolder) {
      filesQuery = filesQuery.eq('folder_id', currentFolder);
    } else {
      filesQuery = filesQuery.is('folder_id', null);
    }
    
    const { data: filesData, error: filesError } = await filesQuery.order('created_at', { ascending: false });

    if (filesError) {
      console.error('Error fetching files:', filesError);
    } else {
      // Fetch usernames for files
      const filesWithUsernames = await Promise.all(
        (filesData || []).map(async (file) => {
          if (file.uploaded_by) {
            const { data: profile } = await supabase
              .from('user_profiles')
              .select('username')
              .eq('id', file.uploaded_by)
              .single();
            return { ...file, uploaded_by_username: profile?.username || 'Unknown' };
          }
          return { ...file, uploaded_by_username: 'Unknown' };
        })
      );
      setFiles(filesWithUsernames);
    }

    setLoading(false);
  }, [currentFolder]);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    
    fetchCurrentUser();
    fetchFoldersAndFiles();
    buildBreadcrumbs();
    
    // Listen for file upload events
    const handleFilesUpdated = () => fetchFoldersAndFiles();
    window.addEventListener('files-updated', handleFilesUpdated);
    
    return () => window.removeEventListener('files-updated', handleFilesUpdated);
  }, [currentFolder, fetchFoldersAndFiles, buildBreadcrumbs]);

  const handleCreateFolder = async (folderName) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('folders')
      .insert([{
        name: folderName,
        parent_id: currentFolder,
        created_by: user.id
      }]);

    if (error) {
      alert(`Error creating folder: ${error.message}`);
    } else {
      setShowCreateFolder(false);
      fetchFoldersAndFiles();
    }
  };

  const handleDeleteFolder = async (folderId) => {
    if (!window.confirm('Are you sure you want to delete this folder? All contents will be deleted.')) {
      return;
    }

    const { error } = await supabase
      .from('folders')
      .delete()
      .eq('id', folderId);

    if (error) {
      alert(`Error deleting folder: ${error.message}`);
    } else {
      fetchFoldersAndFiles();
    }
  };

  const handleDeleteFile = async (fileId) => {
    if (!window.confirm('Are you sure you want to delete this file?')) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('/.netlify/functions/delete-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ fileId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete file');
      }

      alert('File deleted successfully!');
      fetchFoldersAndFiles();
    } catch (error) {
      console.error('Delete error:', error);
      alert(`Error deleting file: ${error.message}`);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>;
  }

  return (
    <div style={{ 
      background: '#c0c0c0', 
      borderRadius: '0', 
      padding: '1rem',
      border: '2px solid',
      borderColor: '#808080 #fff #fff #808080',
      boxShadow: 'inset -1px -1px 0 #dfdfdf, inset 1px 1px 0 #000'
    }}>
      {/* Breadcrumbs and Actions */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={() => onFolderChange(null)}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: '#00007f',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontFamily: 'MS Sans Serif, Microsoft Sans Serif, Arial, sans-serif',
              textDecoration: 'underline'
            }}
          >
            ▪ Root
          </button>
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={crumb.id}>
              <span style={{ color: '#000' }}>\</span>
              <button
                onClick={() => onFolderChange(crumb.id)}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: '#00007f',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontFamily: 'MS Sans Serif, Microsoft Sans Serif, Arial, sans-serif',
                  textDecoration: 'underline'
                }}
              >
                {crumb.name}
              </button>
            </React.Fragment>
          ))}
        </div>
        
        {/* Create Folder Button - Admin Only */}
        {isAdmin && (
          <button
            onClick={() => setShowCreateFolder(true)}
            style={{
              padding: '3px 10px',
              background: '#c0c0c0',
              border: '2px solid',
              borderColor: '#fff #000 #000 #fff',
              borderRadius: '0',
              color: '#000',
              cursor: 'pointer',
              fontSize: '0.85rem',
              whiteSpace: 'nowrap',
              fontFamily: 'MS Sans Serif, Microsoft Sans Serif, Arial, sans-serif',
              fontWeight: 'normal',
              boxShadow: 'inset 1px 1px 0 #dfdfdf, inset -1px -1px 0 #808080'
            }}
          >
            New Folder
          </button>
        )}
      </div>

      {/* Folders */}
      {folders.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '0.75rem', color: '#000', fontSize: '0.9rem', fontWeight: 'bold' }}>Folders</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
            {folders.map((folder) => (
              <div
                key={folder.id}
                style={{
                  background: '#c0c0c0',
                  padding: '0.75rem',
                  borderRadius: '0',
                  cursor: 'pointer',
                  border: '2px solid',
                  borderColor: '#fff #808080 #808080 #fff',
                  boxShadow: 'inset 1px 1px 0 #dfdfdf'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#000080 #87ceeb #87ceeb #000080';
                  e.currentTarget.style.background = '#000080';
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#fff #808080 #808080 #fff';
                  e.currentTarget.style.background = '#c0c0c0';
                  e.currentTarget.style.color = '#000';
                }}
              >
                <div onClick={() => onFolderChange(folder.id)} style={{ marginBottom: '0.5rem' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.25rem', filter: 'grayscale(100%)' }}>📁</div>
                  <div style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>{folder.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#555', marginTop: '0.25rem' }}>
                    by {folder.created_by_username}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteFolder(folder.id)}
                  style={{
                    padding: '2px 8px',
                    background: '#c0c0c0',
                    border: '2px solid',
                    borderColor: '#fff #000 #000 #fff',
                    borderRadius: '0',
                    color: '#000',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    width: '100%',
                    fontFamily: 'MS Sans Serif, Microsoft Sans Serif, Arial, sans-serif',
                    boxShadow: 'inset 1px 1px 0 #dfdfdf, inset -1px -1px 0 #808080'
                  }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Files */}
      <div>
        <h3 style={{ marginBottom: '0.75rem', color: '#000', fontSize: '0.9rem', fontWeight: 'bold' }}>Files ({files.length})</h3>
        <FileList 
          files={files} 
          onDelete={handleDeleteFile} 
          currentUser={currentUser}
          isAdmin={isAdmin}
        />
      </div>

      {/* Create Folder Modal */}
      {showCreateFolder && (
        <CreateFolderModal
          onClose={() => setShowCreateFolder(false)}
          onCreate={handleCreateFolder}
        />
      )}
    </div>
  );
};

export default FileExplorer;
