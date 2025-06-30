import React from 'react';

const UploadForm = () => {
  return (
    <form>
      <input type="file" accept="image/*" multiple />
      <button type="submit">Upload</button>
    </form>
  );
};

export default UploadForm;
