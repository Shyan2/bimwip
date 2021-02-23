const express = require('express');
const axios = require('axios');
var config = require('../../config');

let router = express.Router();

const {
  getPublicTokenTwoLegged,
  getInternalTokenTwoLegged,
} = require('./common/oauth');

const {
  BucketsApi,
  ObjectsApi,
  DerivativesApi,
  PostBucketsPayload,
  ItemsApi,
} = require('forge-apis');

const CAD_FILE = 'something.pdf';

// POST api/forge/modelderivative/sendToTranslation
router.post('/sendToTranslation', async (req, res, next) => {
  const forgeInternalToken = await getInternalTokenTwoLegged();

  // the file will be sent on req.file

  const ossBucketKey = 'newcadbucket';

  const buckets = new BucketsApi();
  const objects = new ObjectsApi();
  const postBuckets = new PostBucketsPayload();
  postBuckets.bucketKey = ossBucketKey;
  postBuckets.policyKey = 'transient'; // expires in 24h

  let bucketExists = false;
  let objectExists = false;
  // check if bucket exists
  try {
    const getBuckets = await buckets.getBuckets({}, null, forgeInternalToken);
    console.log(getBuckets.body);

    getBuckets.body.items.forEach((bucket) => {
      if (bucket.bucketKey === ossBucketKey) {
        // bucket exists, skip
        bucketExists = true;
      } else {
        // bucket does not exist
      }
    });
    if (!bucketExists) {
      try {
        const createNewBucket = await buckets.createBucket(
          postBuckets,
          {},
          null,
          forgeInternalToken
        );
        console.log(createNewBucket.body);
        // res.status(200).json(createNewBucket.body);
      } catch (err) {
        next(err);
      }
    } else {
      console.log('Bucket already exists!');
    }
  } catch (err) {
    next(err);
  }

  try {
    // 1. check if object exists in bucket
    // 2. if exists, check if translated. if translated, open CAD viewer
    // 3. else upload file and translate
    // 4. once translation complete, open CAD viewer
    const getBucketObjects = await objects.getObjects(
      ossBucketKey,
      { limit: 100 },
      null,
      forgeInternalToken
    );
    console.log(getBucketObjects.body);

    getBucketObjects.body.items.forEach((object) => {
      if (object.objectKey === CAD_FILE) {
        // File exists
        objectExists = true;
        res.status(200).json({
          readyToShow: true,
          status: 'File already exists',
          objectId: object.objectId,
          urn: object.objectId.toBase64(),
        });
      }
      // file does not exist, therefore upload
    });

    // set the filestream/file here
    const fileToUpload = CAD_FILE;
    const ossObjectName = CAD_FILE;

    const uploadObject = await objects.uploadObject(
      ossBucketKey,
      ossObjectName,
      fileToUpload.length,
      fileToUpload,
      {},
      null,
      forgeInternalToken
    );

    console.log(uploadObject.body);
  } catch (err) {
    next(err);
  }
  res.json('Success!');
});

// UNDER DEVELOPMENT
// aim is to be able to track the translation process.
// will say if it is translated, or in the process
router.post('/integration/isReadyToShow', jsonParser, function (req, res) {
  var ossUrn = req.body.urn;
});

const translateData = (ossUrn) => {
  let postJob = {
    input: {
      urn: ossUrn,
    },
    output: {
      formats: [
        {
          type: 'svf2',
          views: ['2d', '3d'],
        },
      ],
    },
  };
  return postJob;
};

String.prototype.toBase64 = function () {
  return Buffer.from(this)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

module.exports = router;
