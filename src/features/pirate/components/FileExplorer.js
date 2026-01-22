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
    const { data: foldersData, error: foldersError } = await supabase
      .from('folders')
      .select('*, created_by(username)')
      .eq('parent_id', currentFolder || null)
      .order('name');

    if (foldersError) {
      console.error('Error fetching folders:', foldersError);
    } else {
      setFolders(foldersData || []);
    }

    // Fetch files in current directory
    const { data: filesData, error: filesError } = await supabase
      .from('files')
      .select('*, uploaded_by(username)')
      .eq('folder_id', currentFolder || null)
      .order('created_at', { ascending: false });

    if (filesError) {
      console.error('Error fetching files:', filesError);
    } else {
      setFiles(filesData || []);
    }

    setLoading(false);
  }, [currentFolder]);

  useEffect(() => {
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

    const { error } = await supabase
      .from('files')
      .delete()
      .eq('id', fileId);

    if (error) {
      alert(`Error deleting file: ${error.message}`);
    } else {
      fetchFoldersAndFiles();
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>;
  }

  return (
    <div style={{ background: '#2d2d2d', borderRadius: '8px', padding: '1.5rem' }}>
      {/* Breadcrumbs */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <button
          onClick={() => onFolderChange(null)}
          style={{ 
            background: 'none', 
            border: 'none', 
            color: '#66b3ff',
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          🏴‍☠️ Root
        </button>
        {breadcrumbs.map((crumb, idx) => (
          <React.Fragment key={crumb.id}>
            <span style={{ color: '#666' }}>/</span>
            <button
              onClick={() => onFolderChange(crumb.id)}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: '#66b3ff',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              {crumb.name}
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* Actions */}
      <div style={{ marginBottom: '1.5rem' }}>
        <button
          onClick={() => setShowCreateFolder(true)}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#28a745',
            border: 'none',
            borderRadius: '4px',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          ➕ Create Folder
        </button>
      </div>

      {/* Folders */}
      {folders.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1rem', color: '#aaa' }}>📁 Folders</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
            {folders.map((folder) => (
              <div
                key={folder.id}
                style={{
                  background: '#3a3a3a',
                  padding: '1rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  border: '2px solid transparent',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#66b3ff'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
              >
                <div onClick={() => onFolderChange(folder.id)} style={{ marginBottom: '0.5rem' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📁</div>
                  <div style={{ fontWeight: 'bold' }}>{folder.name}</div>
                  <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.25rem' }}>
                    by {folder.created_by?.username || 'Unknown'}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteFolder(folder.id)}
                  style={{
                    padding: '0.25rem 0.5rem',
                    background: '#dc3545',
                    border: 'none',
                    borderRadius: '4px',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    width: '100%'
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
        <h3 style={{ marginBottom: '1rem', color: '#aaa' }}>📄 Files ({files.length})</h3>
        <FileList files={files} onDelete={handleDeleteFile} />
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
