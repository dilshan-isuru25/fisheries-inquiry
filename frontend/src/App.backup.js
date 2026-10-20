import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API_BASE = 'http://127.0.0.1:8000/api';

function App() {
  // Auth & Navigation States
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('all_complaints'); // Admin defaults to all_complaints, Staff to my_complaints

  // Form & Authentication States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tickets, setTickets] = useState([]);
  const [category, setCategory] = useState('Select Inquiry Type');
  const [priority, setPriority] = useState('Medium');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterPriority, setFilterPriority] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  // Admin Assign & Note States
  const [assignee, setAssignee] = useState({});
  const [notes, setNotes] = useState({});

  // View Modal State & Print Ticket State
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [printTicketData, setPrintTicketData] = useState(null);

  // New Ticket Notification States
  const [newTicketAlert, setNewTicketAlert] = useState(null);
  const previousTicketCountRef = useRef(null);

  // Available Officers List for Dropdown
  const officersList = [
    'Unassigned',
    'IT Officer',
    'Network Admin',
    'Hardware Support',
    'System Analyst',
    'IT Specialist'
  ];

  // Sound Alarm Generator function using Web Audio API
  const playAlarmSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const playBeep = (freq, startTime, duration) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + startTime);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime + startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + startTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(audioCtx.currentTime + startTime);
        osc.stop(audioCtx.currentTime + startTime + duration);
      };
      // High pitch double beep alarm
      playBeep(880, 0, 0.2);
      playBeep(1200, 0.25, 0.4);
    } catch (e) {
      console.log('Audio playback error:', e);
    }
  };

  const fetchTickets = async () => {
    try {
      const endpoint = user.role === 'Admin' 
        ? `${API_BASE}/complaints/admin` 
        : `${API_BASE}/complaints/user/${user.user_id}`;
      const res = await axios.get(endpoint);
      const fetchedTickets = res.data;

      // Check if new ticket arrived
      if (previousTicketCountRef.current !== null && fetchedTickets.length > previousTicketCountRef.current) {
        const latestTicket = fetchedTickets[0]; // Assuming latest is first
        
        // Always trigger alarm sound when new ticket arrives
        playAlarmSound();

        // Trigger Popup Alert for Live Monitor
        setNewTicketAlert(latestTicket);

        // Auto dismiss popup after 6 seconds
        setTimeout(() => {
          setNewTicketAlert(null);
        }, 6000);
      }

      previousTicketCountRef.current = fetchedTickets.length;
      setTickets(fetchedTickets);
    } catch (err) {
      console.error('Error fetching tickets:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTickets();
      // Auto-refresh data every 10 seconds for Live Monitor view
      const interval = setInterval(fetchTickets, 10000);
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Login Handler
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_BASE}/login`, { email, password });
      setUser(res.data.user);
      if (res.data.user.role === 'Staff') {
        setActiveTab('my_complaints');
      } else {
        setActiveTab('all_complaints');
      }
    } catch (err) {
      alert('Invalid Email or Password');
    }
  };

  // Logout Handler
  const handleLogout = () => {
    setUser(null);
    setEmail('');
    setPassword('');
    setTickets([]);
  };

  // Submit Ticket Handler (with File Upload)
  const handleSubmitTicket = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('user_id', user.user_id);
    formData.append('category', category);
    formData.append('priority', priority);
    formData.append('description', description);
    if (file) {
      formData.append('file', file);
    }

    try {
      await axios.post(`${API_BASE}/complaints`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert('Ticket Submitted Successfully!');
      setDescription('');
      setFile(null);
      setActiveTab('my_complaints');
      fetchTickets();
    } catch (err) {
      alert('Error submitting ticket');
    }
  };

  // Admin Update Status Handler
  const handleStatusChange = async (ticketId, status) => {
    try {
      await axios.put(`${API_BASE}/complaints/${ticketId}/status`, { status });
      fetchTickets();
    } catch (err) {
      alert('Failed to update status');
    }
  };

  // Admin Assign & Note Handler
  const handleAssignSubmit = async (ticketId) => {
    try {
      await axios.put(`${API_BASE}/complaints/${ticketId}/assign`, {
        assigned_to: assignee[ticketId] !== undefined ? assignee[ticketId] : 'Unassigned',
        action_note: notes[ticketId] || ''
      });
      alert('Ticket Assigned & Updated Successfully!');
      fetchTickets();
    } catch (err) {
      alert('Failed to assign ticket');
    }
  };

  // Delete Ticket Handler
  const handleDeleteTicket = async (ticketId) => {
    if (window.confirm("Are you sure you want to delete this ticket?")) {
      try {
        await axios.delete(`${API_BASE}/complaints/${ticketId}`);
        alert('Ticket deleted successfully!');
        if (selectedTicket && selectedTicket.ticket_id === ticketId) {
          setSelectedTicket(null);
        }
        fetchTickets();
      } catch (err) {
        alert('Failed to delete ticket');
      }
    }
  };

  // Print Single Ticket Handler
  const handlePrintSingleTicket = (ticket) => {
    setPrintTicketData(ticket);
    setTimeout(() => {
      window.print();
    }, 200);
  };

  // Media Preview Component
  const renderMedia = (url) => {
    if (!url) return <span style={{ color: '#888', fontSize: '12px' }}>No Attachment</span>;
    const ext = url.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) {
      return (
        <a href={url} target="_blank" rel="noreferrer">
          <img src={url} alt="Attachment" style={{ width: '45px', height: '45px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #ddd' }} />
        </a>
      );
    } else if (['mp3', 'wav', 'ogg'].includes(ext)) {
      return <audio controls src={url} style={{ width: '130px', height: '30px' }} />;
    } else if (['mp4', 'webm'].includes(ext)) {
      return <video controls src={url} style={{ width: '130px', borderRadius: '4px' }} />;
    }
    return <a href={url} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: '#0056b3' }}>View Document</a>;
  };

  // Filtered Tickets Logic
  const filteredTickets = tickets.filter(t => {
    const matchesSearch = 
      t.ticket_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.full_name && t.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.assigned_to && t.assigned_to.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = filterCategory === 'All' || t.category === filterCategory;
    const matchesPriority = filterPriority === 'All' || t.priority === filterPriority;
    const matchesStatus = filterStatus === 'All' || t.status === filterStatus;

    return matchesSearch && matchesCategory && matchesPriority && matchesStatus;
  });

  // Active non-resolved tickets for Live Monitor View (Max 3)
  const activeMonitorTickets = tickets
    .filter(t => t.status !== 'Resolved')
    .slice(0, 3);

  // Export Tickets to Excel (CSV) Handler
  const handleExportToExcel = () => {
    if (tickets.length === 0) {
      alert("No ticket data available to export!");
      return;
    }

    const headers = ["Ticket Code", "User Name", "Email", "Category", "Priority", "Description", "Assigned To", "Action Note", "Status", "Created At"];
    
    const csvRows = [
      headers.join(','),
      ...filteredTickets.map(t => [
        `"${t.ticket_code || ''}"`,
        `"${t.full_name || ''}"`,
        `"${t.email || ''}"`,
        `"${t.category || ''}"`,
        `"${t.priority || ''}"`,
        `"${(t.description || '').replace(/"/g, '""')}"`,
        `"${t.assigned_to || 'Unassigned'}"`,
        `"${(t.action_note || '').replace(/"/g, '""')}"`,
        `"${t.status || ''}"`,
        `"${t.created_at ? new Date(t.created_at).toLocaleString() : ''}"`
      ].join(','))
    ];

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `MFAOR_IT_Tickets_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Report Handler
  const handlePrintReport = () => {
    setPrintTicketData(null);
    window.print();
  };

  // Analytics Metrics
  const totalSubmitted = tickets.length;
  const inProgressCount = tickets.filter(t => t.status === 'In_Progress').length;
  const resolvedCount = tickets.filter(t => t.status === 'Resolved').length;
  const pendingCount = tickets.filter(t => t.status === 'Pending').length;
  const completionRate = totalSubmitted > 0 ? Math.round((resolvedCount / totalSubmitted) * 100) : 0;

  // Login Screen
  if (!user) {
    return (
      <div style={{ maxWidth: '400px', margin: '80px auto', padding: '30px', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', fontFamily: 'Segoe UI, sans-serif' }}>
        <h2 style={{ textAlign: 'center', color: '#002B49', marginBottom: '20px' }}>MFAR IT Portal Login</h2>
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ fontWeight: '600', fontSize: '14px', color: '#444' }}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontWeight: '600', fontSize: '14px', color: '#444' }}>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>
          <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#0056b3', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Login</button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F4F6F9', fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif', position: 'relative' }}>
      
      {/* Dynamic Print Styles for Single Ticket and Bulk Reports */}
      <style>{`
        @keyframes popInBounce {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
          70% { transform: translate(-50%, -50%) scale(1.05); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }

        .single-ticket-print {
          display: none;
        }

        @media print {
          .no-print {
            display: none !important;
          }
          ${printTicketData ? `
            body * {
              visibility: hidden;
            }
            .single-ticket-print, .single-ticket-print * {
              visibility: visible;
            }
            .single-ticket-print {
              display: block !important;
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
          ` : ''}
        }
      `}</style>

      {/* Hidden Layout specifically styled for Single Ticket Printing */}
      {printTicketData && (
        <div className="single-ticket-print" style={{ padding: '30px', fontFamily: 'Segoe UI, sans-serif', color: '#000' }}>
          <div style={{ borderBottom: '3px solid #0A2540', paddingBottom: '15px', marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ margin: 0, color: '#0A2540', fontSize: '24px' }}>MFAOR IT Operations Division</h1>
              <p style={{ margin: '5px 0 0 0', color: '#555', fontSize: '14px' }}>Ministry IT Service Ticket Receipt</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h2 style={{ margin: 0, color: '#2563EB', fontSize: '22px' }}>{printTicketData.ticket_code}</h2>
              <span style={{ fontSize: '12px', color: '#777' }}>Date: {new Date(printTicketData.created_at || Date.now()).toLocaleString()}</span>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px', fontSize: '15px' }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: '12px', fontWeight: 'bold', width: '30%', backgroundColor: '#F8FAFC' }}>Submitted By:</td>
                <td style={{ padding: '12px' }}>{printTicketData.full_name || user.full_name} ({printTicketData.email || user.email})</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: '12px', fontWeight: 'bold', backgroundColor: '#F8FAFC' }}>Category:</td>
                <td style={{ padding: '12px' }}>{printTicketData.category}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: '12px', fontWeight: 'bold', backgroundColor: '#F8FAFC' }}>Priority:</td>
                <td style={{ padding: '12px', fontWeight: 'bold' }}>{printTicketData.priority}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: '12px', fontWeight: 'bold', backgroundColor: '#F8FAFC' }}>Status:</td>
                <td style={{ padding: '12px', fontWeight: 'bold' }}>{printTicketData.status}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: '12px', fontWeight: 'bold', backgroundColor: '#F8FAFC' }}>Assigned Officer:</td>
                <td style={{ padding: '12px' }}>{printTicketData.assigned_to || 'Unassigned'}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: '12px', fontWeight: 'bold', backgroundColor: '#F8FAFC' }}>Action / Resolution Note:</td>
                <td style={{ padding: '12px' }}>{printTicketData.action_note || 'N/A'}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: '12px', fontWeight: 'bold', backgroundColor: '#F8FAFC' }}>Inquiry Description:</td>
                <td style={{ padding: '12px', lineHeight: '1.6' }}>{printTicketData.description}</td>
              </tr>
            </tbody>
          </table>

          <div style={{ marginTop: '50px', display: 'flex', justifyContent: 'space-between', paddingTop: '40px', borderTop: '1px dashed #ccc' }}>
            <div style={{ textAlign: 'center', width: '200px' }}>
              <div style={{ borderBottom: '1px solid #000', marginBottom: '8px' }}></div>
              <span style={{ fontSize: '13px' }}>User Signature</span>
            </div>
            <div style={{ textAlign: 'center', width: '200px' }}>
              <div style={{ borderBottom: '1px solid #000', marginBottom: '8px' }}></div>
              <span style={{ fontSize: '13px' }}>Authorized Officer Signature</span>
            </div>
          </div>
        </div>
      )}

      {/* Animated Pop-up Notification (Only displayed on Live Monitor View) */}
      {activeTab === 'live_monitor' && newTicketAlert && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: '#DC2626',
          color: 'white',
          padding: '30px 40px',
          borderRadius: '16px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          zIndex: 9999,
          textAlign: 'center',
          animation: 'popInBounce 0.5s ease-out forwards',
          minWidth: '380px',
          border: '4px solid #FEF08A'
        }}>
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>🔔</div>
          <h2 style={{ margin: 0, fontSize: '26px', letterSpacing: '1px' }}>NEW TICKET RECEIVED!</h2>
          <div style={{ fontSize: '22px', fontWeight: 'bold', marginTop: '10px', color: '#FEF08A' }}>
            {newTicketAlert.ticket_code}
          </div>
          <p style={{ margin: '10px 0 0 0', fontSize: '16px', opacity: 0.9 }}>
            Category: {newTicketAlert.category} | Priority: {newTicketAlert.priority}
          </p>
        </div>
      )}

      {/* Sidebar - Hidden when activeTab is live_monitor */}
      {activeTab !== 'live_monitor' && (
        <div className="no-print" style={{ width: '250px', backgroundColor: '#0A2540', color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '20px 0' }}>
          <div>
            <div style={{ padding: '0 20px 20px 20px', borderBottom: '1px solid #1E3A5F', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', backgroundColor: '#FFC107', borderRadius: '8px', color: '#000', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>MF</div>
              <div>
                <h4 style={{ margin: 0, fontSize: '16px' }}>MFAOR IT</h4>
                <span style={{ fontSize: '11px', color: '#8A9DB0' }}>Ministry IT Operations</span>
              </div>
            </div>

            <div style={{ marginTop: '20px' }}>
              {user.role === 'Staff' ? (
                <>
                  <div onClick={() => setActiveTab('my_complaints')} style={{ padding: '12px 20px', cursor: 'pointer', backgroundColor: activeTab === 'my_complaints' ? '#1E3A5F' : 'transparent', borderLeft: activeTab === 'my_complaints' ? '4px solid #FFC107' : 'none', fontWeight: activeTab === 'my_complaints' ? 'bold' : 'normal' }}>My Complaints</div>
                  <div onClick={() => setActiveTab('submit_ticket')} style={{ padding: '12px 20px', cursor: 'pointer', backgroundColor: activeTab === 'submit_ticket' ? '#1E3A5F' : 'transparent', borderLeft: activeTab === 'submit_ticket' ? '4px solid #FFC107' : 'none', fontWeight: activeTab === 'submit_ticket' ? 'bold' : 'normal' }}>Submit New Ticket</div>
                </>
              ) : (
                <>
                  <div onClick={() => setActiveTab('all_complaints')} style={{ padding: '12px 20px', cursor: 'pointer', backgroundColor: activeTab === 'all_complaints' ? '#1E3A5F' : 'transparent', borderLeft: activeTab === 'all_complaints' ? '4px solid #FFC107' : 'none', fontWeight: activeTab === 'all_complaints' ? 'bold' : 'normal' }}>All Complaints</div>
                  <div onClick={() => setActiveTab('reports')} style={{ padding: '12px 20px', cursor: 'pointer', backgroundColor: activeTab === 'reports' ? '#1E3A5F' : 'transparent', borderLeft: activeTab === 'reports' ? '4px solid #FFC107' : 'none', fontWeight: activeTab === 'reports' ? 'bold' : 'normal' }}>Reports</div>
                  <div onClick={() => setActiveTab('dashboard')} style={{ padding: '12px 20px', cursor: 'pointer', backgroundColor: activeTab === 'dashboard' ? '#1E3A5F' : 'transparent', borderLeft: activeTab === 'dashboard' ? '4px solid #FFC107' : 'none', fontWeight: activeTab === 'dashboard' ? 'bold' : 'normal' }}>Dashboard Overview</div>
                  <div onClick={() => setActiveTab('live_monitor')} style={{ padding: '12px 20px', cursor: 'pointer', backgroundColor: activeTab === 'live_monitor' ? '#1E3A5F' : 'transparent', borderLeft: activeTab === 'live_monitor' ? '4px solid #FFC107' : 'none', fontWeight: activeTab === 'live_monitor' ? 'bold' : 'normal' }}>Live Monitor (TV Display)</div>
                </>
              )}
            </div>
          </div>

          <div style={{ padding: '0 20px', borderTop: '1px solid #1E3A5F', paddingTop: '15px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{user.full_name}</div>
            <div style={{ fontSize: '12px', color: '#8A9DB0', marginBottom: '10px' }}>{user.role}</div>
            <button onClick={handleLogout} style={{ width: '100%', padding: '8px', backgroundColor: 'transparent', color: '#fff', border: '1px solid #3A5A80', borderRadius: '6px', cursor: 'pointer' }}>Logout</button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div style={{ flex: 1, padding: '30px' }}>
        
        {/* Top Header Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
          <div>
            <h2 style={{ margin: 0, color: '#0A2540', fontSize: activeTab === 'live_monitor' ? '28px' : '24px' }}>
              {user.role === 'Admin' 
                ? (activeTab === 'reports' ? 'MFAOR IT - System Reports' : activeTab === 'dashboard' ? 'MFAOR IT - Executive Dashboard' : activeTab === 'live_monitor' ? 'MFAOR IT - Executive Dashboard' : 'MFAOR IT - All Inquiry Complaints') 
                : 'MFAR IT - My Inquiries'}
            </h2>
            <span style={{ fontSize: activeTab === 'live_monitor' ? '15px' : '13px', color: '#666' }}>
              {user.role === 'Admin' ? 'Live ticket analytics and management system' : 'Submit tickets and track the status of your complaints'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {activeTab === 'live_monitor' && (
              <button 
                onClick={() => setActiveTab('all_complaints')} 
                style={{ backgroundColor: '#DC2626', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}
              >
                ✕ Exit Live Monitor
              </button>
            )}
            {user.role === 'Admin' && activeTab !== 'live_monitor' && (
              <button onClick={handleExportToExcel} className="no-print" style={{ backgroundColor: '#107C41', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                📊 Export to Excel
              </button>
            )}
            {activeTab === 'reports' && (
              <button onClick={handlePrintReport} className="no-print" style={{ backgroundColor: '#4F46E5', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>Print Full Report</button>
            )}
            <span style={{ fontSize: activeTab === 'live_monitor' ? '16px' : '13px', color: '#666', fontWeight: '600' }}>{tickets.length} tickets total</span>
          </div>
        </div>

        {/* Analytics Cards View (Shown for Dashboard, Reports, and Live Monitor) */}
        {(activeTab === 'dashboard' || activeTab === 'reports' || activeTab === 'live_monitor') && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px', marginTop: activeTab === 'live_monitor' ? '20px' : '0' }}>
            <div style={{ backgroundColor: '#2563EB', color: '#fff', padding: activeTab === 'live_monitor' ? '45px 30px' : '20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
              <span style={{ fontSize: activeTab === 'live_monitor' ? '18px' : '12px', opacity: 0.9 }}>{user.role === 'Admin' ? 'Open Tickets' : 'Total Submitted'}</span>
              <h1 style={{ margin: '12px 0 0 0', fontSize: activeTab === 'live_monitor' ? '56px' : '32px', fontWeight: 'bold' }}>{user.role === 'Admin' ? pendingCount : totalSubmitted}</h1>
            </div>
            <div style={{ backgroundColor: '#D97706', color: '#fff', padding: activeTab === 'live_monitor' ? '45px 30px' : '20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
              <span style={{ fontSize: activeTab === 'live_monitor' ? '18px' : '12px', opacity: 0.9 }}>In Progress</span>
              <h1 style={{ margin: '12px 0 0 0', fontSize: activeTab === 'live_monitor' ? '56px' : '32px', fontWeight: 'bold' }}>{inProgressCount}</h1>
            </div>
            <div style={{ backgroundColor: '#16A34A', color: '#fff', padding: activeTab === 'live_monitor' ? '45px 30px' : '20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
              <span style={{ fontSize: activeTab === 'live_monitor' ? '18px' : '12px', opacity: 0.9 }}>{user.role === 'Admin' ? 'Closed / Resolved' : 'Resolved'}</span>
              <h1 style={{ margin: '12px 0 0 0', fontSize: activeTab === 'live_monitor' ? '56px' : '32px', fontWeight: 'bold' }}>{resolvedCount}</h1>
            </div>
            <div style={{ backgroundColor: '#1E40AF', color: '#fff', padding: activeTab === 'live_monitor' ? '45px 30px' : '20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
              <span style={{ fontSize: activeTab === 'live_monitor' ? '18px' : '12px', opacity: 0.9 }}>Completion Rate %</span>
              <h1 style={{ margin: '12px 0 0 0', fontSize: activeTab === 'live_monitor' ? '56px' : '32px', fontWeight: 'bold' }}>{completionRate}%</h1>
            </div>
          </div>
        )}

        {/* Live Monitor View: Display up to 3 Active (Non-Resolved) Tickets */}
        {activeTab === 'live_monitor' && (
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '25px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#0A2540', fontSize: '20px' }}>
              Active Ongoing Tickets ({activeMonitorTickets.length})
            </h3>
            {activeMonitorTickets.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {activeMonitorTickets.map((t) => (
                  <div key={t.ticket_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', backgroundColor: '#F8FAFC', borderRadius: '10px', borderLeft: `6px solid ${t.status === 'In_Progress' ? '#D97706' : '#2563EB'}` }}>
                    <div>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '18px', color: '#0A2540' }}>{t.ticket_code}</span>
                        <span style={{ fontSize: '14px', padding: '3px 10px', borderRadius: '12px', backgroundColor: '#E2E8F0', fontWeight: '600', color: '#334155' }}>{t.category}</span>
                        <span style={{ fontSize: '14px', fontWeight: 'bold', color: t.priority === 'Critical' ? '#DC2626' : t.priority === 'High' ? '#EA580C' : '#2563EB' }}>{t.priority} Priority</span>
                      </div>
                      <div style={{ marginTop: '8px', fontSize: '16px', color: '#334155' }}>{t.description}</div>
                      <div style={{ marginTop: '6px', fontSize: '13px', color: '#64748B' }}>Submitted by: {t.full_name || 'Staff User'} | Assigned to: {t.assigned_to || 'Unassigned'}</div>
                    </div>
                    <div>
                      <span style={{ padding: '8px 16px', borderRadius: '20px', fontSize: '14px', fontWeight: 'bold', backgroundColor: t.status === 'In_Progress' ? '#FEF3C7' : '#DBEAFE', color: t.status === 'In_Progress' ? '#92400E' : '#1E40AF' }}>
                        {t.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: '#16A34A', fontSize: '18px', fontWeight: '600' }}>
                ✅ All active tickets have been resolved! No pending issues.
              </div>
            )}
          </div>
        )}

        {/* New Ticket Submission Form View */}
        {user.role === 'Staff' && activeTab === 'submit_ticket' && (
          <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', maxWidth: '600px', marginBottom: '30px' }}>
            <h3 style={{ marginTop: 0, color: '#0A2540' }}>Submit New Inquiry</h3>
            <form onSubmit={handleSubmitTicket}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '5px' }}>Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}>
                  <option value="Select Inquiry Type">Select Inquiry Type</option>
                  <option value="Internet connectivity">Internet connectivity</option>
                  <option value="System login failure">System login failure</option>
                  <option value="System process issues">System process issues</option>
                  <option value="Report issues">Report issues</option>
                  <option value="Devices not working">Devices not working</option>
                  <option value="SIM card not working">SIM card not working</option>
                  <option value="Document upload">Document upload</option>
                  <option value="Forgot Password">Forgot Password</option>
                  <option value="Other issues">Other issues</option>
                </select>
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '5px' }}>Priority</label>
                <select value={priority} onChange={(e) => setPriority(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '5px' }}>Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} required rows="4" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '5px' }}>Attachment (Photo / Audio / Video)</label>
                <input type="file" onChange={(e) => setFile(e.target.files[0])} accept="image/*,video/*,audio/*" />
              </div>
              <button type="submit" style={{ backgroundColor: '#16A34A', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Submit Ticket</button>
            </form>
          </div>
        )}

        {/* Filter Bar (Visible in All Complaints & Reports Tabs, Hidden in Live Monitor) */}
        {activeTab !== 'submit_ticket' && activeTab !== 'live_monitor' && (
          <div className="no-print" style={{ backgroundColor: '#fff', padding: '15px 20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: '20px', display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input 
              type="text" 
              placeholder="Search Code, Description, User..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc', minWidth: '220px' }}
            />
            
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc' }}>
              <option value="All">All Categories</option>
              <option value="Hardware">Hardware</option>
              <option value="Network">Network</option>
              <option value="Software">Software</option>
              <option value="Intercom">Intercom</option>
            </select>

            <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc' }}>
              <option value="All">All Priorities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>

            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc' }}>
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="In_Progress">In_Progress</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>
        )}

        {/* Complaints Data Table (Hidden in Live Monitor) */}
        {activeTab !== 'submit_ticket' && activeTab !== 'live_monitor' && (
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', padding: '20px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#0A2540' }}>
              {activeTab === 'reports' ? 'Detailed System Inquiry Report' : user.role === 'Admin' ? 'All Complaints List' : 'My Complaint History'}
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #EDF2F7', color: '#718096', height: '40px' }}>
                  <th style={{ padding: '10px' }}>Code</th>
                  {user.role === 'Admin' && <th style={{ padding: '10px' }}>User</th>}
                  <th style={{ padding: '10px' }}>Category</th>
                  <th style={{ padding: '10px' }}>Priority</th>
                  <th style={{ padding: '10px' }}>Description</th>
                  <th style={{ padding: '10px' }}>Attachment</th>
                  <th style={{ padding: '10px' }}>Assigned To & Note</th>
                  <th style={{ padding: '10px' }}>Status</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.length > 0 ? (
                  filteredTickets.map((t) => (
                    <tr key={t.ticket_id} style={{ borderBottom: '1px solid #EDF2F7', height: '65px' }}>
                      <td style={{ padding: '10px', fontWeight: '600', color: '#2D3748' }}>{t.ticket_code}</td>
                      {user.role === 'Admin' && (
                        <td style={{ padding: '10px' }}>
                          <div style={{ fontWeight: '600' }}>{t.full_name}</div>
                          <div style={{ fontSize: '11px', color: '#718096' }}>{t.email}</div>
                        </td>
                      )}
                      <td style={{ padding: '10px' }}>{t.category}</td>
                      <td style={{ padding: '10px' }}>
                        <span style={{ 
                          color: t.priority === 'Critical' ? '#DC2626' : t.priority === 'High' ? '#EA580C' : '#2563EB',
                          fontWeight: '600'
                        }}>
                          {t.priority}
                        </span>
                      </td>
                      <td style={{ padding: '10px', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description}</td>
                      <td style={{ padding: '10px' }}>{renderMedia(t.attachment_url)}</td>
                      
                      {/* Officer Select Dropdown & Action Note */}
                      <td style={{ padding: '10px' }}>
                        {user.role === 'Admin' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <select
                              value={assignee[t.ticket_id] !== undefined ? assignee[t.ticket_id] : (t.assigned_to || 'Unassigned')}
                              onChange={(e) => setAssignee({ ...assignee, [t.ticket_id]: e.target.value })}
                              style={{ width: '140px', padding: '4px', fontSize: '12px', borderRadius: '4px', border: '1px solid #ccc' }}
                            >
                              {officersList.map((off, index) => (
                                <option key={index} value={off}>{off}</option>
                              ))}
                            </select>
                            
                            <input 
                              type="text" 
                              placeholder="Action Note" 
                              defaultValue={t.action_note || ''}
                              onChange={(e) => setNotes({ ...notes, [t.ticket_id]: e.target.value })} 
                              style={{ width: '135px', padding: '4px', fontSize: '12px', borderRadius: '4px', border: '1px solid #ccc' }}
                            />
                            <button onClick={() => handleAssignSubmit(t.ticket_id)} style={{ width: '60px', padding: '3px 6px', fontSize: '11px', backgroundColor: '#2563EB', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Save</button>
                          </div>
                        ) : (
                          <div>
                            <div style={{ fontWeight: '500' }}>{t.assigned_to || 'Unassigned'}</div>
                            {t.action_note && <div style={{ fontSize: '11px', color: '#666', fontStyle: 'italic' }}>Note: {t.action_note}</div>}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '10px' }}>
                        {user.role === 'Admin' ? (
                          <select 
                            value={t.status} 
                            onChange={(e) => handleStatusChange(t.ticket_id, e.target.value)}
                            style={{ padding: '6px', borderRadius: '6px', border: '1px solid #ccc' }}
                          >
                            <option value="Pending">Pending</option>
                            <option value="In_Progress">In_Progress</option>
                            <option value="Resolved">Resolved</option>
                          </select>
                        ) : (
                          <span style={{ 
                            padding: '4px 10px', 
                            borderRadius: '12px', 
                            fontSize: '12px', 
                            fontWeight: '600',
                            backgroundColor: t.status === 'Resolved' ? '#DEF7EC' : t.status === 'In_Progress' ? '#FEF3C7' : '#FDE8E8',
                            color: t.status === 'Resolved' ? '#03543F' : t.status === 'In_Progress' ? '#92400E' : '#9B1C1C'
                          }}>
                            {t.status}
                          </span>
                        )}
                      </td>
                      
                      {/* Actions Column (View + Print + Delete) */}
                      <td style={{ padding: '10px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                          <button 
                            onClick={() => setSelectedTicket(t)}
                            style={{
                              backgroundColor: '#4B5563',
                              color: '#ffffff',
                              border: 'none',
                              padding: '5px 8px',
                              borderRadius: '5px',
                              cursor: 'pointer',
                              fontSize: '11px',
                              fontWeight: '500'
                            }}
                          >
                            View
                          </button>
                          <button 
                            onClick={() => handlePrintSingleTicket(t)}
                            style={{
                              backgroundColor: '#2563EB',
                              color: '#ffffff',
                              border: 'none',
                              padding: '5px 8px',
                              borderRadius: '5px',
                              cursor: 'pointer',
                              fontSize: '11px',
                              fontWeight: '500'
                            }}
                          >
                            Print
                          </button>
                          <button 
                            onClick={() => handleDeleteTicket(t.ticket_id)}
                            style={{
                              backgroundColor: '#EF4444',
                              color: '#ffffff',
                              border: 'none',
                              padding: '5px 8px',
                              borderRadius: '5px',
                              cursor: 'pointer',
                              fontSize: '11px',
                              fontWeight: '600'
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '20px', color: '#888' }}>No tickets found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* View Details Modal */}
        {selectedTicket && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
            <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '12px', width: '500px', maxHeight: '80vh', overflowY: 'auto' }}>
              <h3 style={{ marginTop: 0, borderBottom: '1px solid #ddd', paddingBottom: '10px' }}>Ticket Details ({selectedTicket.ticket_code})</h3>
              <p><strong>Category:</strong> {selectedTicket.category}</p>
              <p><strong>Priority:</strong> {selectedTicket.priority}</p>
              <p><strong>Description:</strong> {selectedTicket.description}</p>
              <p><strong>Assigned To:</strong> {selectedTicket.assigned_to || 'Unassigned'}</p>
              <p><strong>Action Note:</strong> {selectedTicket.action_note || 'None'}</p>
              <p><strong>Status:</strong> {selectedTicket.status}</p>
              <p><strong>Created At:</strong> {new Date(selectedTicket.created_at).toLocaleString()}</p>
              <div style={{ marginBottom: '15px' }}>
                <strong>Attachment:</strong>
                <div style={{ marginTop: '5px' }}>{renderMedia(selectedTicket.attachment_url)}</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button onClick={() => handlePrintSingleTicket(selectedTicket)} style={{ backgroundColor: '#2563EB', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>Print Ticket</button>
                <button onClick={() => handleDeleteTicket(selectedTicket.ticket_id)} style={{ backgroundColor: '#EF4444', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>Delete Ticket</button>
                <button onClick={() => setSelectedTicket(null)} style={{ backgroundColor: '#6B7280', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>Close</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;