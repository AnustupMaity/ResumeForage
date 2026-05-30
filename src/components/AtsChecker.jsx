import { useState } from 'react';
import { checkAtsMatch } from '../utils/geminiApi';

export default function AtsChecker({ resume, onClose }) {
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleCheck = async () => {
    if (!jobDescription.trim()) {
      setError('Please paste a job description.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const atsData = await checkAtsMatch(resume, jobDescription);
      setResult(atsData);
    } catch (err) {
      setError('Failed to analyze ATS match. Try again.');
    }
    setLoading(false);
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'var(--success-color, #10b981)';
    if (score >= 50) return 'var(--warning-color, #f59e0b)';
    return 'var(--danger-color, #ef4444)';
  };

  return (
    <div className="import-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="import-modal import-modal-lg glass-card animate-fade-in-up">
        <div className="import-header">
          <h3><i className="fas fa-search-dollar"></i> ATS Score Checker</h3>
          <button className="btn btn-icon btn-secondary" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        {!result ? (
          <div className="form-stack" style={{ padding: '20px 0' }}>
            <p className="form-section-desc" style={{ marginBottom: '16px' }}>
              Paste the Job Description below. We'll use AI to compare your current resume against the job requirements and give you a match score and missing keywords.
            </p>
            {error && <div className="toast-error" style={{ position: 'relative', margin: '0 0 16px 0', padding: '10px' }}>{error}</div>}
            
            <textarea 
              className="form-textarea" 
              rows={12} 
              placeholder="Paste job description here..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />
            
            <div style={{ textAlign: 'right', marginTop: '16px' }}>
              <button className="btn btn-primary btn-lg" onClick={handleCheck} disabled={loading || !jobDescription.trim()}>
                {loading ? <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }}></span> : <><i className="fas fa-magic"></i> Analyze Match</>}
              </button>
            </div>
          </div>
        ) : (
          <div className="ats-results" style={{ padding: '20px 0' }}>
            <div style={{ display: 'flex', gap: '24px', alignItems: 'center', marginBottom: '24px', background: 'var(--bg-secondary)', padding: '24px', borderRadius: 'var(--radius-md)' }}>
              
              {/* Score Circle */}
              <div style={{ position: 'relative', width: '100px', height: '100px', flexShrink: 0 }}>
                <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="var(--bg-primary)"
                    strokeWidth="3"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke={getScoreColor(result.score)}
                    strokeWidth="3"
                    strokeDasharray={`${result.score}, 100`}
                  />
                </svg>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '1.5rem', fontWeight: 'bold' }}>
                  {result.score}%
                </div>
              </div>

              <div>
                <h4 style={{ marginBottom: '8px', fontSize: '1.2rem' }}>Resume Match Score</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{result.suggestions}</p>
              </div>
            </div>

            <div className="entry-card glass-card">
              <h5 style={{ marginBottom: '16px', color: 'var(--danger-color, #ef4444)' }}><i className="fas fa-exclamation-triangle"></i> Missing Keywords</h5>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {result.missingKeywords?.length > 0 ? (
                  result.missingKeywords.map((kw, i) => (
                    <span key={i} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 500 }}>
                      {kw}
                    </span>
                  ))
                ) : (
                  <span style={{ color: 'var(--success-color, #10b981)' }}>Great job! You hit all the major keywords.</span>
                )}
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              <button className="btn btn-secondary" onClick={() => setResult(null)}>Check Another Job</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
