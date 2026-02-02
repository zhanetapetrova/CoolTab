import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './KanbanBoard.css';

const STATUSES = [
  { key: 'order_received', label: 'Order Received', requiresDate: true },
  { key: 'in_transit_to_warehouse', label: 'In Transit to Warehouse', requiresDate: true },
  { key: 'unloading', label: 'Unloading', requiresDate: true },
  { key: 'in_warehouse', label: 'In Warehouse', requiresDate: true },
  { key: 'transport_issued', label: 'TO DO Transport order', requiresDate: true },
  { key: 'loading', label: 'Loading', requiresDate: true },
  { key: 'in_transit_to_destination', label: 'In Transit to Final Destination', requiresDate: true },
  { key: 'arrived', label: 'Arrived', requiresDate: true },
];

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const getTodayISO = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const addDays = (dateStr, days) => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

function KanbanBoard() {
  const [loads, setLoads] = useState([]);
  const [selectedLoad, setSelectedLoad] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [statusChangeDialog, setStatusChangeDialog] = useState({ show: false, loadId: null, newStatus: null });
  const [userDate, setUserDate] = useState('');
  const [draggedLoad, setDraggedLoad] = useState(null);
  const [filterDate, setFilterDate] = useState(getTodayISO());
  const [notification, setNotification] = useState({ show: false, message: '' });

  useEffect(() => {
    fetchLoads();
  }, []);

  const fetchLoads = async () => {
    try {
      const response = await axios.get(`${API_URL}/loads`);
      setLoads(response.data);
    } catch (error) {
      console.error('Error fetching loads:', error);
    }
  };

  const getLoadsByStatus = (status) => {
    const filtered = loads.filter((load) => load.status === status);
    
    const chosenDate = new Date(filterDate);
    chosenDate.setHours(0, 0, 0, 0);
    
    return filtered.filter((load) => {
      const dates = load.statusDates || {};
      
      switch (status) {
        case 'order_received':
          // Order Received <= chosen date
          if (!dates.orderReceived) return false;
          const orderDate = new Date(dates.orderReceived);
          orderDate.setHours(0, 0, 0, 0);
          return orderDate <= chosenDate;
          
        case 'in_transit_to_warehouse':
          // In Transit < chosen date
          if (!dates.inTransitToWarehouse) return false;
          const transitDate = new Date(dates.inTransitToWarehouse);
          transitDate.setHours(0, 0, 0, 0);
          return transitDate < chosenDate;
          
        case 'unloading':
          // Unloading on chosen date
          if (!dates.unloading) return false;
          const unloadDate = new Date(dates.unloading);
          unloadDate.setHours(0, 0, 0, 0);
          return unloadDate.getTime() === chosenDate.getTime();
          
        case 'in_warehouse':
          // In Warehouse <= chosen date
          if (!dates.inWarehouse) return false;
          const warehouseDate = new Date(dates.inWarehouse);
          warehouseDate.setHours(0, 0, 0, 0);
          return warehouseDate <= chosenDate;
          
        case 'transport_issued':
          // TO DO Transport <= chosen date
          if (!dates.transportIssued) return false;
          const transportDate = new Date(dates.transportIssued);
          transportDate.setHours(0, 0, 0, 0);
          return transportDate <= chosenDate;
          
        case 'loading':
          // Loading on chosen date
          if (!dates.loading) return false;
          const loadingDate = new Date(dates.loading);
          loadingDate.setHours(0, 0, 0, 0);
          return loadingDate.getTime() === chosenDate.getTime();
          
        case 'in_transit_to_destination':
          // Show if loading < chosen date
          if (!dates.loading) return false;
          const loadDate = new Date(dates.loading);
          loadDate.setHours(0, 0, 0, 0);
          return loadDate < chosenDate;
          
        case 'arrived':
          // Arrived on chosen date
          if (!dates.arrived) return false;
          const arrivedDate = new Date(dates.arrived);
          arrivedDate.setHours(0, 0, 0, 0);
          return arrivedDate.getTime() === chosenDate.getTime();
          
        default:
          return true;
      }
    });
  };

  const handleCreateLoad = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    const newLoad = {
      sender: {
        company: formData.get('senderCompany'),
        address: formData.get('senderAddress'),
        contact: formData.get('senderContact'),
      },
      receiver: {
        company: formData.get('receiverCompany'),
        address: formData.get('receiverAddress'),
        contact: formData.get('receiverContact'),
      },
      items: [
        {
          description: formData.get('itemDescription'),
          quantity: parseInt(formData.get('quantity'), 10) || 0,
        },
      ],
      orderReceivedDate: formData.get('orderReceivedDate'),
      deliveryDate: formData.get('deliveryDate'),
    };

    try {
      await axios.post(`${API_URL}/loads`, newLoad);
      fetchLoads();
      setShowForm(false);
      e.target.reset();
    } catch (error) {
      console.error('Error creating load:', error);
      alert('Error creating load. Please try again.');
    }
  };

  const handleStatusClick = (loadId, currentStatus, direction = 'next') => {
    const currentIndex = STATUSES.findIndex((s) => s.key === currentStatus);
    
    if (direction === 'next') {
      if (currentIndex === STATUSES.length - 1) {
        alert('Load has already reached final status');
        return;
      }
      const nextStatus = STATUSES[currentIndex + 1];
      setStatusChangeDialog({ show: true, loadId, newStatus: nextStatus.key });
      setUserDate(new Date().toISOString().split('T')[0]);
    } else {
      if (currentIndex === 0) {
        alert('Load is already at the first status');
        return;
      }
      const prevStatus = STATUSES[currentIndex - 1];
      setStatusChangeDialog({ show: true, loadId, newStatus: prevStatus.key });
      setUserDate(new Date().toISOString().split('T')[0]);
    }
  };

  const handleUpdateStatus = async (loadId, newStatus, userEnteredDate = null) => {
    try {
      await axios.patch(`${API_URL}/loads/${loadId}/status`, {
        status: newStatus,
        notes: `Moved to ${newStatus}`,
        userEnteredDate: userEnteredDate || new Date().toISOString(),
      });
      fetchLoads();
      setSelectedLoad(null);
      setStatusChangeDialog({ show: false, loadId: null, newStatus: null });
      setUserDate('');
      
      // Show notification for transport_issued status
      if (newStatus === 'transport_issued') {
        setNotification({
          show: true,
          message: 'Изпрати заявка за транспорт на Coolsped Bulgaria'
        });
        // Auto-hide notification after 6 seconds
        setTimeout(() => {
          setNotification({ show: false, message: '' });
        }, 6000);
      }
    } catch (error) {
      console.error('Error updating load:', error);
      alert('Error updating status. Please try again.');
    }
  };

  const handleDragStart = (e, load) => {
    setDraggedLoad(load);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetStatus) => {
    e.preventDefault();
    if (!draggedLoad) return;

    const currentIndex = STATUSES.findIndex((s) => s.key === draggedLoad.status);
    const targetIndex = STATUSES.findIndex((s) => s.key === targetStatus);

    // Only allow moving to adjacent column (next phase)
    if (targetIndex === currentIndex + 1) {
      // Move to next phase
      setStatusChangeDialog({ show: true, loadId: draggedLoad._id, newStatus: targetStatus });
      setUserDate(new Date().toISOString().split('T')[0]);
    } else if (targetIndex === currentIndex - 1) {
      // Move to previous phase
      setStatusChangeDialog({ show: true, loadId: draggedLoad._id, newStatus: targetStatus });
      setUserDate(new Date().toISOString().split('T')[0]);
    } else if (targetIndex === currentIndex) {
      // Same column, do nothing
    } else {
      alert('You can only move loads to adjacent columns (next or previous phase)');
    }

    setDraggedLoad(null);
  };

  const handleDragEnd = () => {
    setDraggedLoad(null);
  };

  return (
    <div className="app-container">
      <div className="app-header">
        <h1>CoolTab - Load Tracking</h1>
        <div className="header-actions">
          <div className="filter-section">
            {filterDate !== getTodayISO() && (
              <button
                className="btn-clear-filter"
                onClick={() => setFilterDate(getTodayISO())}
              >
                Reset to Today
              </button>
            )}
            <label>Filter by Date:</label>
            <button
              className="btn-date-nav btn-prev-day"
              onClick={() => setFilterDate(addDays(filterDate, -1))}
              title="Previous day"
            >
              ←
            </button>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
            <button
              className="btn-date-nav btn-next-day"
              onClick={() => setFilterDate(addDays(filterDate, 1))}
              title="Next day"
            >
              →
            </button>
          </div>
          <button
            className="btn-create"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? 'Cancel' : '+ Create New Load'}
          </button>
        </div>
      </div>

      {notification.show && (
        <div className="notification-box">
          <div className="notification-content">
            <span>{notification.message}</span>
            <button 
              className="notification-close"
              onClick={() => setNotification({ show: false, message: '' })}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <div className="form-container">
          <form onSubmit={handleCreateLoad}>
            <h3>Create New Load</h3>
            
            <div className="form-section">
              <h4>Sender Information</h4>
              <input type="text" name="senderCompany" placeholder="Company" required />
              <input type="text" name="senderAddress" placeholder="Address" required />
              <input type="text" name="senderContact" placeholder="Contact" required />
            </div>

            <div className="form-section">
              <h4>Receiver Information</h4>
              <input type="text" name="receiverCompany" placeholder="Company" required />
              <input type="text" name="receiverAddress" placeholder="Address" required />
              <input type="text" name="receiverContact" placeholder="Contact" required />
            </div>

            <div className="form-section">
              <h4>Load Details</h4>
              <input type="text" name="itemDescription" placeholder="Item Description" required />
              <input type="number" name="quantity" placeholder="Quantity" required />
            </div>

            <div className="form-section">
              <h4>Order Received Date</h4>
              <input type="date" name="orderReceivedDate" defaultValue={getTodayISO()} required />
            </div>

            <div className="form-section">
              <h4>Expected Delivery Date (at final destination)</h4>
              <input type="date" name="deliveryDate" />
            </div>

            <button type="submit" className="btn-submit">Create Load</button>
          </form>
        </div>
      )}

      <div className="kanban-board">
        {STATUSES.map((status) => (
          <div 
            key={status.key} 
            className="kanban-column"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, status.key)}
          >
            <div className="column-header">
              <h3>{status.label}</h3>
              <span className="count">{getLoadsByStatus(status.key).length}</span>
            </div>
            <div className="column-content">
              {getLoadsByStatus(status.key).map((load) => (
                <div
                  key={load._id}
                  className={`load-card ${load.status === 'transport_issued' ? 'transport-order' : ''}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, load)}
                  onDragEnd={handleDragEnd}
                  onClick={() => setSelectedLoad(load)}
                >
                  <div className="card-line-1">
                    <span className="card-id">ID: {load.loadId?.substring(0, 8)}</span>
                    {load.barcode?.qrCodeData && (
                      <div className="qr-code-mini">
                        <img src={load.barcode.qrCodeData} alt="QR Code" />
                      </div>
                    )}
                  </div>
                  <div className="card-line-2">
                    {load.sender?.company || 'N/A'} - {load.receiver?.company || 'N/A'}
                  </div>
                  <div className="card-line-3">
                    {load.timeline && load.timeline.length > 0 && load.timeline[load.timeline.length - 1].userEnteredDate && (
                      new Date(load.timeline[load.timeline.length - 1].userEnteredDate).toLocaleDateString()
                    )}
                  </div>
                  <div className="card-line-4">
                    {load.statusDates?.arrived && `Delivery: ${new Date(load.statusDates.arrived).toLocaleDateString()}`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Load Details Modal */}
      {selectedLoad && (
        <div className="modal-overlay" onClick={() => setSelectedLoad(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Load Details</h2>
              <button className="btn-close" onClick={() => setSelectedLoad(null)}>×</button>
            </div>

            <div className="modal-body">
              <div className="detail-section">
                <h3>Load ID: {selectedLoad.loadId}</h3>
                <p><strong>Status:</strong> {STATUSES.find(s => s.key === selectedLoad.status)?.label}</p>
              </div>

              {selectedLoad.barcode?.qrCodeData && (
                <div className="detail-section">
                  <h3>QR Code</h3>
                  <img src={selectedLoad.barcode.qrCodeData} alt="QR Code" className="qr-code-large" />
                </div>
              )}

              <div className="detail-section">
                <h3>Sender</h3>
                <p><strong>Company:</strong> {selectedLoad.sender?.company}</p>
                <p><strong>Address:</strong> {selectedLoad.sender?.address}</p>
                <p><strong>Contact:</strong> {selectedLoad.sender?.contact}</p>
              </div>

              <div className="detail-section">
                <h3>Receiver</h3>
                <p><strong>Company:</strong> {selectedLoad.receiver?.company}</p>
                <p><strong>Address:</strong> {selectedLoad.receiver?.address}</p>
                <p><strong>Contact:</strong> {selectedLoad.receiver?.contact}</p>
              </div>

              <div className="detail-section">
                <h3>Items</h3>
                {selectedLoad.items?.map((item, idx) => (
                  <p key={idx}>{item.description} - Qty: {item.quantity}</p>
                ))}
              </div>

              {selectedLoad.statusDates && (
                <div className="detail-section">
                  <h3>Important Dates</h3>
                  {selectedLoad.statusDates.orderReceived && (
                    <p><strong>Order Received:</strong> {new Date(selectedLoad.statusDates.orderReceived).toLocaleString()}</p>
                  )}
                  {selectedLoad.statusDates.unloading && (
                    <p><strong>Unloading:</strong> {new Date(selectedLoad.statusDates.unloading).toLocaleString()}</p>
                  )}
                  {selectedLoad.statusDates.loading && (
                    <p><strong>Loading:</strong> {new Date(selectedLoad.statusDates.loading).toLocaleString()}</p>
                  )}
                  {selectedLoad.statusDates.arrived && (
                    <p><strong>Arrived:</strong> {new Date(selectedLoad.statusDates.arrived).toLocaleString()}</p>
                  )}
                </div>
              )}

              {selectedLoad.timeline && selectedLoad.timeline.length > 0 && (
                <div className="detail-section">
                  <h3>Timeline</h3>
                  <div className="timeline">
                    {selectedLoad.timeline.map((event, idx) => (
                      <div key={idx} className="timeline-event">
                        <strong>{STATUSES.find(s => s.key === event.status)?.label || event.status}</strong>
                        <p>{new Date(event.timestamp).toLocaleString()}</p>
                        {event.userEnteredDate && (
                          <p><small>User Date: {new Date(event.userEnteredDate).toLocaleDateString()}</small></p>
                        )}
                        {event.notes && <p><em>{event.notes}</em></p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="modal-actions">
                {selectedLoad.status !== 'order_received' && (
                  <button
                    className="btn-prev-status"
                    onClick={() => handleStatusClick(selectedLoad._id, selectedLoad.status, 'prev')}
                  >
                    ← Move to Previous Status
                  </button>
                )}
                {selectedLoad.status !== 'arrived' && (
                  <button
                    className="btn-next-status"
                    onClick={() => handleStatusClick(selectedLoad._id, selectedLoad.status)}
                  >
                    Move to Next Status →
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Date Input Dialog */}
      {statusChangeDialog.show && (
        <div className="modal-overlay">
          <div className="modal-content date-dialog">
            <h3>Enter Date for {STATUSES.find(s => s.key === statusChangeDialog.newStatus)?.label}</h3>
            <p>Please enter the date for this status change:</p>
            <input
              type="date"
              value={userDate}
              onChange={(e) => setUserDate(e.target.value)}
              required
            />
            <div className="dialog-actions">
              <button
                className="btn-submit"
                onClick={() => {
                  if (userDate) {
                    handleUpdateStatus(statusChangeDialog.loadId, statusChangeDialog.newStatus, userDate);
                  } else {
                    alert('Please enter a date');
                  }
                }}
              >
                Confirm
              </button>
              <button
                className="btn-cancel"
                onClick={() => {
                  setStatusChangeDialog({ show: false, loadId: null, newStatus: null });
                  setUserDate('');
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default KanbanBoard;
