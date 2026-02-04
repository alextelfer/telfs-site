import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import FileExplorer from './components/FileExplorer';
import UploadForm from './components/UploadForm';
import ChatPanel from './components/ChatPanel';

const PiratePage = () => {
  const [user, setUser] = useState(null);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [username, setUsername] = useState('');
  const [isUploadExpanded, setIsUploadExpanded] = useState(false);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [editedUsername, setEditedUsername] = useState('');
  const [updateError, setUpdateError] = useState('');
  const [loading, setLoading] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);
  const navigate = useNavigate();

  // Handle window resize for responsive layout
  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Check if URL has auth tokens (magic link callback)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const hasAuthTokens = hashParams.has('access_token') || hashParams.has('error');

    // Listen for auth state changes (handles magic link callback)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        if (session?.user) {
          setUser(session.user);
          
          // Check if user is admin
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('is_admin, username')
            .eq('id', session.user.id)
            .single();
          
          if (profile) {
            setIsAdmin(profile.is_admin || false);
            setUsername(profile.username || '');
          }
          setLoading(false);
        } else if (!hasAuthTokens) {
          // Only redirect if we're not processing auth tokens
          setLoading(false);
          navigate('/piracy');
        }
      } else if (event === 'SIGNED_OUT') {
        setLoading(false);
        navigate('/piracy');
      }
    });

    // Initial check for existing session (but don't redirect if processing auth callback)
    if (!hasAuthTokens) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) {
          setLoading(false);
          navigate('/piracy');
        }
      });
    }

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  // Keyboard controls for chat
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Check if user is typing in an input field
      const isInputField = ['INPUT', 'TEXTAREA'].includes(e.target.tagName);
      
      // Enter key to open chat (when not in input field and chat is closed)
      if (e.key === 'Enter' && !isInputField && !isChatOpen) {
        e.preventDefault();
        setIsChatOpen(true);
      }
      
      // ESC key to close chat (when chat is open)
      if (e.key === 'Escape' && isChatOpen) {
        e.preventDefault();
        setIsChatOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isChatOpen]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/piracy');
  };

  const handleUsernameEdit = () => {
    setEditedUsername(username);
    setUpdateError('');
    setIsEditingUsername(true);
  };

  const handleUsernameCancel = () => {
    setIsEditingUsername(false);
    setEditedUsername('');
    setUpdateError('');
  };

  const handleUsernameSave = async () => {
    if (!editedUsername.trim()) {
      setUpdateError('Username cannot be empty');
      return;
    }

    if (editedUsername.trim() === username) {
      setIsEditingUsername(false);
      return;
    }

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ username: editedUsername.trim() })
        .eq('id', user.id);

      if (error) {
        if (error.code === '23505') {
          setUpdateError('Username already taken');
        } else {
          setUpdateError('Failed to update username');
        }
        return;
      }

      setUsername(editedUsername.trim());
      setIsEditingUsername(false);
      setUpdateError('');
    } catch (err) {
      setUpdateError('Failed to update username');
    }
  };

  if (loading || !user) return <div className="loading">Loading...</div>;

  return (
    <div style={{ minHeight: '100vh', background: '#c0c0c0', color: '#000', fontFamily: 'MS Sans Serif, Microsoft Sans Serif, Arial, sans-serif' }}>
      {/* Header */}
      <header style={{ 
        padding: '0.5rem 1rem', 
        background: '#000080', 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTop: '2px solid #fff',
        borderLeft: '2px solid #fff',
        borderRight: '2px solid #000',
        borderBottom: '2px solid #000',
        boxShadow: 'inset 1px 1px 0 #0000c0, inset -1px -1px 0 #000050'
      }}>
        <h1 style={{ margin: 0, color: '#fff', fontSize: '1rem', fontWeight: 'bold' }}>piracy with my friends :)</h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {!isEditingUsername ? (
            <span 
              onClick={handleUsernameEdit}
              style={{ 
                cursor: 'pointer',
                color: '#fff',
                fontSize: '0.9rem'
              }}
              title="click to change name playa"
            >
              Welcome, {username}
            </span>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="text"
                value={editedUsername}
                onChange={(e) => setEditedUsername(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') handleUsernameSave();
                  if (e.key === 'Escape') handleUsernameCancel();
                }}
                style={{
                  padding: '2px 4px',
                  borderRadius: '0',
                  border: '2px solid',
                  borderColor: '#808080 #fff #fff #808080',
                  background: '#fff',
                  color: '#000',
                  fontSize: '0.9rem',
                  fontFamily: 'MS Sans Serif, Microsoft Sans Serif, Arial, sans-serif'
                }}
                autoFocus
              />
              <button
                onClick={handleUsernameSave}
                style={{
                  padding: '2px 12px',
                  background: '#c0c0c0',
                  border: '2px solid',
                  borderColor: '#fff #000 #000 #fff',
                  borderRadius: '0',
                  color: '#000',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontFamily: 'MS Sans Serif, Microsoft Sans Serif, Arial, sans-serif',
                  fontWeight: 'normal',
                  boxShadow: 'inset 1px 1px 0 #dfdfdf, inset -1px -1px 0 #808080'
                }}
              >
                Save
              </button>
              <button
                onClick={handleUsernameCancel}
                style={{
                  padding: '2px 12px',
                  background: '#c0c0c0',
                  border: '2px solid',
                  borderColor: '#fff #000 #000 #fff',
                  borderRadius: '0',
                  color: '#000',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontFamily: 'MS Sans Serif, Microsoft Sans Serif, Arial, sans-serif',
                  fontWeight: 'normal',
                  boxShadow: 'inset 1px 1px 0 #dfdfdf, inset -1px -1px 0 #808080'
                }}
              >
                Cancel
              </button>
            </div>
          )}
          {updateError && (
            <span style={{ color: '#fff', fontSize: '0.9rem', background: '#c00', padding: '2px 4px' }}>
              {updateError}
            </span>
          )}
          {isAdmin && <span style={{ background: '#c00', color: '#fff', padding: '2px 8px', border: '1px solid #800', fontSize: '0.8rem', fontWeight: 'bold' }}>ADMIN</span>}
          <button 
            onClick={handleSignOut}
            style={{ 
              padding: '3px 12px', 
              background: '#c0c0c0', 
              border: '2px solid', 
              borderColor: '#fff #000 #000 #fff',
              borderRadius: '0',
              color: '#000',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontFamily: 'MS Sans Serif, Microsoft Sans Serif, Arial, sans-serif',
              fontWeight: 'normal',
              boxShadow: 'inset 1px 1px 0 #dfdfdf, inset -1px -1px 0 #808080'
            }}
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div style={{ padding: '1rem', display: 'flex', justifyContent: 'center' }}>
        <div style={{ 
          width: '65vw',
          minWidth: screenWidth < 768 ? '320px' : '600px',
          maxWidth: '1000px',
          opacity: isChatOpen && screenWidth < 768 ? 0 : 1,
          visibility: isChatOpen && screenWidth < 768 ? 'hidden' : 'visible',
          transition: 'opacity 0.3s ease'
        }}>
        <FileExplorer 
          currentFolder={currentFolder}
          onFolderChange={setCurrentFolder}
          isAdmin={isAdmin}
        />
        
        <div style={{ marginTop: '2rem' }}>
          <UploadForm 
            currentFolder={currentFolder} 
            isExpanded={isUploadExpanded}
            onToggle={() => setIsUploadExpanded(!isUploadExpanded)}
            onUploadComplete={() => {
              // Trigger refresh in FileExplorer
              window.dispatchEvent(new Event('files-updated'));
            }} 
          />
        </div>
        </div>
      </div>
      
      {/* Chat Panel */}
      <ChatPanel 
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        currentUser={user}
        isAdmin={isAdmin}
        screenWidth={screenWidth}
      />
    </div>
  );
};

export default PiratePage;
