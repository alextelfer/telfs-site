import React, { useState } from 'react';

const RSVPForm = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    plusOne: false,
    plusOneName: '',
    meaningOfPerson: '',
    plusOneRelation: [],
  });

  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const form = e.target;

    // Create a FormData object so Netlify handles the submission
    const data = new FormData(form);

    // Optional: flatten any complex fields here if needed
    // e.g. convert arrays to strings, etc.

    fetch('/', {
      method: 'POST',
      body: data,
    })
      .then(() => setSubmitted(true))
      .catch(() => alert('There was a problem submitting the form.'));
  };

  const handleRedirect = () => {
    window.location.href = '/';
  };

  return (
    <>
      {/* Success Modal */}
      {submitted && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 999,
          }}
        >
          <div
            style={{
              background: 'white',
              padding: '2rem',
              borderRadius: '10px',
              textAlign: 'center',
            }}
          >
            <h2>thank u!!</h2>
            <p>i'll see u on the 21st!!</p>
            <button onClick={handleRedirect}>get outta here</button>
          </div>
        </div>
      )}

      {/* Actual Form */}
      <form
        onSubmit={handleSubmit}
        name="rsvp"
        method="POST"
        netlify-honeypot="bot-field"
        data-netlify="true"
      >
        <input type="hidden" name="form-name" value="rsvp" />
        <input type="hidden" name="bot-field" />
        <br />
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
        <br />

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
        <br />

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
        <br />

        <label>
          Add a plus one?
          <input
            type="checkbox"
            name="plusOne"
            checked={formData.plusOne}
            onChange={handleChange}
          />
        </label>
        <br />
        <br />

        {formData.plusOne && (
          <>
            <label>
              * i reserve the right to decline their participation in the event
              if they suck
            </label>
            <br />
            <br />
            <label>
              who are they:
              <input
                type="text"
                name="plusOneName"
                value={formData.plusOneName}
                onChange={handleChange}
              />
            </label>
            <br />
            <label>
              what do they mean to you:
              <input
                type="text"
                name="meaningOfPerson"
                value={formData.meaningOfPerson}
                onChange={handleChange}
              />
            </label>
            <br />
            <br />
            <br />
          </>
        )}

        <label>will you be there?</label>
        <br />
        <button type="submit" style={{ fontSize: '2rem', marginRight: '1rem' }}>
          Yes
        </button>
        <button
          type="button"
          onClick={() => alert('..... this is so sad, alexa play despacito')}
          style={{ fontSize: '2rem' }}
        >
          No
        </button>
      </form>
    </>
  );
};

export default RSVPForm;
