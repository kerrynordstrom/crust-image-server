require('dotenv').config()
const express = require('express')
const cloudinary = require('cloudinary').v2
const { v1: uuidv1 } = require("uuid");
const formData = require('express-form-data')
const cors = require('cors')
const { db } = require('./firebase')

const { createPublicLinks, sendApprovalEmail } = require("./helpers");

const app = express()

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
})

app.use(cors())

app.use(formData.parse())

app.post('/image-upload', async (req, res) => {

  const bikeID = uuidv1(); 
  const values = Object.values(req.files)
  const promises = values.map(image => {
    return cloudinary.uploader.upload(image.path, {public_id: req.public_id})
  })

  Promise
    .all(promises)
    .then(results => {
      const publicLinks = createPublicLinks(results);

      console.log('results from post', {results});
      console.log('publicLinks', publicLinks);

      
      db.collection('bikes').add({
        bikeID,
        bikeModel: "lightningbolt",
        _cloudinaryUploadData: results,
        photos: publicLinks,
        approved: false,
      })
      return res.json(results)
    }).catch((error) => {
      console.log('Error posting to Firebase collection', error)
    });

    console.log('bikeID within post', {bikeID})
    await sendApprovalEmail({bikeID});
})

app.get('/bikes', async (_req, res) => {
  const bikesRef = db.collection('bikes');
  const snapshot = await bikesRef.get();
  const allBikes = [];

  if (snapshot.empty) {
    console.log('No bikes!');
    return;
  };

  snapshot.forEach(doc => {
    allBikes.push(doc.data());
  });
  return res.json(allBikes);
})

app.get('/bikes/:bikeModel', async (req, res) => {
  const { bikeModel } = req.params;
  const bikesRef = db.collection('bikes');
  const queryRef = bikesRef.where('bikeModel', '==', bikeModel)
  const snapshot = await queryRef.get();
  const allBikesByModel = [];

  if (snapshot.empty) {
    console.log('No matching bikes');
    return res.json([]);
  }

  snapshot.forEach((doc) => {
    allBikesByModel.push(doc.data())
  })
  return res.json(allBikesByModel);
});

app.get("/bike/:bikeID", async (req, res) => {
  const { bikeID } = req.params;
  const bikesRef = db.collection("bikes");
  const queryRef = bikesRef.where("bikeID", "==", bikeID);
  const snapshot = await queryRef.get();
  console.log('bikeID requested', {bikeID, equality: snapshot})
  const allBikesByID = [];

  if (snapshot.empty) {
    console.log("No matching bikes");
    return res.json([]);
    return;
  }

  snapshot.forEach((doc) => {
    allBikesByID.push(doc.data());
  });
  return res.json(allBikesByID);
});

app.listen(process.env.PORT || 8080, () => console.log('👍'))