import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../lib/AuthContext';
import './MediaPlayer.css';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
const CACHE_PREFIX = 'file_comments_';

/**
 * Comment caching utilities
 */
const CommentCache = {
  get: (fileId) => {
    try {
      const cached = localStorage.getItem(CACHE_PREFIX + fileId);
      if (!cached) return null;

      const { data, timestamp } = JSON.parse(cached);
      const age = Date.now() - timestamp;

      if (age > CACHE_TTL) {
        localStorage.removeItem(CACHE_PREFIX + fileId);
        return null;
      }

      return { data, age };
    } catch (error) {
      console.error('Error reading cache:', error);
      return null;
    }
  },

  set: (fileId, comments) => {
    try {
      const cacheData = {
        data: comments,
        timestamp: Date.now()
      };
      localStorage.setItem(CACHE_PREFIX + fileId, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error writing cache:', error);
      // If storage is full, clear old comment caches
      if (error.name === 'QuotaExceededError') {
        CommentCache.clearOldCaches();
      }
    }
  },

  invalidate: (fileId) => {
    try {
      localStorage.removeItem(CACHE_PREFIX + fileId);
    } catch (error) {
      console.error('Error invalidating cache:', error);
    }
  },

  clearOldCaches: () => {
    try {
      const keys = Object.keys(localStorage);
      const commentCaches = keys
        .filter(key => key.startsWith(CACHE_PREFIX))
        .map(key => {
          try {
            const data = JSON.parse(localStorage.getItem(key));
            return { key, timestamp: data.timestamp };
          } catch {
            return { key, timestamp: 0 };
          }
        })
        .sort((a, b) => a.timestamp - b.timestamp);

      // Remove oldest 50% of comment caches
      const toRemove = commentCaches.slice(0, Math.ceil(commentCaches.length / 2));
      toRemove.forEach(item => localStorage.removeItem(item.key));
    } catch (error) {
      console.error('Error clearing old caches:', error);
    }
  }
};

/**
 * CommentSection Component
 * Displays comments for a file with caching, add/delete functionality
 */
const CommentSection = ({ fileId, currentUserId, isAdmin, onCommentCountChange }) => {
  const { session } = useAuth();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [loadedFromCache, setLoadedFromCache] = useState(false);
  const [cacheAge, setCacheAge] = useState(0);
  const textareaRef = useRef(null);

  // Format date as MMM/DD
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const month = date.toLocaleString('en-US', { month: 'short' });
    const day = date.getDate();
    return `${month}/${day}`;
  };

  // Load comments
  const loadComments = async (useCache = true) => {
    setLoading(true);
    setError(null);

    try {
      // Try cache first
      if (useCache) {
        const cached = CommentCache.get(fileId);
        if (cached) {
          setComments(cached.data);
          setLoadedFromCache(true);
          setCacheAge(cached.age);
          setLoading(false);
          return;
        }
      }

      // Fetch from server
      const response = await fetch(
        `/.netlify/functions/get-file-comments?fileId=${fileId}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load comments');
      }

      const data = await response.json();
      setComments(data.comments || []);
      setLoadedFromCache(false);
      setCacheAge(0);

      // Cache the result
      CommentCache.set(fileId, data.comments || []);

      // Update count in parent
      if (onCommentCountChange) {
        onCommentCountChange(data.comments.length);
      }
    } catch (err) {
      console.error('Error loading comments:', err);
      setError('Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  // Add comment
  const handleAddComment = async (e) => {
    e.preventDefault();
    
    if (!newComment.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/.netlify/functions/add-comment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          fileId,
          comment: newComment.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add comment');
      }

      const data = await response.json();
      
      // Add new comment to list
      const updatedComments = [...comments, data.comment];
      setComments(updatedComments);
      setNewComment('');

      // Invalidate cache and update it with new data
      CommentCache.invalidate(fileId);
      CommentCache.set(fileId, updatedComments);

      // Update count in parent
      if (onCommentCountChange) {
        onCommentCountChange(updatedComments.length);
      }

      // Dispatch event for other components
      window.dispatchEvent(new CustomEvent('comment-updated', { 
        detail: { fileId, count: updatedComments.length } 
      }));
    } catch (err) {
      console.error('Error adding comment:', err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete comment
  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Delete this comment?')) return;

    try {
      const response = await fetch('/.netlify/functions/delete-comment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ commentId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete comment');
      }

      // Remove from list
      const updatedComments = comments.filter(c => c.id !== commentId);
      setComments(updatedComments);

      // Invalidate cache and update it with new data
      CommentCache.invalidate(fileId);
      CommentCache.set(fileId, updatedComments);

      // Update count in parent
      if (onCommentCountChange) {
        onCommentCountChange(updatedComments.length);
      }

      // Dispatch event for other components
      window.dispatchEvent(new CustomEvent('comment-updated', { 
        detail: { fileId, count: updatedComments.length } 
      }));
    } catch (err) {
      console.error('Error deleting comment:', err);
      setError(err.message);
    }
  };

  // Load comments on mount
  useEffect(() => {
    loadComments(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileId]);

  // Auto-focus textarea on mount
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  // Format cache age
  const formatCacheAge = (age) => {
    const seconds = Math.floor(age / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ago`;
  };

  return (
    <div className="comment-section">
      <div className="comment-header">
        <h4>Comments ({comments.length})</h4>
        <div className="comment-header-actions">
          {loadedFromCache && (
            <span className="cache-indicator" title="Loaded from cache">
              Updated {formatCacheAge(cacheAge)}
            </span>
          )}
          <button
            className="btn-refresh"
            onClick={() => loadComments(false)}
            disabled={loading}
            title="Refresh comments"
          >
            {loading ? '↻' : '⟳'}
          </button>
        </div>
      </div>

      {error && <div className="comment-error">{error}</div>}

      <div className="comment-list">
        {loading && comments.length === 0 ? (
          <div className="comment-loading">Loading comments...</div>
        ) : comments.length === 0 ? (
          <div className="comment-empty">No comments yet. Be the first to comment!</div>
        ) : (
          comments.map(comment => {
            const canDelete = currentUserId === comment.user_id || isAdmin;
            
            return (
              <div key={comment.id} className="comment-item">
                <div className="comment-meta">
                  <strong className="comment-username">{comment.username}</strong>
                  <span className="comment-date">{formatDate(comment.created_at)}</span>
                  {canDelete && (
                    <button
                      className="btn-delete-comment"
                      onClick={() => handleDeleteComment(comment.id)}
                      title="Delete comment"
                    >
                      ×
                    </button>
                  )}
                </div>
                <div className="comment-text">{comment.comment}</div>
              </div>
            );
          })
        )}
      </div>

      <form className="comment-form" onSubmit={handleAddComment}>
        <textarea
          ref={textareaRef}
          className="comment-input"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          maxLength={1000}
          rows={3}
          disabled={submitting}
        />
        <div className="comment-form-footer">
          <span className="comment-char-count">
            {newComment.length}/1000
          </span>
          <button
            type="submit"
            className="btn-submit-comment"
            disabled={!newComment.trim() || submitting}
          >
            {submitting ? 'Posting...' : 'Post Comment'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CommentSection;
