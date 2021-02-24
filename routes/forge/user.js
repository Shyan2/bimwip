const express = require('express');
const { UserProfileApi } = require('forge-apis');

const { OAuth } = require('./common/oauth');

let router = express.Router();

router.get('/user/profile', async (req, res) => {
  try {
    const oauth = new OAuth(req.session);
    const internalToken = await oauth.getInternalToken();
    const user = new UserProfileApi();
    const profile = await user.getUserProfile(oauth.getClient(), internalToken);
    res.json({
      name: profile.body.firstName + ' ' + profile.body.lastName,
      picture: profile.body.profileImages.sizeX40,
    });
  } catch (err) {
    res.json(err);
  }
});

module.exports = router;
