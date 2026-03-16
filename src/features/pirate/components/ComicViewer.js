import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import JSZip from 'jszip';
import { useAuth } from '../../../lib/AuthContext';

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'];

const getFileExtension = (fileName = '') => {
  const parts = fileName.toLowerCase().split('.');
  return parts.length > 1 ? parts.pop() : '';
};

const isImageByType = (fileType = '') => fileType.startsWith('image/');

const isPdfByType = (fileType = '') => fileType.includes('pdf');

const sortNaturally = (left, right) => left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' });

const getComicLoadErrorMessage = (loadError) => {
  const rawMessage = String(loadError?.message || '');
  const normalizedMessage = rawMessage.toLowerCase();

  const compressionMatch = rawMessage.match(/compression\s+\\x([0-9a-fA-F]{2})\\x([0-9a-fA-F]{2})/);
  if (compressionMatch) {
    const lowByte = parseInt(compressionMatch[1], 16);
    const highByte = parseInt(compressionMatch[2], 16);
    const compressionMethod = lowByte + (highByte << 8);

    const methodNames = {
      9: 'deflate64',
      12: 'bzip2',
      14: 'lzma'
    };

    const methodLabel = methodNames[compressionMethod] || 'unknown';
    return `this cbz uses unsupported zip compression (method ${compressionMethod}: ${methodLabel}). repack as zip/cbz with store or deflate and re-upload.`;
  }

  if (normalizedMessage.includes('encrypted')) {
    return 'this cbz is encrypted/password-protected and cannot be previewed in browser. download it or re-export unencrypted.';
  }

  return 'failed to open comic file. try downloading it instead.';
};

const ComicViewer = ({ file, url }) => {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pageUrls, setPageUrls] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [requestedPage, setRequestedPage] = useState(0);

  const saveTimeoutRef = useRef(null);
  const createdBlobUrlsRef = useRef([]);
  const currentPageRef = useRef(0);

  const extension = useMemo(() => getFileExtension(file?.file_name || ''), [file?.file_name]);
  const isCbz = extension === 'cbz';
  const isPdf = extension === 'pdf' || isPdfByType(file?.file_type || '');
  const isSingleImage = IMAGE_EXTENSIONS.includes(extension) || isImageByType(file?.file_type || '');

  const totalPages = isPdf ? null : pageUrls.length;

  const localKey = useMemo(() => {
    if (!session?.user?.id || !file?.id) return null;
    return `comic-progress-${session.user.id}-${file.id}`;
  }, [session?.user?.id, file?.id]);

  const persistProgress = useCallback(async (pageIndex) => {
    if (!file?.id || !session?.access_token) return;

    try {
      await fetch('/.netlify/functions/save-comic-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          fileId: file.id,
          pageIndex,
          totalPages
        })
      });
    } catch (persistError) {
      console.error('Failed to save comic progress:', persistError);
    }
  }, [file?.id, session?.access_token, totalPages]);

  const saveProgress = useCallback((pageIndex, force = false) => {
    if (!Number.isInteger(pageIndex) || pageIndex < 0) return;

    if (localKey) {
      localStorage.setItem(localKey, JSON.stringify({
        pageIndex,
        totalPages,
        updatedAt: Date.now()
      }));
    }

    if (force) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      persistProgress(pageIndex);
      return;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      persistProgress(pageIndex);
      saveTimeoutRef.current = null;
    }, 600);
  }, [localKey, persistProgress, totalPages]);

  useEffect(() => {
    let isCancelled = false;

    const loadSavedProgress = async () => {
      if (!file?.id || !session?.access_token) return;

      let localPage = 0;
      if (localKey) {
        try {
          const localData = JSON.parse(localStorage.getItem(localKey) || 'null');
          if (localData && Number.isInteger(localData.pageIndex) && localData.pageIndex >= 0) {
            localPage = localData.pageIndex;
          }
        } catch (parseError) {
          console.error('Failed to parse local comic progress:', parseError);
        }
      }

      let remotePage = null;
      try {
        const response = await fetch(`/.netlify/functions/get-comic-progress?fileId=${file.id}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.progress && Number.isInteger(data.progress.page_index) && data.progress.page_index >= 0) {
            remotePage = data.progress.page_index;
          }
        }
      } catch (loadError) {
        console.error('Failed to load remote comic progress:', loadError);
      }

      if (!isCancelled) {
        setRequestedPage(remotePage !== null ? remotePage : localPage);
      }
    };

    loadSavedProgress();

    return () => {
      isCancelled = true;
    };
  }, [file?.id, session?.access_token, localKey]);

  useEffect(() => {
    let isMounted = true;

    const resetUrls = () => {
      createdBlobUrlsRef.current.forEach((blobUrl) => URL.revokeObjectURL(blobUrl));
      createdBlobUrlsRef.current = [];
    };

    const loadComic = async () => {
      if (!file || !url) return;

      setLoading(true);
      setError(null);
      setPageUrls([]);

      try {
        if (isCbz) {
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error('Failed to fetch comic archive');
          }

          const archiveBlob = await response.blob();
          const zip = await JSZip.loadAsync(archiveBlob);

          const imageFiles = Object.values(zip.files)
            .filter((zipFile) => !zipFile.dir)
            .filter((zipFile) => {
              const zipExt = getFileExtension(zipFile.name);
              return IMAGE_EXTENSIONS.includes(zipExt);
            })
            .sort((left, right) => sortNaturally(left.name, right.name));

          if (!imageFiles.length) {
            throw new Error('No comic pages found in this CBZ file');
          }

          resetUrls();
          const generatedUrls = [];

          for (const imageFile of imageFiles) {
            const imageBlob = await imageFile.async('blob');
            const blobUrl = URL.createObjectURL(imageBlob);
            generatedUrls.push(blobUrl);
          }

          createdBlobUrlsRef.current = generatedUrls;

          if (isMounted) {
            setPageUrls(generatedUrls);
          }
        } else if (isSingleImage) {
          if (isMounted) {
            setPageUrls([url]);
          }
        } else if (!isPdf) {
          throw new Error('Unsupported comic format for MVP viewer');
        }
      } catch (loadError) {
        console.error('Comic load error:', loadError);
        if (isMounted) {
          setError(getComicLoadErrorMessage(loadError));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadComic();

    return () => {
      isMounted = false;
      resetUrls();
    };
  }, [file, url, isCbz, isPdf, isSingleImage]);

  useEffect(() => {
    if (isPdf) {
      setCurrentPage(requestedPage);
      return;
    }

    if (!pageUrls.length) return;
    setCurrentPage(Math.min(requestedPage, Math.max(0, pageUrls.length - 1)));
  }, [requestedPage, pageUrls, isPdf]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setCurrentPage((previous) => {
          const nextPage = Math.max(0, previous - 1);
          if (nextPage !== previous) {
            saveProgress(nextPage);
          }
          return nextPage;
        });
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        setCurrentPage((previous) => {
          const maxPage = isPdf ? previous + 1 : Math.max(0, pageUrls.length - 1);
          const nextPage = Math.min(maxPage, previous + 1);
          if (nextPage !== previous) {
            saveProgress(nextPage);
          }
          return nextPage;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPdf, pageUrls.length, saveProgress]);

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveProgress(currentPageRef.current, true);
    };
  }, [saveProgress]);

  const goToPreviousPage = () => {
    setCurrentPage((previous) => {
      const nextPage = Math.max(0, previous - 1);
      if (nextPage !== previous) {
        saveProgress(nextPage);
      }
      return nextPage;
    });
  };

  const goToNextPage = () => {
    setCurrentPage((previous) => {
      const maxPage = isPdf ? previous + 1 : Math.max(0, pageUrls.length - 1);
      const nextPage = Math.min(maxPage, previous + 1);
      if (nextPage !== previous) {
        saveProgress(nextPage);
      }
      return nextPage;
    });
  };

  const pageLabel = isPdf
    ? `Page ${currentPage + 1}`
    : `${Math.min(currentPage + 1, Math.max(pageUrls.length, 1))} / ${Math.max(pageUrls.length, 1)}`;

  return (
    <div style={{ width: '80vw', maxWidth: '1200px', height: '80vh', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
          padding: '0.5rem',
          background: '#c0c0c0',
          border: '2px solid',
          borderColor: '#fff #808080 #808080 #fff',
          fontFamily: 'MS Sans Serif, Microsoft Sans Serif, Arial, sans-serif',
          fontSize: '0.8rem'
        }}
      >
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={goToPreviousPage}
            disabled={currentPage <= 0}
            style={{
              padding: '3px 8px',
              background: currentPage <= 0 ? '#808080' : '#c0c0c0',
              border: '2px solid',
              borderColor: currentPage <= 0 ? '#000 #fff #fff #000' : '#fff #000 #000 #fff',
              color: '#000',
              cursor: currentPage <= 0 ? 'not-allowed' : 'pointer',
              fontFamily: 'MS Sans Serif, Microsoft Sans Serif, Arial, sans-serif',
              fontSize: '0.8rem'
            }}
          >
            Prev
          </button>
          <button
            onClick={goToNextPage}
            disabled={!isPdf && currentPage >= Math.max(0, pageUrls.length - 1)}
            style={{
              padding: '3px 8px',
              background: !isPdf && currentPage >= Math.max(0, pageUrls.length - 1) ? '#808080' : '#c0c0c0',
              border: '2px solid',
              borderColor: !isPdf && currentPage >= Math.max(0, pageUrls.length - 1) ? '#000 #fff #fff #000' : '#fff #000 #000 #fff',
              color: '#000',
              cursor: !isPdf && currentPage >= Math.max(0, pageUrls.length - 1) ? 'not-allowed' : 'pointer',
              fontFamily: 'MS Sans Serif, Microsoft Sans Serif, Arial, sans-serif',
              fontSize: '0.8rem'
            }}
          >
            Next
          </button>
        </div>

        <div style={{ fontWeight: 'bold', color: '#000' }}>{pageLabel}</div>
      </div>

      <div
        style={{
          flex: 1,
          background: '#000',
          border: '2px solid',
          borderColor: '#808080 #fff #fff #808080',
          marginTop: '4px',
          overflow: 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {loading && <div style={{ color: '#fff', fontFamily: 'Arial, sans-serif' }}>loading comic...</div>}

        {!loading && error && <div style={{ color: '#fff', fontFamily: 'Arial, sans-serif' }}>{error}</div>}

        {!loading && !error && isPdf && (
          <iframe
            src={`${url}#page=${currentPage + 1}`}
            title={file.file_name}
            style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }}
          />
        )}

        {!loading && !error && !isPdf && pageUrls[currentPage] && (
          <img
            src={pageUrls[currentPage]}
            alt={`${file.file_name} - page ${currentPage + 1}`}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
          />
        )}
      </div>
    </div>
  );
};

export default ComicViewer;
