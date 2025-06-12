import React, { useState } from 'react';



const RSVPForm = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    plusOne: false,
    plusOneName: '',
    meaningOfPerson: '',
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Convert react-select options to a simple CSV string for submission
    const plusOneRelationStr = formData.plusOneRelation
      .map((opt) => opt.value)
      .join(', ');

    // Create a plain object Netlify can consume
    const payload = {
      ...formData,
      plusOneRelation: plusOneRelationStr,
    };

    console.log(payload); // Netlify will handle the POST as normal
  };

  return (
    <form onSubmit={handleSubmit} name="rsvp" method="POST" data-netlify="true">
      <input type="hidden" name="form-name" value="rsvp" />
      <br></br>
      <p>the part where i steal your identity:</p>
      <label>
        First Name*:
        <input
          required
          type="text"
          name="firstName"
          value={formData.firstName}
          onChange={handleChange}
        />
      </label>
      <br></br>
      <label>
        Last Name*:
        <input
          required
          type="text"
          name="lastName"
          value={formData.lastName}
          onChange={handleChange}
        />
      </label>
      <br></br>
      <label>
        Phone Number*:
        <input
          required
          type="tel"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
        />
      </label>
      <br></br>
      <label>
        Add a plus one?
        <input
          type="checkbox"
          name="plusOne"
          checked={formData.plusOne}
          onChange={handleChange}
        />
      </label>
      <br></br>
      <br></br>
      {formData.plusOne && (
        <>
          <label>
            * i reserve the right to decline their participation in the event if
            they suck
          </label>
          <br></br>
          <br></br>
          <label>
            who are they:
            <input
              type="text"
              name="plusOneName"
              value={formData.plusOneName}
              onChange={handleChange}
            />
          </label>
          <br/>
          <label>
            what do they mean to you:<input
              type="text"
              name="meaningOfPerson"
              value={formData.meaningOfPerson}
              onChange={handleChange}
            /></label>
          <br/>
          <br/>
          <br/>
        </>
      )}
      <label>will you be there?</label> <br></br>
      <button type="submit" style={{ fontSize: '2rem', marginRight: '1rem' }}>
        Yes
      </button>
      <button
        type="button"
        onClick={() =>
          alert('no? if you entered your information im stealing your identity')
        }
        style={{ fontSize: '2rem' }}
      >
        No
      </button>
    </form>
  );
};

export default RSVPForm;
