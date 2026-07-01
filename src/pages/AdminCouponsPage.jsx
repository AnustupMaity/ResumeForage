import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import './AdminPage.css';
import './AdminCouponsPage.css';

export default function AdminCouponsPage() {
  const { isAdmin, currentUser } = useAuth();
  const navigate = useNavigate();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);

  // Modal Form State
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState('free'); // 'free' (100% off), 'fixed' (₹ off), 'percentage' (% off)
  const [discountValue, setDiscountValue] = useState('100');
  const [validityType, setValidityType] = useState('forever'); // 'forever' or 'date'
  const [validUntil, setValidUntil] = useState('');
  const [limitType, setLimitType] = useState('unlimited'); // 'unlimited' or 'limited'
  const [maxUses, setMaxUses] = useState('100');
  const [perUserLimit, setPerUserLimit] = useState('1');
  const [isActive, setIsActive] = useState(true);

  // History Modal State
  const [historyModal, setHistoryModal] = useState(false);
  const [selectedCouponHistory, setSelectedCouponHistory] = useState(null);
  const [redemptions, setRedemptions] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (!isAdmin()) {
      navigate('/dashboard');
      return;
    }
    loadCoupons();
  }, [currentUser]);

  async function loadCoupons() {
    setLoading(true);
    try {
      const q = query(collection(db, 'coupons'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCoupons(list);
    } catch (err) {
      console.error('Failed to load coupons:', err);
      // Fallback if index not ready
      try {
        const snap = await getDocs(collection(db, 'coupons'));
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCoupons(list);
      } catch (e) {
        console.error('Fallback load failed:', e);
      }
    }
    setLoading(false);
  }

  function handleOpenModal(coupon = null) {
    if (coupon) {
      setEditingCoupon(coupon);
      setCode(coupon.code || '');
      setDiscountType(coupon.discountType || 'free');
      setDiscountValue(String(coupon.discountValue || '100'));
      setValidityType(coupon.validityType || 'forever');
      if (coupon.validUntil) {
        const d = coupon.validUntil.toDate ? coupon.validUntil.toDate() : new Date(coupon.validUntil);
        // Format to YYYY-MM-DDTHH:mm for input[type="datetime-local"]
        const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        setValidUntil(iso);
      } else {
        setValidUntil('');
      }
      setLimitType(coupon.limitType || 'unlimited');
      setMaxUses(String(coupon.maxUses || '100'));
      setPerUserLimit(String(coupon.perUserLimit || '1'));
      setIsActive(coupon.isActive !== false);
    } else {
      setEditingCoupon(null);
      setCode('');
      setDiscountType('free');
      setDiscountValue('100');
      setValidityType('forever');
      setValidUntil('');
      setLimitType('unlimited');
      setMaxUses('100');
      setPerUserLimit('1');
      setIsActive(true);
    }
    setShowModal(true);
  }

  function generateRandomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let rand = 'RF-';
    for (let i = 0; i < 6; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCode(rand);
  }

  async function handleSaveCoupon(e) {
    e.preventDefault();
    if (!code.trim()) {
      alert('Please enter a coupon code.');
      return;
    }
    if (validityType === 'date' && !validUntil) {
      alert('Please select a valid expiration date and time.');
      return;
    }

    const cleanedCode = code.trim().toUpperCase();
    const couponData = {
      code: cleanedCode,
      discountType,
      discountValue: discountType === 'free' ? 100 : parseFloat(discountValue) || 0,
      validityType,
      validUntil: validityType === 'date' ? new Date(validUntil) : null,
      limitType,
      maxUses: limitType === 'limited' ? parseInt(maxUses, 10) || 1 : null,
      perUserLimit: parseInt(perUserLimit, 10) || 1,
      isActive,
      updatedAt: serverTimestamp()
    };

    try {
      if (editingCoupon) {
        await updateDoc(doc(db, 'coupons', editingCoupon.id), couponData);
      } else {
        // Check if code exists
        const exists = coupons.some(c => c.code === cleanedCode);
        if (exists) {
          alert(`Coupon code "${cleanedCode}" already exists!`);
          return;
        }
        await addDoc(collection(db, 'coupons'), {
          ...couponData,
          currentUses: 0,
          usedBy: [],
          createdAt: serverTimestamp(),
          createdBy: currentUser.email
        });
      }
      setShowModal(false);
      loadCoupons();
    } catch (err) {
      console.error('Failed to save coupon:', err);
      alert('Failed to save coupon. Check console.');
    }
  }

  async function handleToggleStatus(coupon) {
    try {
      await updateDoc(doc(db, 'coupons', coupon.id), {
        isActive: !coupon.isActive,
        updatedAt: serverTimestamp()
      });
      loadCoupons();
    } catch (err) {
      console.error('Toggle status failed:', err);
    }
  }

  async function handleDelete(coupon) {
    if (!window.confirm(`Are you sure you want to delete coupon "${coupon.code}"?`)) return;
    try {
      await deleteDoc(doc(db, 'coupons', coupon.id));
      loadCoupons();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  }

  async function handleViewHistory(coupon) {
    setSelectedCouponHistory(coupon);
    setHistoryModal(true);
    setHistoryLoading(true);
    try {
      const q = query(collection(db, 'coupon_redemptions'), where('couponCode', '==', coupon.code));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort in memory by redeemedAt desc
      list.sort((a, b) => {
        const tA = a.redeemedAt?.toMillis ? a.redeemedAt.toMillis() : 0;
        const tB = b.redeemedAt?.toMillis ? b.redeemedAt.toMillis() : 0;
        return tB - tA;
      });
      setRedemptions(list);
    } catch (err) {
      console.error('Failed to load redemptions:', err);
      setRedemptions([]);
    }
    setHistoryLoading(false);
  }

  function formatValidity(coupon) {
    if (coupon.validityType === 'forever') {
      return 'Forever (Until Closed)';
    }
    if (!coupon.validUntil) return 'N/A';
    const d = coupon.validUntil.toDate ? coupon.validUntil.toDate() : new Date(coupon.validUntil);
    const isExpired = d < new Date();
    return (
      <span>
        {d.toLocaleDateString()} {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        {isExpired && <span style={{ color: '#ef4444', marginLeft: '6px', fontWeight: 700 }}>(Expired)</span>}
      </span>
    );
  }

  const totalCoupons = coupons.length;
  const activeCoupons = coupons.filter(c => c.isActive !== false).length;
  const totalRedemptions = coupons.reduce((sum, c) => sum + (c.currentUses || 0), 0);

  if (!isAdmin()) return null;

  return (
    <div className="admin-page">
      <div className="page-container">
        <div className="dashboard-header animate-fade-in-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 className="dot-font"><i className="fas fa-ticket"></i> Manage Promo Coupons</h2>
            <p>Create, edit, and track promo codes for subscription checkouts.</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => handleOpenModal()}>
              <i className="fas fa-plus-circle"></i> Create New Coupon
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/admin')}>
              <i className="fas fa-arrow-left"></i> Back to Dashboard
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="admin-stats animate-fade-in-up" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <div className="admin-stat glass-card">
            <span className="admin-stat-number" style={{ color: 'var(--accent-primary-light)' }}>{totalCoupons}</span>
            <span className="admin-stat-label">Total Coupons</span>
          </div>
          <div className="admin-stat glass-card">
            <span className="admin-stat-number" style={{ color: 'var(--accent-success)' }}>{activeCoupons}</span>
            <span className="admin-stat-label">Active Coupons</span>
          </div>
          <div className="admin-stat glass-card">
            <span className="admin-stat-number" style={{ color: 'var(--accent-gold)' }}>{totalRedemptions}</span>
            <span className="admin-stat-label">Total Redemptions</span>
          </div>
        </div>

        {/* Coupons List */}
        {loading ? (
          <div className="loading-screen" style={{ height: '200px' }}><div className="spinner"></div></div>
        ) : coupons.length === 0 ? (
          <div className="glass-card empty-state">
            <i className="fas fa-ticket"></i>
            <h3>No Coupons Created Yet</h3>
            <p>Click "Create New Coupon" to generate your first discount code.</p>
          </div>
        ) : (
          <div className="coupons-grid">
            {coupons.map(coupon => {
              const isExpired = coupon.validityType === 'date' && coupon.validUntil && (coupon.validUntil.toDate ? coupon.validUntil.toDate() : new Date(coupon.validUntil)) < new Date();
              const isLimitReached = coupon.limitType === 'limited' && (coupon.currentUses || 0) >= coupon.maxUses;
              const statusActive = coupon.isActive !== false && !isExpired && !isLimitReached;

              return (
                <div key={coupon.id} className="coupon-card glass-card">
                  <div className="coupon-info">
                    <div className="coupon-code-row">
                      <span className="coupon-code">{coupon.code}</span>
                      <span className="coupon-discount-badge">
                        {coupon.discountType === 'free' ? '100% OFF (FREE)' : coupon.discountType === 'percentage' ? `${coupon.discountValue}% OFF` : `₹${coupon.discountValue} OFF`}
                      </span>
                      <span className={`badge ${statusActive ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.75rem' }}>
                        {coupon.isActive === false ? 'Closed / Inactive' : isExpired ? 'Expired' : isLimitReached ? 'Limit Reached' : 'Active'}
                      </span>
                    </div>

                    <div className="coupon-details-row">
                      <div className="coupon-detail">
                        <span className="coupon-detail-label">Validity</span>
                        <span className="coupon-detail-val">{formatValidity(coupon)}</span>
                      </div>
                      <div className="coupon-detail">
                        <span className="coupon-detail-label">Usage Limit</span>
                        <span className="coupon-detail-val">
                          {coupon.currentUses || 0} / {coupon.limitType === 'unlimited' ? 'Unlimited' : coupon.maxUses}
                        </span>
                      </div>
                      <div className="coupon-detail">
                        <span className="coupon-detail-label">Per-User Limit</span>
                        <span className="coupon-detail-val">{coupon.perUserLimit || 1} use per user</span>
                      </div>
                      <div className="coupon-detail">
                        <span className="coupon-detail-label">Created By</span>
                        <span className="coupon-detail-val" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {coupon.createdBy || 'Admin'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="coupon-actions">
                    <button
                      className={`btn btn-sm ${coupon.isActive === false ? 'btn-success' : 'btn-secondary'}`}
                      onClick={() => handleToggleStatus(coupon)}
                      title={coupon.isActive === false ? 'Activate' : 'Close / Pause'}
                    >
                      <i className={`fas ${coupon.isActive === false ? 'fa-play' : 'fa-pause'}`}></i>
                      <span className="hide-mobile">{coupon.isActive === false ? ' Activate' : ' Pause'}</span>
                    </button>
                    <button className="btn btn-sm btn-secondary" onClick={() => handleViewHistory(coupon)} title="View Redemptions History">
                      <i className="fas fa-history"></i> <span className="hide-mobile">History</span>
                    </button>
                    <button className="btn btn-sm btn-secondary" onClick={() => handleOpenModal(coupon)} title="Edit Limit / Details">
                      <i className="fas fa-edit"></i>
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(coupon)} title="Delete Coupon">
                      <i className="fas fa-trash-alt"></i>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* --- CREATE / EDIT COUPON MODAL --- */}
      {showModal && (
        <div className="coupon-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="coupon-modal glass-card" onClick={e => e.stopPropagation()}>
            <div className="coupon-modal-header">
              <h3 className="coupon-modal-title">
                {editingCoupon ? `Edit Coupon: ${editingCoupon.code}` : 'Create New Promo Coupon'}
              </h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setShowModal(false)} style={{ borderRadius: '50%', width: 32, height: 32, padding: 0 }}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleSaveCoupon}>
              {/* Coupon Code */}
              <div className="coupon-form-group">
                <label className="coupon-form-label">Coupon Code</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="form-input"
                    value={code}
                    onChange={e => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g., FREE2026 or RESUME100"
                    disabled={!!editingCoupon} // Don't allow renaming existing code to prevent history orphans
                    required
                    style={{ flex: 1, fontFamily: 'var(--font-mono)', fontWeight: 700 }}
                  />
                  {!editingCoupon && (
                    <button type="button" className="btn btn-secondary" onClick={generateRandomCode} title="Generate Random Code">
                      <i className="fas fa-random"></i> Random
                    </button>
                  )}
                </div>
                {editingCoupon && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Coupon code cannot be changed once created.</span>}
              </div>

              {/* Discount Type & Value */}
              <div className="coupon-form-group">
                <label className="coupon-form-label">Discount Type</label>
                <div className="coupon-radio-group">
                  <label className="coupon-radio-label">
                    <input type="radio" name="discType" checked={discountType === 'free'} onChange={() => { setDiscountType('free'); setDiscountValue('100'); }} />
                    100% Free (Full Upgrade)
                  </label>
                  <label className="coupon-radio-label">
                    <input type="radio" name="discType" checked={discountType === 'fixed'} onChange={() => setDiscountType('fixed')} />
                    Fixed Amount Off (₹)
                  </label>
                  <label className="coupon-radio-label">
                    <input type="radio" name="discType" checked={discountType === 'percentage'} onChange={() => setDiscountType('percentage')} />
                    Percentage Off (%)
                  </label>
                </div>
              </div>

              {discountType !== 'free' && (
                <div className="coupon-form-group">
                  <label className="coupon-form-label">
                    {discountType === 'fixed' ? 'Discount Amount (₹)' : 'Discount Percentage (%)'}
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    value={discountValue}
                    onChange={e => setDiscountValue(e.target.value)}
                    placeholder={discountType === 'fixed' ? 'e.g., 5' : 'e.g., 50'}
                    required
                    min="1"
                  />
                </div>
              )}

              {/* Validity */}
              <div className="coupon-form-group" style={{ marginTop: '20px' }}>
                <label className="coupon-form-label">Coupon Validity / Expiration</label>
                <div className="coupon-radio-group" style={{ marginBottom: '10px' }}>
                  <label className="coupon-radio-label">
                    <input type="radio" name="valType" checked={validityType === 'forever'} onChange={() => { setValidityType('forever'); setValidUntil(''); }} />
                    Forever (Until I Close Manually)
                  </label>
                  <label className="coupon-radio-label">
                    <input type="radio" name="valType" checked={validityType === 'date'} onChange={() => setValidityType('date')} />
                    Up to Specific Date & Time
                  </label>
                </div>
                {validityType === 'date' && (
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={validUntil}
                    onChange={e => setValidUntil(e.target.value)}
                    required
                  />
                )}
              </div>

              {/* Usage Limits */}
              <div className="coupon-form-group" style={{ marginTop: '20px' }}>
                <label className="coupon-form-label">Total Usage Limit across all users</label>
                <div className="coupon-radio-group" style={{ marginBottom: '10px' }}>
                  <label className="coupon-radio-label">
                    <input type="radio" name="limType" checked={limitType === 'unlimited'} onChange={() => setLimitType('unlimited')} />
                    Unlimited Uses
                  </label>
                  <label className="coupon-radio-label">
                    <input type="radio" name="limType" checked={limitType === 'limited'} onChange={() => setLimitType('limited')} />
                    Limited Number of Uses
                  </label>
                </div>
                {limitType === 'limited' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="number"
                      className="form-input"
                      value={maxUses}
                      onChange={e => setMaxUses(e.target.value)}
                      placeholder="e.g., 100"
                      required
                      min="1"
                    />
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>total redemptions</span>
                  </div>
                )}
              </div>

              {/* Per-user Limit */}
              <div className="coupon-form-group">
                <label className="coupon-form-label">Per-User Limit</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="number"
                    className="form-input"
                    value={perUserLimit}
                    onChange={e => setPerUserLimit(e.target.value)}
                    min="1"
                    required
                    style={{ width: '100px' }}
                  />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>times a single user can use this code</span>
                </div>
              </div>

              {/* Status */}
              <div className="coupon-form-group" style={{ marginTop: '20px' }}>
                <label className="coupon-radio-label">
                  <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} style={{ width: 18, height: 18 }} />
                  <strong>Active (Available for users to redeem immediately)</strong>
                </label>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '28px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">
                  <i className="fas fa-save"></i> {editingCoupon ? 'Update Coupon' : 'Create Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- HISTORY / REDEMPTIONS MODAL --- */}
      {historyModal && selectedCouponHistory && (
        <div className="coupon-modal-overlay" onClick={() => setHistoryModal(false)}>
          <div className="coupon-modal glass-card" style={{ maxWidth: '650px' }} onClick={e => e.stopPropagation()}>
            <div className="coupon-modal-header">
              <div>
                <h3 className="coupon-modal-title">Redemptions History</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Coupon Code: <strong style={{ color: 'var(--accent-primary-light)', fontFamily: 'var(--font-mono)' }}>{selectedCouponHistory.code}</strong>
                </p>
              </div>
              <button className="btn btn-sm btn-secondary" onClick={() => setHistoryModal(false)} style={{ borderRadius: '50%', width: 32, height: 32, padding: 0 }}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            {historyLoading ? (
              <div className="loading-screen" style={{ height: '150px' }}><div className="spinner"></div></div>
            ) : redemptions.length === 0 ? (
              <div className="empty-state" style={{ padding: '32px 0' }}>
                <i className="fas fa-history" style={{ fontSize: '2rem', marginBottom: '12px' }}></i>
                <h4>No Redemptions Yet</h4>
                <p style={{ fontSize: '0.85rem' }}>No users have used this coupon code so far.</p>
              </div>
            ) : (
              <div className="history-table-container">
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>User Name / Email</th>
                      <th>Redeemed At</th>
                      <th>Discount</th>
                      <th>Final Paid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {redemptions.map((r, idx) => {
                      const dt = r.redeemedAt?.toDate ? r.redeemedAt.toDate() : new Date(r.redeemedAt || Date.now());
                      return (
                        <tr key={r.id || idx}>
                          <td>
                            <strong>{r.name || 'User'}</strong>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.email}</div>
                          </td>
                          <td>
                            {dt.toLocaleDateString()} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </td>
                          <td>
                            <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>
                              ₹{r.discountApplied || 0} OFF
                            </span>
                          </td>
                          <td>
                            <strong>₹{r.finalAmount !== undefined ? r.finalAmount : 0}</strong>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button className="btn btn-secondary" onClick={() => setHistoryModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
