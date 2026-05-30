import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import './Navbar.css';

export default function Navbar() {
  const { currentUser, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    if (!currentUser || !isAdmin()) return;

    // Real-time listener for pending payments
    const qPayments = query(collection(db, 'payments'), where('status', '==', 'pending'));
    const unsubPayments = onSnapshot(qPayments, (snap) => {
      setNotificationCount(prev => prev + snap.docChanges().filter(change => change.type === 'added').length - snap.docChanges().filter(change => change.type === 'removed').length);
    });

    // Real-time listener for open tickets
    const qTickets = query(collection(db, 'supportTickets'), where('status', '==', 'open'));
    const unsubTickets = onSnapshot(qTickets, (snap) => {
      setNotificationCount(prev => prev + snap.docChanges().filter(change => change.type === 'added').length - snap.docChanges().filter(change => change.type === 'removed').length);
    });

    // Initial load
    const loadInitial = async () => {
      let count = 0;
      const { getDocs } = await import('firebase/firestore');
      const pSnap = await getDocs(qPayments);
      count += pSnap.size;
      const tSnap = await getDocs(qTickets);
      count += tSnap.size;
      setNotificationCount(count);
    };
    loadInitial();

    return () => {
      unsubPayments();
      unsubTickets();
    };
  }, [currentUser, isAdmin]);

  async function handleLogout() {
    try {
      await logout();
      navigate('/');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  }

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <i className="fas fa-file-alt"></i>
        ResumeForge
      </Link>

      <ul className="navbar-nav">
        {currentUser ? (
          <>
            {!isAdmin() && (
              <>
                <li><Link to="/dashboard"><i className="fas fa-th-large"></i> <span className="nav-text">Dashboard</span></Link></li>
                <li><Link to="/support"><i className="fas fa-headset"></i> <span className="nav-text">Support</span></Link></li>
              </>
            )}
            <li><Link to="/editor"><i className="fas fa-edit"></i> <span className="nav-text">Editor</span></Link></li>
            {isAdmin() && (
              <>
                <li><Link to="/admin"><i className="fas fa-chart-pie"></i> <span className="nav-text">Dashboard</span></Link></li>
                <li><Link to="/admin/payments"><i className="fas fa-rupee-sign"></i> <span className="nav-text">Payments</span></Link></li>
                <li>
                  <Link to="/admin/support" style={{ position: 'relative' }}>
                    <i className="fas fa-shield-alt"></i> <span className="nav-text">Support Tickets</span>
                    {notificationCount > 0 && (
                      <span className="badge badge-danger" style={{ position: 'absolute', top: '-5px', right: '-15px', fontSize: '0.6rem', padding: '2px 5px', borderRadius: '50%' }}>
                        {notificationCount}
                      </span>
                    )}
                  </Link>
                </li>
              </>
            )}
            <li>
              <button className="btn btn-sm btn-secondary" onClick={handleLogout}>
                <i className="fas fa-sign-out-alt"></i> <span className="nav-text">Logout</span>
              </button>
            </li>
          </>
        ) : (
          <>
            <li><Link to="/login" className="btn btn-sm btn-secondary">Log In</Link></li>
            <li><Link to="/register" className="btn btn-sm btn-primary">Sign Up Free</Link></li>
          </>
        )}
      </ul>
    </nav>
  );
}
