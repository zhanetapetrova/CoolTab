import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Calendar.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function Calendar() {
  const [loads, setLoads] = useState([]);
  const [selectedLoad, setSelectedLoad] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());
  const [viewType, setViewType] = useState('week'); // 'year', 'day', 'week', '2weeks', '3weeks'
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
    const selectedDay = normalizeDate(date);
    if (!selectedDay) return { in: [], out: [] };

    const inList = [];
    const outList = [];

    loads.forEach((load) => {
      let showInIN = false;
      let showInOUT = false;

      // Weekly view ONLY shows unloading (IN) and loading (OUT) on specific days
      // Other statuses are NOT displayed in weekly view

      // Rule: Unloading - ONLY on unloading date (one day only) - IN column
      if (load.status === 'unloading') {
        const unloadingDate = getStatusDate(load, 'unloading');
        if (isDateOnDay(unloadingDate, selectedDay)) {
          showInIN = true;
        }
      }

      // Rule: Loading - ONLY on 1 day (loading date only) - OUT column
      if (load.status === 'loading') {
        const loadingDate = getStatusDate(load, 'loading') || 
                           load.transport?.dispatchDate ||
                           load.plannedDates?.warehouseDispatch;
        if (isDateOnDay(loadingDate, selectedDay)) {
          showInOUT = true;
        }
      }

      if (showInIN) inList.push(load);
      if (showInOUT) outList.push(load);
    });

    return { in: inList, out: outList };
  };

  // Helper: Get date from timeline for a specific status
  const getStatusDate = (load, status) => {
    const event = load.timeline?.find((e) => e.status === status);
    return event ? new Date(event.timestamp) : null;
  };

  // Helper: Normalize date to midnight
  const normalizeDate = (date) => {
    if (!date) return null;
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  // Helper: Check if date is on selected day
  const isDateOnDay = (date, selectedDay) => {
    if (!date || !selectedDay) return false;
    const d = normalizeDate(date);
    return d ? d.getTime() === selectedDay.getTime() : false;
  };

  // Helper: Check if selected day is between two dates (inclusive)
  const isDateBetween = (selectedDay, startDate, endDate) => {
    if (!startDate || !selectedDay) return false;
    const start = normalizeDate(startDate);
    if (!start) return false;

    if (!endDate) {
      return selectedDay.getTime() >= start.getTime();
    }

    const end = normalizeDate(endDate);
    if (!end) return selectedDay.getTime() >= start.getTime();

    return selectedDay.getTime() >= start.getTime() && selectedDay.getTime() <= end.getTime();
  };

  // Helper: Should a load display in a status column for the selected day
  const shouldDisplayInStatus = (load, statusKey, selectedDay) => {
    if (!load || load.status !== statusKey) return false;

    switch (statusKey) {
      case 'order_received': {
        const orderDate = load.createdAt ? normalizeDate(load.createdAt) : null;
        
        // Only show on the actual creation date, not on planned arrival
        return orderDate ? isDateOnDay(orderDate, selectedDay) : false;
      }
      case 'in_transit_to_warehouse': {
        const transitStart = getStatusDate(load, 'in_transit_to_warehouse') || load.createdAt;
        const unloadingDate = getStatusDate(load, 'unloading');
        return isDateBetween(selectedDay, transitStart, unloadingDate);
      }
      case 'unloading': {
        const unloadingDate = getStatusDate(load, 'unloading');
        return isDateOnDay(unloadingDate, selectedDay);
      }
      case 'in_warehouse': {
        const warehouseStart = getStatusDate(load, 'in_warehouse') ||
          getStatusDate(load, 'unloading') ||
          load.actualDates?.warehouseArrival;
        const transportIssuedDate = getStatusDate(load, 'transport_issued');
        return isDateBetween(selectedDay, warehouseStart, transportIssuedDate);
      }
      case 'transport_issued': {
        const issuedDate = getStatusDate(load, 'transport_issued');
        const loadingDate = getStatusDate(load, 'loading');
        return isDateBetween(selectedDay, issuedDate, loadingDate);
      }
      case 'loading': {
        const loadingDate = getStatusDate(load, 'loading') ||
          load.transport?.dispatchDate ||
          load.plannedDates?.warehouseDispatch;
        return isDateOnDay(loadingDate, selectedDay);
      }
      case 'in_transit_to_destination': {
        const transitStart = getStatusDate(load, 'in_transit_to_destination') ||
          getStatusDate(load, 'loading') ||
          load.actualDates?.warehouseDispatch;
        const arrivedDate = getStatusDate(load, 'arrived') || load.actualDates?.clientDelivery;

        if (arrivedDate) {
          const arrivalDay = normalizeDate(arrivedDate);
          if (arrivalDay && selectedDay.getTime() >= arrivalDay.getTime()) {
            return false;
          }
        }
        return isDateBetween(selectedDay, transitStart, arrivedDate);
      }
      case 'arrived': {
        const arrivedDate = getStatusDate(load, 'arrived') || load.actualDates?.clientDelivery;
        return arrivedDate ? isDateOnDay(arrivedDate, selectedDay) : false;
      }
      default:
        return false;
    }
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

  const getNavigationDays = () => {
    switch (viewType) {
      case 'day':
        return 1;
      case 'week':
        return 7;
      case '2weeks':
        return 7;
      case '3weeks':
        return 7;
      default:
        return 1;
    }
  };

  const handlePreviousDate = () => {
    const days = getNavigationDays();
    const newDate = new Date(referenceDate);
    newDate.setDate(newDate.getDate() - days);
    setReferenceDate(newDate);
  };

  const handleNextDate = () => {
    const days = getNavigationDays();
    const newDate = new Date(referenceDate);
    newDate.setDate(newDate.getDate() + days);
    setReferenceDate(newDate);
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
            <div className="date-navigation">
              <button 
                className="nav-btn prev-btn"
                onClick={handlePreviousDate}
                title="Previous"
              >
                ← Prev
              </button>
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
              <button 
                className="nav-btn next-btn"
                onClick={handleNextDate}
                title="Next"
              >
                Next →
              </button>
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
          
          // For day view, show status timeline; for other views, show IN/OUT columns
          if (viewType === 'day') {
            return (
              <div className={`timeline-wrapper ${viewType}-view`}>
                <div className="timeline-label">STATUS TIMELINE</div>
                <div className="timeline-scroll status-view">
                  <div className="status-header">
                    <span>Date: {referenceDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                  </div>
                  <div className="status-columns-container">
                    {STATUSES.map((statusObj, idx) => {
                      const selectedDay = normalizeDate(referenceDate);
                      const loadsInStatus = loads.filter(load => shouldDisplayInStatus(load, statusObj.key, selectedDay));
                      return (
                        <div key={idx} className="status-column">
                          <div className="status-column-header">
                            {statusObj.label}
                          </div>
                          <div className="status-load-list">
                            {loadsInStatus.map((load) => (
                              <div
                                key={load._id}
                                className="status-load-card"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedLoad(load);
                                }}
                              >
                                {load.barcode?.qrCodeData && (
                                  <img
                                    src={load.barcode.qrCodeData}
                                    alt="QR"
                                    className="status-qr-code"
                                  />
                                )}
                                <div className="status-load-info">
                                  <div className="status-load-company">
                                    <strong>{load.sender?.company?.substring(0, 20)}</strong>
                                  </div>
                                  <div className="status-load-dates">
                                    {load.warehouse?.incomingDate && (
                                      <div>In: {new Date(load.warehouse.incomingDate).toLocaleDateString()}</div>
                                    )}
                                    {load.expectedDeliveryDate && (
                                      <div>Del: {new Date(load.expectedDeliveryDate).toLocaleDateString()}</div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                            {loadsInStatus.length === 0 && (
                              <div className="empty-status-column">—</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          }

          // Default: IN/OUT columns for week/2weeks/3weeks
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
              {selectedLoad.barcode?.qrCodeData && (
                <div className="detail-section barcode-section barcode-featured">
                  <h3>QR Code / Barcode</h3>
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
                <h3>Basic Information</h3>
                <p><strong>Load ID:</strong> {selectedLoad.loadId}</p>
                <p><strong>Status:</strong> {selectedLoad.status}</p>
                <p>
                  <strong>Created:</strong>{' '}
                  {new Date(selectedLoad.createdAt).toLocaleString()}
                </p>
              </div>

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
