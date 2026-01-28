# CoolTab - Load Tracking System

A full-stack application for tracking loads through their entire lifecycle: from order received, through warehouse storage, to final delivery.

## Overview

CoolTab tracks loads through 8 distinct phases:

1. **Order Received** - Load announced to be sent to warehouse
2. **In Transit to Warehouse** - Load in transit on carrier truck
3. **Unloading** - Load being unloaded at warehouse
4. **In Warehouse** - Load stored on pallet location within warehouse
5. **Transport Issued** - Freight forwarding order issued
6. **Loading** - Load being loaded onto delivery truck
7. **In Transit to Destination** - Load in transit to final destination
8. **Arrived** - Load delivered to final destination

Each phase includes tracking of:
- QR codes for items
- Incoming and delivery dates
- Warehouse pallet locations
- Truck assignments
- Timeline of status changes

## Tech Stack

- **Backend**: Node.js + Express.js
- **Frontend**: React + CSS3
- **Database**: MongoDB
- **DevOps**: Docker + Docker Compose

## Project Structure

```
CoolTab/
├── server/                 # Express backend
│   ├── models/            # MongoDB schemas
│   ├── controllers/       # Route handlers
│   ├── routes/           # API endpoints
│   ├── index.js          # Express server
│   └── package.json
├── client/                # React frontend
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── App.jsx       # Root component
│   │   └── index.jsx     # Entry point
│   ├── public/
│   └── package.json
├── docker-compose.yml    # Docker configuration
├── package.json          # Root dependencies
└── README.md
```

## Setup Instructions

### Using Docker (Recommended)

```bash
# Start all services (MongoDB + Backend + Frontend)
docker-compose up -d

# Access the application:
# Frontend: http://localhost:3000
# API: http://localhost:5000
# MongoDB: localhost:27017
```

### Manual Setup

#### Prerequisites
- Node.js 16+
- MongoDB 5+

#### Backend Setup
```bash
cd server
npm install
cp .env.example .env
npm run dev
```

#### Frontend Setup
```bash
cd client
npm install
REACT_APP_API_URL=http://localhost:5000/api npm run dev
```

## API Endpoints

### Loads
- `GET /api/loads` - Get all loads
- `GET /api/loads/:id` - Get specific load
- `GET /api/loads/status/:status` - Filter by status
- `POST /api/loads` - Create new load
- `PATCH /api/loads/:id/status` - Update load status
- `PATCH /api/loads/:id/warehouse` - Update warehouse info
- `PATCH /api/loads/:id/transport` - Update transport info
- `PATCH /api/loads/:id/deliver` - Mark as delivered

## Load Data Model

```javascript
{
  loadId: String,           // Unique identifier
  status: String,           // Current phase
  items: Array,             // Items in load with QR codes
  sender: Object,           // Sender details (company, address, contact)
  receiver: Object,         // Receiver details
  warehouse: Object,        // Warehouse info (pallet location, notes)
  transport: Object,        // Transport info (truck, driver, carrier)
  timeline: Array,          // Status change history
  incomingDate: Date,
  expectedDeliveryDate: Date,
  actualDeliveryDate: Date
}
```

## Key Features

✅ **Kanban-style UI** - View all loads organized by status  
✅ **Phase Management** - Move loads through the 8 phases  
✅ **Detailed Tracking** - Full audit trail of status changes  
✅ **Warehouse Integration** - Pallet location tracking  
✅ **Transport Management** - Truck and driver assignments  
✅ **Real-time Updates** - Live status changes  

## Common Workflows

### Creating a Load
1. Click "+ New Load"
2. Fill in sender, receiver, and item details
3. Set expected delivery date
4. Load appears in "Order Received" column

### Moving a Load Through Phases
1. Click a load card to view details
2. Click "Move to Next Phase" button
3. Load automatically transitions to next status
4. Timeline updated with status change

### Updating Warehouse Information
1. Open load details
2. Once in "In Warehouse" phase, warehouse pallet location is visible
3. Use API endpoint to update location details

## Development

### Running Tests
```bash
# Backend tests
cd server && npm test

# Frontend tests
cd client && npm test
```

### Building for Production
```bash
npm run build
```

## Environment Variables

### Backend (.env)
```
MONGODB_URI=mongodb://admin:password@localhost:27017/cooltab
NODE_ENV=development
PORT=5000
```

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:5000/api
```

## Contributing

1. Create feature branch (`git checkout -b feature/amazing-feature`)
2. Commit changes (`git commit -m 'Add amazing feature'`)
3. Push to branch (`git push origin feature/amazing-feature`)
4. Open Pull Request

## License

This project is licensed under the ISC License.