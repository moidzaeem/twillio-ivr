import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [phone, setPhone] = useState('+17084987333');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const res = await axios.post('http://testivr.habitizr.com/api/twilio/start-call', {
        phone
      });
      setMessage(res.data.message);
    } catch (err) {
      setMessage("Failed to start call.");
    }

    setLoading(false);
  };

  return (
    <div className="container py-5">
      <h2 className="mb-4 text-center">Agent Payment IVR Portal</h2>
      <form onSubmit={handleSubmit} className="border p-4 shadow rounded">

        <div className="mb-3">
          <label className="form-label">Buyer Phone Number</label>
          <input
            type="text"
            className="form-control"
            placeholder="+15551234567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>


        <button type="submit" className="btn btn-primary w-100" disabled={loading}>
          {loading ? 'Calling...' : 'Start IVR Call'}
        </button>

        {message && <div className="alert alert-info mt-3">{message}</div>}
      </form>
    </div>
  );
}

export default App;
