# CoolTab - Create Load Button Not Working Troubleshooting

## Problem
When clicking the "Create Load" button, the load is not created. The form submits but nothing happens.

## Root Causes

### 1. Backend Server Not Running ❌
**Symptoms:**
- Port 5000 is not listening
- Browser console shows network errors
- No response from API calls

**Solution:**
```bash
cd c:\Users\User\Documents\DEVELOPER\CoolTab\server
npm run dev
```

**Status:** Backend must be running on `http://localhost:5000`

### 2. MongoDB Not Running ❌
**Symptoms:**
- Backend starts but cannot connect to database
- Logs show: `MongooseServerSelectionError: connect ECONNREFUSED ::1:27017`
- API returns 500 errors

**Solution:**
Install and start MongoDB locally:
```bash
# Option A: Using MongoDB community edition (installed locally)
# Start MongoDB service in Windows Services

# Option B: Using Docker (if available)
docker run -d -p 27017:27017 --name mongodb mongo:7.0

# Option C: Using Docker Compose (from CoolTab root)
docker-compose up -d
```

**Status:** MongoDB must be running on `localhost:27017`

### 3. Frontend Not Configured
**Symptoms:**
- Frontend cannot reach backend API

**Solution:**
Ensure `.env` file exists in client folder with:
```
REACT_APP_API_URL=http://localhost:5000/api
```

If missing, create it or the frontend defaults to `http://localhost:5000/api`

## Step-by-Step Startup Guide

### Prerequisites
- Node.js 18+ installed
- MongoDB installed and running on localhost:27017
- No other services using ports 3000 or 5000

### Startup

#### Terminal 1: Start Backend
```bash
cd "c:\Users\User\Documents\DEVELOPER\CoolTab\server"
npm install  # (if not done recently)
npm run dev
```

Expected output:
```
Server running on port 5000
MongoDB connected
```

#### Terminal 2: Start Frontend
```bash
cd "c:\Users\User\Documents\DEVELOPER\CoolTab\client"
npm install  # (if not done recently)
npm start
```

Expected output:
```
Compiled successfully!
webpack compiled successfully
You can now view cooltab-frontend in the browser.
  Local: http://localhost:3000
```

#### Open Browser
```
http://localhost:3000
```

### Test the Create Load Button

1. Click "+ New Load" button
2. Fill in **all required fields**:
   - Sender Company, Address, Contact
   - Receiver Company, Address, Contact
   - Item Description, Quantity
   - Expected Arrival at Client (date)
3. (Optional) Fill in:
   - Incoming Date (to warehouse)
   - Date of Loading
4. Click "Create Load"

Expected behavior:
- Form closes
- New load appears in IN column on the warehouse incoming date
- Or if no warehouse date, appears in default list view

## Debugging

### Check Backend Connection
```powershell
$response = Invoke-RestMethod -Uri 'http://localhost:5000/api/loads' -Method GET
$response | ConvertTo-Json
```

If this fails:
- Backend is not running or not responding
- Check port 5000 is free: `netstat -ano | findstr :5000`

### Check MongoDB Connection
Look at backend logs for:
```
MongoDB connected
```

If you see:
```
MongoDB connection error
```

Then MongoDB is not running. Start it first.

### Check Frontend API Calls
1. Open Browser DevTools (F12)
2. Go to Network tab
3. Click "Create Load"
4. Look for POST request to `/api/loads`
5. Check Response tab for errors

## Form Validation

All these fields are **REQUIRED**:
- ✅ Sender Company
- ✅ Sender Address
- ✅ Sender Contact
- ✅ Receiver Company
- ✅ Receiver Address
- ✅ Receiver Contact
- ✅ Item Description
- ✅ Quantity (must be a number)
- ✅ Expected Arrival at Client (date)

Optional but useful:
- ⚪ Incoming Date (to warehouse)
- ⚪ Date of Loading

## Quick Checklist

- [ ] MongoDB is running (`localhost:27017`)
- [ ] Backend server is running (`localhost:5000`)
- [ ] No console errors in browser DevTools
- [ ] All required form fields are filled
- [ ] Expected Arrival date is set
- [ ] Button click shows loading state
- [ ] New load appears on the calendar

## Still Not Working?

1. Check browser console (F12 → Console tab) for JavaScript errors
2. Check backend logs for 500 errors
3. Check MongoDB is accessible: `mongosh` or `mongo`
4. Try clearing browser cache and refreshing
5. Restart both backend and frontend

