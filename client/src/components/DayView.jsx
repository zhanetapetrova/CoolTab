import React, { useState } from 'react';
import './DayView.css';

const DayView = ({ date, loads, onClose, onLoadClick, onStatusChange }) => {
  const [expandedLoadId, setExpandedLoadId] = useState(null);

  const STATUSES = [
    { key: 'order_received', label: 'Order received', position: 0 },
    { key: 'in_transit_to_warehouse', label: 'In transit to arrive', position: 1 },
    { key: 'unloading', label: 'Unloading', position: 2 },
    { key: 'in_warehouse', label: 'In warehouse', position: 3, highlight: true, color: '#4CAF50' },
    { key: 'transport_issued', label: 'Transit to order issued', position: 4 },
    { key: 'loading', label: 'Loading', position: 5, highlight: true, color: '#FFC107' },
    { key: 'in_transit_to_destination', label: 'Transit to final destination', position: 6 },
    { key: 'arrived', label: 'Arrived', position: 7 },
  ];

  const getStatusIndex = (status) => {
    return STATUSES.findIndex(s => s.key === status);
  };

  const getStatusInfo = (statusKey) => {
    return STATUSES.find(s => s.key === statusKey);
  };

  const getLoadProgress = (load) => {
    const startIndex = 0;
    const currentIndex = getStatusIndex(load.status);
    const width = ((currentIndex + 1) / STATUSES.length) * 100;
    return {
      width: Math.max(width, 5),
      status: load.status,
      currentLabel: getStatusInfo(load.status)?.label || load.status,
    };
  };

  const getProgressColor = (status) => {
    const info = getStatusInfo(status);
    if (info?.highlight) {
      return info.color;
    }
    return '#2196F3';
  };

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusTimeline = (load) => {
    const stages = [];
    const timeline = load.timeline || [];

    STATUSES.forEach((status) => {
      const entry = timeline.find(t => t.status === status.key);
      stages.push({
        status: status.key,
        label: status.label,
        date: entry?.timestamp ? new Date(entry.timestamp) : null,
        hasEntry: !!entry,
      });
    });

    return stages;
  };

  const getLoadsByType = () => {
    const result = {
      incoming: [],
      outgoing: [],
      other: [],
    };

    loads.forEach((load) => {
      const wDate = load.warehouse?.incomingDate ? new Date(load.warehouse.incomingDate) : null;
      const tDate = load.transport?.dispatchDate ? new Date(load.transport.dispatchDate) : null;
      const dateStr = date.split('T')[0];
      const dateObj = new Date(dateStr);
      dateObj.setHours(0, 0, 0, 0);

      let categorized = false;

      // Check if this is incoming for the selected date
      if (wDate) {
        const wDateOnly = new Date(wDate);
        wDateOnly.setHours(0, 0, 0, 0);
        if (wDateOnly.getTime() === dateObj.getTime()) {
          result.incoming.push(load);
          categorized = true;
        }
      }

      // Check if this is outgoing for the selected date
      if (tDate && !categorized) {
        const tDateOnly = new Date(tDate);
        tDateOnly.setHours(0, 0, 0, 0);
        if (tDateOnly.getTime() === dateObj.getTime()) {
          result.outgoing.push(load);
          categorized = true;
        }
      }

      if (!categorized) {
        result.other.push(load);
      }
    });

    return result;
  };

  const renderLoadCard = (load, category) => {
    const progress = getLoadProgress(load);
    const timeline = getStatusTimeline(load);
    const isExpanded = expandedLoadId === load._id;

    return (
      <div key={load._id} className="day-view-load-card">
        <div
          className="day-view-load-header"
          onClick={() => setExpandedLoadId(isExpanded ? null : load._id)}
        >
          <div className="day-view-load-info">
            <h4>{load.sender?.company || 'Unknown Sender'} → {load.receiver?.company || 'Unknown Receiver'}</h4>
            <p className="day-view-load-id">ID: {load._id?.substring(0, 8)}...</p>
          </div>
          <div className={`day-view-category-badge ${category}`}>
            {category === 'incoming' ? '📥 IN' : category === 'outgoing' ? '📤 OUT' : '•'}
          </div>
        </div>

        <div className="day-view-progress-container">
          <div className="day-view-progress-bar-background">
            <div
              className="day-view-progress-bar-fill"
              style={{
                width: `${progress.width}%`,
                backgroundColor: getProgressColor(progress.status),
              }}
            />
          </div>
          <span className="day-view-progress-text">{progress.currentLabel}</span>
        </div>

        {isExpanded && (
          <div className="day-view-load-details">
            <div className="day-view-timeline-stages">
              {timeline.map((stage, idx) => (
                <div
                  key={idx}
                  className={`day-view-timeline-stage ${stage.hasEntry ? 'completed' : 'pending'}`}
                >
                  <div className="day-view-stage-label">{stage.label}</div>
                  {stage.date && (
                    <div className="day-view-stage-date">
                      {stage.date.toLocaleDateString()} {stage.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="day-view-load-details-grid">
              <div className="detail-section">
                <h5>Sender</h5>
                <p>{load.sender?.company}</p>
                <p className="detail-text">{load.sender?.address}</p>
                <p className="detail-text">{load.sender?.contact}</p>
              </div>
              <div className="detail-section">
                <h5>Receiver</h5>
                <p>{load.receiver?.company}</p>
                <p className="detail-text">{load.receiver?.address}</p>
                <p className="detail-text">{load.receiver?.contact}</p>
              </div>
              <div className="detail-section">
                <h5>Items</h5>
                {load.items?.map((item, idx) => (
                  <p key={idx}>{item.quantity}x {item.description}</p>
                ))}
              </div>
              <div className="detail-section">
                <h5>Dates</h5>
                {load.incomingDate && <p>Incoming: {new Date(load.incomingDate).toLocaleDateString()}</p>}
                {load.expectedDeliveryDate && <p>Expected: {new Date(load.expectedDeliveryDate).toLocaleDateString()}</p>}
              </div>
            </div>

            <div className="day-view-load-actions">
              <button className="btn-view" onClick={() => onLoadClick(load)}>View Full Details</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const categorized = getLoadsByType();

  return (
    <div className="day-view-modal-overlay" onClick={onClose}>
      <div className="day-view-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="day-view-header">
          <h2>Day View - {formatDateDisplay(date)}</h2>
          <button className="day-view-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="day-view-timeline-header">
          <div className="day-view-timeline-labels">
            {STATUSES.map((status) => (
              <div
                key={status.key}
                className={`day-view-stage-marker ${status.highlight ? 'highlight' : ''}`}
                style={status.highlight ? { backgroundColor: status.color } : {}}
              >
                {status.label}
              </div>
            ))}
          </div>
        </div>

        <div className="day-view-loads-container">
          {categorized.incoming.length > 0 && (
            <div className="day-view-section">
              <h3 className="day-view-section-title">📥 Incoming Loads</h3>
              {categorized.incoming.map((load) => renderLoadCard(load, 'incoming'))}
            </div>
          )}

          {categorized.outgoing.length > 0 && (
            <div className="day-view-section">
              <h3 className="day-view-section-title">📤 Outgoing Loads</h3>
              {categorized.outgoing.map((load) => renderLoadCard(load, 'outgoing'))}
            </div>
          )}

          {categorized.other.length > 0 && (
            <div className="day-view-section">
              <h3 className="day-view-section-title">Other Loads</h3>
              {categorized.other.map((load) => renderLoadCard(load, 'other'))}
            </div>
          )}

          {loads.length === 0 && (
            <div className="day-view-empty-state">
              <p>No loads for this date</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DayView;
