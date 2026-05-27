import React, { useState } from 'react';
import RSVPForm from '../components/RSVPForm';

const PASSWORD = process.env.REACT_APP_BIRTHDAY_PASSWORD || "";

export default function Birthday() {
  const [entered, setEntered] = useState(false);
  const [input, setInput] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input === PASSWORD) {
      setEntered(true);
    } else {
      alert("Wrong password!");
    }
  };

  if (!entered) {
    return (
      <div style={{ textAlign: "center", marginTop: "2rem" }}>
        <h1>telfs</h1>
        <form onSubmit={handleSubmit}>
          <input 
            type="password" 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            placeholder="Enter password" 
          />
          <br /><br />
          <button type="submit">Enter</button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh',
    padding: '25px 16px 16px', // top, left/right, bottom
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    textAlign: 'left',
    boxSizing: 'border-box', }}>
      <h1>come to my birthday</h1>
      <h1>friday, june 19</h1>
      
      <p>come to my home, have a drink</p>
      <p>please rsvp :)</p>
      
      <section>
        <h2>location:</h2>
        <p><strong>my home:</strong> 1732 9a ST SW - <a href='https://maps.app.goo.gl/GR8VNcmtmfKGKuc9A'>chelsea terrace</a> </p>

                
        <h2>time:</h2>
        <p>after 7pm</p><br/>
        <a href="/birthday-invite.ics" download>add to calendar (.ics)</a>
      </section>

      <section>
        <RSVPForm />
      </section>
    </div>
  );
}