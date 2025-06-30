import React from 'react';

const PhotoCard = ({ src }) => {
  return (
    <div>
      <img src={src} alt="family photo" style={{ width: 150, height: 150, objectFit: 'cover' }} />
    </div>
  );
};

export default PhotoCard;
