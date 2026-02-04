import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../../lib/AuthContext';

const ChatPanel = ({ isOpen, onClose, currentUser, isAdmin, screenWidth = 1920 }) => {
  const { session } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);
  const topSentinelRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const isAtBottomRef = useRef(true);

  // Format timestamp as mmm/d hh:mm
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const day = date.getDate();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${month}/${day} ${hours}:${minutes}`;
  };

  // Check if user is at bottom of scroll
  const checkIfAtBottom = useCallback(() => {
    if (!messagesContainerRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    return scrollHeight - scrollTop - clientHeight < 50;
  }, []);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Fetch initial messages
  const fetchMessages = useCallback(async (before = null) => {
    if (!session?.access_token) return;

    try {
      setLoading(!before);
      setLoadingMore(!!before);

      let url = `/.netlify/functions/get-messages?limit=150`;
      if (before) {
        url += `&before=${encodeURIComponent(before)}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }

      const data = await response.json();
      
      if (before) {
        // Prepending older messages for infinite scroll
        const container = messagesContainerRef.current;
        const previousScrollHeight = container?.scrollHeight || 0;
        
        setMessages(prev => [...data.messages.reverse(), ...prev]);
        setHasMore(data.messages.length === 150);
        
        // Maintain scroll position
        setTimeout(() => {
          if (container) {
            const newScrollHeight = container.scrollHeight;
            container.scrollTop = newScrollHeight - previousScrollHeight;
          }
        }, 0);
      } else {
        // Initial load - messages come DESC, reverse to show oldest first
        setMessages(data.messages.reverse());
        setHasMore(data.messages.length === 150);
        setTimeout(scrollToBottom, 100);
      }

    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [session, scrollToBottom]);

  // Poll for new messages
  const pollNewMessages = useCallback(async () => {
    if (!session?.access_token || messages.length === 0) return;

    try {
      const latestMessage = messages[messages.length - 1];
      const response = await fetch(
        `/.netlify/functions/get-messages?after=${encodeURIComponent(latestMessage.created_at)}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) return;

      const data = await response.json();
      
      if (data.messages.length > 0) {
        const wasAtBottom = checkIfAtBottom();
        setMessages(prev => [...prev, ...data.messages.reverse()]);
        
        if (wasAtBottom) {
          setTimeout(scrollToBottom, 100);
        }
      }

    } catch (err) {
      console.error('Error polling messages:', err);
    }
  }, [session, messages, checkIfAtBottom, scrollToBottom]);

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!inputValue.trim() || sending) return;

    setSending(true);

    try {
      const response = await fetch('/.netlify/functions/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ message: inputValue.trim() }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send message');
      }

      setInputValue('');
      
      // Poll immediately after sending to get the new message
      setTimeout(() => pollNewMessages(), 500);

    } catch (err) {
      console.error('Error sending message:', err);
      alert(`Failed to send message: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  // Delete message
  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Delete this message?')) return;

    try {
      const response = await fetch('/.netlify/functions/delete-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ messageId }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete message');
      }

      setMessages(prev => prev.filter(msg => msg.id !== messageId));

    } catch (err) {
      console.error('Error deleting message:', err);
      alert(`Failed to delete message: ${err.message}`);
    }
  };

  // Infinite scroll observer
  useEffect(() => {
    if (!topSentinelRef.current || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore && hasMore && messages.length > 0) {
          const oldestMessage = messages[0];
          fetchMessages(oldestMessage.created_at);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(topSentinelRef.current);

    return () => observer.disconnect();
  }, [messages, hasMore, loadingMore, fetchMessages]);

  // Initial fetch and polling setup
  useEffect(() => {
    if (isOpen && session) {
      fetchMessages();

      // Set up polling every 10 seconds
      pollingIntervalRef.current = setInterval(pollNewMessages, 10000);

      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, session]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Track if user is at bottom
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      isAtBottomRef.current = checkIfAtBottom();
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [checkIfAtBottom]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      right: 0,
      top: 0,
      width: screenWidth < 768 ? '100%' :
             screenWidth < 1024 ? '350px' :
             screenWidth < 1440 ? '300px' :
             '400px',
      minWidth: '280px',
      maxWidth: screenWidth < 768 ? '100%' : '450px',
      height: '100vh',
      background: '#c0c0c0',
      border: '2px solid',
      borderColor: '#fff #000 #000 #fff',
      boxShadow: 'inset 1px 1px 0 #dfdfdf, -2px 0 5px rgba(0,0,0,0.3)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 9999,
      fontFamily: 'MS Sans Serif, Microsoft Sans Serif, Arial, sans-serif'
    }}>
      {/* Title Bar */}
      <div style={{
        padding: '3px 5px',
        background: '#000080',
        color: '#fff',
        fontSize: '0.85rem',
        fontWeight: 'bold',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span>All Chat</span>
        <button
          onClick={onClose}
          style={{
            background: '#c0c0c0',
            border: '2px solid',
            borderColor: '#fff #000 #000 #fff',
            borderRadius: '0',
            color: '#000',
            cursor: 'pointer',
            padding: '1px 6px',
            fontSize: '0.8rem',
            fontFamily: 'MS Sans Serif, Microsoft Sans Serif, Arial, sans-serif',
            fontWeight: 'bold',
            boxShadow: 'inset 1px 1px 0 #dfdfdf'
          }}
        >
          X
        </button>
      </div>

      {/* Messages Container */}
      <div
        ref={messagesContainerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          background: '#fff',
          padding: '8px',
          margin: '2px',
          border: '2px solid',
          borderColor: '#808080 #fff #fff #808080',
          boxShadow: 'inset -1px -1px 0 #dfdfdf, inset 1px 1px 0 #000',
          fontSize: '0.8rem',
          lineHeight: '1.4'
        }}
      >
        {/* Top sentinel for infinite scroll */}
        <div ref={topSentinelRef} style={{ height: '1px' }} />
        
        {loadingMore && (
          <div style={{ textAlign: 'center', padding: '8px', color: '#555' }}>
            Loading more messages...
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#555' }}>
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#555' }}>
            No messages yet. Be the first to chat!
          </div>
        ) : (
          <>
            {messages.map((msg) => {
              const canDelete = currentUser && (msg.user_id === currentUser.id || isAdmin);
              
              return (
                <div
                  key={msg.id}
                  style={{
                    marginBottom: '8px',
                    padding: '4px',
                    background: '#f0f0f0',
                    border: '1px solid #d0d0d0',
                    wordWrap: 'break-word'
                  }}
                >
                  <div style={{ 
                    color: '#000', 
                    fontWeight: 'bold',
                    marginBottom: '2px',
                    fontSize: '0.9rem'
                  }}>
                    {msg.username}
                  </div>
                  <div style={{ color: '#000', whiteSpace: 'pre-wrap', fontSize: '0.8rem' }}>
                    {formatTimestamp(msg.created_at)}: {msg.message}
                  </div>
                  {canDelete && (
                    <button
                      onClick={() => handleDeleteMessage(msg.id)}
                      style={{
                        marginTop: '4px',
                        padding: '1px 4px',
                        background: '#c0c0c0',
                        border: '1px solid',
                        borderColor: '#fff #000 #000 #fff',
                        borderRadius: '0',
                        color: '#000',
                        cursor: 'pointer',
                        fontSize: '0.7rem',
                        fontFamily: 'MS Sans Serif, Microsoft Sans Serif, Arial, sans-serif'
                      }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSendMessage} style={{ padding: '4px' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type a message..."
            maxLength={1000}
            disabled={sending}
            style={{
              flex: 1,
              padding: '4px',
              background: '#fff',
              border: '2px solid',
              borderColor: '#808080 #fff #fff #808080',
              borderRadius: '0',
              color: '#000',
              fontSize: '0.8rem',
              fontFamily: 'MS Sans Serif, Microsoft Sans Serif, Arial, sans-serif',
              boxShadow: 'inset -1px -1px 0 #dfdfdf, inset 1px 1px 0 #000'
            }}
          />
          <button
            type="submit"
            disabled={sending || !inputValue.trim()}
            style={{
              padding: '4px 12px',
              background: sending || !inputValue.trim() ? '#808080' : '#c0c0c0',
              border: '2px solid',
              borderColor: sending || !inputValue.trim() ? '#000 #fff #fff #000' : '#fff #000 #000 #fff',
              borderRadius: '0',
              color: '#000',
              cursor: sending || !inputValue.trim() ? 'not-allowed' : 'pointer',
              fontSize: '0.8rem',
              fontWeight: 'bold',
              fontFamily: 'MS Sans Serif, Microsoft Sans Serif, Arial, sans-serif',
              boxShadow: sending || !inputValue.trim() ? 'inset -1px -1px 0 #dfdfdf, inset 1px 1px 0 #000' : 'inset 1px 1px 0 #dfdfdf, inset -1px -1px 0 #808080'
            }}
          >
            Send
          </button>
        </div>
        <div style={{ 
          marginTop: '4px', 
          fontSize: '0.7rem', 
          color: '#555',
          textAlign: 'right'
        }}>
          {inputValue.length}/1000 chars
        </div>
      </form>
    </div>
  );
};

export default ChatPanel;
