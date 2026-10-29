const express = require('express');
const router = express.Router();
const AllocationController = require('../controllers/allocationController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(authenticate);

router.get('/', AllocationController.getAll);
router.get('/:id', AllocationController.getById);

// Create allocation - Hospital Admin and Reception Staff
router.post('/', authorize('HOSPITAL_ADMINISTRATOR', 'RECEPTION_STAFF'), AllocationController.create);

// Release resource from allocation
router.post(
  '/:id/release',
  authorize('HOSPITAL_ADMINISTRATOR', 'RECEPTION_STAFF', 'DEPARTMENT_COORDINATOR'),
  AllocationController.release
);

module.exports = router;
