const twilio = require('twilio');
require('dotenv').config();
const axios = require('axios');
const VoiceResponse = twilio.twiml.VoiceResponse;
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

let session = {};

function getURL(path, phone) {
    return `http://testivr.habitizr.com/api/twilio/${path}?phone=${phone}`;
}

// Start Call
exports.startCall = async (req, res) => {
    const { phone } = req.body;
    session[phone] = {};

    try {
        const call = await client.calls.create({
            url: getURL('ivr', phone),
            to: phone,
            from: process.env.TWILIO_PHONE,
            record: true
        });

        console.log('Twilio Call Response:', call);
        res.json({ message: 'Call started.', sid: call.sid, status: call.status });
    } catch (error) {
        console.error('Error starting call:', error);
        res.status(500).json({ message: 'Failed to start call', error: error.message });
    }
};

// Initial IVR Menu
exports.ivr = (req, res) => {
    const phone = req.query.phone;
    session[phone] = {};

    const twiml = new VoiceResponse();
    const gather = twiml.gather({
        numDigits: 1,
        action: getURL('select-method', phone),
        method: 'POST'
    });
    gather.say("Press 1 for Credit Card, Press 2 for Bank Account ACH.");

    res.type('text/xml').send(twiml.toString());
};

// Handle Payment Method
exports.selectMethod = (req, res) => {
    const phone = req.query.phone;
    const choice = req.body.Digits;
    const twiml = new VoiceResponse();

    if (choice === '1') {
        session[phone].paymentType = 'card';
        const gather = twiml.gather({
            numDigits: 16,
            action: getURL('capture-card', phone),
            method: 'POST'
        });
        gather.say("Please enter your 16-digit credit card number.");
    } else if (choice === '2') {
        session[phone].paymentType = 'ach';
        const gather = twiml.gather({
            numDigits: 9,
            action: getURL('capture-routing', phone),
            method: 'POST'
        });
        gather.say("Please enter your 9-digit routing number.");
    } else {
        twiml.say("Invalid option. Goodbye.");
        twiml.hangup();
    }

    res.type('text/xml').send(twiml.toString());
};

// Capture Credit Card
exports.captureCard = async (req, res) => {
    const phone = req.query.phone;
    session[phone].cardNumber = req.body.Digits;

    await sendWebhook(phone);

    const twiml = new VoiceResponse();
    twiml.say("Thank you. Your credit card details have been submitted.");
    twiml.hangup();
    res.type('text/xml').send(twiml.toString());
};

// Capture Routing Number
exports.captureRouting = async (req, res) => {
    const phone = req.query.phone;
    session[phone].routingNumber = req.body.Digits;

    await sendWebhook(phone);

    const twiml = new VoiceResponse();
    twiml.say("Thank you. Your bank details have been submitted.");
    twiml.hangup();
    res.type('text/xml').send(twiml.toString());
};

// Send to webhook
async function sendWebhook(phone) {
    const data = session[phone];
    data.phone = phone;

    try {
        await axios.post("http://crm.reliabletiredisposal.online/jotform-webhook", data);
        console.log("Data sent to webhook:", data);
    } catch (error) {
        console.error("Webhook failed:", error.message);
    }
}
