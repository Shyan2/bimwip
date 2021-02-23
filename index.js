const path = require('path');
const express = require('express');
const cors = require('cors');

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
app.use(cors());

app.use('/api/forge/oauth', require('./routes/forge/oauth'));
app.use('/api/forge/oss', require('./routes/forge/oss'));
app.use(
  '/api/forge/modelderivative',
  require('./routes/forge/model-derivative')
);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.statusCode).json(err);
});

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
