const Load = require('../models/Load');

// Get all loads
exports.getAllLoads = async (req, res) => {
  try {
    const loads = await Load.find().sort({ createdAt: -1 });
    res.json(loads);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get loads by status
exports.getLoadsByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    const loads = await Load.find({ status }).sort({ createdAt: -1 });
    res.json(loads);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single load
exports.getLoad = async (req, res) => {
  try {
    const load = await Load.findById(req.params.id);
    if (!load) return res.status(404).json({ error: 'Load not found' });
    res.json(load);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create new load
exports.createLoad = async (req, res) => {
  try {
    const { sender, receiver, items, expectedDeliveryDate } = req.body;
    
    const load = new Load({
      sender,
      receiver,
      items,
      expectedDeliveryDate,
      status: 'order_received',
    });

    await load.save();
    res.status(201).json(load);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update load status
exports.updateLoadStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, location } = req.body;

    const load = await Load.findByIdAndUpdate(
      id,
      {
        status,
        $push: {
          timeline: {
            status,
            timestamp: new Date(),
            notes,
            location,
          },
        },
      },
      { new: true }
    );

    if (!load) return res.status(404).json({ error: 'Load not found' });
    res.json(load);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update warehouse information
exports.updateWarehouseInfo = async (req, res) => {
  try {
    const { id } = req.params;
    const { palletLocation, warehouseNotes } = req.body;

    const load = await Load.findByIdAndUpdate(
      id,
      {
        'warehouse.palletLocation': palletLocation,
        'warehouse.warehouseNotes': warehouseNotes,
        'warehouse.incomingDate': new Date(),
      },
      { new: true }
    );

    if (!load) return res.status(404).json({ error: 'Load not found' });
    res.json(load);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update transport information
exports.updateTransportInfo = async (req, res) => {
  try {
    const { id } = req.params;
    const { truckId, driverId, carrier, dispatchDate } = req.body;

    const load = await Load.findByIdAndUpdate(
      id,
      {
        'transport.truckId': truckId,
        'transport.driverId': driverId,
        'transport.carrier': carrier,
        'transport.dispatchDate': dispatchDate,
      },
      { new: true }
    );

    if (!load) return res.status(404).json({ error: 'Load not found' });
    res.json(load);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Mark load as delivered
exports.markAsDelivered = async (req, res) => {
  try {
    const { id } = req.params;

    const load = await Load.findByIdAndUpdate(
      id,
      {
        status: 'arrived',
        actualDeliveryDate: new Date(),
        $push: {
          timeline: {
            status: 'arrived',
            timestamp: new Date(),
            notes: 'Load delivered to final destination',
          },
        },
      },
      { new: true }
    );

    if (!load) return res.status(404).json({ error: 'Load not found' });
    res.json(load);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
