const twilio = require('twilio');
require('dotenv').config();
const VoiceResponse = twilio.twiml.VoiceResponse;
// const { processCreditCard, processACH } = require('../utils/paymentProcessor');
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

let session = {}; // TEMP: use DB/session in real-world

exports.startCall = async (req, res) => {
    const { phone, amount } = req.body;

    // Always initialize session safely
    session[phone] = { amount };

    try {
        const call = await client.calls.create({
            url: `http://testivr.habitizr.com/api/twilio/ivr?phone=${phone}`,  // include phone in query
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



exports.ivr = (req, res) => {
    const phone = req.query.phone;

    // Always initialize session (redundant safety)
    if (!session[phone]) session[phone] = {};

    const twiml = new VoiceResponse();
    twiml.say("This call is recorded. Your responses will serve as your authorization.");

    const gather = twiml.gather({
        input: 'speech',
        action: `http://testivr.habitizr.com/api/twilio/capture-name?phone=${phone}`,
        method: 'POST'
    });

    gather.say("Please state your full name.");
    res.type('text/xml').send(twiml.toString());
};

exports.captureName = (req, res) => {
    const phone = req.query.phone;
    const name = req.body.SpeechResult;

    if (!session[phone]) session[phone] = {};
    session[phone].name = name;

    console.log('Captured Name:', name);

    const twiml = new VoiceResponse();
    const gather = twiml.gather({
        numDigits: 8,
        action: `http://testivr.habitizr.com/api/twilio/capture-dob?phone=${phone}`,
        method: 'POST'
    });

    gather.say("Enter your date of birth as MMDDYYYY.");
    res.type('text/xml').send(twiml.toString());
};


exports.captureDOB = (req, res) => {
    const phone = req.query.phone;
    const dob = req.body.Digits;

    if (!session[phone]) session[phone] = {};
    session[phone].dob = dob;

    console.log('Captured DOB:', dob);

    const twiml = new VoiceResponse();
    const gather = twiml.gather({
        numDigits: 1,
        action: `http://testivr.habitizr.com/api/twilio/select-method?phone=${phone}`,
        method: 'POST'
    });

    gather.say("Press 1 for Credit Card, 2 for Bank Account.");
    res.type('text/xml').send(twiml.toString());
};

exports.selectMethod = (req, res) => {
    const phone = req.query.phone;
    const choice = req.body.Digits;
    const twiml = new VoiceResponse();

    twiml.pauseRecording();

    if (choice === '1') {
        const gather = twiml.gather({
            numDigits: 16,
            action: `/api/twilio/capture-card?phone=${phone}`
        });
        gather.say("Enter your 16-digit credit card number.");
    } else if (choice === '2') {
        const gather = twiml.gather({
            numDigits: 9,
            action: `/api/twilio/capture-routing?phone=${phone}`
        });
        gather.say("Enter your 9-digit bank routing number.");
    } else {
        twiml.say("Invalid choice.");
    }

    res.type('text/xml').send(twiml.toString());
};

exports.captureCard = (req, res) => {
    const phone = req.query.phone;
    session[phone].card = req.body.Digits;
    const twiml = new VoiceResponse();
    twiml.resumeRecording();
    twiml.redirect(`/api/twilio/process-payment?phone=${phone}&type=card`);
    res.type('text/xml').send(twiml.toString());
};

exports.captureRouting = (req, res) => {
    const phone = req.query.phone;
    session[phone].routing = req.body.Digits;
    const twiml = new VoiceResponse();
    const gather = twiml.gather({
        numDigits: 12,
        action: `/api/twilio/capture-account?phone=${phone}`
    });
    gather.say("Enter your bank account number.");
    res.type('text/xml').send(twiml.toString());
};

exports.captureAccount = (req, res) => {
    const phone = req.query.phone;
    session[phone].account = req.body.Digits;
    const twiml = new VoiceResponse();
    twiml.resumeRecording();
    twiml.redirect(`/api/twilio/process-payment?phone=${phone}&type=ach`);
    res.type('text/xml').send(twiml.toString());
};

exports.processPayment = async (req, res) => {
    const phone = req.query.phone;
    const type = req.query.type;
    const data = session[phone];
    const amount = parseFloat(data.amount);

    let success = false;
    if (type === 'card') {
        // success = await processCreditCard(data.card, amount);
    } else {
        // success = await processACH(data.routing, data.account, amount);
    }

    const twiml = new VoiceResponse();
    if (success) {
        twiml.say("Payment processed successfully.");
    } else {
        twiml.say("Payment failed. Please contact support.");
    }
    res.type('text/xml').send(twiml.toString());
};
