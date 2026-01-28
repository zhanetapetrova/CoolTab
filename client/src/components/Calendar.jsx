import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Calendar.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function Calendar() {
  const [loads, setLoads] = useState([]);
  const [selectedLoad, setSelectedLoad] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());
  const [viewType, setViewType] = useState('year'); // 'year', 'day', 'week', '2weeks', '3weeks'
  const [referenceDate, setReferenceDate] = useState(new Date());

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

  const getWeekNumber = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const diff = d - yearStart;
    const oneWeek = 1000 * 60 * 60 * 24 * 7;
    return Math.floor(diff / oneWeek) + 1;
  };

  const getDaysInYear = (y) => {
    return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 366 : 365;
  };

  const getWeekStartDate = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  const getDateRange = () => {
    const range = [];
    let startDate;
    let numDays = 1;

    switch (viewType) {
      case 'day':
        startDate = new Date(referenceDate);
        numDays = 1;
        break;
      case 'week':
        startDate = getWeekStartDate(referenceDate);
        numDays = 7;
        break;
      case '2weeks':
        startDate = getWeekStartDate(referenceDate);
        numDays = 14;
        break;
      case '3weeks':
        startDate = getWeekStartDate(referenceDate);
        numDays = 21;
        break;
      case 'year':
      default:
        // Return null to handle year view separately
        return null;
    }

    for (let i = 0; i < numDays; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      range.push(d);
    }
    return range;
  };

  const isToday = (date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
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

  // Generate all days of the year
  const daysOfYear = [];
  const daysInYear = getDaysInYear(year);
  for (let i = 0; i < daysInYear; i++) {
    daysOfYear.push(new Date(year, 0, i + 1));
  }

  return (
    <div className="timeline-calendar-container">
      <div className="header">
        <h1>Load Tracking</h1>
        <div className="view-controls">
          <button 
            className={`view-btn ${viewType === 'day' ? 'active' : ''}`}
            onClick={() => {
              setViewType('day');
              setReferenceDate(new Date());
            }}
          >
            Day
          </button>
          <button 
            className={`view-btn ${viewType === 'week' ? 'active' : ''}`}
            onClick={() => {
              setViewType('week');
              setReferenceDate(new Date());
            }}
          >
            Week
          </button>
          <button 
            className={`view-btn ${viewType === '2weeks' ? 'active' : ''}`}
            onClick={() => {
              setViewType('2weeks');
              setReferenceDate(new Date());
            }}
          >
            2 Weeks
          </button>
          <button 
            className={`view-btn ${viewType === '3weeks' ? 'active' : ''}`}
            onClick={() => {
              setViewType('3weeks');
              setReferenceDate(new Date());
            }}
          >
            3 Weeks
          </button>
          <button 
            className={`view-btn ${viewType === 'year' ? 'active' : ''}`}
            onClick={() => {
              setViewType('year');
              setYear(new Date().getFullYear());
            }}
          >
            Year
          </button>
        </div>
        <div className="header-actions">
          {viewType !== 'year' && (
            <div className="go-to-date-control">
              <input 
                type="date" 
                value={referenceDate.toISOString().split('T')[0]}
                onChange={(e) => {
                  const selectedDate = new Date(e.target.value + 'T00:00:00');
                  setReferenceDate(selectedDate);
                }}
                className="date-input"
              />
            </div>
          )}
          <button className="btn-create" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : '+ New Load'}
          </button>
          {viewType === 'year' && (
            <div className="year-controls">
              <button onClick={() => setYear(year - 1)}>← Prev Year</button>
              <span className="year-display">{year}</span>
              <button onClick={() => setYear(year + 1)}>Next Year →</button>
            </div>
          )}
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

      {viewType === 'year' ? (
        // Year view rendering
        (() => {
          const daysOfYear = [];
          for (let i = 0; i < getDaysInYear(year); i++) {
            const d = new Date(year, 0, 1);
            d.setDate(d.getDate() + i);
            daysOfYear.push(d);
          }

          const daysByWeek = [];
          let currentWeek = [];
          let currentWeekNum = null;

          daysOfYear.forEach((date) => {
            const weekNum = getWeekNumber(date);
            if (currentWeekNum !== null && currentWeekNum !== weekNum) {
              daysByWeek.push(currentWeek);
              currentWeek = [];
            }
            currentWeek.push(date);
            currentWeekNum = weekNum;
          });
          if (currentWeek.length > 0) {
            daysByWeek.push(currentWeek);
          }

          return (
            <div className="timeline-wrapper year-view">
              <div className="timeline-label">ТОВАРИ</div>
              <div className="timeline-scroll">
                {daysByWeek.map((week, weekIdx) => (
                  <div key={weekIdx} className="timeline-week">
                    <div className="week-header">
                      <span className="week-number">CW{getWeekNumber(week[0])}</span>
                    </div>
                    <div className="week-days">
                      {week.map((date, dayIdx) => {
                        const { in: inLoads, out: outLoads } = getLoadsByDateAndType(date);
                        const today = isToday(date);

                        return (
                          <div
                            key={dayIdx}
                            className={`timeline-day ${today ? 'today' : ''}`}
                            title={date.toLocaleDateString()}
                          >
                            <div className="day-number">{date.getDate()}</div>
                            <div className="day-columns">
                              <div className="day-column in-column">
                                {inLoads.length > 0 && (
                                  <>
                                    <div className="column-dot" title={`${inLoads.length} incoming`}>●</div>
                                    {inLoads.slice(0, 1).map((load) => (
                                      <div
                                        key={load._id}
                                        className="load-dot"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedLoad(load);
                                        }}
                                        title={load.loadId.substring(0, 8)}
                                      >◆</div>
                                    ))}
                                  </>
                                )}
                              </div>
                              <div className="day-column out-column">
                                {outLoads.length > 0 && (
                                  <>
                                    <div className="column-dot" title={`${outLoads.length} outgoing`}>●</div>
                                    {outLoads.slice(0, 1).map((load) => (
                                      <div
                                        key={load._id}
                                        className="load-dot"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedLoad(load);
                                        }}
                                        title={load.loadId.substring(0, 8)}
                                      >◆</div>
                                    ))}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()
      ) : (
        // Day/Week/2weeks/3weeks view rendering
        (() => {
          const dateRange = getDateRange();
          
          return (
            <div className={`timeline-wrapper ${viewType}-view`}>
              <div className="timeline-label">ТОВАРИ</div>
              <div className="timeline-scroll detailed-view">
                <div className="detailed-days">
                  {dateRange.map((date, idx) => {
                    const { in: inLoads, out: outLoads } = getLoadsByDateAndType(date);
                    const today = isToday(date);
                    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

                    return (
                      <div
                        key={idx}
                        className={`detailed-day ${today ? 'today' : ''}`}
                        title={date.toLocaleDateString()}
                      >
                        <div className="detailed-day-header">
                          <div className="detailed-day-number">{date.getDate()}</div>
                          <div className="detailed-day-name">{dayName}</div>
                        </div>
                        <div className="detailed-columns">
                          <div className="detailed-column in-column">
                            <div className="column-label">IN</div>
                            <div className="detailed-load-list">
                              {inLoads.map((load) => (
                                <div
                                  key={load._id}
                                  className="detailed-load-card"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedLoad(load);
                                  }}
                                  title={load.loadId}
                                >
                                  <div className="load-mini-badge">{load.sender?.company?.substring(0, 3)}</div>
                                </div>
                              ))}
                              {inLoads.length === 0 && <div className="empty-state">—</div>}
                            </div>
                          </div>
                          <div className="detailed-column out-column">
                            <div className="column-label">OUT</div>
                            <div className="detailed-load-list">
                              {outLoads.map((load) => (
                                <div
                                  key={load._id}
                                  className="detailed-load-card"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedLoad(load);
                                  }}
                                  title={load.loadId}
                                >
                                  <div className="load-mini-badge">{load.receiver?.company?.substring(0, 3)}</div>
                                </div>
                              ))}
                              {outLoads.length === 0 && <div className="empty-state">—</div>}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()
      )}

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
