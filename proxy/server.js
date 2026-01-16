
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = 3001;

app.use(cors());

app.get('/rss', async (req, res) => {
  const feedUrl = req.query.url;
  if (!feedUrl) {
    return res.status(400).send('Missing url parameter');
  }

  try {
    const response = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) BostonPulse/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }

    const body = await response.text();
    res.set('Content-Type', 'application/xml');
    res.send(body);
  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(500).send(error.message);
  }
});

app.listen(PORT, () => {
  console.log(`Boston Pulse Proxy running at http://localhost:${PORT}`);
  console.log(`Example: http://localhost:${PORT}/rss?url=https://www.wbur.org/rss`);
});
