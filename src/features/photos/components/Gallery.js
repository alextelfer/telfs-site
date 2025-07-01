import React from 'react';
import PhotoCard from './PhotoCard';
import { useAuth } from '@/lib/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

const { session } = useAuth();
const userId = session?.user?.id;

const Gallery = ({ userId }) => {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPhotos = async () => {
      const { data, error } = await supabase
        .from('photos')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching photos:', error);
      } else {
        setPhotos(data);
      }
      setLoading(false);
    };

    if (userId) fetchPhotos();
  }, [userId]);

  if (loading) return <p>Loading photos...</p>;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4">
      {photos.map((photo) => (
        <div key={photo.id} className="rounded overflow-hidden shadow-md">
          <img
            src={`https://f004.backblazeb2.com/file/${process.env.REACT_APP_B2_BUCKET_NAME}/${photo.file_path}`}
            alt={photo.file_name}
            className="w-full h-auto"
          />
        </div>
      ))}
    </div>
  );
};

export default Gallery;
