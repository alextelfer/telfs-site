import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import FileExplorer from './components/FileExplorer';
import UploadForm from './components/UploadForm';

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
  const navigate = useNavigate();

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
    <div style={{ minHeight: '100vh', background: '#1a1a1a', color: '#fff' }}>
      {/* Header */}
      <header style={{ 
        padding: '1rem 2rem', 
        background: '#2d2d2d', 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '2px solid #444'
      }}>
        <h1 style={{ margin: 0 }}>piracy with my friends :)</h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {!isEditingUsername ? (
            <span 
              onClick={handleUsernameEdit}
              style={{ 
                cursor: 'pointer'
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
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  border: '1px solid #444',
                  background: '#1a1a1a',
                  color: '#fff',
                  fontSize: '1rem'
                }}
                autoFocus
              />
              <button
                onClick={handleUsernameSave}
                style={{
                  padding: '0.25rem 0.5rem',
                  background: '#28a745',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '0.8rem'
                }}
              >
                Save
              </button>
              <button
                onClick={handleUsernameCancel}
                style={{
                  padding: '0.25rem 0.5rem',
                  background: '#6c757d',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '0.8rem'
                }}
              >
                Cancel
              </button>
            </div>
          )}
          {updateError && (
            <span style={{ color: '#dc3545', fontSize: '0.9rem' }}>
              {updateError}
            </span>
          )}
          {isAdmin && <span style={{ background: '#dc3545', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>ADMIN</span>}
          <button 
            onClick={handleSignOut}
            style={{ 
              padding: '0.5rem 1rem', 
              background: '#dc3545', 
              border: 'none', 
              borderRadius: '4px',
              color: '#fff',
              cursor: 'pointer'
            }}
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '65vw', minWidth: '600px', maxWidth: '1400px' }}>
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
    </div>
  );
};

export default PiratePage;
