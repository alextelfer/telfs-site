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
    <div style={{ textAlign: "center", padding: "2rem" }}>
      <h1>alex telfer's birthday bonanza</h1>
      <p>come play spikeball with me at time and place</p>
      <p>and/or</p>
      <p>drink with me at time and place</p>
      <p>please rsvp so i know how many people are coming :)</p>
      <section>
        <RSVPForm />
      </section>

      <section>
        <h2>Event Info</h2>
        <p><strong>Hangs:</strong> 3 PM – Prince's Island Park</p>
        <p><strong>Drinks:</strong> 7 PM – Proof Cocktail Bar</p>

        <h3>Add to Calendar</h3>
        <a href="/birthday-invite.ics" download>Add to Calendar (.ics)</a>
      </section>
    </div>
  );
}