import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import Gallery from './components/Gallery';
import UploadForm from './components/UploadForm';


const PhotosPage = () => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) {
        navigate('/signin'); // redirect to sign-in if not authenticated
      } else {
        setUser(data.user);
      }
    };

    fetchUser();
  }, [navigate]);

  if (!user) return <p>Loading...</p>;

  return (
    <div>
      <button onClick={() => supabase.auth.signOut()}>Sign Out</button>
      <h1>Welcome, {user.email}</h1>
      {/* render UploadForm and Gallery here */}
      <UploadForm />
      <Gallery userId={user.id} />
    </div>
  );
};

export default PhotosPage;
