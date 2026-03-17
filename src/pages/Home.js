// import Spinner from '../components/Spinner';
import { Link } from 'react-router-dom';

function Home() {
  return (
    <div className="App">
      <h1>telfs</h1>
      <div style={{ marginTop: '12px' }}>
        <Link to="/workout">workout tracker</Link>
      </div>
    </div>
  );
}

export default Home;
