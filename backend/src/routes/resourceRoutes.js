const express = require('express');
const router = express.Router();
const ResourceController = require('../controllers/resourceController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(authenticate);

// Availability summary endpoint (place before /:id)
router.get('/availability', ResourceController.getAvailability);

// Resource list & single resource
router.get('/', ResourceController.getAll);
router.get('/:id', ResourceController.getById);

// Resource registration - Hospital Administrator only
router.post('/', authorize('HOSPITAL_ADMINISTRATOR'), ResourceController.create);

// Update resource details
router.put('/:id', authorize('HOSPITAL_ADMINISTRATOR', 'DEPARTMENT_COORDINATOR'), ResourceController.update);

// Update status (lifecycle transition)
router.patch(
  '/:id/status',
  authorize('HOSPITAL_ADMINISTRATOR', 'DEPARTMENT_COORDINATOR', 'SYSTEM_ADMINISTRATOR', 'RECEPTION_STAFF'),
  ResourceController.updateStatus
);

// Retire / archive resource
router.post('/:id/retire', authorize('HOSPITAL_ADMINISTRATOR', 'SYSTEM_ADMINISTRATOR'), ResourceController.retire);

module.exports = router;
