import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './KanbanBoard.css';

const STATUSES = [
  { key: 'order_received', label: 'Order Received' },
  { key: 'in_transit_to_warehouse', label: 'In Transit to Warehouse' },
  { key: 'unloading', label: 'Unloading' },
  { key: 'in_warehouse', label: 'In Warehouse' },
  { key: 'transport_issued', label: 'Transport Issued' },
  { key: 'loading', label: 'Loading' },
  { key: 'in_transit_to_destination', label: 'In Transit to Destination' },
  { key: 'arrived', label: 'Arrived' },
];

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Supported file types for drag-and-drop
const SUPPORTED_FILE_TYPES = ['email', 'pdf', 'gif', 'png', 'jpg', 'jpeg', 'txt', 'eml', 'msg', 'doc', 'docx', 'xlsx', 'xls'];

function KanbanBoard() {
  const [loads, setLoads] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedLoad, setSelectedLoad] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [statusChangeDialog, setStatusChangeDialog] = useState({ show: false, loadId: null, newStatus: null });
  const [actualDate, setActualDate] = useState('');

  useEffect(() => {
    fetchLoads(selectedDate);
  }, [selectedDate]);

  const fetchLoads = async (date) => {
    try {
      let url = `${API_URL}/loads`;
      if (date) {
        url = `${API_URL}/loads/date/${date}`;
      }
      const response = await axios.get(url);
      setLoads(response.data);
    } catch (error) {
      console.error('Error fetching loads:', error);
    }
  };

  const getTodayISO = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Check if a load is overdue (not arrived by expected delivery date)
  const isLoadOverdue = (load) => {
    if (load.status === 'arrived') return false;
    if (!load.expectedDeliveryDate) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expectedDate = new Date(load.expectedDeliveryDate);
    expectedDate.setHours(0, 0, 0, 0);
    
    return today > expectedDate;
  };

  // Count overdue loads
  const getOverdueCount = () => {
    return loads.filter(load => isLoadOverdue(load)).length;
  };

  // Check if any milestone is delayed (actual date past planned date)
  const hasDelayedMilestone = (load) => {
    if (!load.plannedDates || !load.actualDates) return false;
    
    const checkDelay = (planned, actual) => {
      if (!planned || !actual) return false;
      return new Date(actual) > new Date(planned);
    };
    
    return checkDelay(load.plannedDates.warehouseArrival, load.actualDates.warehouseArrival) ||
           checkDelay(load.plannedDates.warehouseDispatch, load.actualDates.warehouseDispatch) ||
           checkDelay(load.plannedDates.clientDelivery, load.actualDates.clientDelivery);
  };

  // Check if a specific milestone is approaching but not completed
  const isApproachingDeadline = (load, milestone) => {
    if (!load.plannedDates) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let plannedDate;
    let isCompleted = false;
    
    switch(milestone) {
      case 'warehouseArrival':
        plannedDate = load.plannedDates.warehouseArrival;
        isCompleted = load.actualDates?.warehouseArrival || load.status === 'in_warehouse' || 
                      ['transport_issued', 'loading', 'in_transit_to_destination', 'arrived'].includes(load.status);
        break;
      case 'warehouseDispatch':
        plannedDate = load.plannedDates.warehouseDispatch;
        isCompleted = load.actualDates?.warehouseDispatch || 
                      ['loading', 'in_transit_to_destination', 'arrived'].includes(load.status);
        break;
      case 'clientDelivery':
        plannedDate = load.plannedDates.clientDelivery;
        isCompleted = load.actualDates?.clientDelivery || load.status === 'arrived';
        break;
      default:
        return false;
    }
    
    if (!plannedDate || isCompleted) return false;
    
    const planned = new Date(plannedDate);
    planned.setHours(0, 0, 0, 0);
    
    // Approaching if past the planned date
    return today > planned;
  };

  const getLoadsByStatus = (status) => {
    return loads.filter((load) => load.status === status);
  };

  // For day view: IN = arriving in warehouse on selectedDate; OUT = dispatch/loaded on selectedDate
  const getDayInOut = (date) => {
    if (!date) return { in: [], out: [] };
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const inList = [];
    const outList = [];

    loads.forEach((load) => {
      // If load has arrived, only show it on or before its arrival date
      if (load.status === 'arrived') {
        const arrivedEvent = load.timeline?.find((event) => event.status === 'arrived');
        const arrivalDate = arrivedEvent 
          ? new Date(arrivedEvent.timestamp)
          : (load.expectedDeliveryDate ? new Date(load.expectedDeliveryDate) : null);
        
        if (arrivalDate) {
          arrivalDate.setHours(0, 0, 0, 0);
          // Only include if the selected date is on or before the arrival date
          if (start > arrivalDate) {
            return; // Skip this load on dates after arrival
          }
        }
      }

      const wDate = load.warehouse?.incomingDate ? new Date(load.warehouse.incomingDate) : null;
      const tDate = load.transport?.dispatchDate ? new Date(load.transport.dispatchDate) : null;
      const topIn = load.incomingDate ? new Date(load.incomingDate) : null;
      const expected = load.expectedDeliveryDate ? new Date(load.expectedDeliveryDate) : null;

      const inMatch = (d) => d && d >= start && d < end;

      if (inMatch(wDate) || inMatch(topIn) || inMatch(expected)) {
        inList.push(load);
      }

      if (inMatch(tDate) || (load.status === 'loading' && inMatch(load.createdAt))) {
        outList.push(load);
      }
    });

    return { in: inList, out: outList };
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
          quantity: parseInt(formData.get('quantity')),
        },
      ],
      incomingDate: formData.get('incomingDate') || undefined,
      expectedDeliveryDate: formData.get('expectedDeliveryDate'),
      warehouse: {
        incomingDate: formData.get('warehouseIncomingDate') || undefined,
      },
      transport: {
        dispatchDate: formData.get('transportDispatchDate') || undefined,
      },
    };

    try {
      await axios.post(`${API_URL}/loads`, newLoad);
      fetchLoads();
      setShowForm(false);
      
      // If warehouse incoming date is provided, switch to day view for that date
      const warehouseIncomingDate = formData.get('warehouseIncomingDate');
      if (warehouseIncomingDate) {
        setSelectedDate(warehouseIncomingDate);
      }
      
      e.target.reset();
    } catch (error) {
      console.error('Error creating load:', error);
    }
  };

  const handleUpdateStatus = async (loadId, newStatus, actualDate = null) => {
    try {
      await axios.patch(`${API_URL}/loads/${loadId}/status`, {
        status: newStatus,
        notes: `Moved to ${newStatus}`,
        actualDate: actualDate || new Date().toISOString(),
      });
      fetchLoads();
      setSelectedLoad(null);
      setStatusChangeDialog({ show: false, loadId: null, newStatus: null });
      setActualDate('');
    } catch (error) {
      console.error('Error updating load:', error);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = (error) => reject(error);
    });
  };

  const getFileType = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    return ext;
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      setUploading(true);
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileType = getFileType(file.name);

        if (!SUPPORTED_FILE_TYPES.includes(fileType)) {
          alert(`File type .${fileType} not supported. Supported: email, PDF, GIF, PNG, JPG, TXT`);
          continue;
        }

        try {
          const fileBase64 = await fileToBase64(file);
          
          const response = await axios.post(`${API_URL}/loads/upload/file`, {
            fileName: file.name,
            fileBuffer: fileBase64,
            senderCompany: `File: ${file.name}`,
            receiverCompany: 'Pending',
          });

          console.log('Load created from file:', response.data);
        } catch (error) {
          console.error('Error uploading file:', error);
          alert(`Error creating order from ${file.name}`);
        }
      }

      setUploading(false);
      fetchLoads();
    }
  };

  return (
    <div className="kanban-container">
      <div className="header">
        <h1>Load Tracking System</h1>
        <div className="header-controls">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            aria-label="Select date"
          />
          <button
            className="btn-create"
            onClick={() => {
              setShowForm(!showForm);
            }}
          >
            {showForm ? 'Cancel' : '+ New Load'}
          </button>
          <button
            className="btn-view-day"
            onClick={() => setSelectedDate(getTodayISO())}
          >
            Today
          </button>
          <button
            className="btn-clear-day"
            onClick={() => setSelectedDate('')}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Overdue Alert */}
      {getOverdueCount() > 0 && (
        <div className="alert-banner overdue-alert">
          <strong>⚠️ Alert:</strong> {getOverdueCount()} load{getOverdueCount() > 1 ? 's' : ''} past expected delivery date and not yet arrived!
        </div>
      )}

      {/* Drag and Drop Zone */}
      <div
        className={`drag-drop-zone ${dragActive ? 'active' : ''} ${uploading ? 'uploading' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="drag-drop-content">
          <svg className="drag-drop-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
          </svg>
          <h3>Drag & Drop Files Here</h3>
          <p>Email • PDF • Word • Excel • Images (PNG, GIF, JPG) • Text</p>
          {uploading && <p className="uploading-text">Creating orders...</p>}
        </div>
      </div>

      {showForm && (
        <div className="form-container">
          <form onSubmit={handleCreateLoad}>
            <div className="form-section">
              <h3>Sender Information</h3>
              <input type="text" name="senderCompany" placeholder="Company" required />
              <input type="text" name="senderAddress" placeholder="Address" required />
              <input type="text" name="senderContact" placeholder="Contact" required />
            </div>

            <div className="form-section">
              <h3>Receiver Information</h3>
              <input type="text" name="receiverCompany" placeholder="Company" required />
              <input type="text" name="receiverAddress" placeholder="Address" required />
              <input type="text" name="receiverContact" placeholder="Contact" required />
            </div>

            <div className="form-section">
              <h3>Load Details</h3>
              <input type="text" name="itemDescription" placeholder="Item Description" required />
              <input type="number" name="quantity" placeholder="Quantity" required />
            </div>

            <div className="form-section">
              <h3>Dates</h3>
              <label>Incoming Date (to warehouse)</label>
              <input type="date" name="warehouseIncomingDate" />
              <label>Date of Loading</label>
              <input type="date" name="transportDispatchDate" />
              <label>Expected Arrival at Client</label>
              <input type="date" name="expectedDeliveryDate" required />
            </div>

            <button type="submit" className="btn-submit">Create Load</button>
          </form>
        </div>
      )}

      <div className="kanban-board">
        {selectedDate ? (
          // Day view: two columns IN / OUT
          (() => {
            const { in: inList, out: outList } = getDayInOut(selectedDate);
            return (
              <>
                <div className="kanban-column day-column">
                  <div className="column-header">
                    <h3>IN</h3>
                    <span className="count">{inList.length}</span>
                  </div>
                  <div className="column-content">
                    {inList.map((load) => (
                      <div key={load._id} className={`load-card ${isLoadOverdue(load) ? 'overdue' : ''} ${hasDelayedMilestone(load) ? 'milestone-delayed' : ''}`} onClick={() => setSelectedLoad(load)}>
                        {isLoadOverdue(load) && <div className="overdue-badge">OVERDUE</div>}
                        {hasDelayedMilestone(load) && !isLoadOverdue(load) && <div className="delay-badge">DELAYED</div>}
                        <div className="load-card-header">
                          <strong>ID: {load.loadId.substring(0, 8)}</strong>
                          {load.barcode?.qrCodeData && (
                            <div className="qr-code-mini">
                              <img src={load.barcode.qrCodeData} alt="QR Code" title="QR Code" />
                            </div>
                          )}
                        </div>
                        <div className="load-card-body">
                          <p><strong>From:</strong> {load.sender?.company || 'N/A'}</p>
                          <p><strong>To:</strong> {load.receiver?.company || 'N/A'}</p>
                          {load.warehouse?.palletLocation && <p><strong>Location:</strong> {load.warehouse.palletLocation}</p>}
                          {/* Show milestone warnings */}
                          {isApproachingDeadline(load, 'warehouseArrival') && (
                            <p className="milestone-warning"><small>⚠️ Warehouse arrival overdue</small></p>
                          )}
                          {isApproachingDeadline(load, 'clientDelivery') && (
                            <p className="milestone-warning"><small>⚠️ Delivery overdue</small></p>
                          )}
                        </div>
                        <div className="load-card-footer">
                          <small>{(load.warehouse?.incomingDate || load.incomingDate || load.expectedDeliveryDate) ? new Date(load.warehouse?.incomingDate || load.incomingDate || load.expectedDeliveryDate).toLocaleString() : new Date(load.createdAt).toLocaleDateString()}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="kanban-column day-column">
                  <div className="column-header">
                    <h3>OUT</h3>
                    <span className="count">{outList.length}</span>
                  </div>
                  <div className="column-content">
                    {outList.map((load) => (
                      <div key={load._id} className={`load-card ${isLoadOverdue(load) ? 'overdue' : ''} ${hasDelayedMilestone(load) ? 'milestone-delayed' : ''}`} onClick={() => setSelectedLoad(load)}>
                        {isLoadOverdue(load) && <div className="overdue-badge">OVERDUE</div>}
                        {hasDelayedMilestone(load) && !isLoadOverdue(load) && <div className="delay-badge">DELAYED</div>}
                        <div className="load-card-header">
                          <strong>ID: {load.loadId.substring(0, 8)}</strong>
                          {load.barcode?.qrCodeData && (
                            <div className="qr-code-mini">
                              <img src={load.barcode.qrCodeData} alt="QR Code" title="QR Code" />
                            </div>
                          )}
                        </div>
                        <div className="load-card-body">
                          <p><strong>From:</strong> {load.sender?.company || 'N/A'}</p>
                          <p><strong>To:</strong> {load.receiver?.company || 'N/A'}</p>
                          {load.transport?.truckId && <p><strong>Truck:</strong> {load.transport.truckId}</p>}
                          {/* Show milestone warnings */}
                          {isApproachingDeadline(load, 'warehouseDispatch') && (
                            <p className="milestone-warning"><small>⚠️ Dispatch overdue</small></p>
                          )}
                          {isApproachingDeadline(load, 'clientDelivery') && (
                            <p className="milestone-warning"><small>⚠️ Delivery overdue</small></p>
                          )}
                        </div>
                        <div className="load-card-footer">
                          <small>{(load.transport?.dispatchDate) ? new Date(load.transport.dispatchDate).toLocaleString() : new Date(load.createdAt).toLocaleDateString()}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            );
          })()
        ) : (
          // Full 8-column view
          STATUSES.map((status) => (
            <div key={status.key} className="kanban-column">
              <div className="column-header">
                <h3>{status.label}</h3>
                <span className="count">{getLoadsByStatus(status.key).length}</span>
              </div>
              <div className="column-content">
                {getLoadsByStatus(status.key).map((load) => (
                  <div
                    key={load._id}
                    className={`load-card ${isLoadOverdue(load) ? 'overdue' : ''} ${hasDelayedMilestone(load) ? 'milestone-delayed' : ''}`}
                    onClick={() => setSelectedLoad(load)}
                  >
                    {isLoadOverdue(load) && <div className="overdue-badge">OVERDUE</div>}
                    {hasDelayedMilestone(load) && !isLoadOverdue(load) && <div className="delay-badge">DELAYED</div>}
                    <div className="load-card-header">
                      <strong>ID: {load.loadId.substring(0, 8)}</strong>
                      {load.barcode?.qrCodeData && (
                        <div className="qr-code-mini">
                          <img src={load.barcode.qrCodeData} alt="QR Code" title="QR Code" />
                        </div>
                      )}
                    </div>
                    <div className="load-card-body">
                      <p>
                        <strong>From:</strong> {load.sender?.company || 'N/A'}
                      </p>
                      <p>
                        <strong>To:</strong> {load.receiver?.company || 'N/A'}
                      </p>
                      {load.warehouse?.palletLocation && (
                        <p>
                          <strong>Location:</strong> {load.warehouse.palletLocation}
                        </p>
                      )}
                      {/* Show specific milestone warnings based on status */}
                      {status.key === 'in_transit_to_warehouse' && isApproachingDeadline(load, 'warehouseArrival') && (
                        <p className="milestone-warning"><small>⚠️ Warehouse arrival overdue</small></p>
                      )}
                      {['in_warehouse', 'transport_issued'].includes(status.key) && isApproachingDeadline(load, 'warehouseDispatch') && (
                        <p className="milestone-warning"><small>⚠️ Dispatch overdue</small></p>
                      )}
                      {['loading', 'in_transit_to_destination'].includes(status.key) && isApproachingDeadline(load, 'clientDelivery') && (
                        <p className="milestone-warning"><small>⚠️ Delivery overdue</small></p>
                      )}
                    </div>
                    <div className="load-card-footer">
                      <small>{new Date(load.createdAt).toLocaleDateString()}</small>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {selectedLoad && (
        <div className="modal-overlay" onClick={() => setSelectedLoad(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Load Details</h2>
              <button className="btn-close" onClick={() => setSelectedLoad(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="detail-section">
                <h3>Basic Information</h3>
                <p><strong>Load ID:</strong> {selectedLoad.loadId}</p>
                <p><strong>Status:</strong> {selectedLoad.status}</p>
                <p>
                  <strong>Created:</strong>{' '}
                  {new Date(selectedLoad.createdAt).toLocaleString()}
                </p>
              </div>

              {selectedLoad.barcode?.qrCodeData && (
                <div className="detail-section barcode-section">
                  <h3>QR Code</h3>
                  <div className="barcode-container">
                    <img 
                      src={selectedLoad.barcode.qrCodeData} 
                      alt="QR Code"
                      className="barcode-image"
                    />
                    <p className="barcode-id">{selectedLoad.barcode.barcodeId}</p>
                  </div>
                </div>
              )}

              <div className="detail-section">
                <h3>Sender</h3>
                <p><strong>Company:</strong> {selectedLoad.sender?.company}</p>
                <p><strong>Address:</strong> {selectedLoad.sender?.address}</p>
              </div>

              <div className="detail-section">
                <h3>Receiver</h3>
                <p><strong>Company:</strong> {selectedLoad.receiver?.company}</p>
                <p><strong>Address:</strong> {selectedLoad.receiver?.address}</p>
              </div>

              {selectedLoad.warehouse?.palletLocation && (
                <div className="detail-section">
                  <h3>Warehouse</h3>
                  <p>
                    <strong>Pallet Location:</strong>{' '}
                    {selectedLoad.warehouse.palletLocation}
                  </p>
                </div>
              )}

              {/* Planned vs Actual Dates Comparison */}
              {(selectedLoad.plannedDates || selectedLoad.actualDates) && (
                <div className="detail-section">
                  <h3>Planned vs Actual Dates</h3>
                  <div className="dates-comparison">
                    {/* Warehouse Arrival */}
                    {selectedLoad.plannedDates?.warehouseArrival && (
                      <div className="date-row">
                        <strong>Warehouse Arrival:</strong>
                        <div className="date-comparison">
                          <span className="planned-date">
                            Planned: {new Date(selectedLoad.plannedDates.warehouseArrival).toLocaleDateString()}
                          </span>
                          {selectedLoad.actualDates?.warehouseArrival ? (
                            <span className={`actual-date ${new Date(selectedLoad.actualDates.warehouseArrival) > new Date(selectedLoad.plannedDates.warehouseArrival) ? 'delayed' : 'on-time'}`}>
                              Actual: {new Date(selectedLoad.actualDates.warehouseArrival).toLocaleDateString()}
                              {new Date(selectedLoad.actualDates.warehouseArrival) > new Date(selectedLoad.plannedDates.warehouseArrival) && ' ⚠️ DELAYED'}
                            </span>
                          ) : (
                            <span className="actual-date pending">Actual: Pending</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Warehouse Dispatch */}
                    {selectedLoad.plannedDates?.warehouseDispatch && (
                      <div className="date-row">
                        <strong>Warehouse Dispatch:</strong>
                        <div className="date-comparison">
                          <span className="planned-date">
                            Planned: {new Date(selectedLoad.plannedDates.warehouseDispatch).toLocaleDateString()}
                          </span>
                          {selectedLoad.actualDates?.warehouseDispatch ? (
                            <span className={`actual-date ${new Date(selectedLoad.actualDates.warehouseDispatch) > new Date(selectedLoad.plannedDates.warehouseDispatch) ? 'delayed' : 'on-time'}`}>
                              Actual: {new Date(selectedLoad.actualDates.warehouseDispatch).toLocaleDateString()}
                              {new Date(selectedLoad.actualDates.warehouseDispatch) > new Date(selectedLoad.plannedDates.warehouseDispatch) && ' ⚠️ DELAYED'}
                            </span>
                          ) : (
                            <span className="actual-date pending">Actual: Pending</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Client Delivery */}
                    {selectedLoad.plannedDates?.clientDelivery && (
                      <div className="date-row">
                        <strong>Client Delivery:</strong>
                        <div className="date-comparison">
                          <span className="planned-date">
                            Planned: {new Date(selectedLoad.plannedDates.clientDelivery).toLocaleDateString()}
                          </span>
                          {selectedLoad.actualDates?.clientDelivery ? (
                            <span className={`actual-date ${new Date(selectedLoad.actualDates.clientDelivery) > new Date(selectedLoad.plannedDates.clientDelivery) ? 'delayed' : 'on-time'}`}>
                              Actual: {new Date(selectedLoad.actualDates.clientDelivery).toLocaleDateString()}
                              {new Date(selectedLoad.actualDates.clientDelivery) > new Date(selectedLoad.plannedDates.clientDelivery) && ' ⚠️ DELAYED'}
                            </span>
                          ) : (
                            <span className="actual-date pending">Actual: Pending</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="detail-section">
                <h3>Timeline</h3>
                <div className="timeline">
                  {selectedLoad.timeline?.map((event, idx) => (
                    <div key={idx} className="timeline-event">
                      <strong>{event.status}</strong>
                      <p>{new Date(event.timestamp).toLocaleString()}</p>
                      {event.notes && <p>{event.notes}</p>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="modal-actions">
                {selectedLoad.status !== 'arrived' && (
                  <>
                    <button
                      className="btn-next"
                      onClick={() => {
                        const currentIdx = STATUSES.findIndex(
                          (s) => s.key === selectedLoad.status
                        );
                        if (currentIdx < STATUSES.length - 1) {
                          setStatusChangeDialog({
                            show: true,
                            loadId: selectedLoad._id,
                            newStatus: STATUSES[currentIdx + 1].key
                          });
                          // Set default to today
                          const today = new Date();
                          const yyyy = today.getFullYear();
                          const mm = String(today.getMonth() + 1).padStart(2, '0');
                          const dd = String(today.getDate()).padStart(2, '0');
                          setActualDate(`${yyyy}-${mm}-${dd}`);
                        }
                      }}
                    >
                      Move to Next Phase
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Change Date Dialog */}
      {statusChangeDialog.show && (
        <div className="modal-overlay" onClick={() => setStatusChangeDialog({ show: false, loadId: null, newStatus: null })}>
          <div className="modal status-change-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Confirm Status Change</h2>
              <button className="btn-close" onClick={() => setStatusChangeDialog({ show: false, loadId: null, newStatus: null })}>×</button>
            </div>
            <div className="modal-body">
              <p>Enter the actual date for this status change:</p>
              <div className="form-section">
                <label><strong>Status:</strong> {statusChangeDialog.newStatus?.replace(/_/g, ' ').toUpperCase()}</label>
                <label><strong>Actual Date:</strong></label>
                <input
                  type="date"
                  value={actualDate}
                  onChange={(e) => setActualDate(e.target.value)}
                  required
                />
              </div>
              <div className="modal-actions">
                <button
                  className="btn-cancel"
                  onClick={() => setStatusChangeDialog({ show: false, loadId: null, newStatus: null })}
                >
                  Cancel
                </button>
                <button
                  className="btn-confirm"
                  onClick={() => {
                    if (actualDate) {
                      handleUpdateStatus(statusChangeDialog.loadId, statusChangeDialog.newStatus, actualDate);
                    } else {
                      alert('Please select a date');
                    }
                  }}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default KanbanBoard;
