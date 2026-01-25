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
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) {
        navigate('/signin');
      } else {
        setUser(data.user);
        
        // Check if user is admin
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('is_admin, username')
          .eq('id', data.user.id)
          .single();
        
        if (profile) {
          setIsAdmin(profile.is_admin || false);
          setUsername(profile.username || '');
        }
      }
    };

    fetchUser();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/signin');
  };

  if (!user) return <div className="loading">Loading...</div>;

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
          <span>Welcome, {username}</span>
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
      <div style={{ padding: '2rem' }}>
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
  );
};

export default PiratePage;
