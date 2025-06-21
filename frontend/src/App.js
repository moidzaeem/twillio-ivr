import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [phone, setPhone] = useState('+17084987333');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [zip, setZip] = useState('');
  const [state, setState] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const res = await axios.post('https://backend-ivr.worldhomeapplication.com/api/twilio/start-call', {
        phone,
        name,
        address,
        zip,
        state,
        city
      });
      setMessage(res.data.message);
    } catch (err) {
      setMessage("Failed to start call.");
    }

    setLoading(false);
  };

  return (
    <div className="container py-5" style={{ maxWidth: '480px' }}>
      <h2 className="mb-4 text-center fw-bold text-primary">Agent Payment IVR Portal</h2>
      <form onSubmit={handleSubmit} className="border p-4 shadow rounded bg-white">

        <div className="mb-3">
          <label htmlFor="phone" className="form-label fw-semibold">Buyer Phone Number</label>
          <input
            id="phone"
            type="tel"
            className="form-control"
            placeholder="+1 555 123 4567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            pattern="^\+\d{10,15}$"
            title="Please enter a valid phone number starting with +"
          />
        </div>

        <div className="mb-3">
          <label htmlFor="name" className="form-label fw-semibold">Full Name</label>
          <input
            id="name"
            type="text"
            className="form-control"
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="mb-3">
          <label htmlFor="address" className="form-label fw-semibold">Address</label>
          <input
            id="address"
            type="text"
            className="form-control"
            placeholder="123 Main St"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
          />
        </div>

         <div className="mb-3">
          <label htmlFor="city" className="form-label fw-semibold">City</label>
          <input
            id="city"
            type="text"
            className="form-control"
            placeholder="Los Angeles"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            required
          />
        </div>

        <div className="row g-3 mb-4">
          <div className="col-md-6">
            <label htmlFor="state" className="form-label fw-semibold">State</label>
            <input
              id="state"
              type="text"
              className="form-control"
              placeholder="CA"
              value={state}
              onChange={(e) => setState(e.target.value)}
              required
              maxLength={2}
              style={{ textTransform: 'uppercase' }}
            />
          </div>

          <div className="col-md-6">
            <label htmlFor="zip" className="form-label fw-semibold">Zip Code</label>
            <input
              id="zip"
              type="text"
              className="form-control"
              placeholder="90001"
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              required
              pattern="\d{5}(-\d{4})?"
              title="Please enter a valid zip code"
            />
          </div>
        </div>

        <button type="submit" className="btn btn-primary w-100 py-2 fs-5" disabled={loading}>
          {loading ? 'Calling...' : 'Start IVR Call'}
        </button>

        {message && (
          <div className="alert alert-info mt-4 text-center" role="alert" style={{ fontSize: '1rem' }}>
            {message}
          </div>
        )}
      </form>
    </div>
  );
}

export default App;
