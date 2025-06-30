import React from 'react';
import PhotoCard from './PhotoCard';

const Gallery = () => {
  const placeholderImages = [
    { id: 1, url: 'https://via.placeholder.com/150' },
    { id: 2, url: 'https://via.placeholder.com/150' },
  ];

  return (
    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
      {placeholderImages.map((img) => (
        <PhotoCard key={img.id} src={img.url} />
      ))}
    </div>
  );
};

export default Gallery;
