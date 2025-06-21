const twilio = require('twilio');
require('dotenv').config();
const axios = require('axios');
const VoiceResponse = twilio.twiml.VoiceResponse;
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const paymentProcessor = require('../utils/paymentProcessor');
const fs = require('fs');
const { google } = require('googleapis');


const serviceAccount = require('../google-credentials.json');


const auth = new google.auth.GoogleAuth({
    credentials: serviceAccount,
    scopes: ['https://www.googleapis.com/auth/drive']
});
const drive = google.drive({ version: 'v3', auth });

// Temporary in-memory session store (replace with DB/cache for production)
let session = {};

// Helper to generate full Twilio callback URL
function getURL(path, phone) {
    return `https://backend-ivr.worldhomeapplication.com/api/twilio/${path}?phone=${phone}`;
}

// Start Call
exports.startCall = async (req, res) => {
    const { phone, name, address, zip, state } = req.body;
    if (!phone) return res.status(400).json({ message: 'Phone number is required.' });

    if (!session[phone]) {
        session[phone] = {};
    }

    session[phone].name = name || '';
    session[phone].address = address || '';
    session[phone].zip = zip || '';
    session[phone].state = state || '';


    try {
        const call = await client.calls.create({
            url: getURL('ivr', phone),
            to: phone,
            from: process.env.TWILIO_PHONE,
            record: true,
            recordingStatusCallback: getURL('recording-status', phone),
            recordingStatusCallbackMethod: 'POST'
        });

        console.log('Call started successfully:', call.sid);
        res.json({ message: 'Call started.', sid: call.sid, status: call.status });
    } catch (error) {
        console.error('Failed to start call:', error);
        res.status(500).json({ message: 'Failed to start call', error: error.message });
    }
};

// Entry IVR Menu
// Entry IVR Menu (Voice Signature First)
exports.ivr = (req, res) => {
    const phone = (req.query.phone || '').trim();
    if (!phone) return res.status(400).send('Missing phone param');

    if (!session[phone]) session[phone] = {};

    const twiml = new VoiceResponse();

    // Voice Signature Script
    twiml.say(`Hello. Welcome to World Home Warranty LLC. This is an automated call to confirm your subscription to our complete home protection plan, which covers your home’s heating, cooling, and plumbing systems at a monthly cost.`);

    twiml.say(`By continuing, you consent to receive this automated call from World Home Warranty LLC for the purpose of confirming your subscription.`);

    twiml.say(`You confirm that you were provided all necessary information regarding this plan, including the monthly cost, recurring nature, cancellation policy, and your rights, during a prior call with our representative.`);

    twiml.say(`You confirm that you wish to proceed and authorize the purchase of this plan. You confirm that you are legally authorized and of legal age.`);

    twiml.say(`You understand this is a recurring monthly charge and you will be billed automatically each month until you cancel.`);

    twiml.say(`This call is being recorded for verification and legal purposes. You will receive a paper copy of the agreement within 5 business days.`);

    twiml.say(`You may cancel within 3 business days of receiving the agreement. To confirm and proceed, please clearly state your full name, date of birth, and say I AGREE after the tone.`);

    // Record voice signature
    twiml.record({
        action: getURL('voice-confirmed', phone), // <== New endpoint
        method: 'POST',
        timeout: 10,
        maxLength: 15,
        playBeep: true,
        recordingStatusCallback: getURL('recording-status', phone),
        recordingStatusCallbackMethod: 'POST'
    });


    res.type('text/xml').send(twiml.toString());
};

exports.voiceConfirmed = (req, res) => {
    const phone = (req.query.phone || '').trim();
    if (!phone) return res.status(400).send('Missing phone param');

    const twiml = new VoiceResponse();

    const gather = twiml.gather({
        numDigits: 1,
        action: getURL('select-method', phone),
        method: 'POST',
        timeout: 20
    });

    gather.say("Okay great, you've been verified. Now you'll just need to enter your payment details to activate your plan. Press 1 for Credit Card, press 2 for Bank Account ACH, or press 3 to hear this menu again.");


    res.type('text/xml').send(twiml.toString());
};


// Receive recording status (optional)
exports.recordingStatus = async (req, res) => {
    const phone = (req.query.phone || '').trim();
    const recordingUrl = req.body.RecordingUrl;

    if (phone && recordingUrl) {
        session[phone].voiceSignature = recordingUrl;
        console.log(`Saved voice signature for ${phone}: ${recordingUrl}`);

        try {
            await uploadRecordingToDrive(phone, recordingUrl);
            console.log('Recording uploaded to Google Drive successfully.');
        } catch (err) {
            console.error('Failed to upload recording to Google Drive', err);
        }

    }

    res.type('text/xml').send();
};



// Handle Payment Option
exports.selectMethod = (req, res) => {
    const phone = (req.query.phone || '').trim();
    const digit = req.body.Digits;

    console.log('Received phone:', phone);
    console.log('Received digit:', digit);
    console.log('Full body:', req.body);

    if (!phone || !digit) {
        console.error("Missing params!", { phone, digit });
        return res.status(400).send('Missing params');
    }

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
    } else if (digit === '3') {
        // Replay the payment method menu
        const gather = twiml.gather({
            numDigits: 1,
            action: getURL('select-method', phone),
            method: 'POST',
            timeout: 20
        });
        gather.say("Okay. Please listen carefully. Press 1 for Credit Card, press 2 for Bank Account ACH, or press 3 to hear this menu again.");
    } else {
        twiml.say("Invalid option selected. Goodbye.");
        twiml.hangup();
    }


    res.type('text/xml').send(twiml.toString());
};


// Capture Credit Card Input
exports.captureCard = async (req, res) => {
    const phone = (req.query.phone || '').trim();
    const digits = req.body.Digits;
    if (!phone || !digits) return res.status(400).send('Missing params');

    // Store card number
    session[phone].cardNumber = digits;
    console.log('Captured card number:', digits);

    // Now ask for expiry date (in MMYY format)
    const twiml = new VoiceResponse();
    const gather = twiml.gather({
        numDigits: 4, // expecting MMYY format, e.g. 0825
        action: getURL('capture-expiry', phone),
        method: 'POST',
        timeout: 10
    });
    gather.say("Please enter your card expiry date in four digits. For example, August twenty five as zero eight two five.");

    res.type('text/xml').send(twiml.toString());
};

exports.captureExpiry = async (req, res) => {
    const phone = (req.query.phone || '').trim();
    const digits = req.body.Digits;
    if (!phone || !digits) return res.status(400).send('Missing params');

    // Store expiry date
    session[phone].expiryDate = digits;
    console.log('Captured expiry date:', digits);

    const twiml = new VoiceResponse();
    twiml.say("Please wait, we're processing payment.");

    try {
        const success = await paymentProcessor.processCreditCard(
            session[phone].cardNumber,
            49.99,
            digits
        );

        if (success) {
            twiml.say("Payment successful. Thank you!");
        } else {
            twiml.say("Payment failed. Please try again later.");
        }
    } catch (error) {
        console.error('Payment processing error:', error);
        twiml.say("An error occurred while processing your payment. Please try again later.");
    }

    twiml.hangup();
    res.type('text/xml').send(twiml.toString());
};



// Capture Routing Number Input (ACH - Step 1)
exports.captureRouting = (req, res) => {
    const phone = (req.query.phone || '').trim();
    const digits = req.body.Digits;
    if (!phone || !digits) return res.status(400).send('Missing params');

    session[phone].routingNumber = digits;
    console.log('Captured routing number:', digits);

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
    const phone = (req.query.phone || '').trim();
    const digits = req.body.Digits;
    if (!phone || !digits) return res.status(400).send('Missing params');

    session[phone].accountNumber = digits;
    console.log('Captured account number:', digits);
    const twiml = new VoiceResponse();

    try {
        const success = await paymentProcessor.processACH(
            session[phone].routingNumber,
            digits
        );

        if (success) {
            twiml.say("Payment successful. Thank you!");
        } else {
            twiml.say("Payment failed. Please try again later.");
        }
    } catch (error) {
        console.error('Payment processing error:', error);
        twiml.say("An error occurred while processing your payment. Please try again later.");
    }

    twiml.hangup();
    res.type('text/xml').send(twiml.toString());
};

async function uploadRecordingToDrive(phone, recordingUrl) {
    // Step 1: Download recording as stream
    const response = await axios({
        url: recordingUrl + '.mp3',
        method: 'GET',
        responseType: 'stream',
        auth: {
            username: process.env.TWILIO_ACCOUNT_SID,
            password: process.env.TWILIO_AUTH_TOKEN
        }
    });

    // Step 2: Get or create folder for phone number
    // const folderId = await getOrCreateFolder(phone);
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    // Step 3: Upload file to folder
    const fileMetadata = {
        name: `recording-${phone}-${Date.now()}.mp3`,
        parents: [folderId]
    };
    const media = {
        mimeType: 'audio/mpeg',
        body: response.data
    };

    await drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id'
    });
}

// Helper: create folder if not exist
async function getOrCreateFolder(folderName) {
    // Search for existing folder
    const res = await drive.files.list({
        q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name)',
        spaces: 'drive'
    });

    if (res.data.files.length > 0) {
        return res.data.files[0].id;
    }

    // Create folder if not exists
    const folderMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder'
    };

    const folder = await drive.files.create({
        resource: folderMetadata,
        fields: 'id'
    });

    return folder.data.id;
}

