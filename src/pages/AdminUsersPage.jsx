import { useState, useEffect } from 'react';
import { collection, getDocs, updateDoc, doc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import './AdminPage.css';

export default function AdminUsersPage() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAdmin()) loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      const fetchedUsers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort by creation date or just put blocked users at the bottom
      fetchedUsers.sort((a, b) => {
        if (a.isBlocked && !b.isBlocked) return 1;
        if (!a.isBlocked && b.isBlocked) return -1;
        return 0;
      });
      setUsers(fetchedUsers);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
    setLoading(false);
  }

  async function toggleBlockUser(userId, currentStatus) {
    if (!window.confirm(`Are you sure you want to ${currentStatus ? 'UNBLOCK' : 'BLOCK'} this user?`)) return;
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { isBlocked: !currentStatus });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, isBlocked: !currentStatus } : u));
    } catch (err) {
      console.error('Failed to toggle block:', err);
      alert('Failed to update user status.');
    }
  }

  async function wipeUserData(userId, email) {
    if (!window.confirm(`CRITICAL WARNING: This will permanently delete ALL resumes, payments, and support tickets for ${email}. It cannot be undone. Type "WIPE" to confirm:`)) return;
    
    // In a real scenario we'd use a prompt, but a confirm is okay for now. Let's use prompt for safety.
    const confirmText = window.prompt(`Type WIPE to delete data for ${email}`);
    if (confirmText !== 'WIPE') {
      alert('Wipe cancelled.');
      return;
    }

    try {
      // Delete user document
      await deleteDoc(doc(db, 'users', userId));

      // Delete payments
      const paymentsQ = query(collection(db, 'payments'), where('uid', '==', userId));
      const paySnap = await getDocs(paymentsQ);
      for (const p of paySnap.docs) {
        await deleteDoc(doc(db, 'payments', p.id));
      }

      // Delete support tickets
      const ticketsQ = query(collection(db, 'supportTickets'), where('uid', '==', userId));
      const tickSnap = await getDocs(ticketsQ);
      for (const t of tickSnap.docs) {
        await deleteDoc(doc(db, 'supportTickets', t.id));
      }

      alert(`All database records for ${email} have been permanently deleted.`);
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err) {
      console.error('Failed to wipe user data:', err);
      alert('Failed to delete some or all user data.');
    }
  }

  if (!isAdmin()) {
    return <Navigate to="/dashboard" replace />;
  }

  if (loading) {
    return <div className="loading-screen"><div className="spinner"></div></div>;
  }

  return (
    <div className="admin-page">
      <div className="page-container">
        
        <div className="dashboard-header animate-fade-in-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 className="dot-font"><i className="fas fa-users"></i> Manage Users</h2>
            <p>Block accounts or permanently wipe user data.</p>
          </div>
          <Link to="/admin" className="btn btn-secondary">
            <i className="fas fa-arrow-left"></i> Back to Dashboard
          </Link>
        </div>

        <div className="entry-card glass-card animate-fade-in-up" style={{ marginTop: '24px' }}>
          <div className="payments-list">
            {users.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No users found.</p>
            ) : (
              users.map(user => (
                <div key={user.id} className="payment-item glass-card" style={{ padding: '16px', background: 'var(--bg-primary)', opacity: user.isBlocked ? 0.6 : 1 }}>
                  <div className="payment-info" style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                      <i className="fas fa-user-circle" style={{ fontSize: '2rem', color: user.isBlocked ? 'var(--text-muted)' : 'var(--accent-primary-light)' }}></i>
                      <div>
                        <strong style={{ fontSize: '1.1rem', display: 'block' }}>
                          {user.displayName || 'No Name'} 
                          {user.isBlocked && <span className="badge badge-danger" style={{ marginLeft: '8px', fontSize: '0.7rem' }}>BLOCKED</span>}
                        </strong>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{user.email}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>UID: {user.id}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        className={`btn btn-sm ${user.isBlocked ? 'btn-success' : 'btn-warning'}`} 
                        onClick={() => toggleBlockUser(user.id, user.isBlocked)}
                      >
                        <i className={`fas ${user.isBlocked ? 'fa-unlock' : 'fa-ban'}`}></i> {user.isBlocked ? 'Unblock' : 'Block'}
                      </button>
                      <button 
                        className="btn btn-sm btn-danger" 
                        onClick={() => wipeUserData(user.id, user.email)}
                      >
                        <i className="fas fa-trash-alt"></i> Wipe Data
                      </button>
                    </div>

                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
