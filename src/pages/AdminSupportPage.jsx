import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, updateDoc, doc, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import './AdminPage.css';

export default function AdminSupportPage() {
  const { isAdmin } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTicket, setActiveTicket] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [filter, setFilter] = useState('open'); // 'open' | 'closed' | 'all'

  if (!isAdmin()) {
    return <Navigate to="/dashboard" replace />;
  }

  useEffect(() => {
    loadTickets();
  }, []);

  async function loadTickets() {
    setLoading(true);
    try {
      const q = query(collection(db, 'supportTickets'), orderBy('updatedAt', 'desc'));
      const snap = await getDocs(q);
      setTickets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Failed to load tickets', err);
    }
    setLoading(false);
  }

  async function handleReply(e) {
    e.preventDefault();
    if (!replyText.trim() || !activeTicket) return;
    
    const newMsg = {
      sender: 'admin',
      text: replyText.trim(),
      timestamp: new Date().toISOString()
    };

    try {
      const ticketRef = doc(db, 'supportTickets', activeTicket.id);
      await updateDoc(ticketRef, {
        messages: arrayUnion(newMsg),
        updatedAt: serverTimestamp()
      });
      setReplyText('');
      
      setActiveTicket(prev => ({
        ...prev,
        messages: [...(prev.messages || []), newMsg]
      }));

      // Send email notification to User
      try {
        await fetch('https://api.emailjs.com/api/v1.0/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            service_id: 'service_920gocp',
            template_id: 'template_jxhw6fl',
            user_id: 'tLkq2m6tl1Lqs7Psv',
            template_params: {
              to_email: activeTicket.email,
              subject: `Admin Reply: ${activeTicket.type}`,
              message: `An admin has replied to your support ticket regarding ${activeTicket.type}:\n\n"${newMsg.text}"\n\nPlease log in to ResumeForge to reply or view the full thread.`
            }
          })
        });
      } catch (emailErr) {
        console.error('Email failed', emailErr);
      }
    } catch (err) {
      console.error('Failed to send reply', err);
    }
  }

  async function toggleStatus() {
    if (!activeTicket) return;
    const newStatus = activeTicket.status === 'open' ? 'closed' : 'open';
    try {
      await updateDoc(doc(db, 'supportTickets', activeTicket.id), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      setActiveTicket(prev => ({ ...prev, status: newStatus }));
      loadTickets(); // Refresh list silently in background
    } catch (err) {
      console.error('Failed to update status', err);
    }
  }

  const filteredTickets = tickets.filter(t => filter === 'all' || t.status === filter);

  return (
    <div className="admin-page">
      <div className="page-container">
        <div className="dashboard-header animate-fade-in-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2><i className="fas fa-headset"></i> Support Tickets Manager</h2>
            <p>View user issues, bugs, and respond to queries.</p>
          </div>
        </div>

        {!activeTicket && (
          <>
            <div className="filter-tabs">
              {['open', 'closed', 'all'].map(f => (
                <button
                  key={f}
                  className={`section-tab ${filter === f ? 'active' : ''}`}
                  onClick={() => setFilter(f)}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
              <button className="btn btn-sm btn-secondary" onClick={loadTickets} style={{ marginLeft: 'auto' }}>
                <i className="fas fa-sync-alt"></i> Refresh
              </button>
            </div>

            {loading ? (
              <div className="loading-screen" style={{ minHeight: '200px' }}><div className="spinner"></div></div>
            ) : filteredTickets.length === 0 ? (
              <div className="empty-state glass-card">
                <i className="fas fa-inbox"></i>
                <p>No {filter !== 'all' ? filter : ''} tickets found.</p>
              </div>
            ) : (
              <div className="payments-list">
                {filteredTickets.map(ticket => (
                  <div key={ticket.id} className="payment-item glass-card" style={{ cursor: 'pointer' }} onClick={() => setActiveTicket(ticket)}>
                    <div className="payment-info" style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <strong style={{ fontSize: '1.1rem' }}>{ticket.type}</strong>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{ticket.email}</span>
                        </div>
                        <span className={`badge badge-${ticket.status === 'open' ? 'warning' : 'success'}`}>
                          {ticket.status}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: '0 0 8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {ticket.description}
                      </p>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        <i className="fas fa-clock"></i> Updated: {ticket.updatedAt?.toDate ? ticket.updatedAt.toDate().toLocaleString() : 'Just now'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Ticket Detail / Reply View */}
        {activeTicket && (
          <div className="entry-card glass-card animate-fade-in-up" style={{ maxWidth: '800px', margin: '0 auto 24px' }}>
            <div className="import-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ margin: 0 }}>Ticket: {activeTicket.type}</h4>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>User: {activeTicket.email} (UID: {activeTicket.uid})</div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className={`btn btn-sm btn-${activeTicket.status === 'open' ? 'success' : 'warning'}`} onClick={toggleStatus}>
                  <i className={`fas fa-${activeTicket.status === 'open' ? 'check' : 'redo'}`}></i> {activeTicket.status === 'open' ? 'Mark Resolved' : 'Reopen'}
                </button>
                <button className="btn btn-sm btn-secondary" onClick={() => setActiveTicket(null)}>
                  <i className="fas fa-arrow-left"></i> Back
                </button>
              </div>
            </div>

            {/* Images attached to original ticket */}
            {activeTicket.images?.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Attachments</p>
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
                  {activeTicket.images.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noreferrer">
                      <img src={url} alt={`attachment-${i}`} style={{ height: '80px', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="chat-container" style={{ background: 'var(--bg-primary)', padding: '16px', borderRadius: '8px', maxHeight: '400px', overflowY: 'auto', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(activeTicket.messages || []).map((msg, i) => {
                const isAdminMsg = msg.sender === 'admin';
                return (
                  <div key={i} style={{ alignSelf: isAdminMsg ? 'flex-end' : 'flex-start', maxWidth: '80%', background: isAdminMsg ? 'var(--accent-primary)' : 'var(--bg-secondary)', color: isAdminMsg ? 'white' : 'inherit', padding: '10px 14px', borderRadius: '12px', borderBottomRightRadius: isAdminMsg ? '2px' : '12px', borderBottomLeftRadius: !isAdminMsg ? '2px' : '12px' }}>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>{msg.text}</p>
                    <span style={{ fontSize: '0.7rem', opacity: 0.7, display: 'block', marginTop: '4px', textAlign: 'right' }}>
                      {isAdminMsg ? 'You' : 'User'} • {new Date(msg.timestamp).toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                );
              })}
            </div>

            <form onSubmit={handleReply} style={{ display: 'flex', gap: '8px' }}>
              <input
                className="form-input"
                style={{ flex: 1 }}
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder="Type your reply to the user..."
              />
              <button type="submit" className="btn btn-primary" disabled={!replyText.trim()}>
                <i className="fas fa-paper-plane"></i>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
