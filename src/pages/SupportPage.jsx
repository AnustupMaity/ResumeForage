import { useState, useEffect, useRef } from 'react';
import { collection, query, where, orderBy, getDocs, addDoc, updateDoc, doc, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import './AdminPage.css'; // Reusing some base styles

export default function SupportPage() {
  const { currentUser } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTicket, setActiveTicket] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  // New Ticket Form State
  const [showNewForm, setShowNewForm] = useState(false);
  const [issueType, setIssueType] = useState('Payment Issue');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState([]); // Will store { name, size, base64 }
  const [uploadError, setUploadError] = useState('');

  // Reply State
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    if (currentUser) {
      loadTickets();
    }
  }, [currentUser]);

  async function loadTickets() {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'supportTickets'),
        where('uid', '==', currentUser.uid),
        orderBy('updatedAt', 'desc')
      );
      const snap = await getDocs(q);
      setTickets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Failed to load tickets', err);
    }
    setLoading(false);
  }

  function handleFileSelect(e) {
    const selectedFiles = Array.from(e.target.files);
    if (files.length + selectedFiles.length > 5) {
      setUploadError('You can upload a maximum of 5 images.');
      return;
    }

    setUploadError('');
    selectedFiles.forEach(file => {
      if (!file.type.startsWith('image/')) {
        setUploadError('Only images are allowed.');
        return;
      }
      if (file.size > 200 * 1024) {
        setUploadError('Each image must be under 200KB.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setFiles(prev => [...prev, { name: file.name, size: file.size, base64: e.target.result }]);
      };
      reader.readAsDataURL(file);
    });
  }

  async function handleSubmitTicket(e) {
    e.preventDefault();
    if (!description.trim()) {
      setUploadError('Please describe your issue.');
      return;
    }
    setSubmitting(true);
    setUploadError('');

    try {
      const imageUrls = files.map(f => f.base64);
      const newTicket = {
        uid: currentUser.uid,
        email: currentUser.email,
        type: issueType,
        description: description.trim(),
        images: imageUrls,
        status: 'open',
        messages: [{
          sender: 'user',
          text: description.trim(),
          timestamp: new Date().toISOString()
        }],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'supportTickets'), newTicket);

      // Send email notification to Admin
      try {
        await fetch('/api/sendEmail', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            template: 'admin',
            templateParams: {
              subject: `New Support Ticket: ${issueType}`,
              message: `User: ${currentUser.email}\nIssue: ${issueType}\n\nDescription:\n${description.trim()}`
            }
          })
        });
      } catch (emailErr) {
        console.error('Email failed', emailErr);
      }

      setShowNewForm(false);
      setIssueType('Payment Issue');
      setDescription('');
      setFiles([]);
      await loadTickets();
    } catch (err) {
      console.error('Submit failed', err);
      setUploadError('Failed to submit ticket. Try again.');
    }
    setSubmitting(false);
  }

  async function handleReply(e) {
    e.preventDefault();
    if (!replyText.trim() || !activeTicket) return;
    
    const newMsg = {
      sender: 'user',
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
      
      // Local update to avoid re-fetching everything immediately
      setActiveTicket(prev => ({
        ...prev,
        messages: [...(prev.messages || []), newMsg]
      }));
    } catch (err) {
      console.error('Failed to send reply', err);
    }
  }

  if (loading && tickets.length === 0) {
    return <div className="loading-screen"><div className="spinner"></div></div>;
  }

  return (
    <div className="admin-page">
      <div className="page-container">
        <div className="dashboard-header animate-fade-in-up">
          <h2 className="dot-font"><i className="fas fa-headset"></i> Support Center</h2>
          <p>Report issues, track payment status, and connect with admin.</p>
        </div>

        {!showNewForm && !activeTicket && (
          <div style={{ marginBottom: '24px' }}>
            <button className="btn btn-primary" onClick={() => setShowNewForm(true)}>
              <i className="fas fa-plus"></i> Create New Ticket
            </button>
          </div>
        )}

        {showNewForm && (
          <div className="entry-card glass-card animate-fade-in-up" style={{ maxWidth: '600px', margin: '0 auto 24px' }}>
            <div className="import-header" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
              <h4>Submit a Request</h4>
              <button className="btn btn-icon btn-secondary" onClick={() => setShowNewForm(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            {uploadError && (
              <div className="toast-error" style={{ position: 'static', animation: 'none', marginBottom: '16px', borderRadius: '8px', padding: '10px 14px' }}>
                <i className="fas fa-exclamation-circle"></i> {uploadError}
              </div>
            )}

            <form onSubmit={handleSubmitTicket} className="auth-form">
              <div className="form-group">
                <label className="form-label">Issue Type</label>
                <select className="form-input" value={issueType} onChange={e => setIssueType(e.target.value)}>
                  <option value="Payment Issue">Money paid but not active</option>
                  <option value="Wrong ID">Wrong UPI ID entered</option>
                  <option value="App Bugs">App Bugs</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea 
                  className="form-textarea" 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  placeholder="Please describe your issue in detail..."
                  rows={4}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Attachments (Max 5 images, max 200KB each)</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  {files.map((f, i) => (
                    <div key={i} className="badge badge-secondary" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</span>
                      <i className="fas fa-times" style={{ cursor: 'pointer' }} onClick={() => setFiles(files.filter((_, idx) => idx !== i))}></i>
                    </div>
                  ))}
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept="image/*" 
                  multiple 
                  style={{ display: 'none' }} 
                  onChange={handleFileSelect}
                />
                <button type="button" className="btn btn-sm btn-outline" onClick={() => fileInputRef.current.click()} disabled={files.length >= 5}>
                  <i className="fas fa-image"></i> Upload Image
                </button>
              </div>

              <button className="btn btn-primary" type="submit" disabled={submitting} style={{ width: '100%', marginTop: '16px' }}>
                {submitting ? <span className="spinner" style={{ width: 18, height: 18 }}></span> : 'Submit Request'}
              </button>
            </form>
          </div>
        )}

        {/* Ticket Chat View */}
        {activeTicket && (
          <div className="entry-card glass-card animate-fade-in-up" style={{ maxWidth: '800px', margin: '0 auto 24px' }}>
            <div className="import-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ margin: 0 }}>Ticket: {activeTicket.type}</h4>
                <span className={`badge badge-${activeTicket.status === 'open' ? 'warning' : 'success'}`} style={{ marginTop: '8px', display: 'inline-block' }}>
                  {activeTicket.status.toUpperCase()}
                </span>
              </div>
              <button className="btn btn-sm btn-secondary" onClick={() => { setActiveTicket(null); loadTickets(); }}>
                <i className="fas fa-arrow-left"></i> Back to List
              </button>
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
                const isUser = msg.sender === 'user';
                return (
                  <div key={i} style={{ alignSelf: isUser ? 'flex-end' : 'flex-start', maxWidth: '80%', background: isUser ? 'var(--accent-primary)' : 'var(--bg-secondary)', color: isUser ? 'white' : 'inherit', padding: '10px 14px', borderRadius: '12px', borderBottomRightRadius: isUser ? '2px' : '12px', borderBottomLeftRadius: !isUser ? '2px' : '12px' }}>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>{msg.text}</p>
                    <span style={{ fontSize: '0.7rem', opacity: 0.7, display: 'block', marginTop: '4px', textAlign: 'right' }}>
                      {new Date(msg.timestamp).toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                );
              })}
            </div>

            {activeTicket.status === 'open' ? (
              <form onSubmit={handleReply} style={{ display: 'flex', gap: '8px' }}>
                <input
                  className="form-input"
                  style={{ flex: 1 }}
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Type your reply..."
                />
                <button type="submit" className="btn btn-primary" disabled={!replyText.trim()}>
                  <i className="fas fa-paper-plane"></i>
                </button>
              </form>
            ) : (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>This ticket is closed.</p>
            )}
          </div>
        )}

        {/* Ticket List View */}
        {!showNewForm && !activeTicket && tickets.length > 0 && (
          <div className="payments-list">
            {tickets.map(ticket => (
              <div key={ticket.id} className="payment-item glass-card" style={{ cursor: 'pointer' }} onClick={() => setActiveTicket(ticket)}>
                <div className="payment-info" style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <strong style={{ fontSize: '1.1rem' }}>{ticket.type}</strong>
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
                <div className="payment-actions">
                  <button className="btn btn-sm btn-outline">
                    View Thread <i className="fas fa-chevron-right"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {!showNewForm && !activeTicket && tickets.length === 0 && (
          <div className="empty-state glass-card">
            <i className="fas fa-inbox"></i>
            <p>You have no open support tickets.</p>
          </div>
        )}
      </div>
    </div>
  );
}
