import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import RSVP from './pages/RSVP';
import Birthday from './pages/Birthday';
import PiratePage from './features/pirate/PiratePage';
import SignIn from './features/auth/SignIn';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/rsvp" element={<RSVP />} />
        <Route path="/birthday" element={<Birthday />} />
        <Route path="/piracy_is_cool" element={<PiratePage />} />
        <Route path="/piracy" element={<SignIn />} />
      </Routes>
    </Router>
  );
}

export default App;
