import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import RSVP from './pages/RSVP';
import Birthday from './pages/Birthday';
import PhotoPage from './features/photos/PhotoPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/rsvp" element={<RSVP />} />
        <Route path="/birthday" element={<Birthday />} />
        <Route path="/photos" element={<PhotoPage />} />
      </Routes>
    </Router>
  );
}

export default App;
