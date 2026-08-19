import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import './CCStaffPartyPage.css';

const BUCKET = 'ccstaffparty';
const PAGE_TITLE = 'class clown staff party';

const IMAGE_EXTENSIONS = /\.(jpe?g|png|gif|webp|heic|heif)$/i;

const CCStaffPartyPage = () => {
  const [photos, setPhotos] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error | empty
  const [activeIndex, setActiveIndex] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.title = PAGE_TITLE;
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase.storage.from(BUCKET).list('', {
        limit: 1000,
        sortBy: { column: 'name', order: 'asc' },
      });

      if (cancelled) return;

      if (error) {
        console.error('Error listing photos:', error);
        setStatus('error');
        return;
      }

      const files = (data || []).filter(
        (item) => item.id && IMAGE_EXTENSIONS.test(item.name)
      );

      if (files.length === 0) {
        setStatus('empty');
        return;
      }

      const withUrls = files.map((item) => ({
        name: item.name,
        url: supabase.storage.from(BUCKET).getPublicUrl(item.name).data.publicUrl,
      }));

      setPhotos(withUrls);
      setStatus('ready');
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const closeModal = useCallback(() => {
    setActiveIndex(null);
  }, []);

  const goPrev = useCallback(() => {
    setActiveIndex((i) => (i === null ? i : (i - 1 + photos.length) % photos.length));
  }, [photos.length]);

  const goNext = useCallback(() => {
    setActiveIndex((i) => (i === null ? i : (i + 1) % photos.length));
  }, [photos.length]);

  useEffect(() => {
    if (activeIndex === null) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') closeModal();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeIndex, closeModal, goPrev, goNext]);

  const handleSave = async (photo) => {
    setSaving(true);
    try {
      const res = await fetch(photo.url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = photo.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Save failed, opening image instead:', err);
      window.open(photo.url, '_blank');
    } finally {
      setSaving(false);
    }
  };

  const activePhoto = activeIndex === null ? null : photos[activeIndex];

  return (
    <div className="ccsp-page">
      <h1 className="ccsp-title">{PAGE_TITLE}</h1>

      {status === 'loading' && <p className="ccsp-status">loading photos...</p>}
      {status === 'error' && <p className="ccsp-status">couldn't load photos. try refreshing.</p>}
      {status === 'empty' && <p className="ccsp-status">no photos yet.</p>}

      {status === 'ready' && (
        <div className="ccsp-grid">
          {photos.map((photo, index) => (
            <button
              key={photo.name}
              className="ccsp-tile"
              onClick={() => setActiveIndex(index)}
              aria-label={`Open ${photo.name}`}
            >
              <img src={photo.url} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      {activePhoto && (
        <div className="ccsp-overlay" onClick={closeModal}>
          <button className="ccsp-overlay-close" onClick={closeModal} aria-label="Close">
            &times;
          </button>

          <img
            className="ccsp-overlay-img"
            src={activePhoto.url}
            alt=""
            onClick={(e) => e.stopPropagation()}
          />

          <div className="ccsp-overlay-bar" onClick={(e) => e.stopPropagation()}>
            {photos.length > 1 && (
              <button
                className="ccsp-nav ccsp-nav-prev"
                onClick={goPrev}
                aria-label="Previous photo"
              >
                &#8249;
              </button>
            )}

            <span className="ccsp-counter">{activeIndex + 1} / {photos.length}</span>

            <button
              className="ccsp-save-btn"
              disabled={saving}
              onClick={() => handleSave(activePhoto)}
            >
              {saving ? 'saving...' : 'save photo'}
            </button>

            {photos.length > 1 && (
              <button
                className="ccsp-nav ccsp-nav-next"
                onClick={goNext}
                aria-label="Next photo"
              >
                &#8250;
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CCStaffPartyPage;
