import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './DashboardPage.css';

export default function DashboardPage() {
  const { currentUser, userData, isSubscriptionActive } = useAuth();

  const subActive = isSubscriptionActive();
  const expiresAt = userData?.subscription?.expiresAt;
  const expiryDate = expiresAt
    ? (expiresAt.toDate ? expiresAt.toDate() : new Date(expiresAt)).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  const resumeName = userData?.resume?.personalInfo?.name;

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
            <h4 className="dot-font">Your Resume</h4>
            {resumeName ? (
              <>
                <p className="card-detail" style={{ fontSize: '1.1rem', fontWeight: 600 }}>{resumeName}</p>
                <p className="card-detail-sub">{userData?.resume?.education?.length || 0} education • {userData?.resume?.projects?.length || 0} projects • {userData?.resume?.experience?.length || 0} experience</p>
              </>
            ) : (
              <p className="card-detail">No resume data yet. Start building!</p>
            )}
            <Link to="/editor" className="btn btn-primary btn-sm" style={{ marginTop: '12px' }}>
              <i className="fas fa-edit"></i> {resumeName ? 'Edit Resume' : 'Start Building'}
            </Link>
          </div>

          {/* Quick Actions */}
          <div className="glass-card dashboard-card">
            <div className="card-icon-wrap" style={{ background: 'rgba(255, 107, 107, 0.12)' }}>
              <i className="fas fa-bolt" style={{ color: 'var(--accent-warm)' }}></i>
            </div>
            <h4 className="dot-font">Quick Actions</h4>
            <div className="quick-actions">
              <Link to="/editor" className="btn btn-secondary btn-sm">
                <i className="fas fa-edit"></i> Edit Resume
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
                <span className="account-label">Transaction ID</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{userData.subscription.transactionId}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
