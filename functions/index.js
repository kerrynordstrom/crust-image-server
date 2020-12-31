const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const cors = require('cors')({origin: functions.config().gmail.origin});

admin.initializeApp();

let transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: functions.config().gmail.user,
    pass: functions.config().gmail.pass,
  },
});

exports.sendMail = functions.https.onRequest((req, res) => {
  cors(req, res, () => {
    const dest = req.query.dest;
    const bikeID = req.query.bikeID;

    console.log({dest, bikeID})

    const mailOptions = {
      from: `<${functions.config().gmail.user}>`,
      to: dest,
      subject: "Please approve the following image upload request:",
      html: `<p>Please approve this upload request</p>
            <p>${bikeID}</p>
            <br/>
            <a href="http://www.google.com">Click Here to Be Redirected to Approval Portal</a>
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
