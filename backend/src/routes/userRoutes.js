const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(authenticate);
router.use(authorize('SYSTEM_ADMINISTRATOR'));

router.get('/', UserController.getAll);
router.get('/:id', UserController.getById);
router.post('/', UserController.create);
router.put('/:id', UserController.update);
router.patch('/:id/status', UserController.updateStatus);
router.post('/:id/reset-password', UserController.resetPassword);

module.exports = router;
