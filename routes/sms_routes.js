const Nexmo = require('nexmo');

const nexmo = new Nexmo({
  apiKey: 'fef99caa',
  apiSecret: 'NnBrerHfTzaFv4a1',
});
const auth = require("../auth.js").authenticateJWT;

var appRouter = function (app) {
    // NOTE: DO NOT UNCOMMENT THIS. I HAVE LIMTED FREE CREDIT FOR SMS.
    // uncomment this to send SMS
    // app.post("/sms", auth, send_sms);
}

async function send_sms(req, res) {
    try {
        const phone_number = req.body.phone_number;
        const text = req.body.text;

        if (!isNaN(phone_number)) {
            const from = 'Whoosh'; 
            const to = '6591546534'; // hardcoded for testing; should use phone_number above.
            nexmo.message.sendSms(from, to, text);

            res.status(200).send(`SMS text: ${text} is sent to ${phone_number}.`);
        } else {
            res.status(400).send("Phone number must be a number.");
        }
    } catch (err) {
        console.error(err);
        res.status(400).send("Error " + err);
    }
}

module.exports = appRouter;