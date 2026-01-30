const Load = require('../models/Load');
const QRCode = require('qrcode');
const { simpleParser } = require('mailparser');
const fs = require('fs');
const path = require('path');
const mockDb = require('../mockDb');

// Generate QR Code for load
const generateQRCode = async (loadId) => {
  try {
    const qrDataUrl = await QRCode.toDataURL(loadId, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 0.95,
      margin: 1,
      width: 200,
    });
    return qrDataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    return null;
  }
};

// Extract text from file (basic implementation)
const extractFileInfo = async (fileBuffer, filename) => {
  const ext = path.extname(filename).toLowerCase();
  
  try {
    if (ext === '.eml' || ext === '.txt' && filename.includes('mail')) {
      // Parse email
      const parsed = await simpleParser(fileBuffer);
      return {
        source: filename,
        type: 'email',
        subject: parsed.subject || 'No subject',
        from: parsed.from?.text || 'Unknown',
        date: parsed.date || new Date(),
        text: parsed.text?.substring(0, 500) || '',
      };
    } else if (ext === '.txt') {
      // Parse text
      const text = fileBuffer.toString('utf-8');
      return {
        source: filename,
        type: 'text',
        content: text.substring(0, 500),
      };
    } else {
      // For PDF and images, just return file info
      return {
        source: filename,
        type: ext.replace('.', ''),
        uploadDate: new Date(),
      };
    }
  } catch (error) {
    console.error('Error extracting file info:', error);
    return {
      source: filename,
      type: ext.replace('.', ''),
      uploadDate: new Date(),
    };
  }
};

// Get all loads
exports.getAllLoads = async (req, res) => {
  try {
    let loads;
    if (req.useMockDb) {
      loads = await mockDb.getAllLoads();
    } else {
      loads = await Load.find().sort({ createdAt: -1 });
    }
    res.json(loads);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get loads by status
exports.getLoadsByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    let loads;
    if (req.useMockDb) {
      loads = await mockDb.getLoadsByStatus(status);
    } else {
      loads = await Load.find({ status }).sort({ createdAt: -1 });
    }
    res.json(loads);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get loads for a specific date (YYYY-MM-DD)
exports.getLoadsByDate = async (req, res) => {
  try {
    const { date } = req.params;
    if (!date) return res.status(400).json({ error: 'Date required (YYYY-MM-DD)' });

    let loads;
    if (req.useMockDb) {
      loads = await mockDb.getLoadsByDate(date);
    } else {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      loads = await Load.find({
        $or: [
          { 'timeline.timestamp': { $gte: start, $lt: end } },
          { createdAt: { $gte: start, $lt: end } },
          { expectedDeliveryDate: { $gte: start, $lt: end } },
          { 'warehouse.incomingDate': { $gte: start, $lt: end } },
          { 'transport.dispatchDate': { $gte: start, $lt: end } },
          { incomingDate: { $gte: start, $lt: end } },
          { status: 'arrived' }, // Always include loads that have arrived, regardless of date
        ],
      }).sort({ createdAt: -1 });
    }

    res.json(loads);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single load
exports.getLoad = async (req, res) => {
  try {
    const { id } = req.params;
    let load;
    if (req.useMockDb) {
      load = await mockDb.getLoadById(id);
    } else {
      load = await Load.findById(id);
    }
    if (!load) return res.status(404).json({ error: 'Load not found' });
    res.json(load);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create new load
exports.createLoad = async (req, res) => {
  try {
    const { sender, receiver, items, expectedDeliveryDate, fileInfo, warehouse, transport, incomingDate } = req.body;
    
    // Create plannedDates object from input dates
    const plannedDates = {
      warehouseArrival: warehouse?.incomingDate || incomingDate,
      warehouseDispatch: transport?.dispatchDate,
      clientDelivery: expectedDeliveryDate,
    };
    
    let load;
    if (req.useMockDb) {
      load = await mockDb.createLoad({
        sender,
        receiver,
        items,
        expectedDeliveryDate,
        warehouse,
        transport,
        incomingDate,
        plannedDates,
        status: 'order_received',
      });
    } else {
      load = new Load({
        sender,
        receiver,
        items,
        expectedDeliveryDate,
        warehouse,
        transport,
        incomingDate,
        plannedDates,
        status: 'order_received',
      });
      await load.save();
    }

    // Generate QR code for the load ID
    const qrCodeData = await generateQRCode(load.loadId || load._id);
    if (qrCodeData) {
      load.barcode = {
        qrCodeData,
        barcodeId: load.loadId || load._id,
        generatedAt: new Date(),
      };
      if (!req.useMockDb) {
        await load.save();
      }
    }

    res.status(201).json(load);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create load from file upload
exports.createLoadFromFile = async (req, res) => {
  try {
    const fileBuffer = req.body.fileBuffer; // Base64 encoded
    const fileName = req.body.fileName;
    const senderCompany = req.body.senderCompany || 'From File Upload';
    const receiverCompany = req.body.receiverCompany || 'Pending';

    // Decode base64 if necessary
    const buffer = Buffer.from(fileBuffer, 'base64');

    // Extract file information
    const fileInfo = await extractFileInfo(buffer, fileName);

    const load = new Load({
      sender: {
        company: senderCompany,
        address: `File: ${fileName}`,
        contact: fileInfo.from || 'N/A',
      },
      receiver: {
        company: receiverCompany,
        address: 'To be determined',
        contact: 'N/A',
      },
      items: [
        {
          description: fileInfo.subject || `${fileInfo.type.toUpperCase()} - ${fileName}`,
          quantity: 1,
        },
      ],
      status: 'order_received',
    });

    await load.save();

    // Generate QR code for the load
    const qrCodeData = await generateQRCode(load.loadId);
    if (qrCodeData) {
      load.barcode = {
        qrCodeData,
        barcodeId: load.loadId,
        generatedAt: new Date(),
      };
      await load.save();
    }

    res.status(201).json({
      ...load.toObject(),
      fileInfo,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update load status
exports.updateLoadStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, location, actualDate } = req.body;

    console.log('=== Status Update Request ===');
    console.log('Load ID:', id);
    console.log('New Status:', status);
    console.log('Actual Date:', actualDate);
    console.log('============================');

    // Use provided actualDate or current time
    const timestamp = actualDate ? new Date(actualDate) : new Date();
    const updateFields = { status };
    
    // Record actual dates based on status change
    if (status === 'in_warehouse') {
      updateFields['actualDates.warehouseArrival'] = timestamp;
    } else if (status === 'loading' || status === 'in_transit_to_destination') {
      updateFields['actualDates.warehouseDispatch'] = timestamp;
    } else if (status === 'arrived') {
      updateFields['actualDates.clientDelivery'] = timestamp;
      updateFields.actualDeliveryDate = timestamp;
    }

    let load;
    if (req.useMockDb) {
      load = await mockDb.updateLoadStatus(id, status, notes, location, actualDate);
    } else {
      load = await Load.findByIdAndUpdate(
        id,
        {
          ...updateFields,
          $push: {
            timeline: {
              status,
              timestamp: timestamp,
              notes,
              location,
            },
          },
        },
        { new: true }
      );
    }

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
