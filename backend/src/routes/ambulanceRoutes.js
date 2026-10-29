const express = require('express');
const router = express.Router();
const AmbulanceController = require('../controllers/ambulanceController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(authenticate);

router.get('/available', AmbulanceController.getAvailable);
router.post(
  '/:id/allocate',
  authorize('RECEPTION_STAFF', 'HOSPITAL_ADMINISTRATOR'),
  AmbulanceController.allocateEmergency
);

module.exports = router;
