import React, { useRef, useState } from 'react';

const DECLINE_REASON_OPTIONS = [
  'i hate you',
  'i dont want to have fun',
  'im "busy"',
  'some other lame excuse',
  'other',
];

const RSVPForm = () => {
  const formRef = useRef(null);
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
  const [showNoModal, setShowNoModal] = useState(false);
  const [declineReasons, setDeclineReasons] = useState([]);
  const [declineOther, setDeclineOther] = useState('');
  const [attendance, setAttendance] = useState('yes');

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
  const data = new FormData(form);
  data.set('attendance', 'yes');
  data.set('declineReasons', '');
  data.set('declineReasonOther', '');
  fetch('/', {
    method: 'POST',
    body: data
  })
    .then(() => {
      setAttendance('yes');
      setSubmitted(true);
    })
    .catch(() => alert('Submission failed'));
};

  const toggleDeclineReason = (reason) => {
    setDeclineReasons((prev) =>
      prev.includes(reason)
        ? prev.filter((item) => item !== reason)
        : [...prev, reason]
    );
  };

  const handleNoSubmit = () => {
    const form = formRef.current;
    if (!form) return;
    if (!form.reportValidity()) return;

    const data = new FormData(form);
    data.set('attendance', 'no');
    data.set('declineReasons', declineReasons.join(', '));
    data.set('declineReasonOther', declineOther.trim());

    fetch('/', {
      method: 'POST',
      body: data
    })
      .then(() => {
        setAttendance('no');
        setSubmitted(true);
        setShowNoModal(false);
      })
      .catch(() => alert('Submission failed'));
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
            {attendance === 'yes' ? (
              <>
                <p>i'll see u on the 19th!!</p>
                <a href="/birthday-invite.ics" download>add to calendar (.ics)</a><br/><br/>
              </>
            ) : (
              <p>thanks for letting me know</p>
            )}
            <button onClick={handleRedirect}>get outta here</button>
            
          </div>
        </div>
      )}

      {showNoModal && (
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
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: 'white',
              padding: '2rem',
              borderRadius: '10px',
              maxWidth: '420px',
              width: '90%',
            }}
          >
            <h2>...oh ok...</h2>
            <p>why not :(</p>

            {DECLINE_REASON_OPTIONS.map((reason) => (
              <label key={reason} style={{ display: 'block', marginBottom: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={declineReasons.includes(reason)}
                  onChange={() => toggleDeclineReason(reason)}
                />{' '}
                {reason}
              </label>
            ))}

            <label style={{ display: 'block', marginTop: '0.75rem' }}>
              name yourself, coward:
              <input
                type="text"
                value={declineOther}
                onChange={(e) => setDeclineOther(e.target.value)}
                placeholder="my name is..."
                style={{ width: '100%', marginTop: '0.25rem' }}
              />
            </label>

            <div style={{ marginTop: '1rem' }}>
              <button type="button" onClick={handleNoSubmit} style={{ marginRight: '0.75rem' }}>
                submit no
              </button>
              <button type="button" onClick={() => setShowNoModal(false)}>
                cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Actual Form */}
      <form
  ref={formRef}
  name="rsvp"
  method="POST"
  data-netlify="true"
  data-netlify-honeypot="bot-field"
  onSubmit={handleSubmit}
>
  <input type="hidden" name="form-name" value="rsvp" />
  <input type="hidden" name="bot-field" />
  <input type="hidden" name="attendance" value={attendance} />
  <input type="hidden" name="declineReasons" value={declineReasons.join(', ')} />
  <input type="hidden" name="declineReasonOther" value={declineOther} />

        <br />
        <p>the part where i steal your identity:</p>
        <p><small>(just kidding, i will text you how to enter my building day of)</small></p>

        <label>
          first name*:
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
          last name*:
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
          phone number*:
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
          add a plus one?
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
          onClick={() => setShowNoModal(true)}
          style={{ fontSize: '2rem' }}
        >
          No
        </button>
      </form>
    </>
  );
};

export default RSVPForm;
