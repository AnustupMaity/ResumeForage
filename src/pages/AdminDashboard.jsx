import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, limit, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import './AdminPage.css';

export default function AdminDashboard() {
  const { isAdmin, currentUser, userData } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalRevenue: 0,
    pendingPayments: 0,
    openTickets: 0
  });
  const [recentPending, setRecentPending] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAdmin()) loadDashboardData();
  }, []);

  async function loadDashboardData() {
    setLoading(true);
    try {
      // 1. Total Users
      const usersSnap = await getDocs(collection(db, 'users'));
      const totalUsers = usersSnap.size;

      // 2. Revenue & Pending Payments
      const paymentsSnap = await getDocs(collection(db, 'payments'));
      let revenue = 0;
      let pendingCount = 0;
      const allPending = [];
      paymentsSnap.forEach(doc => {
        const data = doc.data();
        if (data.status === 'approved') {
          revenue += data.amount || 0;
        } else if (data.status === 'pending') {
          pendingCount++;
          allPending.push({ id: doc.id, ...data });
        }
      });
      
      // Sort pending to get top 5 latest
      allPending.sort((a, b) => b.submittedAt?.toMillis() - a.submittedAt?.toMillis());
      setRecentPending(allPending.slice(0, 5));

      // 3. Open Tickets
      const ticketsQ = query(collection(db, 'supportTickets'), where('status', '==', 'open'));
      const ticketsSnap = await getDocs(ticketsQ);
      const openTicketsCount = ticketsSnap.size;

      setStats({
        totalUsers,
        totalRevenue: revenue,
        pendingPayments: pendingCount,
        openTickets: openTicketsCount
      });
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
    setLoading(false);
  }

  if (!isAdmin()) {
    return <Navigate to="/dashboard" replace />;
  }

  if (loading) {
    return <div className="loading-screen"><div className="spinner"></div></div>;
  }

  const resumeName = userData?.resume?.personalInfo?.name;

  return (
    <div className="admin-page">
      <div className="page-container">
        
        {/* --- PERSONAL ADMIN DASHBOARD WIDGETS --- */}
        <div className="dashboard-header animate-fade-in-up">
          <div>
            <h2 className="dot-font">Welcome, {currentUser?.displayName || 'ADMIN'}! 👋</h2>
            <p>Manage your resume and subscription.</p>
          </div>
        </div>

        <div className="dashboard-grid" style={{ marginBottom: '32px' }}>
          {/* Subscription Card - Slim */}
          <div className="glass-card dashboard-card" style={{ padding: '16px' }}>
            <h4 style={{ fontSize: '1rem', marginBottom: '8px' }}><i className="fas fa-crown" style={{ color: 'var(--accent-secondary)', marginRight: '8px' }}></i> Subscription</h4>
            <span className="badge badge-success">FOREVER</span>
            <p className="card-detail-sub" style={{ marginTop: '8px' }}>Unlimited edits & PDF downloads</p>
          </div>

          {/* Resume Card - Slim */}
          <div className="glass-card dashboard-card" style={{ padding: '16px' }}>
            <h4 style={{ fontSize: '1rem', marginBottom: '8px' }}><i className="fas fa-file-alt" style={{ color: 'var(--accent-primary-light)', marginRight: '8px' }}></i> Your Resume</h4>
            {resumeName ? (
              <>
                <p className="card-detail" style={{ fontSize: '1rem', fontWeight: 600 }}>{resumeName}</p>
                <p className="card-detail-sub" style={{ fontSize: '0.8rem' }}>{userData?.resume?.education?.length || 0} ed • {userData?.resume?.projects?.length || 0} proj • {userData?.resume?.experience?.length || 0} exp</p>
              </>
            ) : (
              <p className="card-detail" style={{ fontSize: '0.9rem' }}>No resume data yet. Start building!</p>
            )}
            <Link to="/editor" className="btn btn-primary btn-sm" style={{ marginTop: '8px', width: '100%' }}>
              <i className="fas fa-edit"></i> {resumeName ? 'Edit Resume' : 'Start Building'}
            </Link>
          </div>

          {/* Quick Actions - Slim */}
          <div className="glass-card dashboard-card" style={{ padding: '16px' }}>
            <h4 style={{ fontSize: '1rem', marginBottom: '8px' }}><i className="fas fa-bolt" style={{ color: 'var(--accent-warm)', marginRight: '8px' }}></i> Quick Actions</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Link to="/editor" className="btn btn-secondary btn-sm" style={{ width: '100%' }}>
                <i className="fas fa-edit"></i> Edit Resume
              </Link>
              <Link to="/editor" className="btn btn-secondary btn-sm" style={{ width: '100%' }}>
                <i className="fas fa-download"></i> Download PDF
              </Link>
            </div>
          </div>
        </div>

        <div className="glass-card account-info" style={{ marginBottom: '48px', padding: '16px' }}>
          <h4 style={{ fontSize: '1rem', marginBottom: '12px' }}><i className="fas fa-user-shield"></i> Account Information</h4>
          <div className="account-details" style={{ fontSize: '0.9rem' }}>
            <div className="account-row">
              <span className="account-label">Name</span>
              <span>{currentUser?.displayName || 'ADMIN'}</span>
            </div>
            <div className="account-row">
              <span className="account-label">Email</span>
              <span>{currentUser?.email}</span>
            </div>
            <div className="account-row">
              <span className="account-label">Status</span>
              <span className="badge badge-success">ADMIN</span>
            </div>
          </div>
        </div>

        {/* --- GLOBAL PLATFORM STATS --- */}
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '32px' }}></div>
        
        <div className="dashboard-header animate-fade-in-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 className="dot-font"><i className="fas fa-chart-pie"></i> Platform Overview</h2>
            <p>High-level statistics of ResumeForge platform.</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Link to="/admin/users" className="btn btn-secondary"><i className="fas fa-users"></i> Manage Users</Link>
            <Link to="/admin/payments" className="btn btn-secondary"><i className="fas fa-rupee-sign"></i> Manage Payments</Link>
            <Link to="/admin/support" className="btn btn-secondary"><i className="fas fa-headset"></i> Support Tickets</Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="admin-stats animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="admin-stat glass-card">
            <span className="admin-stat-number" style={{ color: 'var(--accent-primary-light)' }}>{stats.totalUsers}</span>
            <span className="admin-stat-label">Total Users</span>
          </div>
          <div className="admin-stat glass-card">
            <span className="admin-stat-number" style={{ color: 'var(--accent-success)' }}>₹{stats.totalRevenue.toFixed(2)}</span>
            <span className="admin-stat-label">Total Revenue</span>
          </div>
          <div className="admin-stat glass-card">
            <span className="admin-stat-number" style={{ color: 'var(--accent-warning)' }}>{stats.pendingPayments}</span>
            <span className="admin-stat-label">Pending Payments</span>
          </div>
          <div className="admin-stat glass-card">
            <span className="admin-stat-number" style={{ color: 'var(--accent-danger)' }}>{stats.openTickets}</span>
            <span className="admin-stat-label">Open Support Tickets</span>
          </div>
        </div>

        {/* Top 5 Pending Approvals Marquee/List */}
        <div className="entry-card glass-card animate-fade-in-up" style={{ marginTop: '32px', animationDelay: '0.2s' }}>
          <h4 style={{ marginBottom: '16px', color: 'var(--accent-warning)' }}><i className="fas fa-clock"></i> Latest Pending Approvals</h4>
          {recentPending.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No pending approvals right now.</p>
          ) : (
            <div style={{ maxHeight: '300px', overflowY: 'auto', paddingRight: '8px' }}>
              <div className="payments-list">
                {recentPending.map(payment => (
                  <div key={payment.id} className="payment-item glass-card" style={{ padding: '12px 16px', background: 'var(--bg-primary)' }}>
                    <div className="payment-info" style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong>{payment.name || payment.email}</strong>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ID: {payment.transactionId}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 'bold' }}>₹{payment.amount}</div>
                        <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>Pending</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ textAlign: 'center', marginTop: '16px' }}>
                <Link to="/admin/payments" className="btn btn-sm btn-outline">View All Payments <i className="fas fa-arrow-right"></i></Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
