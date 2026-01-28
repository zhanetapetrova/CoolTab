# Developer Reference Guide

## Project Structure Quick Reference

```
CoolTab/
├── 📄 README.md                    → Full documentation
├── 📄 QUICKSTART.md                → 5-minute setup
├── 📄 API.md                       → API endpoints
├── 📄 IMPLEMENTATION.md            → What was built
├── 📦 package.json                 → Root dependencies
├── 🐳 docker-compose.yml           → Container setup
│
├── 📁 server/                      → Backend (Express)
│   ├── index.js                    → Main server file
│   ├── package.json                → Backend deps
│   ├── Dockerfile                  → Container image
│   ├── .env.example                → Env template
│   ├── 📁 models/
│   │   ├── Load.js                 → Load schema
│   │   └── Truck.js                → Truck schema
│   ├── 📁 controllers/
│   │   └── loadController.js       → API logic
│   └── 📁 routes/
│       └── loads.js                → Route definitions
│
├── 📁 client/                      → Frontend (React)
│   ├── package.json                → Frontend deps
│   ├── 📁 src/
│   │   ├── index.jsx               → React entry
│   │   ├── App.jsx                 → Root component
│   │   ├── App.css                 → Global styles
│   │   └── 📁 components/
│   │       ├── KanbanBoard.jsx    → Main Kanban UI
│   │       └── KanbanBoard.css    → Kanban styles
│   └── 📁 public/
│       ├── index.html              → HTML template
│       └── manifest.json           → Web manifest
│
└── 📁 .github/
    └── copilot-instructions.md     → AI agent guide
```

## Core Data Flow

```
User Action (Frontend)
         ↓
React Component Handler
         ↓
axios HTTP Request
         ↓
Express Route → Controller Function
         ↓
MongoDB Query/Update
         ↓
JSON Response
         ↓
Frontend State Update
         ↓
UI Re-render
```

## API Endpoints Summary

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/loads` | Fetch all loads |
| GET | `/api/loads/:id` | Fetch specific load |
| GET | `/api/loads/status/:status` | Filter by phase |
| POST | `/api/loads` | Create new load |
| PATCH | `/api/loads/:id/status` | Update phase |
| PATCH | `/api/loads/:id/warehouse` | Set warehouse info |
| PATCH | `/api/loads/:id/transport` | Assign transport |
| PATCH | `/api/loads/:id/deliver` | Mark delivered |

## Load Status Phases (In Order)

1. `order_received` - Order placed
2. `in_transit_to_warehouse` - On truck to warehouse
3. `unloading` - Being unloaded
4. `in_warehouse` - Stored on pallet
5. `transport_issued` - Forwarding order issued
6. `loading` - Loading for delivery
7. `in_transit_to_destination` - Traveling to destination
8. `arrived` - Delivered

## Important Code Patterns

### Creating a Load (Backend)
```javascript
// In loadController.js - createLoad function
const load = new Load({
  sender, receiver, items, expectedDeliveryDate,
  status: 'order_received'
});
await load.save();
```

### Updating Load Status (Backend)
```javascript
// In loadController.js - updateLoadStatus function
await Load.findByIdAndUpdate(
  id,
  {
    status,
    $push: { timeline: { status, timestamp, notes, location } }
  },
  { new: true }
);
```

### Fetching Loads by Status (Frontend)
```javascript
// In KanbanBoard.jsx
const getLoadsByStatus = (status) => {
  return loads.filter((load) => load.status === status);
};
```

### Moving to Next Phase (Frontend)
```javascript
// In KanbanBoard.jsx - handleUpdateStatus
const currentIdx = STATUSES.findIndex(s => s.key === selectedLoad.status);
if (currentIdx < STATUSES.length - 1) {
  const nextStatus = STATUSES[currentIdx + 1].key;
  await axios.patch(`${API_URL}/loads/${loadId}/status`, {
    status: nextStatus
  });
}
```

## Development Commands

```bash
# Install dependencies
cd server && npm install
cd client && npm install

# Run everything (Docker)
docker-compose up -d

# Run everything (Manual)
npm run dev

# Backend only
cd server && npm run dev

# Frontend only
cd client && npm run dev

# View Docker logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Access MongoDB
docker exec -it cooltab-mongodb mongosh -u admin -p password
```

## Environment Variables

### Backend (.env)
```
MONGODB_URI=mongodb://admin:password@localhost:27017/cooltab
NODE_ENV=development
PORT=5000
```

### Frontend (set before npm start)
```
REACT_APP_API_URL=http://localhost:5000/api
```

## Testing the API

### Test Load Creation
```bash
curl -X POST http://localhost:5000/api/loads \
  -H "Content-Type: application/json" \
  -d '{
    "sender": {"company":"Test","address":"123 Main","contact":"test@test.com"},
    "receiver": {"company":"Receiver","address":"456 Oak","contact":"rec@rec.com"},
    "items": [{"description":"Test Item","quantity":1}],
    "expectedDeliveryDate":"2026-02-28T00:00:00Z"
  }'
```

### Test Status Update (replace {ID})
```bash
curl -X PATCH http://localhost:5000/api/loads/{ID}/status \
  -H "Content-Type: application/json" \
  -d '{
    "status":"in_warehouse",
    "notes":"Arrived at warehouse",
    "location":"Building A"
  }'
```

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Port 5000 in use | Change `PORT` in `.env` or stop other service |
| MongoDB connection fails | Ensure Docker is running: `docker-compose up -d` |
| Frontend API 404 | Check `REACT_APP_API_URL` matches backend URL |
| Components not rendering | Clear browser cache or hard refresh (Ctrl+Shift+R) |
| Database empty after restart | Data persists in Docker volume unless deleted |

## File Modification Guide

### Adding a New Status Phase
1. Update enum in [server/models/Load.js](server/models/Load.js#L8-L15)
2. Add to STATUSES array in [client/src/components/KanbanBoard.jsx](client/src/components/KanbanBoard.jsx#L8-L15)
3. Update [API.md](API.md) status list

### Adding a New Load Field
1. Add to Load schema: [server/models/Load.js](server/models/Load.js)
2. Add form input: [client/src/components/KanbanBoard.jsx](client/src/components/KanbanBoard.jsx#L57)
3. Include in API request body in [loadController.js](server/controllers/loadController.js)
4. Display in modal if needed

### Styling Changes
- Kanban layout: [client/src/components/KanbanBoard.css](client/src/components/KanbanBoard.css#L23-L35)
- Load cards: [client/src/components/KanbanBoard.css](client/src/components/KanbanBoard.css#L82-L105)
- Modal: [client/src/components/KanbanBoard.css](client/src/components/KanbanBoard.css#L108-L130)

## Key Concepts

### Timeline (Immutable Audit Trail)
- Every status change creates a NEW entry
- Entries are NEVER modified, only appended
- Provides complete history for audit purposes
- Contains: status, timestamp, notes, location

### Status Transitions
- Linear flow: can only move to next phase
- No backward transitions allowed
- Frontend enforces this with "Move to Next Phase" button
- Backend validates sequential order

### Database Nesting
- Load contains all related data (sender, receiver, warehouse, transport)
- Timeline is append-only array
- Enables single document transactions
- No complex joins needed

## Getting Help

1. **File locations**: See file paths in this guide
2. **API details**: Check [API.md](API.md)
3. **Setup issues**: See [QUICKSTART.md](QUICKSTART.md)
4. **Full docs**: See [README.md](README.md)
5. **AI guidance**: See [.github/copilot-instructions.md](.github/copilot-instructions.md)

---

**Last Updated**: January 28, 2026
