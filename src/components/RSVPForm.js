import React, { useState } from 'react';

export default function RSVPForm() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: ""
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleYes = (e) => {
    e.preventDefault();
    const form = document.forms['rsvp'];
    if (form.checkValidity()) {
      form.submit();
      setSubmitted(true);
    } else {
      form.reportValidity();
    }
  };

  const handleNo = (e) => {
    e.preventDefault();
    alert("Custom message here. You can change this later.");
  };

  if (submitted) {
    return <p>Thanks for RSVPing! 🎉</p>;
  }

  return (
    <form 
      name="rsvp" 
      method="POST" 
      data-netlify="true" 
      style={{ marginTop: '2rem' }}
    >
      <input type="hidden" name="form-name" value="rsvp" />
      <input 
        type="text" 
        name="firstName" 
        placeholder="First Name" 
        required 
        onChange={handleChange}
      /><br /><br />
      <input 
        type="text" 
        name="lastName" 
        placeholder="Last Name" 
        required 
        onChange={handleChange}
      /><br /><br />
      <input 
        type="tel" 
        name="phone" 
        placeholder="Phone Number" 
        required 
        onChange={handleChange}
      /><br /><br />

      <button 
        onClick={handleYes} 
        style={{
          fontSize: "2rem",
          backgroundColor: "green",
          color: "white",
          margin: "1rem",
          padding: "1rem 2rem"
        }}
      >
        YES
      </button>
      
      <button 
        onClick={handleNo} 
        style={{
          fontSize: "2rem",
          backgroundColor: "red",
          color: "white",
          margin: "1rem",
          padding: "1rem 2rem"
        }}
      >
        NO
      </button>
    </form>
  );
}
