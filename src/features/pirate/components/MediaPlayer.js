import React, { useEffect, useRef, useState, useCallback } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import './MediaPlayer.css';
import { useAuth } from '../../../lib/AuthContext';

const MediaPlayer = ({ 
  file, 
  url, 
  playlist = [], 
  currentIndex = 0, 
  onPlaylistChange,
  onClose 
}) => {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const urlTimestampRef = useRef(Date.now());
  const onPlaylistChangeRef = useRef(onPlaylistChange);
  const currentIndexRef = useRef(currentIndex);
  const playlistLengthRef = useRef(playlist.length);
  const [error, setError] = useState(null);
  const [isRefreshingUrl, setIsRefreshingUrl] = useState(false);
  const { session } = useAuth();

  const isVideo = file?.file_type?.startsWith('video/');
  const isAudio = file?.file_type?.startsWith('audio/');

  // Check if browser can play the file
  const checkCodecSupport = (fileType) => {
    if (!fileType) return { supported: false, message: 'Unknown file type' };

    const video = document.createElement('video');
    const audio = document.createElement('audio');

    // Common MIME types
    const typeMap = {
      'video/mp4': video.canPlayType('video/mp4; codecs="avc1.42E01E, mp4a.40.2"'),
      'video/webm': video.canPlayType('video/webm; codecs="vp8, vorbis"'),
      'video/ogg': video.canPlayType('video/ogg; codecs="theora, vorbis"'),
      'video/x-matroska': video.canPlayType('video/x-matroska; codecs="avc1.42E01E, mp4a.40.2"'),
      'audio/mpeg': audio.canPlayType('audio/mpeg'),
      'audio/mp4': audio.canPlayType('audio/mp4'),
      'audio/ogg': audio.canPlayType('audio/ogg; codecs="vorbis"'),
      'audio/wav': audio.canPlayType('audio/wav'),
      'audio/webm': audio.canPlayType('audio/webm'),
    };

    const support = typeMap[fileType] || '';
    
    if (support === 'probably' || support === 'maybe') {
      return { supported: true };
    }

    return { 
      supported: false, 
      message: `Your browser may not support this file format (${fileType}). Try downloading the file instead.` 
    };
  };

  // Refresh URL before it expires (1 hour expiry)
  const refreshUrl = useCallback(async () => {
    if (isRefreshingUrl || !file) return;

    try {
      setIsRefreshingUrl(true);
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
        throw new Error('Failed to refresh URL');
      }

      const data = await response.json();
      
      if (playerRef.current && data.downloadUrl) {
        const currentTime = playerRef.current.currentTime();
        const wasPaused = playerRef.current.paused();
        
        playerRef.current.src({ src: data.downloadUrl, type: file.file_type });
        playerRef.current.currentTime(currentTime);
        
        if (!wasPaused) {
          playerRef.current.play();
        }
        
        urlTimestampRef.current = Date.now();
      }
    } catch (err) {
      console.error('Error refreshing URL:', err);
    } finally {
      setIsRefreshingUrl(false);
    }
  }, [file, session, isRefreshingUrl]);

  // Check URL age and refresh if needed
  useEffect(() => {
    const checkUrlExpiry = setInterval(() => {
      const age = Date.now() - urlTimestampRef.current;
      const fiftyMinutes = 50 * 60 * 1000;
      
      if (age >= fiftyMinutes) {
        refreshUrl();
      }
    }, 60000); // Check every minute

    return () => clearInterval(checkUrlExpiry);
  }, [file, session, refreshUrl]);

  useEffect(() => {
    onPlaylistChangeRef.current = onPlaylistChange;
  }, [onPlaylistChange]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    playlistLengthRef.current = playlist.length;
  }, [playlist.length]);

  useEffect(() => {
    if (!videoRef.current || playerRef.current) return;

    const player = videojs(videoRef.current, {
      controls: true,
      autoplay: false,
      preload: 'auto',
      fluid: true,
      playbackRates: [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2],
      controlBar: {
        pictureInPictureToggle: isVideo,
        volumePanel: {
          inline: false
        }
      }
    });

    playerRef.current = player;

    const savedVolume = localStorage.getItem('mediaPlayerVolume');
    if (savedVolume) {
      player.volume(parseFloat(savedVolume));
    }

    player.on('volumechange', () => {
      localStorage.setItem('mediaPlayerVolume', player.volume());
    });

    player.on('ended', () => {
      const playlistChange = onPlaylistChangeRef.current;
      const activeIndex = currentIndexRef.current;
      const totalItems = playlistLengthRef.current;
      if (playlistChange && activeIndex < totalItems - 1) {
        playlistChange(activeIndex + 1);
      }
    });

    player.on('error', () => {
      const currentError = player.error();
      if (currentError) {
        setError(`Playback error: ${currentError.message || 'Unable to play this file'}`);
      }
    });

    const handleKeyDown = (e) => {
      const currentPlayer = playerRef.current;
      if (!currentPlayer) return;

      switch(e.key) {
        case ' ':
          e.preventDefault();
          if (currentPlayer.paused()) {
            currentPlayer.play();
          } else {
            currentPlayer.pause();
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          currentPlayer.currentTime(Math.max(0, currentPlayer.currentTime() - 5));
          break;
        case 'ArrowRight':
          e.preventDefault();
          currentPlayer.currentTime(currentPlayer.currentTime() + 5);
          break;
        case 'n':
        case 'N': {
          const playlistChange = onPlaylistChangeRef.current;
          const activeIndex = currentIndexRef.current;
          const totalItems = playlistLengthRef.current;
          if (playlistChange && activeIndex < totalItems - 1) {
            playlistChange(activeIndex + 1);
          }
          break;
        }
        case 'p':
        case 'P': {
          const playlistChange = onPlaylistChangeRef.current;
          const activeIndex = currentIndexRef.current;
          if (playlistChange && activeIndex > 0) {
            playlistChange(activeIndex - 1);
          }
          break;
        }
        case 'c':
        case 'C': {
          const tracks = currentPlayer.textTracks();
          if (tracks.length > 0) {
            const track = tracks[0];
            track.mode = track.mode === 'showing' ? 'hidden' : 'showing';
          }
          break;
        }
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (playerRef.current && !playerRef.current.isDisposed()) {
        if (playerRef.current.isFullscreen && playerRef.current.isFullscreen()) {
          playerRef.current.exitFullscreen();
        }

        const fullscreenElement = document.fullscreenElement;
        if (fullscreenElement && playerRef.current.el && playerRef.current.el()?.contains(fullscreenElement)) {
          document.exitFullscreen?.();
        }

        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [isVideo]);

  useEffect(() => {
    if (!playerRef.current || !url || !file) return;

    const codecCheck = checkCodecSupport(file.file_type);
    if (!codecCheck.supported) {
      setError(codecCheck.message);
      return;
    }

    setError(null);
    playerRef.current.src({ src: url, type: file.file_type });
    urlTimestampRef.current = Date.now();
  }, [url, file]);

  const handlePrevious = () => {
    if (onPlaylistChange && currentIndex > 0) {
      onPlaylistChange(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (onPlaylistChange && currentIndex < playlist.length - 1) {
      onPlaylistChange(currentIndex + 1);
    }
  };

  return (
    <div className="media-player-container">
      {error ? (
        <div className="media-player-error">
          <div className="error-icon">⚠</div>
          <div className="error-message">{error}</div>
          <button onClick={onClose} className="error-close-btn">
            Close
          </button>
        </div>
      ) : (
        <>
          <div className="media-player-wrapper" data-vjs-player>
            {isVideo ? (
              <video
                ref={videoRef}
                className="video-js vjs-big-play-centered"
              />
            ) : isAudio ? (
              <video
                ref={videoRef}
                className="video-js vjs-audio"
              />
            ) : null}
          </div>

          {playlist.length > 1 && (
            <div className="playlist-controls">
              <div className="playlist-info">
                Track {currentIndex + 1} of {playlist.length}
              </div>
              <div className="playlist-buttons">
                <button
                  onClick={handlePrevious}
                  disabled={currentIndex === 0}
                  className="playlist-btn"
                  title="Previous (P)"
                >
                  ⏮ Previous
                </button>
                <button
                  onClick={handleNext}
                  disabled={currentIndex === playlist.length - 1}
                  className="playlist-btn"
                  title="Next (N)"
                >
                  Next ⏭
                </button>
              </div>
            </div>
          )}

          {playlist.length > 1 && (
            <div className="playlist-list">
              <div className="playlist-title">Playlist</div>
              <div className="playlist-items">
                {playlist.map((item, index) => (
                  <div
                    key={item.id}
                    className={`playlist-item ${index === currentIndex ? 'active' : ''}`}
                    onClick={() => onPlaylistChange && onPlaylistChange(index)}
                  >
                    <span className="playlist-item-icon">
                      {index === currentIndex ? '▶' : '♪'}
                    </span>
                    <span className="playlist-item-name">{item.file_name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="media-player-shortcuts">
            <strong>Keyboard Shortcuts:</strong> Space=Play/Pause | ←/→=Seek 5s | N=Next | P=Previous | C=Captions
          </div>
        </>
      )}
    </div>
  );
};

export default MediaPlayer;
