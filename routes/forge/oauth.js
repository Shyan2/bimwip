const express = require('express');
const axios = require('axios');

const config = require('../../config');

let router = express.Router();

const { getPublicTokenTwoLegged } = require('./common/oauth');

// 2-legged authorization routes

// GET /api/forge/oauth/token - generates a public access token for 2-legged-authorization.
router.get('/token', async (req, res, next) => {
  try {
    const accessToken = await getPublicTokenTwoLegged();
    res.json(accessToken);
  } catch (err) {
    next(err);
  }
});

// 3-legged authorization routes
router.get('/callback/oauth', async (req, res, next) => {
  const { code } = req.query;
  const oauth = new OAuth(req.session);
  try {
    await oauth.setCode(code);
    // res.redirect('/');
    res.redirect('http://localhost:3000/bim360');
    // res.redirect('https://wsp-internal-forge.herokuapp.com/bim360');
  } catch (err) {
    next(err);
  }
});

router.get('/oauth/url', (req, res) => {
  const url =
    'https://developer.api.autodesk.com' +
    '/authentication/v1/authorize?response_type=code' +
    '&client_id=' +
    config.credentials.client_id +
    '&redirect_uri=' +
    config.credentials.callback_url +
    '&scope=' +
    config.scopes.internal.join(' ');
  res.end(url);
});

router.get('/oauth/signout', (req, res) => {
  req.session = null;
  res.redirect('http://localhost:3000/bim360');
  // res.redirect('https://wsp-internal-forge.herokuapp.com/bim360');
});

module.exports = router;
