const mongoose = require('mongoose');

const TruckSchema = new mongoose.Schema(
  {
    truckId: {
      type: String,
      unique: true,
      required: true,
    },
    plate: String,
    capacity: Number,
    driver: String,
    status: {
      type: String,
      enum: ['available', 'loading', 'in_transit', 'unloading'],
      default: 'available',
    },
    loads: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Load',
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Truck', TruckSchema);
