import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, updateDoc, doc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
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
  const [checkingPending, setCheckingPending] = useState(true);
  const [hasPending, setHasPending] = useState(false);

  // Coupon state
  const [couponInput, setCouponInput] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [freeRedeeming, setFreeRedeeming] = useState(false);

  const baseAmount = parseFloat(AMOUNT);
  const finalAmount = Math.max(0, baseAmount - discountAmount);
  const upiLink = `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(PAYEE_NAME)}&am=${finalAmount.toFixed(2)}&cu=INR&tn=${encodeURIComponent('ResumeForge Annual Subscription')}`;

  useEffect(() => {
    async function checkPendingPayment() {
      if (!currentUser || isSubscriptionActive()) {
        setCheckingPending(false);
        return;
      }
      try {
        const payQ = query(
          collection(db, 'payments'),
          where('uid', '==', currentUser.uid)
        );
        const snap = await getDocs(payQ);
        const hasPendingPayment = snap.docs.some(doc => doc.data().status === 'pending');
        if (hasPendingPayment) {
          setHasPending(true);
        }
      } catch (err) {
        console.error('Failed to check pending payments:', err);
      }
      setCheckingPending(false);
    }
    checkPendingPayment();
  }, [currentUser]);

  async function handleApplyCoupon(e) {
    e.preventDefault();
    if (!couponInput.trim()) return;
    setCouponError('');
    setApplyingCoupon(true);
    try {
      const codeClean = couponInput.trim().toUpperCase();
      const q = query(collection(db, 'coupons'), where('code', '==', codeClean));
      const snap = await getDocs(q);
      if (snap.empty) {
        setCouponError('Invalid coupon code.');
        setApplyingCoupon(false);
        return;
      }
      const couponDoc = snap.docs[0];
      const coupon = { id: couponDoc.id, ...couponDoc.data() };

      // Validate status
      if (coupon.isActive === false) {
        setCouponError('This coupon code is no longer active.');
        setApplyingCoupon(false);
        return;
      }
      // Validate expiry
      if (coupon.validityType === 'date' && coupon.validUntil) {
        const d = coupon.validUntil.toDate ? coupon.validUntil.toDate() : new Date(coupon.validUntil);
        if (d < new Date()) {
          setCouponError('This coupon code has expired.');
          setApplyingCoupon(false);
          return;
        }
      }
      // Validate total limit
      if (coupon.limitType === 'limited' && (coupon.currentUses || 0) >= (coupon.maxUses || 1)) {
        setCouponError('This coupon has reached its maximum usage limit.');
        setApplyingCoupon(false);
        return;
      }
      // Validate per-user limit
      const userUses = (coupon.usedBy || []).filter(id => id === currentUser.uid).length;
      if (userUses >= (coupon.perUserLimit || 1)) {
        setCouponError('You have already redeemed this coupon code.');
        setApplyingCoupon(false);
        return;
      }

      // Calculate discount
      let disc = 0;
      if (coupon.discountType === 'free') {
        disc = baseAmount;
      } else if (coupon.discountType === 'percentage') {
        disc = (baseAmount * (coupon.discountValue || 100)) / 100;
      } else if (coupon.discountType === 'fixed') {
        disc = coupon.discountValue || 0;
      }
      disc = Math.min(baseAmount, disc);

      setAppliedCoupon(coupon);
      setDiscountAmount(disc);
      setCouponInput('');
    } catch (err) {
      console.error('Apply coupon failed:', err);
      setCouponError('Error verifying coupon. Please try again.');
    }
    setApplyingCoupon(false);
  }

  function handleRemoveCoupon() {
    setAppliedCoupon(null);
    setDiscountAmount(0);
    setCouponError('');
  }

  async function handleRedeemFreeCoupon() {
    if (!appliedCoupon) return;
    setFreeRedeeming(true);
    setCouponError('');
    try {
      // Re-verify in DB before committing
      const cSnap = await getDocs(query(collection(db, 'coupons'), where('code', '==', appliedCoupon.code)));
      if (!cSnap.empty) {
        const latest = { id: cSnap.docs[0].id, ...cSnap.docs[0].data() };
        if (latest.limitType === 'limited' && (latest.currentUses || 0) >= latest.maxUses) {
          setCouponError('Sorry, this coupon was just filled by another user.');
          setFreeRedeeming(false);
          return;
        }
        const userUses = (latest.usedBy || []).filter(id => id === currentUser.uid).length;
        if (userUses >= (latest.perUserLimit || 1)) {
          setCouponError('You have already redeemed this coupon.');
          setFreeRedeeming(false);
          return;
        }
      }

      const now = new Date();
      const expiresAt = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());

      // 1. Log redemption history
      await addDoc(collection(db, 'coupon_redemptions'), {
        couponCode: appliedCoupon.code,
        couponId: appliedCoupon.id,
        uid: currentUser.uid,
        email: currentUser.email,
        name: currentUser.displayName || name || 'User',
        discountApplied: discountAmount,
        finalAmount: 0,
        redeemedAt: serverTimestamp()
      });

      // 2. Increment coupon usage
      const newUses = (appliedCoupon.currentUses || 0) + 1;
      const newUsedBy = [...(appliedCoupon.usedBy || []), currentUser.uid];
      await updateDoc(doc(db, 'coupons', appliedCoupon.id), {
        currentUses: newUses,
        usedBy: newUsedBy
      });

      // 3. Activate user subscription
      await updateDoc(doc(db, 'users', currentUser.uid), {
        'subscription.active': true,
        'subscription.paidAt': serverTimestamp(),
        'subscription.expiresAt': expiresAt,
        'subscription.transactionId': `COUPON_${appliedCoupon.code}`
      });

      // 4. Record an approved payment in admin list
      await addDoc(collection(db, 'payments'), {
        uid: currentUser.uid,
        email: currentUser.email,
        name: currentUser.displayName || name || 'User',
        phone: phone || 'N/A (Free Coupon)',
        transactionId: `COUPON_${appliedCoupon.code}`,
        amount: 0,
        originalAmount: baseAmount,
        discount: discountAmount,
        couponCode: appliedCoupon.code,
        status: 'approved',
        submittedAt: serverTimestamp(),
        reviewedAt: serverTimestamp()
      });

      // Navigate to editor directly after upgrade!
      window.location.href = '/editor';
    } catch (err) {
      console.error('Free redemption failed:', err);
      setCouponError('Failed to activate subscription. Try again.');
      setFreeRedeeming(false);
    }
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
        amount: finalAmount,
        originalAmount: baseAmount,
        discount: discountAmount,
        couponCode: appliedCoupon ? appliedCoupon.code : null,
        couponId: appliedCoupon ? appliedCoupon.id : null,
        status: 'pending',
        submittedAt: serverTimestamp(),
        reviewedAt: null
      });

      if (appliedCoupon) {
        // Log in history & increment usage
        await addDoc(collection(db, 'coupon_redemptions'), {
          couponCode: appliedCoupon.code,
          couponId: appliedCoupon.id,
          uid: currentUser.uid,
          email: currentUser.email,
          name: name.trim(),
          discountApplied: discountAmount,
          finalAmount: finalAmount,
          redeemedAt: serverTimestamp()
        });
        const newUses = (appliedCoupon.currentUses || 0) + 1;
        const newUsedBy = [...(appliedCoupon.usedBy || []), currentUser.uid];
        await updateDoc(doc(db, 'coupons', appliedCoupon.id), {
          currentUses: newUses,
          usedBy: newUsedBy
        });
      }

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
              message: `User: ${name.trim()} (${currentUser.email})\nPhone: ${phone.trim()}\nTransaction ID: ${transactionId.trim()}\nAmount: ₹${finalAmount}${appliedCoupon ? ` (Coupon: ${appliedCoupon.code})` : ''}`
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

  if (checkingPending) {
    return <div className="loading-screen"><div className="spinner"></div></div>;
  }

  if (submitted || hasPending) {
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

  return (
    <div className="auth-page">
      <div className="payment-card glass-card">
        <h2 className="dot-font">Complete Payment</h2>
        <p className="auth-subtitle">
          Pay {discountAmount > 0 && <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)', marginRight: '6px' }}>₹{baseAmount.toFixed(2)}</span>}
          <strong style={{ color: 'var(--accent-primary-light)' }}>₹{finalAmount.toFixed(2)}</strong> to unlock PDF downloads for 1 year
        </p>

        {/* --- COUPON SECTION --- */}
        <div className="coupon-box">
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="fas fa-ticket-alt" style={{ color: 'var(--accent-primary-light)' }}></i> Have a Promo / Coupon Code?
          </label>

          {appliedCoupon ? (
            <div className="coupon-applied-badge animate-fade-in">
              <div>
                <i className="fas fa-check-circle"></i> Code <strong>{appliedCoupon.code}</strong> applied!
                <div style={{ fontSize: '0.75rem', fontWeight: 400, marginTop: '2px' }}>
                  You save ₹{discountAmount.toFixed(2)}
                </div>
              </div>
              <button
                type="button"
                onClick={handleRemoveCoupon}
                className="btn btn-sm btn-secondary"
                style={{ borderRadius: '50%', width: 28, height: 28, padding: 0 }}
                title="Remove Coupon"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          ) : (
            <form onSubmit={handleApplyCoupon} className="coupon-input-group">
              <input
                type="text"
                className="form-input"
                value={couponInput}
                onChange={e => setCouponInput(e.target.value.toUpperCase())}
                placeholder="Enter code (e.g., FREE2026)"
                style={{ flex: 1, fontFamily: 'var(--font-mono)', fontWeight: 600, textTransform: 'uppercase', padding: '8px 12px' }}
              />
              <button type="submit" className="btn btn-secondary" disabled={applyingCoupon || !couponInput.trim()}>
                {applyingCoupon ? <span className="spinner" style={{ width: 16, height: 16 }}></span> : 'Apply'}
              </button>
            </form>
          )}

          {couponError && (
            <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '6px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <i className="fas fa-exclamation-triangle"></i> {couponError}
            </div>
          )}
        </div>

        {/* --- IF COUPON MAKES IT 100% FREE --- */}
        {finalAmount === 0 ? (
          <div className="free-redemption-card animate-fade-in">
            <div style={{ fontSize: '3rem', color: '#10b981', marginBottom: '12px' }}>
              <i className="fas fa-gift"></i>
            </div>
            <h3 style={{ fontSize: '1.4rem', color: '#10b981', marginBottom: '8px' }}>100% Free Pro Upgrade!</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px' }}>
              Your promo code covers the full annual subscription price. You owe nothing!
            </p>
            <button
              type="button"
              className="btn btn-success btn-lg"
              style={{ width: '100%', fontSize: '1.1rem', padding: '14px', background: '#10b981', color: '#fff', border: 'none' }}
              onClick={handleRedeemFreeCoupon}
              disabled={freeRedeeming}
            >
              {freeRedeeming ? (
                <span className="spinner" style={{ width: 22, height: 22, borderWidth: 3 }}></span>
              ) : (
                <>
                  <i className="fas fa-unlock-alt"></i> Activate 1-Year Pro Subscription Now
                </>
              )}
            </button>
          </div>
        ) : (
          /* --- IF PAYABLE AMOUNT > 0 (Standard or Partial Discount) --- */
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
                <i className="fas fa-mobile-alt"></i> Pay ₹{finalAmount.toFixed(2)} via UPI App
              </a>
              <div className="upi-details">
                <p><strong>UPI ID:</strong> {UPI_ID}</p>
                <p><strong>Amount:</strong> ₹{finalAmount.toFixed(2)}</p>
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
                  {loading ? <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }}></span> : `Submit Payment of ₹${finalAmount.toFixed(2)}`}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
