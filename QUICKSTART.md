# Quick Start Guide

## Project Overview

CoolTab tracks loads through 8 phases from order received to final delivery:

```
Order Received → In Transit to Warehouse → Unloading → In Warehouse → 
Transport Issued → Loading → In Transit to Destination → Arrived
```

## 5-Minute Setup

### Option 1: Docker (Recommended)
```bash
docker-compose up -d
# Frontend: http://localhost:3000
# API: http://localhost:5000
```

### Option 2: Manual
```bash
# Terminal 1 - Backend
cd server
npm install
npm run dev

# Terminal 2 - Frontend  
cd client
npm install
npm run dev
# http://localhost:3000
```

## First Steps

1. **Create a Load**: Click "+ New Load" and fill in sender/receiver info
2. **View Load**: Load appears in "Order Received" column
3. **Track Progress**: Click load to see timeline and move to next phase
4. **Monitor Status**: Each column shows loads at that phase

## Key Files

| File | Purpose |
|------|---------|
| [server/models/Load.js](server/models/Load.js) | Database schema |
| [server/routes/loads.js](server/routes/loads.js) | API endpoints |
| [client/src/components/KanbanBoard.jsx](client/src/components/KanbanBoard.jsx) | Main UI |
| [docker-compose.yml](docker-compose.yml) | Docker setup |

## API Examples

```bash
# Create load
curl -X POST http://localhost:5000/api/loads \
  -H "Content-Type: application/json" \
  -d '{"sender":{"company":"ABC Corp"},"receiver":{"company":"XYZ Inc"}}'

# Get all loads
curl http://localhost:5000/api/loads

# Update status
curl -X PATCH http://localhost:5000/api/loads/[ID]/status \
  -H "Content-Type: application/json" \
  -d '{"status":"in_warehouse","notes":"Arrived"}'
```

## Development Commands

```bash
# Run all services
npm run dev

# Backend only
cd server && npm run dev

# Frontend only
cd client && npm run dev

# Docker
docker-compose up -d      # Start
docker-compose down       # Stop
docker-compose logs -f    # View logs
```

## Database

MongoDB connection: `mongodb://admin:password@localhost:27017/cooltab`

Default credentials: `admin / password`

## Need Help?

- See [README.md](README.md) for detailed documentation
- Check [.github/copilot-instructions.md](.github/copilot-instructions.md) for AI-specific conventions
- API Docs: [server/routes/loads.js](server/routes/loads.js)
