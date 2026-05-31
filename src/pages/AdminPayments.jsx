import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import './AdminPage.css';

export default function AdminPayments() {
  const { isAdmin } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [filter, setFilter] = useState('pending');

  if (!isAdmin()) {
    return <Navigate to="/dashboard" replace />;
  }

  useEffect(() => {
    loadPayments();
  }, []);

  async function loadPayments() {
    setLoading(true);
    try {
      const q = query(collection(db, 'payments'), orderBy('submittedAt', 'desc'));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPayments(data);
    } catch (err) {
      console.error('Failed to load payments:', err);
    }
    setLoading(false);
  }

  async function handleApprove(payment) {
    setActionLoading(payment.id);
    try {
      // Update payment status
      await updateDoc(doc(db, 'payments', payment.id), {
        status: 'approved',
        reviewedAt: serverTimestamp()
      });

      // Activate user subscription
      const now = new Date();
      const expiresAt = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
      await updateDoc(doc(db, 'users', payment.uid), {
        'subscription.active': true,
        'subscription.paidAt': serverTimestamp(),
        'subscription.expiresAt': expiresAt,
        'subscription.transactionId': payment.transactionId
      });

      // Send email notification to User
      try {
        await fetch('/api/sendEmail', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            template: 'user',
            templateParams: {
              to_email: payment.email,
              subject: 'Your Payment is Approved!',
              message: `Hello ${payment.name || 'User'},\n\nYour payment for ResumeForge (Transaction ID: ${payment.transactionId}) has been successfully verified!\n\nYou now have full access to download your PDFs. Happy building!`
            }
          })
        });
      } catch (emailErr) {
        console.error('Email failed', emailErr);
      }

      await loadPayments();
    } catch (err) {
      console.error('Approve failed:', err);
      alert('Failed to approve. Check console for details.');
    }
    setActionLoading(null);
  }

  async function handleReject(payment) {
    setActionLoading(payment.id);
    try {
      await updateDoc(doc(db, 'payments', payment.id), {
        status: 'rejected',
        reviewedAt: serverTimestamp()
      });
      await loadPayments();
    } catch (err) {
      console.error('Reject failed:', err);
    }
    setActionLoading(null);
  }

  const filtered = payments.filter(p => filter === 'all' || p.status === filter);

  return (
    <div className="admin-page">
      <div className="page-container">
        <div className="dashboard-header animate-fade-in-up">
          <h2 className="dot-font"><i className="fas fa-shield-alt"></i> Admin Panel</h2>
          <p>Manage payment verifications and user subscriptions.</p>
        </div>

        {/* Stats */}
        <div className="admin-stats">
          <div className="admin-stat glass-card">
            <span className="admin-stat-number">{payments.filter(p => p.status === 'pending').length}</span>
            <span className="admin-stat-label">Pending</span>
          </div>
          <div className="admin-stat glass-card">
            <span className="admin-stat-number" style={{ color: 'var(--accent-secondary)' }}>{payments.filter(p => p.status === 'approved').length}</span>
            <span className="admin-stat-label">Approved</span>
          </div>
          <div className="admin-stat glass-card">
            <span className="admin-stat-number" style={{ color: 'var(--accent-warm)' }}>{payments.filter(p => p.status === 'rejected').length}</span>
            <span className="admin-stat-label">Rejected</span>
          </div>
          <div className="admin-stat glass-card">
            <span className="admin-stat-number">{payments.length}</span>
            <span className="admin-stat-label">Total</span>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="filter-tabs">
          {['pending', 'approved', 'rejected', 'all'].map(f => (
            <button
              key={f}
              className={`section-tab ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
          <button className="btn btn-sm btn-secondary" onClick={loadPayments} style={{ marginLeft: 'auto' }}>
            <i className="fas fa-sync-alt"></i> Refresh
          </button>
        </div>

        {/* Payments list */}
        {loading ? (
          <div className="loading-screen" style={{ minHeight: '200px' }}>
            <div className="spinner"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state glass-card">
            <i className="fas fa-inbox"></i>
            <p>No {filter === 'all' ? '' : filter} payments found.</p>
          </div>
        ) : (
          <div className="payments-list">
            {filtered.map(payment => (
              <div key={payment.id} className="payment-item glass-card">
                <div className="payment-info">
                  <div className="payment-user">
                    <i className="fas fa-user-circle"></i>
                    <div>
                      <strong>{payment.email}</strong>
                      <span className="payment-uid">UID: {payment.uid?.slice(0, 12)}...</span>
                    </div>
                  </div>
                  <div className="payment-details-row">
                    <div className="payment-detail">
                      <span className="detail-label">Name & Phone</span>
                      <span className="detail-value">{payment.name || 'N/A'}<br/>{payment.phone || 'N/A'}</span>
                    </div>
                    <div className="payment-detail">
                      <span className="detail-label">Transaction ID</span>
                      <span className="detail-value mono">{payment.transactionId}</span>
                    </div>
                    <div className="payment-detail">
                      <span className="detail-label">Amount</span>
                      <span className="detail-value">₹{payment.amount}</span>
                    </div>
                    <div className="payment-detail">
                      <span className="detail-label">Submitted</span>
                      <span className="detail-value">
                        {payment.submittedAt?.toDate
                          ? payment.submittedAt.toDate().toLocaleString('en-IN')
                          : '—'}
                      </span>
                    </div>
                    <div className="payment-detail">
                      <span className="detail-label">Status</span>
                      <span className={`badge badge-${payment.status === 'approved' ? 'success' : payment.status === 'rejected' ? 'danger' : 'warning'}`}>
                        {payment.status}
                      </span>
                    </div>
                  </div>
                </div>
                {payment.status === 'pending' && (
                  <div className="payment-actions">
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => handleApprove(payment)}
                      disabled={actionLoading === payment.id}
                    >
                      <i className="fas fa-check"></i> Approve
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleReject(payment)}
                      disabled={actionLoading === payment.id}
                    >
                      <i className="fas fa-times"></i> Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
