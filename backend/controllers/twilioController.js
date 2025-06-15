const twilio = require('twilio');
require('dotenv').config();
const axios = require('axios');
const VoiceResponse = twilio.twiml.VoiceResponse;
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Temporary in-memory session store (replace with DB/cache for production)
let session = {};

// Helper to generate full Twilio callback URL
function getURL(path, phone) {
    return `https://testivr.habitizr.com/api/twilio/${path}?phone=${phone}`;
}

// Start Call
exports.startCall = async (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ message: 'Phone number is required.' });

    session[phone] = {};  // Start fresh session

    try {
        const call = await client.calls.create({
            url: getURL('ivr', phone),
            to: phone,
            from: process.env.TWILIO_PHONE,
            record: true
        });

        console.log('Call started successfully:', call.sid);
        res.json({ message: 'Call started.', sid: call.sid, status: call.status });
    } catch (error) {
        console.error('Failed to start call:', error);
        res.status(500).json({ message: 'Failed to start call', error: error.message });
    }
};

// Entry IVR Menu
exports.ivr = (req, res) => {
    const phone = req.query.phone;
    if (!phone) return res.status(400).send('Missing phone param');

    if (!session[phone]) session[phone] = {};

    const twiml = new VoiceResponse();
    const gather = twiml.gather({
        numDigits: 1,
        action: getURL('select-method', phone),
        method: 'POST',
        timeout: 20
    });
    gather.say("Press 1 for Credit Card. Press 2 for Bank Account ACH.");
    res.type('text/xml').send(twiml.toString());
};

// Handle Payment Option
exports.selectMethod = (req, res) => {
    const phone = req.query.phone;
    const digit = req.body.Digits;
    if (!phone || !digit) return res.status(400).send('Missing params');

    const twiml = new VoiceResponse();

    if (digit === '1') {
        session[phone].paymentType = 'card';
        const gather = twiml.gather({
            numDigits: 16,
            action: getURL('capture-card', phone),
            method: 'POST',
            timeout: 20
        });
        gather.say("Please enter your 16-digit credit card number.");
    } else if (digit === '2') {
        session[phone].paymentType = 'ach';
        const gather = twiml.gather({
            numDigits: 9,
            action: getURL('capture-routing', phone),
            method: 'POST',
            timeout: 20
        });
        gather.say("Please enter your 9-digit routing number.");
    } else {
        twiml.say("Invalid option selected. Goodbye.");
        twiml.hangup();
    }

    res.type('text/xml').send(twiml.toString());
};

// Capture Credit Card Input
exports.captureCard = async (req, res) => {
    const phone = req.query.phone;
    const digits = req.body.Digits;
    if (!phone || !digits) return res.status(400).send('Missing params');

    session[phone].cardNumber = digits;

    await sendWebhook(phone);

    const twiml = new VoiceResponse();
    twiml.say("Thank you. Your credit card details have been submitted.");
    twiml.hangup();
    res.type('text/xml').send(twiml.toString());
};

// Capture Routing Number Input (ACH - Step 1)
exports.captureRouting = (req, res) => {
    const phone = req.query.phone;
    const digits = req.body.Digits;
    if (!phone || !digits) return res.status(400).send('Missing params');

    session[phone].routingNumber = digits;

    const twiml = new VoiceResponse();
    const gather = twiml.gather({
        numDigits: 12,
        action: getURL('capture-account', phone),
        method: 'POST',
        timeout: 20
    });
    gather.say("Please enter your bank account number.");
    res.type('text/xml').send(twiml.toString());
};

// Capture Account Number Input (ACH - Step 2)
exports.captureAccount = async (req, res) => {
    const phone = req.query.phone;
    const digits = req.body.Digits;
    if (!phone || !digits) return res.status(400).send('Missing params');

    session[phone].accountNumber = digits;

    await sendWebhook(phone);

    const twiml = new VoiceResponse();
    twiml.say("Thank you. Your bank account details have been submitted.");
    twiml.hangup();
    res.type('text/xml').send(twiml.toString());
};

// Webhook submission
async function sendWebhook(phone) {
    const data = { ...session[phone], phone };
    try {
        await axios.post("http://crm.reliabletiredisposal.online/jotform-webhook", data);
        console.log("Webhook sent successfully:", data);
    } catch (error) {
        console.error("Failed to send webhook:", error.message);
    }
}
