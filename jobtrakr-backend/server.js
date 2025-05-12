const express = require('express');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const cors = require('cors');

const app = express();
const PORT = 3001;

// Allow CORS from your frontend (adjust the origin as needed)
app.use(cors({
  origin: 'http://localhost:3000', // Change this if your frontend runs elsewhere
}));

let savedJobs = []; // Replace with DB in production

// Proxy route for jobs
app.get('/api/jobs', async (req, res) => {
  try {
    const searchTerm = req.query.search || 'Software';
    const location = req.query.location || 'Ireland';
    const joobleKey = '19209957-7ead-4342-a3c7-2e961f33bcd8'; // Replace with your Jooble API key

    const joobleUrl = 'https://jooble.org/api/' + joobleKey;
    const body = {
      keywords: searchTerm,
      location: location,
      page: 1,
      radius: 50
    };

    const response = await fetch(joobleUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(500).json({ error: 'Failed to fetch jobs from Jooble API', status: response.status, body: text });
    }

    const data = await response.json();
    res.json({ data: data.jobs || data.results || [] });
  } catch (err) {
    console.error('Backend error:', err);
    res.status(500).json({ error: 'Failed to fetch jobs', details: err.message });
  }
});

app.post('/api/saved-jobs', (req, res) => {
  const job = req.body;
  job.status = 'Applied';
  savedJobs.push(job);
  res.json({ success: true });
});

app.get('/api/saved-jobs', (req, res) => {
  res.json({ data: savedJobs });
});

app.patch('/api/saved-jobs/:id', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const job = savedJobs.find(j => j.link === id);
  if (job) job.status = status;
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});