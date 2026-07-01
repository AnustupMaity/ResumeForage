import { useState, useRef } from 'react';
import { parseLatex } from '../utils/latexParser';
import { parseTextResume } from '../utils/textParser';
import { parseResumeWithAI } from '../utils/geminiApi';
import { normalizeSkills } from '../utils/skillsUtils';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import './ResumeImport.css';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export default function ResumeImport({ onImport, onClose }) {
  const [mode, setMode] = useState(null); // 'latex' | 'file' | 'text'
  const [latexCode, setLatexCode] = useState('');
  const [textInput, setTextInput] = useState('');
  const [fileName, setFileName] = useState('');
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef(null);

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError('');
    setParsing(true);

    try {
      if (file.name.endsWith('.tex')) {
        // LaTeX file
        const text = await file.text();
        setLatexCode(text);
        const parsed = parseLatex(text);
        setPreview(parsed);
        setMode('latex');
      } else if (file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        // Plain text file
        const text = await file.text();
        const parsed = await parseResumeWithAI(text);
        setPreview(parsed);
      } else if (file.name.endsWith('.pdf')) {
        // PDF - extract text using pdf.js
        await parsePDF(file);
      } else {
        setError('Unsupported file format. Please upload .tex, .pdf, or .txt files.');
      }
    } catch (err) {
      console.error('File parse error:', err);
      setError('Failed to parse file. Please try pasting the content manually.');
    }
    setParsing(false);
  }

  async function parsePDF(file) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';
      }

      const parsed = await parseResumeWithAI(fullText);
      setPreview(parsed);
    } catch (err) {
      console.error('PDF parse error:', err);
      setError('Failed to parse PDF. Try uploading as .tex or .txt instead.');
    }
  }



  function handleLatexParse() {
    if (!latexCode.trim()) {
      setError('Please paste your LaTeX code.');
      return;
    }
    setError('');
    setParsing(true);
    try {
      const parsed = parseLatex(latexCode);
      setPreview(parsed);
    } catch (err) {
      setError('Failed to parse LaTeX code. Please check the format.');
    }
    setParsing(false);
  }

  async function handleTextParse() {
    if (!textInput.trim()) {
      setError('Please paste some text to parse.');
      return;
    }
    setError('');
    setParsing(true);
    try {
      const parsed = await parseResumeWithAI(textInput);
      setPreview(parsed);
    } catch (err) {
      setError('Failed to parse text. Please check your connection and try again.');
    }
    setParsing(false);
  }

  function handleConfirmImport() {
    if (preview) {
      onImport(preview);
    }
  }

  function getFieldCount(resume) {
    let count = 0;
    if (resume.personalInfo?.name) count++;
    if (resume.personalInfo?.email) count++;
    if (resume.personalInfo?.phone) count++;
    if (resume.personalInfo?.linkedin) count++;
    if (resume.personalInfo?.github) count++;
    count += resume.education?.length || 0;
    count += resume.projects?.length || 0;
    count += resume.experience?.length || 0;
    count += resume.achievements?.length || 0;
    count += resume.certifications?.length || 0;
    count += resume.customSections?.length || 0;
    count += normalizeSkills(resume.skills).filter(s => s.value && String(s.value).trim() !== '').length;
    return count;
  }

  // Main view
  if (!mode) {
    return (
      <div className="import-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="import-modal glass-card animate-fade-in-up">
          <div className="import-header">
            <h3><i className="fas fa-file-import"></i> Import Resume</h3>
            <button className="btn btn-icon btn-secondary" onClick={onClose}>
              <i className="fas fa-times"></i>
            </button>
          </div>
          <p className="import-desc">Choose how you want to import your existing resume data.</p>

          <div className="import-options">
            <button className="import-option glass-card" onClick={() => setMode('file')}>
              <div className="option-icon"><i className="fas fa-file-upload"></i></div>
              <h4>Upload Resume File</h4>
              <p>Upload a PDF, TXT, or TEX file. We'll extract the details automatically.</p>
              <span className="option-formats">Supports: .pdf, .txt, .tex</span>
            </button>

            <button className="import-option glass-card" onClick={() => setMode('text')}>
              <div className="option-icon"><i className="fas fa-paste"></i></div>
              <h4>Paste Plain Text</h4>
              <p>Paste LinkedIn profile or raw text. AI will automatically extract the details.</p>
              <span className="option-formats">Powered by Gemini AI</span>
            </button>
            
            <button className="import-option glass-card" onClick={() => setMode('latex')}>
              <div className="option-icon"><i className="fas fa-code"></i></div>
              <h4>Paste LaTeX Code</h4>
              <p>Paste your LaTeX resume source code. Best accuracy for our template format.</p>
              <span className="option-formats">Recommended for LaTeX users</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="import-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="import-modal import-modal-lg glass-card animate-fade-in-up">
        <div className="import-header">
          <h3>
            <i className={`fas ${mode === 'latex' ? 'fa-code' : mode === 'text' ? 'fa-paste' : 'fa-file-upload'}`}></i>
            {mode === 'latex' ? ' Paste LaTeX Code' : mode === 'text' ? ' Paste Plain Text' : ' Upload Resume File'}
          </h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-sm btn-secondary" onClick={() => { setMode(null); setPreview(null); setError(''); }}>
              <i className="fas fa-arrow-left"></i> Back
            </button>
            <button className="btn btn-icon btn-secondary" onClick={onClose}>
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>

        {error && (
          <div className="toast-error" style={{ position: 'static', padding: '10px 14px', borderRadius: '8px', marginBottom: '12px', fontSize: '0.85rem', animation: 'none' }}>
            <i className="fas fa-exclamation-circle"></i> {error}
          </div>
        )}

        {mode === 'file' && !preview && (
          <div className="file-upload-area">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.tex,.md"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
            <div className="upload-dropzone" onClick={() => fileInputRef.current?.click()}>
              <i className="fas fa-cloud-upload-alt"></i>
              <p>Click to upload or drag and drop</p>
              <span>PDF, TXT, or TEX file</span>
              {fileName && <span className="file-name"><i className="fas fa-file"></i> {fileName}</span>}
            </div>

            {parsing && (
              <div style={{ textAlign: 'center', padding: '16px' }}>
                <div className="spinner" style={{ margin: '0 auto' }}></div>
                <p style={{ marginTop: '8px', color: 'var(--text-muted)' }}>Parsing file with AI...</p>
              </div>
            )}
          </div>
        )}

        {mode === 'latex' && !preview && (
          <div className="latex-input-area">
            <textarea
              className="form-textarea latex-textarea"
              value={latexCode}
              onChange={e => setLatexCode(e.target.value)}
              placeholder={'Paste your LaTeX resume code here...\n\n\\documentclass{article}\n\\begin{document}\n...\n\\end{document}'}
              rows={16}
            />
            <div className="latex-actions">
              <label className="btn btn-sm btn-secondary" style={{ cursor: 'pointer' }}>
                <i className="fas fa-file-upload"></i> Upload .tex File
                <input
                  type="file"
                  accept=".tex"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </label>
              <button className="btn btn-primary" onClick={handleLatexParse} disabled={parsing || !latexCode.trim()}>
                {parsing ? <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }}></span> : <><i className="fas fa-magic"></i> Parse LaTeX</>}
              </button>
            </div>
          </div>
        )}

        {mode === 'text' && !preview && (
          <div className="latex-input-area">
            <textarea
              className="form-textarea latex-textarea"
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              placeholder={'Paste your full resume text or LinkedIn profile dump here...\nGemini AI will analyze it and extract the details.'}
              rows={16}
            />
            <div className="latex-actions">
              <div style={{flex: 1}}></div>
              <button className="btn btn-primary" onClick={handleTextParse} disabled={parsing || !textInput.trim()}>
                {parsing ? <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }}></span> : <><i className="fas fa-magic"></i> Parse with AI</>}
              </button>
            </div>
          </div>
        )}

        {/* Preview parsed data */}
        {preview && (
          <div className="import-preview">
            <div className="preview-header">
              <div className="preview-badge badge badge-success">
                <i className="fas fa-check-circle"></i> {getFieldCount(preview)} fields detected
              </div>
              <p className="form-section-desc" style={{ margin: 0 }}>Review the extracted data below. You can edit everything after importing.</p>
            </div>

            <div className="preview-grid">
              {/* Personal Info */}
              <div className="preview-section">
                <h5><i className="fas fa-user"></i> Personal Info</h5>
                <div className="preview-items">
                  {preview.personalInfo?.name && <div className="preview-item"><span>Name:</span> {preview.personalInfo.name}</div>}
                  {preview.personalInfo?.email && <div className="preview-item"><span>Email:</span> {preview.personalInfo.email}</div>}
                  {preview.personalInfo?.phone && <div className="preview-item"><span>Phone:</span> {preview.personalInfo.phone}</div>}
                  {preview.personalInfo?.linkedin && <div className="preview-item"><span>LinkedIn:</span> {preview.personalInfo.linkedin}</div>}
                  {preview.personalInfo?.github && <div className="preview-item"><span>GitHub:</span> {preview.personalInfo.github}</div>}
                </div>
              </div>

              {/* Education */}
              {preview.education?.length > 0 && (
                <div className="preview-section">
                  <h5><i className="fas fa-graduation-cap"></i> Education ({preview.education.length})</h5>
                  <div className="preview-items">
                    {preview.education.map((edu, i) => (
                      <div key={i} className="preview-item">{edu.institution} — {edu.degree || 'Details available'}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* Skills */}
              {normalizeSkills(preview.skills).some(s => s.value && String(s.value).trim() !== '') && (
                <div className="preview-section">
                  <h5><i className="fas fa-code"></i> Skills</h5>
                  <div className="preview-items">
                    {normalizeSkills(preview.skills).filter(s => s.value && String(s.value).trim() !== '').map((s, idx) => (
                      <div key={idx} className="preview-item"><span>{s.label}:</span> {String(s.value).slice(0, 60)}...</div>
                    ))}
                  </div>
                </div>
              )}

              {/* Projects */}
              {preview.projects?.length > 0 && (
                <div className="preview-section">
                  <h5><i className="fas fa-project-diagram"></i> Projects ({preview.projects.length})</h5>
                  <div className="preview-items">
                    {preview.projects.map((p, i) => (
                      <div key={i} className="preview-item">{p.name}{p.link ? ' 🔗' : ''}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* Experience */}
              {preview.experience?.length > 0 && (
                <div className="preview-section">
                  <h5><i className="fas fa-briefcase"></i> Experience ({preview.experience.length})</h5>
                  <div className="preview-items">
                    {preview.experience.map((e, i) => (
                      <div key={i} className="preview-item">{e.title} — {e.duration}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* Achievements */}
              {preview.achievements?.length > 0 && (
                <div className="preview-section">
                  <h5><i className="fas fa-trophy"></i> Achievements ({preview.achievements.length})</h5>
                  <div className="preview-items">
                    {preview.achievements.map((a, i) => (
                      <div key={i} className="preview-item">{a.bold || a.text}{a.link ? ' 🔗' : ''}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* Certifications */}
              {preview.certifications?.length > 0 && (
                <div className="preview-section">
                  <h5><i className="fas fa-certificate"></i> Certifications ({preview.certifications.length})</h5>
                  <div className="preview-items">
                    {preview.certifications.map((c, i) => (
                      <div key={i} className="preview-item">{c.name}{c.provider ? ` (${c.provider})` : ''}{c.link ? ' 🔗' : ''}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Sections */}
              {preview.customSections?.length > 0 && preview.customSections.map((s, i) => (
                <div key={i} className="preview-section">
                  <h5><i className="fas fa-plus-square"></i> {s.title} ({s.items.length})</h5>
                  <div className="preview-items">
                    {s.items.slice(0, 3).map((item, j) => (
                      <div key={j} className="preview-item">{typeof item === 'string' ? item.slice(0, 60) : item}...</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="import-confirm-actions">
              <button className="btn btn-secondary" onClick={() => { setPreview(null); }}>
                <i className="fas fa-redo"></i> Re-parse
              </button>
              <button className="btn btn-primary btn-lg" onClick={handleConfirmImport}>
                <i className="fas fa-check"></i> Import & Fill Resume
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
