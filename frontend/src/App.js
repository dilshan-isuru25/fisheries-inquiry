import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import './App.css';

// Dynamic Environment & LAN-aware API Base URL configuration
const getApiBase = () => {
  if (process.env.REACT_APP_API_BASE) return process.env.REACT_APP_API_BASE;
  const host = window.location.hostname || '127.0.0.1';
  if (host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.')) {
    return `http://${host}:8000/api`;
  }
  return `/api`;
};
const API_BASE = getApiBase();

// Axios Security Interceptors: automatically attach JWT Bearer token and handle 401 Unauthorized
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('it_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('it_user');
      localStorage.removeItem('it_token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Standard Ministry Divisions (Guaranteed 17 Divisions across all clients)
const MINISTRY_DEPARTMENTS = [
  { department_id: 1, department_name: 'Department of Fisheries & Aquatic Resources' },
  { department_id: 2, department_name: 'Ocean Resources Division' },
  { department_id: 3, department_name: 'Administration Division' },
  { department_id: 4, department_name: 'Finance Division' },
  { department_id: 5, department_name: 'Ministry Office' },
  { department_id: 6, department_name: 'Deputy Minister Office' },
  { department_id: 7, department_name: 'Secretary Office' },
  { department_id: 8, department_name: 'Internal Audit' },
  { department_id: 9, department_name: 'Engineering Division' },
  { department_id: 10, department_name: 'Agriculture Division' },
  { department_id: 11, department_name: 'IT Unit' },
  { department_id: 12, department_name: 'Planning Division' },
  { department_id: 13, department_name: 'Technical Division' },
  { department_id: 14, department_name: 'Development Division' },
  { department_id: 15, department_name: 'Government Audit Division' },
  { department_id: 16, department_name: 'Statistics Unit' },
  { department_id: 17, department_name: 'National Fisheries Federation' }
];

function MainPortal() {
  const navigate = useNavigate();
  const location = useLocation();

  // 1. Auth & Session Persistence (using localStorage with JWT token check)
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('it_user');
      const savedToken = localStorage.getItem('it_token');
      if (savedUser && savedToken) {
        return JSON.parse(savedUser);
      }
      return null;
    } catch (e) {
      return null;
    }
  });

  // Form & Authentication States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Registration Form States
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regDeptId, setRegDeptId] = useState('1');
  const [regTerms, setRegTerms] = useState(false);
  const [departmentList, setDepartmentList] = useState(MINISTRY_DEPARTMENTS);

  const [tickets, setTickets] = useState([]);
  const [category, setCategory] = useState('Select Inquiry Type');
  const [department, setDepartment] = useState('Ministry Office');
  const priority = 'Medium';
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterDepartment, setFilterDepartment] = useState('All');
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

  // Dynamic Route-to-ActiveTab Mapping
  const getActiveTab = () => {
    const path = location.pathname;
    if (path === '/staff/my-complaints') return 'my_complaints';
    if (path === '/staff/submit-ticket') return 'submit_ticket';
    if (path === '/admin/reports') return 'reports';
    if (path === '/admin/dashboard') return 'dashboard';
    if (path === '/admin/live-monitor') return 'live_monitor';
    if (path === '/admin/complaints') return 'all_complaints';
    return user?.role === 'Admin' ? 'all_complaints' : 'my_complaints';
  };

  const activeTab = getActiveTab();

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
    if (!user) return;
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

  // Load departments for registration (guarantees all 17 divisions are always available)
  useEffect(() => {
    if (!user) {
      axios.get(`${API_BASE}/departments`)
        .then(res => {
          if (Array.isArray(res.data) && res.data.length >= 17) {
            setDepartmentList(res.data);
          } else if (Array.isArray(res.data) && res.data.length > 0) {
            // If the database only has partial departments (e.g. 4), merge to keep all 17!
            const merged = [...MINISTRY_DEPARTMENTS];
            res.data.forEach(d => {
              const idx = merged.findIndex(m => m.department_id === d.department_id);
              if (idx !== -1) {
                merged[idx] = d;
              } else {
                merged.push(d);
              }
            });
            setDepartmentList(merged);
          }
        })
        .catch(err => {
          console.log('Departments fetch error, using default 17 divisions:', err);
          setDepartmentList(MINISTRY_DEPARTMENTS);
        });
    }
  }, [user]);

  // Protected Route & Dynamic Title Management
  useEffect(() => {
    const path = location.pathname;

    if (!user) {
      if (path === '/register') {
        setAuthMode('register');
        document.title = 'MFAR IT - Staff Registration';
      } else {
        if (path !== '/login') {
          navigate('/login', { replace: true });
        }
        setAuthMode('login');
        document.title = 'MFAR IT - Portal Login';
      }
      return;
    }

    // Redirect logged in user away from /login or /
    if (path === '/login' || path === '/' || path === '/register') {
      if (user.role === 'Admin') {
        navigate('/admin/complaints', { replace: true });
      } else {
        navigate('/staff/my-complaints', { replace: true });
      }
    } else if (user.role === 'Staff' && path.startsWith('/admin')) {
      navigate('/staff/my-complaints', { replace: true });
    } else if (user.role === 'Admin' && path.startsWith('/staff')) {
      navigate('/admin/complaints', { replace: true });
    }

    // Update browser tab document title
    if (path === '/admin/live-monitor') {
      document.title = 'MFAR IT - Live Monitor (TV Display)';
    } else if (path === '/admin/dashboard') {
      document.title = 'MFAR IT - Executive Dashboard';
    } else if (path === '/admin/reports') {
      document.title = 'MFAR IT - System Reports';
    } else if (path === '/staff/submit-ticket') {
      document.title = 'MFAR IT - Submit Inquiry';
    } else if (path === '/staff/my-complaints') {
      document.title = 'MFAR IT - My Inquiries';
    } else {
      document.title = 'MFAR IT - All Complaints';
    }
  }, [user, location.pathname, navigate]);

  // Tab switch helpers for Auth
  const switchToLogin = () => {
    setAuthMode('login');
    setAuthError('');
    setAuthSuccess('');
    navigate('/login');
  };

  const switchToRegister = () => {
    setAuthMode('register');
    setAuthError('');
    setAuthSuccess('');
    navigate('/register');
  };

  // Login Handler with In-Card Feedback
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    setAuthLoading(true);

    try {
      const res = await axios.post(`${API_BASE}/login`, { email, password });
      const loggedUser = res.data.user;
      const accessToken = res.data.access_token;
      
      setUser(loggedUser);
      localStorage.setItem('it_user', JSON.stringify(loggedUser));
      if (accessToken) {
        localStorage.setItem('it_token', accessToken);
      }
      
      if (loggedUser.role === 'Staff') {
        navigate('/staff/my-complaints');
      } else {
        navigate('/admin/complaints');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Invalid email address or password. Please try again.';
      setAuthError(errorMsg);
    } finally {
      setAuthLoading(false);
    }
  };

  // Registration Handler with Automatic Login
  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    if (!regFullName.trim()) {
      setAuthError('Please enter your full official name.');
      return;
    }
    if (!regEmail.trim()) {
      setAuthError('Please enter your email address.');
      return;
    }
    if (regPassword.length < 6) {
      setAuthError('Password must contain at least 6 characters.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setAuthError('Passwords do not match. Please verify your password entries.');
      return;
    }
    if (!regTerms) {
      setAuthError('Please agree to the Ministry IT Acceptable Use Policy to proceed.');
      return;
    }

    setAuthLoading(true);
    try {
      const payload = {
        full_name: regFullName.trim(),
        email: regEmail.trim(),
        password: regPassword,
        department_id: regDeptId ? parseInt(regDeptId) : null
      };

      const res = await axios.post(`${API_BASE}/register`, payload);
      const registeredUser = res.data.user;
      const accessToken = res.data.access_token;

      setAuthSuccess('Account created successfully! Logging you in...');
      
      setTimeout(() => {
        setUser(registeredUser);
        localStorage.setItem('it_user', JSON.stringify(registeredUser));
        if (accessToken) {
          localStorage.setItem('it_token', accessToken);
        }
        navigate('/staff/my-complaints');
      }, 1200);
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Registration failed. Please check your information and try again.';
      setAuthError(errorMsg);
    } finally {
      setAuthLoading(false);
    }
  };

  // Logout Handler with Confirmation
  const handleLogout = () => {
    const confirmLogout = window.confirm("Are you sure you want to log out of the Ministry IT Portal?");
    if (!confirmLogout) return;

    localStorage.removeItem('it_user');
    localStorage.removeItem('it_token');
    setUser(null);
    setEmail('');
    setPassword('');
    setTickets([]);
    navigate('/login');
  };

  // Submit Ticket Handler (with File Upload and Client-Side Security Checks)
  const handleSubmitTicket = async (e) => {
    e.preventDefault();

    if (!category || category === 'Select Inquiry Type') {
      alert('Please select an Inquiry Category from the dropdown before submitting!');
      return;
    }

    // Client-side file security validation
    if (file) {
      const maxSizeBytes = 10 * 1024 * 1024; // 10MB limit
      if (file.size > maxSizeBytes) {
        alert("Security Alert: File size exceeds the 10MB limit. Please upload a smaller file.");
        return;
      }
      const allowedExts = ['png', 'jpg', 'jpeg', 'webp', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt'];
      const ext = file.name.split('.').pop().toLowerCase();
      if (!allowedExts.includes(ext)) {
        alert(`Security Alert: Unsupported file format ('.${ext}'). Allowed formats: ${allowedExts.join(', ')}`);
        return;
      }
    }

    const formData = new FormData();
    formData.append('category', category);
    formData.append('department', department);
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
      setDepartment('Ministry Office');
      navigate('/staff/my-complaints');
      fetchTickets();
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Error submitting ticket';
      alert(errorMsg);
    }
  };

  // Admin Update Status Handler
  const handleStatusChange = async (ticketId, status) => {
    try {
      await axios.put(`${API_BASE}/complaints/${ticketId}/status`, { status });
      fetchTickets();
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to update status';
      alert(errorMsg);
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
      const errorMsg = err.response?.data?.detail || 'Failed to assign ticket';
      alert(errorMsg);
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
        const errorMsg = err.response?.data?.detail || 'Failed to delete ticket';
        alert(errorMsg);
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

  // Media Preview Component with LAN & Cloud URL Resolution
  const getFullMediaUrl = (url) => {
    if (!url) return null;
    const host = window.location.hostname || '127.0.0.1';
    const isLocal = host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.');
    if (isLocal) {
      if (url.startsWith('/uploads/')) {
        return `http://${host}:8000${url}`;
      }
      if (url.includes(':8000/uploads/')) {
        return url.replace(/https?:\/\/[^/]+:8000/, `http://${host}:8000`);
      }
      return url;
    }
    // Cloud / Vercel: serve relative path over HTTPS
    if (url.includes('/uploads/')) {
      return url.substring(url.indexOf('/uploads/'));
    }
    return url;
  };

  const renderMedia = (rawUrl) => {
    if (!rawUrl) return <span style={{ color: '#888', fontSize: '12px' }}>No Attachment</span>;
    const url = getFullMediaUrl(rawUrl);
    const ext = rawUrl.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
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
      (t.department && t.department.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.full_name && t.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.assigned_to && t.assigned_to.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = filterCategory === 'All' || t.category === filterCategory;
    const matchesDepartment = filterDepartment === 'All' || t.department === filterDepartment;
    const matchesStatus = filterStatus === 'All' || t.status === filterStatus;

    return matchesSearch && matchesCategory && matchesDepartment && matchesStatus;
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

    const headers = ["Ticket Code", "User Name", "Email", "Department", "Category", "Priority", "Description", "Assigned To", "Action Note", "Status", "Created At"];
    
    const csvRows = [
      headers.join(','),
      ...filteredTickets.map(t => [
        `"${t.ticket_code || ''}"`,
        `"${t.full_name || ''}"`,
        `"${t.email || ''}"`,
        `"${t.department || 'Ministry Office'}"`,
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

  // Modern Enterprise Auth & Welcome Portal View
  if (!user) {
    return (
      <div className="auth-wrapper" style={{
        minHeight: '100vh',
        backgroundColor: '#071629',
        backgroundImage: 'radial-gradient(at 0% 0%, rgba(37, 99, 235, 0.25) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(217, 119, 6, 0.18) 0px, transparent 50%)',
        fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif",
        color: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}>
        
        {/* Top Official Header Bar */}
        <header className="auth-header" style={{
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '16px 36px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backdropFilter: 'blur(10px)',
          backgroundColor: 'rgba(7, 22, 41, 0.7)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
              color: '#071629',
              fontWeight: '900',
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 15px rgba(245, 158, 11, 0.35)'
            }}>
              MF
            </div>
            <div>
              <div className="header-brand-title" style={{ fontSize: '13px', fontWeight: '800', letterSpacing: '1px', textTransform: 'uppercase', color: '#FCD34D' }}>
                Ministry of Fisheries & Aquatic Resources
              </div>
              <div style={{ fontSize: '12px', color: '#94A3B8', fontWeight: '500' }}>
                Information Technology Operations Division • Centralized Service Portal
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '30px',
              backgroundColor: 'rgba(34, 197, 94, 0.12)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              fontSize: '12px',
              fontWeight: '600',
              color: '#4ADE80'
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22C55E', display: 'inline-block', boxShadow: '0 0 10px #22C55E' }}></span>
              Systems Operational
            </div>
            <div style={{ fontSize: '13px', color: '#CBD5E1', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>📞</span>
              <span>Hotline: <strong style={{ color: '#FCD34D' }}>419</strong></span>
            </div>
          </div>
        </header>

        {/* Main Split Section (Hero + Auth Card) */}
        <main className="auth-main-grid" style={{
          flex: 1,
          maxWidth: '1240px',
          margin: '0 auto',
          width: '100%',
          padding: '40px 24px',
          display: 'grid',
          gridTemplateColumns: '1.15fr 1fr',
          gap: '50px',
          alignItems: 'center'
        }}>
          
          {/* Left Hero Column */}
          <div className="auth-hero-col">
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              borderRadius: '20px',
              padding: '5px 14px',
              fontSize: '12px',
              fontWeight: '700',
              color: '#FCD34D',
              marginBottom: '20px'
            }}>
              <span>🛡️</span> OFFICIAL GOVERNMENT IT HELPDESK
            </div>

            <h1 className="auth-hero-title" style={{
              fontSize: '38px',
              fontWeight: '800',
              lineHeight: '1.25',
              margin: '0 0 16px 0',
              color: '#FFFFFF',
              letterSpacing: '-0.5px'
            }}>
              Fast, Reliable & Transparent IT Assistance for <span style={{ color: '#60A5FA' }}>Ministry Personnel</span>
            </h1>

            <p style={{
              fontSize: '15px',
              lineHeight: '1.65',
              color: '#94A3B8',
              margin: '0 0 32px 0'
            }}>
              Log technical difficulties, request network access, resolve workstation issues, or track ticket progress directly with the IT Operations Team.
            </p>

            {/* Staff-Centric Service Highlights */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '32px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '14px',
                padding: '14px 18px',
                borderRadius: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}>
                <div style={{ fontSize: '24px' }}>🖥️</div>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#F1F5F9' }}>Workstation & Hardware Support</h4>
                  <p style={{ margin: 0, fontSize: '13px', color: '#94A3B8', lineHeight: '1.4' }}>
                    Prompt on-site assistance for office computers, laptops, printers, scanners, display units, and intercoms.
                  </p>
                </div>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '14px',
                padding: '14px 18px',
                borderRadius: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}>
                <div style={{ fontSize: '24px' }}>🌐</div>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#F1F5F9' }}>Network, Internet & Access Help</h4>
                  <p style={{ margin: 0, fontSize: '13px', color: '#94A3B8', lineHeight: '1.4' }}>
                    Assistance with office Wi-Fi, LAN connectivity, ministry email setups, and system password resets.
                  </p>
                </div>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '14px',
                padding: '14px 18px',
                borderRadius: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}>
                <div style={{ fontSize: '24px' }}>📋</div>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#F1F5F9' }}>Live Tracking & Official Receipts</h4>
                  <p style={{ margin: 0, fontSize: '13px', color: '#94A3B8', lineHeight: '1.4' }}>
                    Follow inquiry status anytime from 'My Inquiries' and print official resolution slips for departmental files.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Desk Location Info */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '12px',
              color: '#64748B'
            }}>
              <span>📍 IT Unit, Floor 1, Ministry of Fisheries</span>
              <span>•</span>
              <span>✉️ minfishit@gmail.com</span>
            </div>
          </div>

          {/* Right Authentication Card */}
          <div className="auth-card-col" style={{
            backgroundColor: '#FFFFFF',
            color: '#1E293B',
            borderRadius: '20px',
            padding: '36px',
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.1)',
            position: 'relative'
          }}>
            
            {/* Tab Switcher: Sign In vs Register */}
            <div style={{
              display: 'flex',
              backgroundColor: '#F1F5F9',
              borderRadius: '12px',
              padding: '4px',
              marginBottom: '26px'
            }}>
              <button
                type="button"
                onClick={switchToLogin}
                style={{
                  flex: 1,
                  padding: '11px',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  backgroundColor: authMode === 'login' ? '#0A2540' : 'transparent',
                  color: authMode === 'login' ? '#FFFFFF' : '#64748B',
                  boxShadow: authMode === 'login' ? '0 3px 10px rgba(10, 37, 64, 0.2)' : 'none'
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={switchToRegister}
                style={{
                  flex: 1,
                  padding: '11px',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  backgroundColor: authMode === 'register' ? '#0A2540' : 'transparent',
                  color: authMode === 'register' ? '#FFFFFF' : '#64748B',
                  boxShadow: authMode === 'register' ? '0 3px 10px rgba(10, 37, 64, 0.2)' : 'none'
                }}
              >
                Register Account
              </button>
            </div>

            {/* In-Card Title Header */}
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ margin: '0 0 6px 0', fontSize: '22px', fontWeight: '800', color: '#0A2540' }}>
                {authMode === 'login' ? 'Sign In to Portal' : 'Create Staff Account'}
              </h2>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>
                {authMode === 'login' 
                  ? 'Sign in with your ministry email to manage inquiries.' 
                  : 'Register your official details to submit and track IT tickets.'}
              </p>
            </div>

            {/* Error & Success Feedback Alerts */}
            {authError && (
              <div style={{
                padding: '12px 16px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: '10px',
                color: '#991B1B',
                fontSize: '13px',
                fontWeight: '500',
                marginBottom: '18px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>⚠️</span>
                <span style={{ flex: 1 }}>{authError}</span>
              </div>
            )}

            {authSuccess && (
              <div style={{
                padding: '12px 16px',
                backgroundColor: '#F0FDF4',
                border: '1px solid #86EFAC',
                borderRadius: '10px',
                color: '#166534',
                fontSize: '13px',
                fontWeight: '600',
                marginBottom: '18px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>✅</span>
                <span style={{ flex: 1 }}>{authSuccess}</span>
              </div>
            )}

            {/* 1. LOGIN FORM */}
            {authMode === 'login' ? (
              <form onSubmit={handleLogin}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontWeight: '600', fontSize: '13px', color: '#334155', marginBottom: '6px' }}>
                    Email Address
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. user@fisheries.gov.lk"
                      required
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: '8px',
                        border: '1.5px solid #CBD5E1',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontWeight: '600', fontSize: '13px', color: '#334155' }}>
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ background: 'none', border: 'none', color: '#2563EB', fontSize: '12px', cursor: 'pointer', padding: 0 }}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: '8px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748B', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                    Remember session (8 hrs)
                  </label>
                  <span style={{ fontSize: '12px', color: '#64748B' }}>
                    Support: <strong style={{ color: '#0A2540' }}>Ext 4455</strong>
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  style={{
                    width: '100%',
                    padding: '13px',
                    backgroundColor: authLoading ? '#94A3B8' : '#0A2540',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: '700',
                    fontSize: '15px',
                    cursor: authLoading ? 'not-allowed' : 'pointer',
                    transition: 'background-color 0.2s',
                    boxShadow: '0 4px 14px rgba(10, 37, 64, 0.3)'
                  }}
                >
                  {authLoading ? 'Signing In...' : 'Sign In to Portal →'}
                </button>

                <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: '#64748B' }}>
                  New ministry employee?{' '}
                  <span
                    onClick={switchToRegister}
                    style={{ color: '#2563EB', fontWeight: '700', cursor: 'pointer' }}
                  >
                    Create Staff Account
                  </span>
                </div>
              </form>
            ) : (
              /* 2. REGISTRATION FORM */
              <form onSubmit={handleRegister}>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontWeight: '600', fontSize: '13px', color: '#334155', marginBottom: '5px' }}>
                    Full Official Name
                  </label>
                  <input
                    type="text"
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder="e.g. Sunil Perera"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontWeight: '600', fontSize: '13px', color: '#334155', marginBottom: '5px' }}>
                    Official Email Address
                  </label>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="e.g. sunil@fisheries.gov.lk"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontWeight: '600', fontSize: '13px', color: '#334155', marginBottom: '5px' }}>
                    Department / Division
                  </label>
                  <select
                    value={regDeptId}
                    onChange={(e) => setRegDeptId(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '13px',
                      outline: 'none',
                      backgroundColor: '#FFFFFF',
                      boxSizing: 'border-box'
                    }}
                  >
                    {departmentList.map((d) => (
                      <option key={d.department_id} value={d.department_id}>
                        {d.department_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: '600', fontSize: '12px', color: '#334155', marginBottom: '5px' }}>
                      Password (min 6)
                    </label>
                    <input
                      type="password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1.5px solid #CBD5E1',
                        fontSize: '13px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: '600', fontSize: '12px', color: '#334155', marginBottom: '5px' }}>
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: `1.5px solid ${regConfirmPassword && regPassword !== regConfirmPassword ? '#EF4444' : '#CBD5E1'}`,
                        fontSize: '13px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {regConfirmPassword && (
                  <div style={{
                    fontSize: '11px',
                    fontWeight: '600',
                    marginBottom: '12px',
                    color: regPassword === regConfirmPassword ? '#16A34A' : '#DC2626'
                  }}>
                    {regPassword === regConfirmPassword ? '✓ Passwords match' : '✕ Passwords do not match'}
                  </div>
                )}

                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', color: '#64748B', cursor: 'pointer', lineHeight: '1.4' }}>
                    <input
                      type="checkbox"
                      checked={regTerms}
                      onChange={(e) => setRegTerms(e.target.checked)}
                      required
                      style={{ marginTop: '2px', cursor: 'pointer' }}
                    />
                    <span>
                      I agree to the Ministry IT Acceptable Use Policy and confirm that this account is for official government duties.
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  style={{
                    width: '100%',
                    padding: '13px',
                    backgroundColor: authLoading ? '#94A3B8' : '#16A34A',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: '700',
                    fontSize: '15px',
                    cursor: authLoading ? 'not-allowed' : 'pointer',
                    transition: 'background-color 0.2s',
                    boxShadow: '0 4px 14px rgba(22, 163, 74, 0.3)'
                  }}
                >
                  {authLoading ? 'Registering Account...' : 'Complete Staff Registration ✓'}
                </button>

                <div style={{ textAlign: 'center', marginTop: '18px', fontSize: '13px', color: '#64748B' }}>
                  Already have an account?{' '}
                  <span
                    onClick={switchToLogin}
                    style={{ color: '#2563EB', fontWeight: '700', cursor: 'pointer' }}
                  >
                    Sign In
                  </span>
                </div>
              </form>
            )}

            {/* Bottom Security Badge */}
            <div style={{
              marginTop: '22px',
              paddingTop: '16px',
              borderTop: '1px solid #F1F5F9',
              textAlign: 'center',
              fontSize: '11px',
              color: '#94A3B8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}>
              <span>🔒</span>
              <span>Ministry of Fisheries</span>
            </div>
          </div>
        </main>

        {/* Official Footer */}
        <footer className="auth-footer" style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '16px 36px',
          textAlign: 'center',
          fontSize: '12px',
          color: '#64748B',
          backgroundColor: 'rgba(7, 22, 41, 0.8)'
        }}>
          © 2026 Ministry of Fisheries and Aquatic Resources • Information Technology Operations Division • All Rights Reserved.
        </footer>
      </div>
    );
  }

  return (
    <div className="dash-container" style={{ minHeight: '100vh', backgroundColor: '#F4F6F9', fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif', position: 'relative' }}>
      
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
                <td style={{ padding: '12px', fontWeight: 'bold', backgroundColor: '#F8FAFC' }}>Department / Division:</td>
                <td style={{ padding: '12px' }}>{printTicketData.department || 'Ministry Office'}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: '12px', fontWeight: 'bold', backgroundColor: '#F8FAFC' }}>Category:</td>
                <td style={{ padding: '12px' }}>{printTicketData.category}</td>
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
          padding: '24px 20px',
          borderRadius: '16px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          zIndex: 9999,
          textAlign: 'center',
          animation: 'popInBounce 0.5s ease-out forwards',
          width: '90%',
          maxWidth: '420px',
          border: '4px solid #FEF08A'
        }}>
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>🔔</div>
          <h2 style={{ margin: 0, fontSize: '24px', letterSpacing: '1px' }}>NEW TICKET RECEIVED!</h2>
          <div style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '10px', color: '#FEF08A' }}>
            {newTicketAlert.ticket_code}
          </div>
          <p style={{ margin: '10px 0 0 0', fontSize: '15px', opacity: 0.9 }}>
            Category: {newTicketAlert.category} | Department: {newTicketAlert.department || 'Ministry Office'}
          </p>
        </div>
      )}

      {/* Responsive Mobile Sticky Nav Bar - Shown on Screens <= 820px */}
      {activeTab !== 'live_monitor' && (
        <div className="mobile-nav-bar no-print">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '28px', height: '28px', backgroundColor: '#FFC107', borderRadius: '6px', color: '#000', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>MF</div>
              <span style={{ fontWeight: 'bold', fontSize: '13px', color: '#FCD34D' }}>MFAOR IT Portal</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: '#CBD5E1' }}>{user.full_name?.split(' ')[0]} ({user.role})</span>
              <button
                onClick={handleLogout}
                style={{
                  backgroundColor: '#DC2626',
                  color: '#fff',
                  border: 'none',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Logout
              </button>
            </div>
          </div>
          <div className="mobile-nav-scroll">
            {user.role === 'Staff' ? (
              <>
                <button 
                  onClick={() => navigate('/staff/my-complaints')} 
                  className={`mobile-nav-tab ${activeTab === 'my_complaints' ? 'active' : ''}`}
                >
                  📋 My Inquiries
                </button>
                <button 
                  onClick={() => navigate('/staff/submit-ticket')} 
                  className={`mobile-nav-tab ${activeTab === 'submit_ticket' ? 'active' : ''}`}
                >
                  ➕ Submit Ticket
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={() => navigate('/admin/complaints')} 
                  className={`mobile-nav-tab ${activeTab === 'all_complaints' ? 'active' : ''}`}
                >
                  📋 Complaints
                </button>
                <button 
                  onClick={() => navigate('/admin/reports')} 
                  className={`mobile-nav-tab ${activeTab === 'reports' ? 'active' : ''}`}
                >
                  📊 Reports
                </button>
                <button 
                  onClick={() => navigate('/admin/dashboard')} 
                  className={`mobile-nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
                >
                  📈 Dashboard
                </button>
                <button 
                  onClick={() => navigate('/admin/live-monitor')} 
                  className={`mobile-nav-tab ${activeTab === 'live_monitor' ? 'active' : ''}`}
                >
                  📺 Live Monitor
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Desktop Sidebar - Hidden on Mobile and in live_monitor */}
      {activeTab !== 'live_monitor' && (
        <div className="dash-sidebar no-print">
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
                  <div onClick={() => navigate('/staff/my-complaints')} style={{ padding: '12px 20px', cursor: 'pointer', backgroundColor: activeTab === 'my_complaints' ? '#1E3A5F' : 'transparent', borderLeft: activeTab === 'my_complaints' ? '4px solid #FFC107' : 'none', fontWeight: activeTab === 'my_complaints' ? 'bold' : 'normal' }}>My Complaints</div>
                  <div onClick={() => navigate('/staff/submit-ticket')} style={{ padding: '12px 20px', cursor: 'pointer', backgroundColor: activeTab === 'submit_ticket' ? '#1E3A5F' : 'transparent', borderLeft: activeTab === 'submit_ticket' ? '4px solid #FFC107' : 'none', fontWeight: activeTab === 'submit_ticket' ? 'bold' : 'normal' }}>Submit New Ticket</div>
                </>
              ) : (
                <>
                  <div onClick={() => navigate('/admin/complaints')} style={{ padding: '12px 20px', cursor: 'pointer', backgroundColor: activeTab === 'all_complaints' ? '#1E3A5F' : 'transparent', borderLeft: activeTab === 'all_complaints' ? '4px solid #FFC107' : 'none', fontWeight: activeTab === 'all_complaints' ? 'bold' : 'normal' }}>All Complaints</div>
                  <div onClick={() => navigate('/admin/reports')} style={{ padding: '12px 20px', cursor: 'pointer', backgroundColor: activeTab === 'reports' ? '#1E3A5F' : 'transparent', borderLeft: activeTab === 'reports' ? '4px solid #FFC107' : 'none', fontWeight: activeTab === 'reports' ? 'bold' : 'normal' }}>Reports</div>
                  <div onClick={() => navigate('/admin/dashboard')} style={{ padding: '12px 20px', cursor: 'pointer', backgroundColor: activeTab === 'dashboard' ? '#1E3A5F' : 'transparent', borderLeft: activeTab === 'dashboard' ? '4px solid #FFC107' : 'none', fontWeight: activeTab === 'dashboard' ? 'bold' : 'normal' }}>Dashboard Overview</div>
                  <div onClick={() => navigate('/admin/live-monitor')} style={{ padding: '12px 20px', cursor: 'pointer', backgroundColor: activeTab === 'live_monitor' ? '#1E3A5F' : 'transparent', borderLeft: activeTab === 'live_monitor' ? '4px solid #FFC107' : 'none', fontWeight: activeTab === 'live_monitor' ? 'bold' : 'normal' }}>Live Monitor (TV Display)</div>
                </>
              )}
            </div>
          </div>

          <div style={{ padding: '0 20px', borderTop: '1px solid #1E3A5F', paddingTop: '15px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{user.full_name}</div>
            <div style={{ fontSize: '12px', color: '#8A9DB0' }}>{user.role}</div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="dash-content">
        
        {/* Top Header Controls */}
        <div className="dash-topbar">
          <div>
            <h2 style={{ margin: 0, color: '#0A2540', fontSize: activeTab === 'live_monitor' ? '28px' : '22px' }}>
              {user.role === 'Admin' 
                ? (activeTab === 'reports' ? 'MFAOR IT - System Reports' : activeTab === 'dashboard' ? 'MFAOR IT - Executive Dashboard' : activeTab === 'live_monitor' ? 'MFAOR IT - Executive Dashboard' : 'MFAOR IT - All Inquiry Complaints') 
                : 'MFAR IT - My Inquiries'}
            </h2>
            <span style={{ fontSize: activeTab === 'live_monitor' ? '15px' : '13px', color: '#666' }}>
              {user.role === 'Admin' ? 'Live ticket analytics and management system' : 'Submit tickets and track the status of your complaints'}
            </span>
          </div>
          <div className="dash-topbar-actions" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {activeTab === 'live_monitor' && (
              <button 
                onClick={() => navigate('/admin/complaints')} 
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
            <span style={{ fontSize: activeTab === 'live_monitor' ? '16px' : '13px', color: '#666', fontWeight: '600', marginRight: '4px' }}>{tickets.length} tickets</span>

            {/* Top Quick Logout Button & User Badge */}
            <div className="no-print" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: '#FFFFFF',
              padding: '5px 12px',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
            }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: '700', fontSize: '13px', color: '#0A2540', lineHeight: '1.2' }}>{user.full_name}</div>
                <span style={{
                  display: 'inline-block',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  backgroundColor: user.role === 'Admin' ? '#FEF3C7' : '#DBEAFE',
                  color: user.role === 'Admin' ? '#B45309' : '#1E40AF',
                  fontWeight: '700',
                  fontSize: '10px',
                  marginTop: '2px'
                }}>
                  {user.role}
                </span>
              </div>
              <button
                onClick={handleLogout}
                title="Log out of Ministry Portal"
                style={{
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '7px 14px',
                  borderRadius: '6px',
                  fontWeight: '700',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 6px rgba(220, 38, 38, 0.25)'
                }}
              >
                <span>🚪</span>
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>

        {/* Analytics Cards View (Shown for Dashboard, Reports, and Live Monitor) */}
        {(activeTab === 'dashboard' || activeTab === 'reports' || activeTab === 'live_monitor') && (
          <div className="dash-kpi-grid">
            <div className="dash-kpi-card" style={{ backgroundColor: '#2563EB' }}>
              <span style={{ fontSize: activeTab === 'live_monitor' ? '18px' : '12px', opacity: 0.9 }}>{user.role === 'Admin' ? 'Open Tickets' : 'Total Submitted'}</span>
              <h1 style={{ margin: '12px 0 0 0', fontSize: activeTab === 'live_monitor' ? '56px' : '32px', fontWeight: 'bold' }}>{user.role === 'Admin' ? pendingCount : totalSubmitted}</h1>
            </div>
            <div className="dash-kpi-card" style={{ backgroundColor: '#D97706' }}>
              <span style={{ fontSize: activeTab === 'live_monitor' ? '18px' : '12px', opacity: 0.9 }}>In Progress</span>
              <h1 style={{ margin: '12px 0 0 0', fontSize: activeTab === 'live_monitor' ? '56px' : '32px', fontWeight: 'bold' }}>{inProgressCount}</h1>
            </div>
            <div className="dash-kpi-card" style={{ backgroundColor: '#16A34A' }}>
              <span style={{ fontSize: activeTab === 'live_monitor' ? '18px' : '12px', opacity: 0.9 }}>{user.role === 'Admin' ? 'Closed / Resolved' : 'Resolved'}</span>
              <h1 style={{ margin: '12px 0 0 0', fontSize: activeTab === 'live_monitor' ? '56px' : '32px', fontWeight: 'bold' }}>{resolvedCount}</h1>
            </div>
            <div className="dash-kpi-card" style={{ backgroundColor: '#1E40AF' }}>
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
                        <span style={{ fontSize: '13px', padding: '3px 10px', borderRadius: '12px', backgroundColor: '#DBEAFE', fontWeight: '600', color: '#1E40AF' }}>{t.department || 'Ministry Office'}</span>
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
          <div className="submit-form-container" style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', maxWidth: '600px', marginBottom: '30px' }}>
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
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '5px' }}>Department / Division</label>
                <select value={department} onChange={(e) => setDepartment(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}>
                  <option value="Ministry Office">Ministry Office</option>
                  <option value="Deputy Minister Office">Deputy Minister Office</option>
                  <option value="Secretary Office">Secretary Office</option>
                  <option value="Administration Division">Administration Division</option>
                  <option value="Finance Division">Finance Division</option>
                  <option value="Internal Audit">Internal Audit</option>
                  <option value="Engineering Division">Engineering Division</option>
                  <option value="Agriculture Division">Agriculture Division</option>
                  <option value="IT Unit">IT Unit</option>
                  <option value="Planning Division">Planning Division</option>
                  <option value="Technical Division">Technical Division</option>
                  <option value="Development Division">Development Division</option>
                  <option value="Government Audit Division">Government Audit Division</option>
                  <option value="Statistics Unit">Statistics Unit</option>
                  <option value="National Fisheries Federation">National Fisheries Federation</option>
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
          <div className="filter-bar-container no-print">
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

            <select value={filterDepartment} onChange={(e) => setFilterDepartment(e.target.value)} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc' }}>
              <option value="All">All Departments</option>
              <option value="Ministry Office">Ministry Office</option>
              <option value="Deputy Minister Office">Deputy Minister Office</option>
              <option value="Secretary Office">Secretary Office</option>
              <option value="Administration Division">Administration Division</option>
              <option value="Finance Division">Finance Division</option>
              <option value="Internal Audit">Internal Audit</option>
              <option value="Engineering Division">Engineering Division</option>
              <option value="Agriculture Division">Agriculture Division</option>
              <option value="IT Unit">IT Unit</option>
              <option value="Planning Division">Planning Division</option>
              <option value="Technical Division">Technical Division</option>
              <option value="Development Division">Development Division</option>
              <option value="Government Audit Division">Government Audit Division</option>
              <option value="Statistics Unit">Statistics Unit</option>
              <option value="National Fisheries Federation">National Fisheries Federation</option>
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
            <div className="table-responsive-container">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #EDF2F7', color: '#718096', height: '40px' }}>
                  <th style={{ padding: '10px' }}>Code</th>
                  {user.role === 'Admin' && <th style={{ padding: '10px' }}>User</th>}
                  <th style={{ padding: '10px' }}>Category</th>
                  <th style={{ padding: '10px' }}>Department</th>
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
                      <td style={{ padding: '10px', fontWeight: '500' }}>{t.category}</td>
                      <td style={{ padding: '10px' }}>
                        <span style={{ 
                          fontWeight: '600',
                          color: '#0A2540',
                          backgroundColor: '#F1F5F9',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '13px',
                          display: 'inline-block'
                        }}>
                          {t.department || 'Ministry Office'}
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
                    <td colSpan={user.role === 'Admin' ? '9' : '8'} style={{ textAlign: 'center', padding: '20px', color: '#888' }}>No tickets found.</td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          </div>
        )}

        {/* View Details Modal */}
        {selectedTicket && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '16px' }}>
            <div className="modal-responsive-card">
              <h3 style={{ marginTop: 0, borderBottom: '1px solid #ddd', paddingBottom: '10px' }}>Ticket Details ({selectedTicket.ticket_code})</h3>
              <p><strong>Category:</strong> {selectedTicket.category}</p>
              <p><strong>Department / Division:</strong> {selectedTicket.department || 'Ministry Office'}</p>
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

export default function App() {
  return (
    <BrowserRouter>
      <MainPortal />
    </BrowserRouter>
  );
}