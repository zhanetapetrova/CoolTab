# CoolTab API Documentation

## Base URL
```
http://localhost:5000/api
```

## Load Status Phases
```
order_received
in_transit_to_warehouse
unloading
in_warehouse
transport_issued
loading
in_transit_to_destination
arrived
```

## Endpoints

### Get All Loads
```http
GET /loads
```

**Response:**
```json
[
  {
    "_id": "ObjectId",
    "loadId": "uuid",
    "status": "order_received",
    "sender": {
      "company": "ABC Corp",
      "address": "123 Main St",
      "contact": "contact@abc.com"
    },
    "receiver": {
      "company": "XYZ Inc",
      "address": "456 Oak Ave",
      "contact": "contact@xyz.com"
    },
    "warehouse": {
      "palletLocation": "A-12-3",
      "incomingDate": "2026-01-28T10:00:00Z",
      "warehouseNotes": "Handle with care"
    },
    "transport": {
      "truckId": "TRUCK-001",
      "driverId": "DRIVER-001",
      "carrier": "FastFreight Co",
      "dispatchDate": "2026-01-28T14:00:00Z"
    },
    "items": [
      {
        "itemId": "ITEM-001",
        "qrCode": "QR123456",
        "description": "Electronic equipment",
        "quantity": 10
      }
    ],
    "timeline": [
      {
        "status": "order_received",
        "timestamp": "2026-01-28T09:00:00Z",
        "notes": "Order received from sender",
        "location": "Sender warehouse"
      }
    ],
    "incomingDate": "2026-01-28T09:00:00Z",
    "expectedDeliveryDate": "2026-02-04T00:00:00Z",
    "actualDeliveryDate": null,
    "createdAt": "2026-01-28T09:00:00Z",
    "updatedAt": "2026-01-28T10:00:00Z"
  }
]
```

### Get Load by ID
```http
GET /loads/:id
```

**Parameters:**
- `id` (string, required) - MongoDB ObjectId

**Response:** Single load object

### Get Loads by Status
```http
GET /loads/status/:status
```

**Parameters:**
- `status` (string, required) - One of the phase names

**Response:** Array of loads with matching status

### Create New Load
```http
POST /loads
Content-Type: application/json
```

**Request Body:**
```json
{
  "sender": {
    "company": "ABC Corp",
    "address": "123 Main St",
    "contact": "contact@abc.com"
  },
  "receiver": {
    "company": "XYZ Inc",
    "address": "456 Oak Ave",
    "contact": "contact@xyz.com"
  },
  "items": [
    {
      "description": "Electronic equipment",
      "quantity": 10
    }
  ],
  "expectedDeliveryDate": "2026-02-04T00:00:00Z"
}
```

**Response:** Created load object (201 Created)

### Update Load Status
```http
PATCH /loads/:id/status
Content-Type: application/json
```

**Request Body:**
```json
{
  "status": "in_transit_to_warehouse",
  "notes": "Picked up by courier",
  "location": "In transit"
}
```

**Response:** Updated load object

### Update Warehouse Information
```http
PATCH /loads/:id/warehouse
Content-Type: application/json
```

**Request Body:**
```json
{
  "palletLocation": "A-12-3",
  "warehouseNotes": "Store in cool area"
}
```

**Response:** Updated load object

### Update Transport Information
```http
PATCH /loads/:id/transport
Content-Type: application/json
```

**Request Body:**
```json
{
  "truckId": "TRUCK-001",
  "driverId": "DRIVER-001",
  "carrier": "FastFreight Co",
  "dispatchDate": "2026-01-28T14:00:00Z"
}
```

**Response:** Updated load object

### Mark Load as Delivered
```http
PATCH /loads/:id/deliver
```

**Response:** Updated load object with status "arrived" and actualDeliveryDate set

## Error Responses

All errors follow this format:
```json
{
  "error": "Error message description"
}
```

**Common HTTP Status Codes:**
- 200: Success
- 201: Created
- 400: Bad request
- 404: Not found
- 500: Server error

## Example Usage

### Using cURL

**Create a load:**
```bash
curl -X POST http://localhost:5000/api/loads \
  -H "Content-Type: application/json" \
  -d '{
    "sender": {
      "company": "ABC Corp",
      "address": "123 Main St",
      "contact": "contact@abc.com"
    },
    "receiver": {
      "company": "XYZ Inc",
      "address": "456 Oak Ave",
      "contact": "contact@xyz.com"
    },
    "items": [{"description": "Test item", "quantity": 5}],
    "expectedDeliveryDate": "2026-02-04T00:00:00Z"
  }'
```

**Get all loads:**
```bash
curl http://localhost:5000/api/loads
```

**Update load status:**
```bash
curl -X PATCH http://localhost:5000/api/loads/{id}/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "in_transit_to_warehouse",
    "notes": "Picked up",
    "location": "Route 1"
  }'
```

### Using axios (Node.js/JavaScript)

```javascript
const axios = require('axios');

const api = axios.create({
  baseURL: 'http://localhost:5000/api'
});

// Create load
const newLoad = await api.post('/loads', {
  sender: { company: 'ABC Corp', address: '123 Main St', contact: 'abc@abc.com' },
  receiver: { company: 'XYZ Inc', address: '456 Oak Ave', contact: 'xyz@xyz.com' },
  items: [{ description: 'Test item', quantity: 5 }],
  expectedDeliveryDate: '2026-02-04T00:00:00Z'
});

// Get all loads
const loads = await api.get('/loads');

// Update status
await api.patch(`/loads/${newLoad.data._id}/status`, {
  status: 'in_warehouse',
  notes: 'Received at warehouse'
});
```

## Data Validation Notes

- Load IDs are auto-generated UUIDs
- All dates are stored as JavaScript Date objects
- Timeline entries are immutable (append-only)
- Status transitions follow fixed phase order (no backward moves)
- Required fields for load creation: sender, receiver, items, expectedDeliveryDate
