import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/AuthContext';
import BackupUploader from './components/BackupUploader';
import BackupGrid from './components/BackupGrid';

const styles = {
  page: { minHeight: '100vh', background: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  header: { padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', position: 'sticky', top: 0, background: '#fff', zIndex: 10 },
  title: { fontSize: '17px', fontWeight: 700, color: '#111' },
  count: { fontSize: '13px', color: '#888' },
  signOut: { background: 'none', border: 'none', color: '#007aff', fontSize: '14px', cursor: 'pointer', padding: 0 },
  content: { maxWidth: '480px', margin: '0 auto', padding: '16px' },
  centered: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '24px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
};

const BackupPage = () => {
  const { session, loading: authLoading } = useAuth();
  const user = session?.user || null;

  const [backupEnabled, setBackupEnabled] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [fileCount, setFileCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      navigate('/backup-login');
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('backup_enabled')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Backup profile fetch error:', error);
        }

        if (!cancelled) {
          setBackupEnabled(profile?.backup_enabled || false);
        }
      } catch (err) {
        console.error('Backup profile fetch exception:', err);
      } finally {
        if (!cancelled) {
          setProfileLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/backup-login');
  };

  if (authLoading || !user || profileLoading) {
    return <div style={styles.centered}>Loading...</div>;
  }

  if (!backupEnabled) {
    return (
      <div style={styles.centered}>
        <div>
          <h2>Backup isn't enabled for your account yet</h2>
          <p style={{ color: '#666' }}>Ask the site owner to turn it on for you.</p>
          <button style={{ ...styles.signOut, marginTop: '16px' }} onClick={handleSignOut}>Sign out</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <div style={styles.title}>Backup</div>
          <div style={styles.count}>{fileCount} {fileCount === 1 ? 'file' : 'files'}</div>
        </div>
        <button style={styles.signOut} onClick={handleSignOut}>Sign out</button>
      </header>

      <div style={styles.content}>
        <BackupUploader onUploadComplete={() => setRefreshKey((k) => k + 1)} />
        <BackupGrid refreshKey={refreshKey} onCountChange={setFileCount} />
      </div>
    </div>
  );
};

export default BackupPage;
