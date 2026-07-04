import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../lib/AuthContext';

const styles = {
  grid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2px', marginTop: '16px' },
  tile: { position: 'relative', aspectRatio: '1', background: '#e2e2e6', overflow: 'hidden', cursor: 'pointer' },
  img: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  videoBadge: { position: 'absolute', bottom: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '11px', padding: '2px 5px', borderRadius: '4px' },
  placeholder: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' },
  empty: { textAlign: 'center', color: '#888', fontSize: '14px', padding: '40px 0' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' },
  overlayMedia: { maxWidth: '100%', maxHeight: '75vh', borderRadius: '8px' },
  overlayBar: { display: 'flex', gap: '12px', marginTop: '16px' },
  overlayButton: { padding: '10px 18px', borderRadius: '10px', border: 'none', fontSize: '14px', fontWeight: 600, cursor: 'pointer' },
};

const BackupTile = ({ file, onOpen }) => {
  const [visible, setVisible] = useState(false);
  const [thumbUrl, setThumbUrl] = useState(null);
  const ref = useRef(null);
  const { session } = useAuth();
  const isImage = (file.file_type || '').startsWith('image/');

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || !isImage || thumbUrl) return;
    let cancelled = false;

    fetch('/.netlify/functions/backup-get-file-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ fileId: file.id }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.downloadUrl) setThumbUrl(data.downloadUrl);
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [visible, isImage, thumbUrl, file.id, session]);

  return (
    <div ref={ref} style={styles.tile} onClick={() => onOpen(file)}>
      {isImage && thumbUrl ? (
        <img src={thumbUrl} alt={file.file_name} style={styles.img} loading="lazy" />
      ) : (
        <div style={styles.placeholder}>{isImage ? '🖼️' : '🎬'}</div>
      )}
      {!isImage && <div style={styles.videoBadge}>Video</div>}
    </div>
  );
};

const BackupGrid = ({ refreshKey, onCountChange }) => {
  const { session } = useAuth();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFile, setActiveFile] = useState(null);
  const [activeUrl, setActiveUrl] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchFiles = React.useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('backup_files')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) {
      setFiles(data || []);
      if (onCountChange) onCountChange((data || []).length);
    }
    setLoading(false);
  }, [onCountChange]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles, refreshKey]);

  const openFile = async (file) => {
    setActiveFile(file);
    setActiveUrl(null);

    const res = await fetch('/.netlify/functions/backup-get-file-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ fileId: file.id }),
    });
    const data = await res.json();
    if (data.downloadUrl) setActiveUrl(data.downloadUrl);
  };

  const closeViewer = () => {
    setActiveFile(null);
    setActiveUrl(null);
  };

  const handleDelete = async () => {
    if (!activeFile) return;
    if (!window.confirm(`Delete ${activeFile.file_name}? This can't be undone.`)) return;

    setDeleting(true);
    try {
      const res = await fetch('/.netlify/functions/backup-delete-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ fileId: activeFile.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete file');

      setFiles((prev) => prev.filter((f) => f.id !== activeFile.id));
      if (onCountChange) onCountChange(files.length - 1);
      closeViewer();
    } catch (err) {
      alert(`Error deleting file: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <div style={styles.empty}>Loading...</div>;
  }

  if (files.length === 0) {
    return <div style={styles.empty}>No backups yet. Add your first photo above.</div>;
  }

  return (
    <>
      <div style={styles.grid}>
        {files.map((file) => (
          <BackupTile key={file.id} file={file} onOpen={openFile} />
        ))}
      </div>

      {activeFile && (
        <div style={styles.overlay} onClick={closeViewer}>
          <div onClick={(e) => e.stopPropagation()}>
            {activeUrl ? (
              (activeFile.file_type || '').startsWith('video/') ? (
                <video src={activeUrl} controls autoPlay style={styles.overlayMedia} />
              ) : (
                <img src={activeUrl} alt={activeFile.file_name} style={styles.overlayMedia} />
              )
            ) : (
              <div style={{ color: '#fff' }}>Loading...</div>
            )}
          </div>
          <div style={styles.overlayBar}>
            {activeUrl && (
              <a href={activeUrl} download={activeFile.file_name} style={{ textDecoration: 'none' }}>
                <button style={{ ...styles.overlayButton, background: '#fff', color: '#111' }}>Download</button>
              </a>
            )}
            <button
              style={{ ...styles.overlayButton, background: '#ff3b30', color: '#fff' }}
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
            <button style={{ ...styles.overlayButton, background: '#333', color: '#fff' }} onClick={closeViewer}>
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default BackupGrid;
