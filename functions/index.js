const functions = require('firebase-functions');
const admin = require('firebase-admin');
const fetch = require("node-fetch");
const nodemailer = require('nodemailer');
const cors = require('cors')({origin: functions.config().gmail.origin});


const sendApprovalEmail = async ({ bikeID, documentID }) => {
  try {
    await fetch(
      `${functions.config().firebaseFunctions.url}/sendMail?dest=${
        functions.config().firebaseFunctions.url
      }&bikeID=${bikeID}&documentID=${documentID}`
    );
  } catch (error) {
    console.log("Issue posting to email URL", error);
  }
};

admin.initializeApp();

let transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: functions.config().gmail.user,
    pass: functions.config().gmail.pass,
  },
});

exports.createBike = functions.firestore
  .document('bikes/{documentID}')
  .onCreate( async (snap, context) => {
    const newValue = snap.data();

    const bikeID = newValue.bikeID
    const documentID = context.params.documentID

    console.log({ bikeID, documentIDParam });

    try {
    await fetch(
      `${functions.config().firebaseFunctions.url}/sendMail?dest=${
        functions.config().firebaseFunctions.url
      }&bikeID=${bikeID}&documentID=${documentID}`
    );
  } catch (error) {
    console.log("Issue posting to email URL", error);
  }
})

exports.sendMail = functions.https.onRequest((req, res) => {
  cors(req, res, () => {
    const dest = req.query.dest;
    const bikeID = req.query.bikeID;
    const documentID = req.query.documentID;

    console.log({ dest, bikeID, documentID });

    const mailOptions = {
      from: `<${functions.config().gmail.user}>`,
      to: dest,
      subject: "Please approve the following image upload request:",
      html: `<p>Please approve this upload request</p>
            <p>${bikeID}</p>
            <br/>
            <a href="${functions.config().gmail.origin}/bike/${bikeID}">Click Here to Be Redirected to Approval Portal</a>
      `
    };

    return transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return res.send(error.toString());
      }

      return res.send(`Sent email to ${mailOptions.to}`);
    })
  })
})
