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
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#c0c0c0',
          padding: '0',
          borderRadius: '0',
          minWidth: '400px',
          border: '2px solid',
          borderColor: '#fff #000 #000 #fff',
          boxShadow: 'inset 1px 1px 0 #dfdfdf, 2px 2px 8px rgba(0,0,0,0.5)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ 
          padding: '3px 8px',
          background: '#000080',
          color: '#fff',
          fontFamily: 'MS Sans Serif, Microsoft Sans Serif, Arial, sans-serif',
          fontSize: '0.85rem',
          fontWeight: 'bold',
          marginBottom: '0'
        }}>
          Create New Folder
        </div>
        <div style={{ padding: '1rem' }}>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="folderName" style={{ display: 'block', marginBottom: '0.5rem', fontFamily: 'MS Sans Serif, Microsoft Sans Serif, Arial, sans-serif', fontSize: '0.85rem', color: '#000' }}>
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
                padding: '4px',
                background: '#fff',
                border: '2px solid',
                borderColor: '#808080 #fff #fff #808080',
                borderRadius: '0',
                color: '#000',
                fontSize: '0.85rem',
                fontFamily: 'MS Sans Serif, Microsoft Sans Serif, Arial, sans-serif',
                boxSizing: 'border-box',
                boxShadow: 'inset -1px -1px 0 #dfdfdf, inset 1px 1px 0 #000'
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '4px 16px',
                background: '#c0c0c0',
                border: '2px solid',
                borderColor: '#fff #000 #000 #fff',
                borderRadius: '0',
                color: '#000',
                cursor: 'pointer',
                fontFamily: 'MS Sans Serif, Microsoft Sans Serif, Arial, sans-serif',
                fontSize: '0.85rem',
                fontWeight: 'normal',
                boxShadow: 'inset 1px 1px 0 #dfdfdf, inset -1px -1px 0 #808080'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!folderName.trim()}
              style={{
                padding: '4px 16px',
                background: !folderName.trim() ? '#808080' : '#c0c0c0',
                border: '2px solid',
                borderColor: !folderName.trim() ? '#000 #fff #fff #000' : '#fff #000 #000 #fff',
                borderRadius: '0',
                color: '#000',
                cursor: folderName.trim() ? 'pointer' : 'not-allowed',
                fontFamily: 'MS Sans Serif, Microsoft Sans Serif, Arial, sans-serif',
                fontSize: '0.85rem',
                fontWeight: 'bold',
                boxShadow: !folderName.trim() ? 'inset -1px -1px 0 #dfdfdf, inset 1px 1px 0 #000' : 'inset 1px 1px 0 #dfdfdf, inset -1px -1px 0 #808080'
              }}
            >
              Create
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
};

export default CreateFolderModal;
