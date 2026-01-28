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

  const getLoadsByStatus = (status) => {
    return loads.filter((load) => load.status === status);
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
      expectedDeliveryDate: formData.get('expectedDeliveryDate'),
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
              <input type="date" name="expectedDeliveryDate" required />
            </div>

            <button type="submit" className="btn-submit">Create Load</button>
          </form>
        </div>
      )}

      <div className="kanban-board">
        {STATUSES.map((status) => (
          <div key={status.key} className="kanban-column">
            <div className="column-header">
              <h3>{status.label}</h3>
              <span className="count">{getLoadsByStatus(status.key).length}</span>
            </div>
            <div className="column-content">
              {getLoadsByStatus(status.key).map((load) => (
                <div
                  key={load._id}
                  className="load-card"
                  onClick={() => setSelectedLoad(load)}
                >
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
                  </div>
                  <div className="load-card-footer">
                    <small>{new Date(load.createdAt).toLocaleDateString()}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
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

export default KanbanBoard;
