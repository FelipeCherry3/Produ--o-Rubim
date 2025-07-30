import express from 'express';
import axios from 'axios';

const app = express();

const {
  BLING_CLIENT_ID,
  BLING_CLIENT_SECRET,
  BLING_REDIRECT_URI
} = process.env;

if (!BLING_CLIENT_ID || !BLING_CLIENT_SECRET || !BLING_REDIRECT_URI) {
  console.error('Missing required Bling OAuth environment variables');
  process.exit(1);
}

let accessToken = null;

app.get('/api/auth/bling', (req, res) => {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: BLING_CLIENT_ID,
    redirect_uri: BLING_REDIRECT_URI
  });

  const url = `https://www.bling.com.br/Api/v3/oauth/authorize?${params.toString()}`;
  res.redirect(url);
});

app.get('/api/auth/bling/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('Missing authorization code');

  try {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: BLING_CLIENT_ID,
      client_secret: BLING_CLIENT_SECRET,
      code,
      redirect_uri: BLING_REDIRECT_URI
    });

    const response = await axios.post(
      'https://www.bling.com.br/Api/v3/oauth/token',
      params.toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    accessToken = response.data.access_token;
    res.send('Authorization successful');
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).send('Failed to obtain access token');
  }
});

app.get('/api/bling/orders', async (req, res) => {
  if (!accessToken) return res.status(401).json({ error: 'Not authorized' });

  try {
    const response = await axios.get(
      'https://www.bling.com.br/Api/v3/orders',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    res.json(response.data);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
