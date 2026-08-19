import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import RSVP from './pages/RSVP';
import Birthday from './pages/Birthday';
import Workout from './pages/Workout';
import PiratePage from './features/pirate/PiratePage';
import SignIn from './features/auth/SignIn';
import BackupPage from './features/backup/BackupPage';
import BackupSignIn from './features/backup/BackupSignIn';
import CCStaffPartyPage from './features/ccstaffparty/CCStaffPartyPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/rsvp" element={<RSVP />} />
        <Route path="/birthday" element={<Birthday />} />
        <Route path="/workout" element={<Workout />} />
        <Route path="/piracy_is_cool" element={<PiratePage />} />
        <Route path="/piracy" element={<SignIn />} />
        <Route path="/backup" element={<BackupPage />} />
        <Route path="/backup-login" element={<BackupSignIn />} />
        <Route path="/ccstaffparty" element={<CCStaffPartyPage />} />
      </Routes>
    </Router>
  );
}

export default App;
