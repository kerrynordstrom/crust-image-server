 require('dotenv').config()
const express = require('express')
const cloudinary = require('cloudinary').v2
const { v1: uuidv1 } = require("uuid");
const formData = require('express-form-data')
const bodyParser = require('body-parser');
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

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

app.use(formData.parse());

app.post('/image-upload', async (req, res) => {
  const { bikeID, bikeDetails } = req.body;
  const values = Object.values(req.files)
  const parsedBikeDetails = JSON.parse(bikeDetails);

  const { ['Bike Model']: bikeModel, ['Email Address']: emailAddress } = parsedBikeDetails;

  delete parsedBikeDetails['Email Address'];

  const promises = values.map(image => {
    return cloudinary.uploader.upload(image.path, {public_id: req.public_id})
  })

  Promise
    .all(promises)
    .then(results => {
      const publicLinks = createPublicLinks(results);

      console.log('results from post', {results});
      console.log('publicLinks', publicLinks);

      
      db.collection("bikes")
        .add({
          bikeID,
          bikeModel: bikeModel,
          emailAddress: emailAddress,
          bikeDetails: parsedBikeDetails,
          _cloudinaryUploadData: results,
          photos: publicLinks,
          approved: false,
        })
        .then(async (docRef) => {
          const { id: documentID } = docRef;
          console.log("results from db write", { doc: docRef, documentID });
          console.log("bikeID within post", { bikeID, documentID });
          await sendApprovalEmail({ bikeID, documentID });
        });
      return res.json(results)
    }).catch((error) => {
      console.log('Error posting to Firebase collection', error)
    });

})

app.get('/bikes', async (_req, res) => {
  const bikesRef = db.collection('bikes');
  const queryRef = bikesRef
    .where("approved", "==", true);
  const snapshot = await queryRef.get();
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
  const queryRef = bikesRef
    .where("approved", "==", true)
    .where('bikeModel', '==', bikeModel)
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
  const allBikesByID = [];

  if (snapshot.empty) {
    console.log("No matching bikes");
    return res.json([]);
  }

  snapshot.forEach((doc) => {
    allBikesByID.push(doc.data());
  });
  return res.json(allBikesByID);
});

app.post("/bike/:bikeID/approve", async (req, res) => {
  const { documentID } = req.body;
  console.log('documentID in post', {documentID})
  try {
    db.collection("bikes").doc(documentID).update({ approved: true });
    return res.send(200);
  } catch (error) {
    console.log("could not update document ", error);
    return res.send(400);
  }
});

app.listen(process.env.PORT || 8080, () => console.log('👍'))