import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import './DashboardPage.css';
import './AdminPage.css'; // For payment-list styles

export default function DashboardPage() {
  const { currentUser, userData, isSubscriptionActive } = useAuth();

  const subActive = isSubscriptionActive();
  const expiresAt = userData?.subscription?.expiresAt;
  const expiryDate = expiresAt
    ? (expiresAt.toDate ? expiresAt.toDate() : new Date(expiresAt)).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  const [resumeCount, setResumeCount] = useState(0);
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    async function fetchData() {
      if (!currentUser) return;
      try {
        // Fetch Resume Count
        const snap = await getDocs(collection(db, 'users', currentUser.uid, 'resumes'));
        setResumeCount(snap.size);

        // Fetch Payment History (sort locally to avoid requiring a composite index)
        const payQ = query(collection(db, 'payments'), where('uid', '==', currentUser.uid));
        const paySnap = await getDocs(payQ);
        const fetchedPayments = paySnap.docs.map(d => ({ id: d.id, ...d.data() }));
        fetchedPayments.sort((a, b) => b.submittedAt?.toMillis() - a.submittedAt?.toMillis());
        setPayments(fetchedPayments);
      } catch (e) {
        console.error('Failed to fetch dashboard data:', e);
      }
    }
    fetchData();
  }, [currentUser]);

  return (
    <div className="dashboard-page">
      <div className="page-container">
        {/* Welcome */}
        <div className="dashboard-header animate-fade-in-up">
          <div>
            <h2 className="dot-font">Welcome, {currentUser?.displayName || 'User'}! 👋</h2>
            <p>Manage your resume and subscription from here.</p>
          </div>
        </div>

        {/* Status Cards */}
        <div className="dashboard-grid">
          {/* Subscription Card */}
          <div className="glass-card dashboard-card">
            <div className="card-icon-wrap" style={{ background: subActive ? 'rgba(0, 212, 170, 0.12)' : 'rgba(255, 215, 0, 0.12)' }}>
              <i className={`fas ${subActive ? 'fa-crown' : 'fa-lock'}`} style={{ color: subActive ? 'var(--accent-secondary)' : 'var(--accent-gold)' }}></i>
            </div>
            <h4 className="dot-font">Subscription</h4>
            {subActive ? (
              <>
                <span className="badge badge-success">Active</span>
                <p className="card-detail">Expires: {expiryDate}</p>
                <p className="card-detail-sub">Unlimited edits & PDF downloads</p>
              </>
            ) : (
              <>
                <span className="badge badge-warning">Inactive</span>
                <p className="card-detail">Upgrade to download PDFs</p>
                <Link to="/payment" className="btn btn-primary btn-sm" style={{ marginTop: '12px' }}>
                  <i className="fas fa-bolt"></i> Activate — ₹5/year
                </Link>
              </>
            )}
          </div>

          {/* Resume Card */}
          <div className="glass-card dashboard-card">
            <div className="card-icon-wrap" style={{ background: 'rgba(108, 99, 255, 0.12)' }}>
              <i className="fas fa-file-alt" style={{ color: 'var(--accent-primary-light)' }}></i>
            </div>
            <h4 className="dot-font">Your Resumes</h4>
            <p className="card-detail" style={{ fontSize: '1.1rem', fontWeight: 600 }}>{resumeCount} saved</p>
            <p className="card-detail-sub">Manage multiple versions and history</p>
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <Link to="/resumes" className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
                <i className="fas fa-history"></i> History
              </Link>
              <Link to="/editor" className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
                <i className="fas fa-plus"></i> New
              </Link>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="glass-card dashboard-card">
            <div className="card-icon-wrap" style={{ background: 'rgba(255, 107, 107, 0.12)' }}>
              <i className="fas fa-bolt" style={{ color: 'var(--accent-warm)' }}></i>
            </div>
            <h4 className="dot-font">Quick Actions</h4>
            <div className="quick-actions">
              <Link to="/resumes" className="btn btn-secondary btn-sm">
                <i className="fas fa-history"></i> My Resumes
              </Link>
              {subActive && (
                <Link to="/editor" className="btn btn-secondary btn-sm">
                  <i className="fas fa-download"></i> Download PDF
                </Link>
              )}
              {!subActive && (
                <Link to="/payment" className="btn btn-secondary btn-sm">
                  <i className="fas fa-credit-card"></i> Make Payment
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Account Info */}
        <div className="glass-card account-info" style={{ marginTop: 'var(--space-xl)' }}>
          <h4 className="dot-font"><i className="fas fa-user-circle"></i> Account Information</h4>
          <div className="account-details">
            <div className="account-row">
              <span className="account-label">Name</span>
              <span>{currentUser?.displayName || '—'}</span>
            </div>
            <div className="account-row">
              <span className="account-label">Email</span>
              <span>{currentUser?.email}</span>
            </div>
            <div className="account-row">
              <span className="account-label">Status</span>
              <span className={`badge ${subActive ? 'badge-success' : 'badge-warning'}`}>
                {subActive ? 'Premium' : 'Free'}
              </span>
            </div>
            {userData?.subscription?.transactionId && (
              <div className="account-row">
                <span className="account-label">Current Transaction ID</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{userData.subscription.transactionId}</span>
              </div>
            )}
          </div>
        </div>

        {/* Payment History */}
        <div className="glass-card account-info" style={{ marginTop: 'var(--space-xl)' }}>
          <h4 className="dot-font"><i className="fas fa-history"></i> Payment History</h4>
          {payments.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No payment history found.</p>
          ) : (
            <div className="payments-list" style={{ marginTop: '16px' }}>
              {payments.map(payment => (
                <div key={payment.id} className="payment-item glass-card" style={{ padding: '16px', background: 'var(--bg-primary)' }}>
                  <div className="payment-info">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <strong style={{ fontSize: '1.05rem' }}>₹{payment.amount} - Subscription</strong>
                      <span className={`badge badge-${payment.status === 'approved' ? 'success' : payment.status === 'rejected' ? 'danger' : 'warning'}`}>
                        {payment.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="payment-details-row" style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                      <div className="payment-detail">
                        <span className="detail-label">Transaction ID</span>
                        <span className="detail-value mono">{payment.transactionId}</span>
                      </div>
                      <div className="payment-detail">
                        <span className="detail-label">Date Submitted</span>
                        <span className="detail-value">{payment.submittedAt?.toDate ? payment.submittedAt.toDate().toLocaleDateString() : 'N/A'}</span>
                      </div>
                      {payment.status === 'rejected' && payment.reason && (
                        <div className="payment-detail">
                          <span className="detail-label" style={{ color: 'var(--accent-warm)' }}>Rejection Reason</span>
                          <span className="detail-value">{payment.reason}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
