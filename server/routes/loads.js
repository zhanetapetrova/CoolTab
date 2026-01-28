const express = require('express');
const router = express.Router();
const loadController = require('../controllers/loadController');

// Get all loads
router.get('/', loadController.getAllLoads);

// Get loads by status
router.get('/status/:status', loadController.getLoadsByStatus);

// Get single load
router.get('/:id', loadController.getLoad);

// Create new load
router.post('/', loadController.createLoad);

// Create load from file upload
router.post('/upload/file', loadController.createLoadFromFile);

// Update load status (transition through phases)
router.patch('/:id/status', loadController.updateLoadStatus);

// Update warehouse information
router.patch('/:id/warehouse', loadController.updateWarehouseInfo);

// Update transport information
router.patch('/:id/transport', loadController.updateTransportInfo);

// Mark as delivered
router.patch('/:id/deliver', loadController.markAsDelivered);

module.exports = router;
