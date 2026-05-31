import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { QRCodeSVG } from 'qrcode.react';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import './PaymentPage.css';

const UPI_ID = 'anustupmaity2022@oksbi';
const PAYEE_NAME = 'Anustup Maity';
const AMOUNT = '5.00';

export default function PaymentPage() {
  const { currentUser, isSubscriptionActive } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(currentUser?.displayName || '');
  const [phone, setPhone] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const upiLink = `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(PAYEE_NAME)}&am=${AMOUNT}&cu=INR&tn=${encodeURIComponent('ResumeForge Annual Subscription')}`;

  if (isSubscriptionActive()) {
    return (
      <div className="auth-page">
        <div className="glass-card" style={{ maxWidth: 500, textAlign: 'center', padding: '48px 32px' }}>
          <div className="success-icon"><i className="fas fa-check-circle"></i></div>
          <h2 className="dot-font">Subscription Active!</h2>
          <p style={{ margin: '16px 0 24px' }}>Your annual subscription is active. You have full access to download your resume as PDF.</p>
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/editor')}>
            <i className="fas fa-edit"></i> Go to Editor
          </button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="auth-page">
        <div className="glass-card" style={{ maxWidth: 500, textAlign: 'center', padding: '48px 32px' }}>
          <div className="pending-icon"><i className="fas fa-clock"></i></div>
          <h2 className="dot-font">Payment Submitted!</h2>
          <p style={{ margin: '16px 0 8px' }}>Your payment is being verified. This usually takes a few hours.</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Transaction ID: <strong>{transactionId}</strong></p>
          <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
              <i className="fas fa-th-large"></i> Dashboard
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/editor')}>
              <i className="fas fa-edit"></i> Continue Editing
            </button>
          </div>
        </div>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !transactionId.trim()) {
      setError('Please fill out all fields.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await addDoc(collection(db, 'payments'), {
        uid: currentUser.uid,
        email: currentUser.email,
        name: name.trim(),
        phone: phone.trim(),
        transactionId: transactionId.trim(),
        amount: parseFloat(AMOUNT),
        status: 'pending',
        submittedAt: serverTimestamp(),
        reviewedAt: null
      });

      // Send email notification to Admin using EmailJS
      try {
        await fetch('/api/sendEmail', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            template: 'admin',
            templateParams: {
              subject: 'New Payment Received',
              message: `User: ${name.trim()} (${currentUser.email})\nPhone: ${phone.trim()}\nTransaction ID: ${transactionId.trim()}\nAmount: ₹5`
            }
          })
        });
      } catch (emailErr) {
        console.error('Email notification failed, but payment was recorded.', emailErr);
      }

      setSubmitted(true);
    } catch (err) {
      console.error('Payment submission failed:', err);
      setError('Failed to submit. Please try again.');
    }
    setLoading(false);
  }

  return (
    <div className="auth-page">
      <div className="payment-card glass-card">
        <h2 className="dot-font">Complete Payment</h2>
        <p className="auth-subtitle">Pay ₹{AMOUNT} to unlock PDF downloads for 1 year</p>

        <div className="payment-steps">
          {/* Step 1: QR Code */}
          <div className="payment-step">
            <div className="step-badge">Step 1</div>
            <h4>Scan QR Code or Click to Pay</h4>
            <div className="qr-container">
              <QRCodeSVG
                value={upiLink}
                size={200}
                bgColor="#ffffff"
                fgColor="#000000"
                level="H"
                includeMargin={true}
              />
            </div>
            <a href={upiLink} className="btn btn-primary" style={{ width: '100%' }}>
              <i className="fas fa-mobile-alt"></i> Pay ₹{AMOUNT} via UPI App
            </a>
            <div className="upi-details">
              <p><strong>UPI ID:</strong> {UPI_ID}</p>
              <p><strong>Amount:</strong> ₹{AMOUNT}</p>
              <p><strong>Name:</strong> {PAYEE_NAME}</p>
            </div>
          </div>

          {/* Step 2: Enter transaction ID */}
          <div className="payment-step">
            <div className="step-badge">Step 2</div>
            <h4>Enter Transaction ID</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
              After payment, find the UPI Transaction ID / UTR number in your payment app and enter it below.
            </p>

            {error && (
              <div className="toast-error" style={{ position: 'static', padding: '10px 14px', borderRadius: '8px', marginBottom: '12px', fontSize: '0.85rem', animation: 'none' }}>
                <i className="fas fa-exclamation-circle"></i> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  className="form-input"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="John Doe"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  className="form-input"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="10-digit mobile number"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">UPI Transaction ID / UTR</label>
                <input
                  className="form-input"
                  value={transactionId}
                  onChange={e => setTransactionId(e.target.value)}
                  placeholder="e.g., 412345678901"
                  required
                />
              </div>
              <button className="btn btn-primary btn-lg" type="submit" disabled={loading}>
                {loading ? <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }}></span> : 'Submit for Verification'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
