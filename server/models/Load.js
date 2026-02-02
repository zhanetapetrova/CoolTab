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
      qrCodeData: String,
      barcodeId: String,
      generatedAt: { type: Date, default: Date.now },
    },
    items: [
      {
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
    // Status-specific dates entered by user
    statusDates: {
      orderReceived: Date,
      inTransitToWarehouse: Date,
      unloading: Date,
      inWarehouse: Date,
      transportIssued: Date,
      loading: Date,
      inTransitToDestination: Date,
      arrived: Date,
    },
    warehouse: {
      palletLocation: String,
      notes: String,
    },
    transport: {
      truckId: String,
      driverId: String,
      carrier: String,
    },
    timeline: [
      {
        status: String,
        timestamp: { type: Date, default: Date.now },
        userEnteredDate: Date,
        notes: String,
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Load', LoadSchema);
