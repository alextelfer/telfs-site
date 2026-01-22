import React, { useState } from 'react';

const CreateFolderModal = ({ onClose, onCreate }) => {
  const [folderName, setFolderName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (folderName.trim()) {
      onCreate(folderName.trim());
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#2d2d2d',
          padding: '2rem',
          borderRadius: '8px',
          minWidth: '400px',
          border: '2px solid #444'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Create New Folder</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="folderName" style={{ display: 'block', marginBottom: '0.5rem' }}>
              Folder Name:
            </label>
            <input
              id="folderName"
              type="text"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="Enter folder name"
              autoFocus
              style={{
                width: '100%',
                padding: '0.75rem',
                background: '#1a1a1a',
                border: '1px solid #444',
                borderRadius: '4px',
                color: '#fff',
                fontSize: '1rem'
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#6c757d',
                border: 'none',
                borderRadius: '4px',
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!folderName.trim()}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#28a745',
                border: 'none',
                borderRadius: '4px',
                color: '#fff',
                cursor: folderName.trim() ? 'pointer' : 'not-allowed',
                opacity: folderName.trim() ? 1 : 0.6
              }}
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateFolderModal;
