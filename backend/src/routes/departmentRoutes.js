const express = require('express');
const router = express.Router();
const DepartmentController = require('../controllers/departmentController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(authenticate);

router.get('/', DepartmentController.getAll);
router.post('/', authorize('HOSPITAL_ADMINISTRATOR', 'SYSTEM_ADMINISTRATOR'), DepartmentController.create);

module.exports = router;
