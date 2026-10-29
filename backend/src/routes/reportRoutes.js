const express = require('express');
const router = express.Router();
const ReportController = require('../controllers/reportController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(authenticate);
router.use(authorize('HOSPITAL_ADMINISTRATOR', 'SYSTEM_ADMINISTRATOR'));

router.get('/utilization', ReportController.getUtilization);
router.get('/allocations', ReportController.getAllocationsReport);
router.get('/export', ReportController.exportCSV);
router.get('/snapshots', ReportController.getSnapshots);
router.post('/snapshot', authorize('HOSPITAL_ADMINISTRATOR', 'SYSTEM_ADMINISTRATOR'), ReportController.saveSnapshot);

module.exports = router;
