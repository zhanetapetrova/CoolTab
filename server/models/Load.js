const mongoose = require('mongoose');

const LoadSchema = new mongoose.Schema(
  {
    loadId: {
      type: String,
      unique: true,
      required: true,
      default: () => require('uuid').v4(),
    },
    status: {
      type: String,
      enum: [
        'order_received',
        'in_transit_to_warehouse',
        'unloading',
        'in_warehouse',
        'transport_issued',
        'loading',
        'in_transit_to_destination',
        'arrived',
      ],
      default: 'order_received',
      required: true,
    },
    barcode: {
      qrCodeData: String, // Base64 encoded QR code image
      barcodeId: String, // Unique barcode identifier
      generatedAt: { type: Date, default: Date.now },
    },
    items: [
      {
        itemId: String,
        qrCode: String,
        description: String,
        quantity: Number,
      },
    ],
    sender: {
      company: String,
      address: String,
      contact: String,
    },
    receiver: {
      company: String,
      address: String,
      contact: String,
    },
    warehouse: {
      palletLocation: String, // Address within warehouse
      incomingDate: Date,
      warehouseNotes: String,
    },
    transport: {
      truckId: String,
      driverId: String,
      carrier: String,
      dispatchDate: Date,
    },
    timeline: [
      {
        status: String,
        timestamp: { type: Date, default: Date.now },
        notes: String,
        location: String,
      },
    ],
    incomingDate: { type: Date, default: Date.now },
    expectedDeliveryDate: Date,
    actualDeliveryDate: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Load', LoadSchema);
