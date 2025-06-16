const express = require('express');
const router = express.Router();
const twilioController = require('../controllers/twilioController');

// Agent triggers call
router.post('/start-call', twilioController.startCall);

// Twilio IVR Callbacks
router.post('/ivr', twilioController.ivr);
router.post('/select-method', twilioController.selectMethod);
router.post('/capture-card', twilioController.captureCard);
router.post('/capture-routing', twilioController.captureRouting);
router.post('/capture-account', twilioController.captureAccount);
router.post('/capture-expiry', twilioController.captureExpiry);
router.post('/recording-status', twilioController.recordingStatus);
router.post('/voice-confirmed', twilioController.voiceConfirmed);



module.exports = router;
