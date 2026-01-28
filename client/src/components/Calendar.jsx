import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Calendar.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function Calendar() {
  const [loads, setLoads] = useState([]);
  const [selectedLoad, setSelectedLoad] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

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

  const getLoadsByDateAndType = (date) => {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const inList = [];
    const outList = [];

    loads.forEach((load) => {
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

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDate = (day) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const isToday = (day) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
    );
  };

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const days = [];

  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

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
      e.target.reset();
    } catch (error) {
      console.error('Error creating load:', error);
    }
  };

  const handleUpdateStatus = async (loadId, newStatus) => {
    try {
      await axios.patch(`${API_URL}/loads/${loadId}/status`, {
        status: newStatus,
        notes: `Moved to ${newStatus}`,
      });
      fetchLoads();
      setSelectedLoad(null);
    } catch (error) {
      console.error('Error updating load:', error);
    }
  };

  return (
    <div className="calendar-container">
      <div className="header">
        <h1>Load Tracking Calendar</h1>
        <button className="btn-create" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ New Load'}
        </button>
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

      <div className="calendar-header">
        <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}>
          ← Prev
        </button>
        <h2>{currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
        <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}>
          Next →
        </button>
      </div>

      <div className="calendar-grid">
        {days.map((day, idx) => {
          if (!day) {
            return <div key={`empty-${idx}`} className="calendar-day empty"></div>;
          }

          const dateStr = formatDate(day);
          const { in: inLoads, out: outLoads } = getLoadsByDateAndType(new Date(dateStr));
          const dayIsToday = isToday(day);

          return (
            <div
              key={day}
              className={`calendar-day ${dayIsToday ? 'today' : ''} ${selectedDate === dateStr ? 'selected' : ''}`}
              onClick={() => setSelectedDate(dateStr)}
            >
              <div className="day-header">
                <span className="day-number">{day}</span>
              </div>

              <div className="day-content">
                <div className="day-column in-column">
                  <div className="column-label">IN</div>
                  <div className="load-list">
                    {inLoads.slice(0, 2).map((load) => (
                      <div
                        key={load._id}
                        className="load-mini-card"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLoad(load);
                        }}
                      >
                        <small>{load.loadId.substring(0, 6)}</small>
                      </div>
                    ))}
                    {inLoads.length > 2 && (
                      <small className="load-count">+{inLoads.length - 2} more</small>
                    )}
                  </div>
                  <span className="count">{inLoads.length}</span>
                </div>

                <div className="day-column out-column">
                  <div className="column-label">OUT</div>
                  <div className="load-list">
                    {outLoads.slice(0, 2).map((load) => (
                      <div
                        key={load._id}
                        className="load-mini-card"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLoad(load);
                        }}
                      >
                        <small>{load.loadId.substring(0, 6)}</small>
                      </div>
                    ))}
                    {outLoads.length > 2 && (
                      <small className="load-count">+{outLoads.length - 2} more</small>
                    )}
                  </div>
                  <span className="count">{outLoads.length}</span>
                </div>
              </div>
            </div>
          );
        })}
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
                  <button
                    className="btn-next"
                    onClick={() => {
                      const currentIdx = STATUSES.findIndex(
                        (s) => s.key === selectedLoad.status
                      );
                      if (currentIdx < STATUSES.length - 1) {
                        handleUpdateStatus(
                          selectedLoad._id,
                          STATUSES[currentIdx + 1].key
                        );
                      }
                    }}
                  >
                    Move to Next Phase
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Calendar;
