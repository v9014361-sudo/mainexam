import React, { useState, useEffect } from 'react';
import { Search, Bell, ChevronDown, Moon, Sun } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import NotificationPanel from './NotificationPanel';

const Navbar = ({ toggleDarkMode, isDarkMode }) => {
  const { user } = useAuth();
  const [isNoteOpen, setIsNoteOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'teacher') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const socket = new WebSocket(`${protocol}//${window.location.host}/ws/proctor`);
      
      socket.onopen = () => {
        socket.send(JSON.stringify({ type: 'auth', token: localStorage.getItem('token') }));
      };

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'violation:live') {
          setNotifications(prev => [
            {
              id: Date.now(),
              type: 'violation:live',
              title: `Violation: ${data.violationType}`,
              subtitle: `${data.studentName} flagged in ${data.examId}`,
              time: 'Just now',
              severity: data.severity || 'high'
            },
            ...prev
          ].slice(0, 20));
        }
      };

      return () => socket.close();
    }
  }, [user]);

  return (
    <header className="navbar">
      <div className="navbar-left">
        <div className="search-box">
          <Search size={18} className="text-muted" />
          <input 
            type="text" 
            placeholder="Search students, exams, reports..." 
            className="search-input"
          />
        </div>
      </div>

      <div className="navbar-right">
        <button 
          className="nav-icon-btn" 
          onClick={toggleDarkMode}
          title="Toggle Dark Mode"
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <div className="relative">
          <button 
            className="nav-icon-btn" 
            title="Notifications"
            onClick={() => setIsNoteOpen(!isNoteOpen)}
          >
            <Bell size={20} />
            {notifications.length > 0 && <span className="btn-badge">{notifications.length}</span>}
          </button>
          
          <NotificationPanel 
            isOpen={isNoteOpen} 
            onClose={() => setIsNoteOpen(false)} 
            notifications={notifications}
            setNotifications={setNotifications}
          />
        </div>

        <div className="user-profile">
          <img 
            src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name || 'Admin'}&background=2563eb&color=fff`} 
            alt="Admin" 
            className="avatar" 
          />
          <div className="user-info">
            <span className="user-name">{user?.name || 'User'}</span>
            <span className="user-role">
              {user?.role === 'admin' ? 'Super Admin' : user?.role === 'teacher' ? 'Faculty Admin' : 'Staff'}
            </span>
          </div>
          <ChevronDown size={16} className="text-muted" />
        </div>
      </div>
    </header>
  );
};

export default Navbar;
