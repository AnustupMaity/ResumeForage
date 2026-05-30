import { useState } from 'react';
import { generateCoverLetter } from '../utils/geminiApi';

export default function CoverLetterGenerator({ resume, onClose }) {
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [letter, setLetter] = useState('');
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!jobTitle.trim()) {
      setError('Target Job Title is required.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const generated = await generateCoverLetter(resume, jobTitle, companyName || 'the company');
      setLetter(generated);
    } catch (err) {
      setError('Failed to generate cover letter. Try again.');
    }
    setLoading(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(letter);
    // Simple visual feedback could go here
  };

  return (
    <div className="import-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="import-modal import-modal-lg glass-card animate-fade-in-up">
        <div className="import-header">
          <h3><i className="fas fa-envelope-open-text"></i> AI Cover Letter</h3>
          <button className="btn btn-icon btn-secondary" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        {!letter ? (
          <div className="form-stack" style={{ padding: '20px 0' }}>
            <p className="form-section-desc" style={{ marginBottom: '16px' }}>
              We'll use Gemini to write a customized, highly persuasive cover letter that perfectly aligns your resume's experience with this specific job.
            </p>
            {error && <div className="toast-error" style={{ position: 'relative', margin: '0 0 16px 0', padding: '10px' }}>{error}</div>}
            
            <div className="form-group">
              <label className="form-label">Target Job Title <span style={{color:'red'}}>*</span></label>
              <input 
                className="form-input" 
                placeholder="e.g. Senior Frontend Engineer"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Company Name (Optional)</label>
              <input 
                className="form-input" 
                placeholder="e.g. Google"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>
            
            <div style={{ textAlign: 'right', marginTop: '16px' }}>
              <button className="btn btn-primary btn-lg" onClick={handleGenerate} disabled={loading || !jobTitle.trim()}>
                {loading ? <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }}></span> : <><i className="fas fa-magic"></i> Generate Letter</>}
              </button>
            </div>
          </div>
        ) : (
          <div className="cover-letter-results" style={{ padding: '20px 0' }}>
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label className="form-label" style={{ margin: 0 }}>Your Custom Cover Letter</label>
                <button className="btn btn-sm btn-outline" onClick={copyToClipboard}>
                  <i className="far fa-copy"></i> Copy to Clipboard
                </button>
              </div>
              <textarea 
                className="form-textarea" 
                style={{ height: '350px', fontFamily: 'var(--font-sans)', lineHeight: '1.6' }} 
                value={letter}
                onChange={(e) => setLetter(e.target.value)}
              />
            </div>

            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              <button className="btn btn-secondary" onClick={() => setLetter('')}>Generate Another</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
