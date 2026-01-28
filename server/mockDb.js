// Mock in-memory database for development
// This allows running the app without MongoDB installed

const { v4: uuidv4 } = require('uuid');

let loads = [];
let nextId = 1;

const mockDb = {
  // Load operations
  createLoad: async (loadData) => {
    const load = {
      _id: uuidv4(),
      ...loadData,
      loadId: loadData.loadId || uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date(),
      timeline: loadData.timeline || [],
    };
    loads.push(load);
    return load;
  },

  getAllLoads: async () => {
    return loads;
  },

  getLoadById: async (id) => {
    return loads.find((l) => l._id === id);
  },

  getLoadsByStatus: async (status) => {
    return loads.filter((l) => l.status === status);
  },

  getLoadsByDate: async (date) => {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    return loads.filter((load) => {
      const wDate = load.warehouse?.incomingDate ? new Date(load.warehouse.incomingDate) : null;
      const tDate = load.transport?.dispatchDate ? new Date(load.transport.dispatchDate) : null;
      const topIn = load.incomingDate ? new Date(load.incomingDate) : null;
      const expected = load.expectedDeliveryDate ? new Date(load.expectedDeliveryDate) : null;

      const inMatch = (d) => d && d >= start && d < end;
      return (
        inMatch(wDate) ||
        inMatch(topIn) ||
        inMatch(expected) ||
        inMatch(tDate) ||
        inMatch(load.createdAt)
      );
    });
  },

  updateLoadStatus: async (id, status, notes, location) => {
    const load = loads.find((l) => l._id === id);
    if (!load) return null;

    load.status = status;
    load.updatedAt = new Date();
    if (!load.timeline) load.timeline = [];
    load.timeline.push({
      status,
      timestamp: new Date(),
      notes,
      location,
    });

    return load;
  },

  updateWarehouseInfo: async (id, palletLocation, warehouseNotes) => {
    const load = loads.find((l) => l._id === id);
    if (!load) return null;

    load.warehouse = {
      ...load.warehouse,
      palletLocation,
      warehouseNotes,
      incomingDate: new Date(),
    };
    load.updatedAt = new Date();

    return load;
  },

  updateTransportInfo: async (id, truckId, driverId, carrier, dispatchDate) => {
    const load = loads.find((l) => l._id === id);
    if (!load) return null;

    load.transport = {
      truckId,
      driverId,
      carrier,
      dispatchDate: dispatchDate ? new Date(dispatchDate) : null,
    };
    load.updatedAt = new Date();

    return load;
  },

  markAsDelivered: async (id) => {
    const load = loads.find((l) => l._id === id);
    if (!load) return null;

    load.status = 'arrived';
    load.actualDeliveryDate = new Date();
    load.updatedAt = new Date();
    if (!load.timeline) load.timeline = [];
    load.timeline.push({
      status: 'arrived',
      timestamp: new Date(),
      notes: 'Load delivered to final destination',
    });

    return load;
  },

  // Initialize with sample data
  seedSampleData: async () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextDay = new Date(today);
    nextDay.setDate(nextDay.getDate() + 2);

    const sampleLoads = [
      {
        loadId: uuidv4(),
        status: 'in_warehouse',
        sender: { company: 'Alpha Corp', address: '123 Main St', contact: 'John' },
        receiver: { company: 'Beta Inc', address: '456 Oak Ave', contact: 'Jane' },
        items: [{ description: 'Electronics', quantity: 50 }],
        warehouse: { incomingDate: today, palletLocation: 'A-12' },
        transport: { dispatchDate: tomorrow },
        expectedDeliveryDate: nextDay,
        timeline: [
          { status: 'order_received', timestamp: new Date(today.getTime() - 86400000), notes: 'Order placed' },
          { status: 'in_warehouse', timestamp: today, notes: 'Received at warehouse' },
        ],
      },
      {
        loadId: uuidv4(),
        status: 'loading',
        sender: { company: 'Gamma Ltd', address: '789 Elm Rd', contact: 'Bob' },
        receiver: { company: 'Delta Co', address: '321 Pine St', contact: 'Alice' },
        items: [{ description: 'Textiles', quantity: 100 }],
        warehouse: { incomingDate: today, palletLocation: 'B-5' },
        transport: { dispatchDate: tomorrow, truckId: 'TRK-001' },
        expectedDeliveryDate: nextDay,
        timeline: [
          { status: 'in_warehouse', timestamp: today, notes: 'In warehouse' },
          { status: 'loading', timestamp: today, notes: 'Being loaded' },
        ],
      },
      {
        loadId: uuidv4(),
        status: 'in_transit_to_destination',
        sender: { company: 'Epsilon Sp', address: '555 Ash Ln', contact: 'Charlie' },
        receiver: { company: 'Zeta Group', address: '777 Birch Dr', contact: 'Diana' },
        items: [{ description: 'Machinery', quantity: 10 }],
        warehouse: { incomingDate: new Date(today.getTime() - 86400000), palletLocation: 'C-8' },
        transport: { dispatchDate: today, truckId: 'TRK-002', driverId: 'DRV-001' },
        expectedDeliveryDate: tomorrow,
        timeline: [
          { status: 'in_warehouse', timestamp: new Date(today.getTime() - 86400000) },
          { status: 'loading', timestamp: today },
          { status: 'in_transit_to_destination', timestamp: today },
        ],
      },
    ];

    loads = sampleLoads.map((load) => ({
      _id: uuidv4(),
      ...load,
      createdAt: new Date(today.getTime() - 172800000),
      updatedAt: new Date(),
    }));

    console.log(`✓ Seeded ${loads.length} sample loads`);
    return loads;
  },
};

module.exports = mockDb;
