const express = require('express');
const cors = require('cors');
const cookieSession = require('cookie-session');

const PORT = process.env.PORT || 8080;
const config = require('./config');

if (
  config.credentials.client_id === null ||
  config.credentials.client_secret === null
) {
  console.error('Missing credentials.');
  return;
}

const app = express();
app.use(cors({ credentials: true, origin: true }));

app.use(
  cookieSession({
    name: 'forge_session',
    keys: ['forge_secure_key'],
    maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days, same as refresh token
  })
);

app.use('/api/forge', require('./routes/forge/oauth'));
app.use('/api/forge/oss', require('./routes/forge/oss'));
app.use(
  '/api/forge/modelderivative',
  require('./routes/forge/model-derivative')
);

app.use('/api/forge/list-projects', require('./routes/forge/list-projects'));

app.use('/api/forge', require('./routes/forge/user'));

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
