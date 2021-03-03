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
app.use(cors({ credentials: true }));

app.set('trust proxy', 1);
app.use(
  cookieSession({
    secure: true, // try
    name: 'forge_session',
    keys: ['forge_secure_key'],
    resave: false,
    saveUninitialized: false,
    sameSite: 'none',
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

app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Credentials', true);
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header(
    'Access-Control-Allow-Headers',
    'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept'
  );
  next();
});

app.use('/api/forge', require('./routes/forge/user'));

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
