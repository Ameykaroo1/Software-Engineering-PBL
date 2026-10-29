const express = require('express');
const router = express.Router();
const AuditController = require('../controllers/auditController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(authenticate);
router.use(authorize('SYSTEM_ADMINISTRATOR'));

router.get('/', AuditController.getAll);

module.exports = router;
