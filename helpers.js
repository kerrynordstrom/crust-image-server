const fetch = require('node-fetch');

const createPublicLinks = (results) => { 
  const photos = [];
  results.forEach((photo, i) => {
  photos[i] = {};
  const originalTransformation = "w_1200,c_scale";
  const thumbnailTransformation = "w_300,c_scale";
  const photoWithExtension = photo.public_id + "." + photo.format;
  photos[i].photo_with_extension = photoWithExtension;
  photos[i].original =
    "http://res.cloudinary.com/crust-bikes/image/upload/" +
    originalTransformation +
    "/" +
    photoWithExtension;
  photos[i].thumbnail =
    "http://res.cloudinary.com/crust-bikes/image/upload/" +
    thumbnailTransformation + 
    "/" +
    photoWithExtension;
})
return photos;
};

const sendApprovalEmail = async ({bikeID}) => {
  try {
    await fetch(
      `${process.env.FIREBASE_CLOUD_FUNCTION_URL}/sendMail?dest=${process.env.FIREBASE_CLOUD_FUNCTION_DESTINATION_EMAIL}&bikeID=${bikeID}`
    );
  } catch(error) {
    console.log('Issue posting to email URL', error)
  }
}

module.exports = { createPublicLinks, sendApprovalEmail };