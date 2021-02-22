const express = require('express');
const axios = require('axios');

const { getInternalTokenTwoLegged } = require('./common/oauth');

let router = express.Router();

// GET api/forge/oss/bucketTree
// will return a list of buckets, or if ID is provided, the objects within the bucket
router.get('/buckets', async (req, res, next) => {
  const token = await getInternalTokenTwoLegged();
  const bucket_name = req.query.id;
  // const token = req.headers.token;
  // const token = req.oauth_token;
  if (!bucket_name || bucket_name === '#') {
    try {
      //retrieve buckets
      const buckets = await axios.get(
        'https://developer.api.autodesk.com/oss/v2/buckets',
        {
          headers: {
            Authorization: `Bearer ${token.access_token}`,
          },
        }
      );
      res.json(
        buckets.data.items.map((bucket) => {
          return {
            id: bucket.bucketKey,
            text: bucket.bucketKey,
            type: 'bucket',
            children: true,
          };
        })
      );
    } catch (err) {
      next(err);
    }
  } else {
    try {
      //retrieve objects from buckets
      const objects = await axios.get(
        `https://developer.api.autodesk.com/oss/v2/buckets/${bucket_name}/objects`,
        {
          headers: {
            Authorization: `Bearer ${token.access_token}`,
          },
        }
      );
      res.json(
        objects.data.items.map((object) => {
          return {
            id: Buffer.from(object.objectId).toString('base64'),
            text: object.objectKey,
            type: 'object',
            children: false,
          };
        })
      );
    } catch (err) {
      next(err);
    }
  }
});

module.exports = router;
