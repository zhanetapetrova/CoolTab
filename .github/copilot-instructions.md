# CoolTab - AI Agent Instructions

**Project**: Full-stack load tracking system for logistics and warehouse management  
**Stack**: Node.js/Express backend, React frontend, MongoDB database, Docker

## Architecture Overview

CoolTab is a **load lifecycle management system** tracking items through 8 sequential phases. The system uses:
- **Kanban workflow**: Each load transitions through status columns (order_received → arrived)
- **Event-driven timeline**: All status changes logged with timestamps
- **Modular API design**: RESTful endpoints for load operations, warehouse updates, transport assignments

### Critical Components

**Backend** ([server/](server/)):
- Express app at [server/index.js](server/index.js) - initializes MongoDB connection, CORS, routes
- [server/models/Load.js](server/models/Load.js) - core data schema with timeline tracking, warehouse/transport details
- [server/controllers/loadController.js](server/controllers/loadController.js) - business logic for status transitions and updates
- [server/routes/loads.js](server/routes/loads.js) - REST endpoints for CRUD operations

**Frontend** ([client/src/](client/src/)):
- [client/src/components/KanbanBoard.jsx](client/src/components/KanbanBoard.jsx) - main UI component managing load cards in status columns
- [client/src/components/KanbanBoard.css](client/src/components/KanbanBoard.css) - responsive grid layout for phases

**Database**:
- MongoDB schema stores loads with multi-level nesting: sender, receiver, warehouse (palletLocation), transport (truckId, driverId), timeline array

## Key Design Patterns

1. **Status Enum**: Loads follow fixed sequence: `order_received` → `in_transit_to_warehouse` → `unloading` → `in_warehouse` → `transport_issued` → `loading` → `in_transit_to_destination` → `arrived`. No backward transitions.

2. **Timeline Tracking**: Every status change creates entry in `load.timeline[]` with timestamp, status, notes, location. Audit trail never mutated, only appended.

3. **Nested Data Updates**: Use MongoDB `$push` for timeline, direct field updates for warehouse/transport details. See [loadController.updateWarehouseInfo](server/controllers/loadController.js#L97) pattern.

4. **Kanban Column Organization**: Frontend filters loads by `status` field to populate 8 columns. Load cards are clickable modals showing full timeline and details.

## Developer Workflows

### Adding a New Load Tracking Field
1. Update [Load schema](server/models/Load.js) with new field (e.g., `cargoWeight: Number`)
2. Add form input in [KanbanBoard.jsx form](client/src/components/KanbanBoard.jsx#L57)
3. Include in request body in `handleCreateLoad()`
4. Optionally add to load card display in render

### Transitioning a Load Between Phases
1. Frontend calls `handleUpdateStatus(loadId, newStatus)` (see [KanbanBoard.jsx#L130](client/src/components/KanbanBoard.jsx#L130))
2. POST to `/api/loads/:id/status` with new status
3. [loadController.updateLoadStatus](server/controllers/loadController.js#L64) appends to timeline and updates status field
4. Card re-renders in new column on UI refresh

### Filtering Loads by Status
1. Use `GET /api/loads/status/:status` endpoint ([routes/loads.js#L8](server/routes/loads.js#L8))
2. Frontend already does client-side filtering in `getLoadsByStatus()` for display

## External Dependencies & Integration Points

- **MongoDB Atlas/Local**: Connection string in `MONGODB_URI` env var. Schema uses ObjectId references (currently unused, ready for Truck model expansion)
- **Docker Compose**: [docker-compose.yml](docker-compose.yml) starts MongoDB (port 27017), backend (5000), frontend (3000) as interconnected services
- **CORS**: Express configured to accept any origin (line 11 [server/index.js](server/index.js)); restrict for production
- **Environment**: Backend reads from `.env` (example: [server/.env.example](server/.env.example))

## Project-Specific Conventions

- **Load IDs**: Generated as UUID v4 in model default (Line 6 [server/models/Load.js](server/models/Load.js))
- **Timestamps**: All dates stored as JavaScript `Date` objects; frontend uses `toLocaleString()` for display
- **API Response Pattern**: Success returns JSON object, errors return `{error: "message"}` (see [loadController](server/controllers/loadController.js#L11))
- **CSS Naming**: BEM-inspired (`.kanban-column`, `.load-card`, `.btn-create`); flexbox grid for responsive phase columns
- **Component State**: Load state managed in parent `KanbanBoard` component; modal for details (selectedLoad state)

## Common Tasks & Commands

```bash
# Start all services
docker-compose up -d

# Backend development (auto-restart on file change)
cd server && npm run dev

# Frontend development (hot reload)
cd client && npm run dev

# Direct MongoDB connection (inside container)
docker exec -it cooltab-mongodb mongosh -u admin -p password
```

## Testing Patterns

- Frontend components consume axios calls to `/api/loads` (see [fetchLoads function](client/src/components/KanbanBoard.jsx#L32))
- Backend errors caught in try-catch, return 500 status
- No validation layer yet; consider adding schema validation before production
