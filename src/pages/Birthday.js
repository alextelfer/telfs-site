import React, { useState } from 'react';
import RSVPForm from '../components/RSVPForm';

const PASSWORD = "fart"; // Replace with actual password

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
    padding: '250px 16px 16px', // top, left/right, bottom
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    boxSizing: 'border-box', }}>
      <h1>alex telfer's birthday bonanza</h1>
      <h1>saturday, June 21st</h1>
      <h1>the big 2-9</h1>
      <p>come play spikeball with me at 4pm at Bealieu Gardens</p>
      <p>and/or</p>
      <p>drink with me at 7pm ish or whenever at ship & anchor</p>
      <p>please rsvp so i know how many people are coming :)</p>
      <section>
        <RSVPForm />
      </section>

      <section>
        <h2>Event Info</h2>
        <p><strong>spike ball in the park (weather permitting):</strong> 4-7pm <a href='https://maps.app.goo.gl/MAiav4Lc2kfTuKwY7'>Beaulieu Gardens</a></p>
        <p>if the weather sucks will prob just go drinking</p>
        <p><strong>drinkies:</strong> 715pm <a href='https://maps.app.goo.gl/ibGWpob9PqEPyT8V7'>ship & anchor</a> </p>

        <h3>Add to Calendar</h3>
        <a href="/birthday-invite.ics" download>Add to Calendar (.ics)</a>
      </section>
    </div>
  );
}