import React, { useRef, useState } from 'react';
import { useAuth } from '../../../lib/AuthContext';

const MULTIPART_THRESHOLD = 500 * 1024 * 1024; // 500MB
const CHUNK_SIZE = 500 * 1024 * 1024;
const MAX_CONCURRENT_FILES = 3;
const MAX_CONCURRENT_CHUNKS = 4;
const MAX_RETRIES = 3;

const styles = {
  addButton: { width: '100%', padding: '14px', background: '#007aff', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 600, cursor: 'pointer' },
  addButtonDisabled: { background: '#a9cdfb', cursor: 'not-allowed' },
  queue: { marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' },
  row: { background: '#f5f5f7', borderRadius: '10px', padding: '10px 12px' },
  rowTop: { display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#333', marginBottom: '6px' },
  fileName: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' },
  barTrack: { height: '6px', borderRadius: '3px', background: '#e2e2e6', overflow: 'hidden' },
  barFill: (pct, failed) => ({ height: '100%', width: `${pct}%`, background: failed ? '#ff3b30' : pct >= 100 ? '#34c759' : '#007aff', transition: 'width 0.2s ease' }),
  statusText: { fontSize: '12px', color: '#888', marginTop: '4px' },
  errorText: { fontSize: '12px', color: '#ff3b30', marginTop: '4px' },
};

const sha1Hex = async (buffer) => {
  const hashBuffer = await crypto.subtle.digest('SHA-1', buffer);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
};

const BackupUploader = ({ onUploadComplete }) => {
  const { session } = useAuth();
  const [queue, setQueue] = useState([]);
  const inputRef = useRef(null);
  const busyRef = useRef(false);

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token}`,
  });

  const updateItem = (id, patch) => {
    setQueue((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const uploadDirect = async (item) => {
    const { file, id } = item;

    const presignedRes = await fetch('/.netlify/functions/backup-get-upload-url', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ fileName: file.name }),
    });
    if (!presignedRes.ok) throw new Error((await presignedRes.json()).error || 'Failed to prepare upload');
    const { uploadUrl, authorizationToken, uploadPath } = await presignedRes.json();
    updateItem(id, { progress: 25 });

    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: authorizationToken,
        'Content-Type': file.type || 'application/octet-stream',
        'X-Bz-File-Name': encodeURIComponent(uploadPath),
        'X-Bz-Content-Sha1': 'do_not_verify',
      },
      body: file,
    });
    if (!uploadRes.ok) throw new Error(`Upload failed: ${await uploadRes.text()}`);
    updateItem(id, { progress: 80 });

    const metadataRes = await fetch('/.netlify/functions/backup-store-file-metadata', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        fileName: file.name,
        filePath: uploadPath,
        fileType: file.type || 'application/octet-stream',
        fileSize: file.size,
      }),
    });
    if (!metadataRes.ok) throw new Error((await metadataRes.json()).error || 'Failed to save file information');

    updateItem(id, { progress: 100 });
  };

  const uploadMultipart = async (item) => {
    const { file, id } = item;
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    const startRes = await fetch('/.netlify/functions/backup-start-large-upload', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ fileName: file.name, mimeType: file.type || 'application/octet-stream' }),
    });
    if (!startRes.ok) throw new Error((await startRes.json()).error || 'Failed to start upload');
    const { fileId, uploadPath } = await startRes.json();

    const sha1Array = new Array(totalChunks);
    let completed = 0;

    const uploadChunk = async (chunkIndex, retryCount = 0) => {
      try {
        const start = chunkIndex * CHUNK_SIZE;
        const chunk = file.slice(start, Math.min(start + CHUNK_SIZE, file.size));
        const sha1 = await sha1Hex(await chunk.arrayBuffer());

        const partUrlRes = await fetch('/.netlify/functions/get-part-upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileId, partNumber: chunkIndex + 1 }),
        });
        if (!partUrlRes.ok) throw new Error(`Failed to get upload URL for part ${chunkIndex + 1}`);
        const { uploadUrl, authorizationToken } = await partUrlRes.json();

        const uploadRes = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            Authorization: authorizationToken,
            'X-Bz-Part-Number': String(chunkIndex + 1),
            'X-Bz-Content-Sha1': sha1,
          },
          body: chunk,
        });
        if (!uploadRes.ok) throw new Error(`Failed to upload part ${chunkIndex + 1}: ${await uploadRes.text()}`);

        sha1Array[chunkIndex] = sha1;
        completed += 1;
        updateItem(id, { progress: 10 + (completed / totalChunks) * 70 });
      } catch (err) {
        if (retryCount < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, 2 ** retryCount * 1000));
          return uploadChunk(chunkIndex, retryCount + 1);
        }
        throw err;
      }
    };

    for (let i = 0; i < totalChunks; i += MAX_CONCURRENT_CHUNKS) {
      const batch = [];
      for (let j = i; j < Math.min(i + MAX_CONCURRENT_CHUNKS, totalChunks); j++) batch.push(uploadChunk(j));
      await Promise.all(batch);
    }

    updateItem(id, { progress: 90 });

    const finishRes = await fetch('/.netlify/functions/backup-finish-large-upload', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        fileId,
        sha1Array,
        fileName: file.name,
        filePath: uploadPath,
        fileType: file.type || 'application/octet-stream',
        fileSize: file.size,
      }),
    });
    if (!finishRes.ok) throw new Error((await finishRes.json()).error || 'Failed to finalize upload');

    updateItem(id, { progress: 100 });
  };

  const uploadOne = async (item) => {
    updateItem(item.id, { status: 'uploading', progress: 5 });
    try {
      if (item.file.size > MULTIPART_THRESHOLD) {
        await uploadMultipart(item);
      } else {
        await uploadDirect(item);
      }
      updateItem(item.id, { status: 'done' });
      if (onUploadComplete) onUploadComplete();
    } catch (err) {
      updateItem(item.id, { status: 'error', error: err.message });
    }
  };

  const processQueue = async (items) => {
    if (busyRef.current) return;
    busyRef.current = true;

    let index = 0;
    const runNext = async () => {
      if (index >= items.length) return;
      const item = items[index];
      index += 1;
      await uploadOne(item);
      await runNext();
    };

    const workers = Array.from({ length: Math.min(MAX_CONCURRENT_FILES, items.length) }, runNext);
    await Promise.all(workers);

    busyRef.current = false;
  };

  const handleFilesSelected = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const items = files.map((file) => ({
      id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
      file,
      status: 'pending',
      progress: 0,
      error: null,
    }));

    setQueue((prev) => [...items, ...prev]);
    processQueue(items);
    e.target.value = '';
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        onChange={handleFilesSelected}
        style={{ display: 'none' }}
      />
      <button
        style={styles.addButton}
        onClick={() => inputRef.current?.click()}
      >
        + Add Photos & Videos
      </button>

      {queue.length > 0 && (
        <div style={styles.queue}>
          {queue.map((item) => (
            <div key={item.id} style={styles.row}>
              <div style={styles.rowTop}>
                <span style={styles.fileName}>{item.file.name}</span>
                <span>{(item.file.size / 1024 / 1024).toFixed(1)} MB</span>
              </div>
              <div style={styles.barTrack}>
                <div style={styles.barFill(item.progress, item.status === 'error')} />
              </div>
              {item.status === 'error' ? (
                <div style={styles.errorText}>{item.error}</div>
              ) : (
                <div style={styles.statusText}>
                  {item.status === 'done' ? 'Uploaded' : item.status === 'uploading' ? 'Uploading...' : 'Waiting...'}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BackupUploader;
