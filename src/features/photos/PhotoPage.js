import React from 'react';
import Gallery from './components/Gallery';
import UploadForm from './components/UploadForm';

const PhotosPage = () => {
  return (
    <div style={{ padding: '1rem' }}>
      <h1>photos</h1>
      <UploadForm />
      <Gallery />
    </div>
  );
};

export default PhotosPage;
