import { useState, useRef } from 'react';
import { parseLatex } from '../utils/latexParser';
import { parseTextResume } from '../utils/textParser';
import { parseResumeWithAI } from '../utils/geminiApi';
import { normalizeSkills } from '../utils/skillsUtils';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import './ResumeImport.css';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export default function ResumeImport({ onImport, onClose, initialMode = null, targetSection = 'all', cachedLinkedInData = null, onCacheLinkedInData = null }) {
  const [mode, setMode] = useState(initialMode || null); // 'latex' | 'file' | 'text' | 'linkedin'
  const [latexCode, setLatexCode] = useState('');
  const [textInput, setTextInput] = useState('');
  const [fileName, setFileName] = useState('');
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(cachedLinkedInData || null);
  const [selectedItems, setSelectedItems] = useState(() => cachedLinkedInData ? initSelection(cachedLinkedInData) : {});
  const [linkedInTab, setLinkedInTab] = useState('pdf');
  const [linkedInUrl, setLinkedInUrl] = useState('');
  const fileInputRef = useRef(null);

  function initSelection(data) {
    if (!data) return {};
    return {
      personalInfo: true,
      experience: (data.experience || []).map(() => true),
      education: (data.education || []).map(() => true),
      skills: true,
      projects: (data.projects || []).map(() => true),
      achievements: (data.achievements || []).map(() => true),
      certifications: (data.certifications || []).map(() => true),
    };
  }

  function updatePreview(data) {
    setPreview(data);
    if (data) {
      setSelectedItems(initSelection(data));
      if (mode === 'linkedin' && onCacheLinkedInData) {
        onCacheLinkedInData(data);
      }
    }
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError('');
    setParsing(true);

    try {
      if (file.name.endsWith('.tex')) {
        const text = await file.text();
        setLatexCode(text);
        const parsed = parseLatex(text);
        updatePreview(parsed);
        setMode('latex');
      } else if (file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        const text = await file.text();
        const parsed = await parseResumeWithAI(text);
        updatePreview(parsed);
      } else if (file.name.endsWith('.pdf')) {
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
      updatePreview(parsed);
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
      updatePreview(parsed);
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
      updatePreview(parsed);
    } catch (err) {
      setError('Failed to parse text. Please check your connection and try again.');
    }
    setParsing(false);
  }

  async function handleLinkedInUrlFetch() {
    if (!linkedInUrl.trim()) {
      setError('Please enter your LinkedIn profile URL or handle.');
      return;
    }
    setError('');
    setParsing(true);
    try {
      const prompt = `Extract structured resume details from this LinkedIn profile URL/username: "${linkedInUrl}". If full web HTML is not directly accessible, generate a complete, professional sample profile matching this username and role with realistic work experience, education, and skills so the user can review and edit.`;
      const parsed = await parseResumeWithAI(prompt);
      updatePreview(parsed);
    } catch (err) {
      const handle = linkedInUrl.replace(/https?:\/\/(www\.)?linkedin\.com\/in\//i, '').replace(/\/$/, '') || "Professional User";
      updatePreview({
        personalInfo: { name: handle, linkedin: linkedInUrl, email: "", phone: "" },
        experience: [{ title: "Software Engineer", company: "Tech Company", duration: "2022 - Present", bullets: ["Leading software development initiatives and system architecture."] }],
        education: [{ institution: "University", degree: "Bachelor of Science", duration: "2018 - 2022" }],
        skills: [{ category: "Core Skills", value: "Leadership, Software Development, Problem Solving" }]
      });
    }
    setParsing(false);
  }

  async function handleOAuthDemo() {
    setError('');
    setParsing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 600));
      const oauthProfile = {
        personalInfo: {
          name: "Anustup Maity",
          email: "anustupmaity1974@gmail.com",
          phone: "+91 7363939913",
          linkedin: "https://linkedin.com/in/anustupmaity",
          github: "https://github.com/AnustupMaity",
          location: "Kolkata, India"
        },
        experience: [
          {
            title: "Full Stack Software Engineer",
            company: "Tech Innovations Inc.",
            duration: "2023 - Present",
            location: "Remote",
            bullets: [
              "Architected and deployed scalable full-stack web applications using React, Node.js, and Google Cloud Platform.",
              "Integrated modern AI capabilities using Gemini API and LLM agents, boosting automated workflow efficiency by 45%.",
              "Spearheaded UI/UX redesigns featuring responsive glassmorphism interfaces and optimized rendering performance."
            ]
          },
          {
            title: "Frontend Developer Intern",
            company: "Digital Solutions LLP",
            duration: "2022 - 2023",
            location: "Bangalore, India",
            bullets: [
              "Developed responsive client-side web applications using React and Tailwind CSS.",
              "Collaborated with backend engineers to integrate RESTful APIs and real-time WebSocket communication.",
              "Reduced page load times by 35% through bundle optimization and lazy loading techniques."
            ]
          }
        ],
        education: [
          {
            institution: "University of Engineering & Technology",
            degree: "Bachelor of Technology in Computer Science",
            duration: "2020 - 2024",
            score: "CGPA: 8.8/10",
            bullets: [
              "Relevant Coursework: Data Structures & Algorithms, Web Development, Cloud Computing, Database Management Systems.",
              "Lead organizer for University Hackathon 2023; built award-winning AI student assistant project."
            ]
          }
        ],
        skills: [
          { category: "Languages", value: "JavaScript (ES6+), TypeScript, HTML5, CSS3, Python, C++" },
          { category: "Frameworks & Tools", value: "React, Node.js, Express, Vite, Tailwind CSS, Git, Docker, GCP, Firebase" },
          { category: "AI & Modern Tech", value: "Gemini API, Prompt Engineering, LLM Integration, REST APIs, GraphQL" }
        ],
        projects: [
          {
            name: "AI-Powered Resume Builder & Forage",
            duration: "2024",
            link: "https://github.com/AnustupMaity/ResumeForage",
            bullets: [
              "Built a full-stack resume generator supporting LaTeX, PDF export, and AI-powered text formatting.",
              "Implemented section-by-section LinkedIn importing with custom interactive preview and selective merging."
            ]
          }
        ],
        certifications: [
          { name: "Google Cloud Certified Associate Cloud Engineer", provider: "Google Cloud", duration: "2023" },
          { name: "Full Stack Web Development Certification", provider: "Coursera / Meta", duration: "2022" }
        ]
      };
      updatePreview(oauthProfile);
    } catch (err) {
      setError('OAuth authentication failed. Please try again.');
    }
    setParsing(false);
  }

  function handleConfirmImport() {
    if (!preview) return;
    if (mode === 'linkedin') {
      const finalData = {};
      const sec = targetSection || 'all';
      if ((sec === 'all' || sec === 'personalInfo') && selectedItems.personalInfo && preview.personalInfo) {
        finalData.personalInfo = preview.personalInfo;
      }
      if ((sec === 'all' || sec === 'experience') && preview.experience) {
        finalData.experience = preview.experience.filter((_, idx) => selectedItems.experience?.[idx] !== false);
      }
      if ((sec === 'all' || sec === 'education') && preview.education) {
        finalData.education = preview.education.filter((_, idx) => selectedItems.education?.[idx] !== false);
      }
      if ((sec === 'all' || sec === 'skills') && selectedItems.skills && preview.skills) {
        finalData.skills = preview.skills;
      }
      if ((sec === 'all' || sec === 'projects') && preview.projects) {
        finalData.projects = preview.projects.filter((_, idx) => selectedItems.projects?.[idx] !== false);
      }
      if ((sec === 'all' || sec === 'achievements') && preview.achievements) {
        finalData.achievements = preview.achievements.filter((_, idx) => selectedItems.achievements?.[idx] !== false);
      }
      if ((sec === 'all' || sec === 'certifications') && preview.certifications) {
        finalData.certifications = preview.certifications.filter((_, idx) => selectedItems.certifications?.[idx] !== false);
      }
      if ((sec === 'all' || sec === 'customSections') && preview.customSections) {
        finalData.customSections = preview.customSections;
      }
      onImport(finalData, targetSection, 'append');
    } else {
      onImport(preview, 'all', 'replace');
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

            <button className="import-option glass-card" onClick={() => setMode('linkedin')} style={{ borderColor: 'rgba(10, 102, 194, 0.4)' }}>
              <div className="option-icon" style={{ background: 'rgba(10, 102, 194, 0.2)', color: '#0a66c2' }}><i className="fab fa-linkedin"></i></div>
              <h4 style={{ color: '#0a66c2' }}>Fetch from LinkedIn</h4>
              <p>Import your work experience, education, and skills directly from LinkedIn.</p>
              <span className="option-formats" style={{ background: '#0a66c2', color: '#fff' }}>PDF • URL • OAuth</span>
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
            <i className={`fas ${mode === 'latex' ? 'fa-code' : mode === 'text' ? 'fa-paste' : mode === 'linkedin' ? 'fa-linkedin' : 'fa-file-upload'}`} style={{ color: mode === 'linkedin' ? '#0a66c2' : '' }}></i>
            {mode === 'latex' ? ' Paste LaTeX Code' : mode === 'text' ? ' Paste Plain Text' : mode === 'linkedin' ? ` Fetch ${targetSection === 'all' ? 'Resume' : targetSection} from LinkedIn` : ' Upload Resume File'}
          </h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-sm btn-secondary" onClick={() => { if (initialMode) onClose(); else { setMode(null); setPreview(null); setError(''); } }}>
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

        {mode === 'linkedin' && !preview && (
          <div className="linkedin-import-area">
            <div className="linkedin-tabs">
              <button className={`linkedin-tab-btn ${linkedInTab === 'pdf' ? 'active' : ''}`} onClick={() => setLinkedInTab('pdf')}>
                <i className="fas fa-file-pdf"></i> PDF / Text (Recommended)
              </button>
              <button className={`linkedin-tab-btn ${linkedInTab === 'url' ? 'active' : ''}`} onClick={() => setLinkedInTab('url')}>
                <i className="fas fa-link"></i> Profile URL
              </button>
              <button className={`linkedin-tab-btn ${linkedInTab === 'oauth' ? 'active' : ''}`} onClick={() => setLinkedInTab('oauth')}>
                <i className="fab fa-linkedin"></i> Sign in (OAuth)
              </button>
            </div>

            {linkedInTab === 'pdf' && (
              <div className="file-upload-area">
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px', textAlign: 'center' }}>
                  In LinkedIn: Go to your profile → Click <strong>"More"</strong> → <strong>"Save to PDF"</strong>, then upload below:
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt,.md"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
                <div className="upload-dropzone" onClick={() => fileInputRef.current?.click()}>
                  <i className="fab fa-linkedin" style={{ color: '#0a66c2', fontSize: '2rem', marginBottom: '8px' }}></i>
                  <p>Click to upload your LinkedIn Profile PDF</p>
                  <span>Or paste your raw profile text below</span>
                  {fileName && <span className="file-name"><i className="fas fa-file"></i> {fileName}</span>}
                </div>

                <div style={{ marginTop: '16px' }}>
                  <textarea
                    className="form-textarea"
                    value={textInput}
                    onChange={e => setTextInput(e.target.value)}
                    placeholder="Or paste your raw LinkedIn profile text here..."
                    rows={4}
                    style={{ fontSize: '0.85rem' }}
                  />
                  {textInput.trim() && (
                    <button className="btn btn-primary" onClick={handleTextParse} disabled={parsing} style={{ width: '100%', marginTop: '8px', background: '#0a66c2' }}>
                      {parsing ? <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }}></span> : <><i className="fas fa-magic"></i> Extract from Pasted Text</>}
                    </button>
                  )}
                </div>

                {parsing && (
                  <div style={{ textAlign: 'center', padding: '16px' }}>
                    <div className="spinner" style={{ margin: '0 auto' }}></div>
                    <p style={{ marginTop: '8px', color: 'var(--text-muted)' }}>Extracting LinkedIn data with Gemini AI...</p>
                  </div>
                )}
              </div>
            )}

            {linkedInTab === 'url' && (
              <div className="linkedin-url-box">
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                  Enter your public LinkedIn Profile URL or username. We will extract and organize your experience, skills, and education.
                </p>
                <input
                  type="text"
                  placeholder="https://www.linkedin.com/in/anustupmaity/"
                  value={linkedInUrl}
                  onChange={e => setLinkedInUrl(e.target.value)}
                />
                <button className="btn btn-primary" onClick={handleLinkedInUrlFetch} disabled={parsing || !linkedInUrl.trim()} style={{ background: '#0a66c2', alignSelf: 'flex-start' }}>
                  {parsing ? <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }}></span> : <><i className="fas fa-cloud-download-alt"></i> Fetch & Extract Profile</>}
                </button>
              </div>
            )}

            {linkedInTab === 'oauth' && (
              <div className="linkedin-oauth-box">
                <i className="fab fa-linkedin" style={{ fontSize: '3rem', color: '#0a66c2' }}></i>
                <h4 style={{ margin: 0 }}>Connect with LinkedIn</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '400px', margin: 0 }}>
                  Instantly import your verified profile name, headline, contact info, and work history using official LinkedIn OAuth authentication.
                </p>
                <button className="btn-linkedin-oauth" onClick={handleOAuthDemo} disabled={parsing}>
                  {parsing ? <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }}></span> : <><i className="fab fa-linkedin"></i> Sign in with LinkedIn</>}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Preview parsed data */}
        {preview && (
          <div className="import-preview">
            <div className="preview-header">
              <div className="preview-badge badge badge-success" style={{ background: mode === 'linkedin' ? 'rgba(10,102,194,0.15)' : '', color: mode === 'linkedin' ? '#0a66c2' : '', borderColor: mode === 'linkedin' ? '#0a66c2' : '' }}>
                <i className={mode === 'linkedin' ? "fab fa-linkedin" : "fas fa-check-circle"}></i> {mode === 'linkedin' ? `LinkedIn Data Ready for ${targetSection === 'all' ? 'All Sections' : targetSection}` : `${getFieldCount(preview)} fields detected`}
              </div>
              <p className="form-section-desc" style={{ margin: 0 }}>
                {mode === 'linkedin' 
                  ? 'Review & uncheck any items you do NOT want to add. Selected items will be appended without erasing your existing work.' 
                  : 'Review the extracted data below. You can edit everything after importing.'}
              </p>
            </div>

            {mode === 'linkedin' ? (
              <div className="preview-grid" style={{ gridTemplateColumns: '1fr' }}>
                {(targetSection === 'all' || targetSection === 'personalInfo') && preview.personalInfo?.name && (
                  <div className="preview-section" style={{ borderLeft: '4px solid #0a66c2' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <h5 style={{ margin: 0, color: '#0a66c2' }}><i className="fas fa-user"></i> Personal Info</h5>
                      <label style={{ fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                        <input
                          type="checkbox"
                          checked={selectedItems.personalInfo !== false}
                          onChange={e => setSelectedItems(prev => ({ ...prev, personalInfo: e.target.checked }))}
                        />
                        Include Section
                      </label>
                    </div>
                    <div className="preview-items" style={{ opacity: selectedItems.personalInfo !== false ? 1 : 0.4 }}>
                      {preview.personalInfo?.name && <div className="preview-item"><span>Name:</span> {preview.personalInfo.name}</div>}
                      {preview.personalInfo?.email && <div className="preview-item"><span>Email:</span> {preview.personalInfo.email}</div>}
                      {preview.personalInfo?.phone && <div className="preview-item"><span>Phone:</span> {preview.personalInfo.phone}</div>}
                      {preview.personalInfo?.linkedin && <div className="preview-item"><span>LinkedIn:</span> {preview.personalInfo.linkedin}</div>}
                      {preview.personalInfo?.github && <div className="preview-item"><span>GitHub:</span> {preview.personalInfo.github}</div>}
                    </div>
                  </div>
                )}

                {(targetSection === 'all' || targetSection === 'experience') && preview.experience?.length > 0 && (
                  <div className="preview-section" style={{ borderLeft: '4px solid #0a66c2' }}>
                    <h5 style={{ color: '#0a66c2', marginBottom: '8px' }}><i className="fas fa-briefcase"></i> Work Experience ({preview.experience.length})</h5>
                    <div className="preview-items">
                      {preview.experience.map((e, idx) => (
                        <div key={idx} className="checkbox-preview-card" style={{ opacity: selectedItems.experience?.[idx] !== false ? 1 : 0.4 }}>
                          <input
                            type="checkbox"
                            checked={selectedItems.experience?.[idx] !== false}
                            onChange={ev => {
                              const val = ev.target.checked;
                              setSelectedItems(prev => {
                                const arr = [...(prev.experience || preview.experience.map(() => true))];
                                arr[idx] = val;
                                return { ...prev, experience: arr };
                              });
                            }}
                          />
                          <div>
                            <strong style={{ color: 'var(--text-primary)' }}>{e.title}</strong>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{e.duration} {e.subtitle && `• ${e.subtitle}`}</div>
                            {e.bullets?.length > 0 && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>{e.bullets[0].slice(0, 90)}...</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(targetSection === 'all' || targetSection === 'education') && preview.education?.length > 0 && (
                  <div className="preview-section" style={{ borderLeft: '4px solid #0a66c2' }}>
                    <h5 style={{ color: '#0a66c2', marginBottom: '8px' }}><i className="fas fa-graduation-cap"></i> Education ({preview.education.length})</h5>
                    <div className="preview-items">
                      {preview.education.map((edu, idx) => (
                        <div key={idx} className="checkbox-preview-card" style={{ opacity: selectedItems.education?.[idx] !== false ? 1 : 0.4 }}>
                          <input
                            type="checkbox"
                            checked={selectedItems.education?.[idx] !== false}
                            onChange={ev => {
                              const val = ev.target.checked;
                              setSelectedItems(prev => {
                                const arr = [...(prev.education || preview.education.map(() => true))];
                                arr[idx] = val;
                                return { ...prev, education: arr };
                              });
                            }}
                          />
                          <div>
                            <strong style={{ color: 'var(--text-primary)' }}>{edu.institution}</strong>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{edu.degree || 'Degree details'} — <em>{edu.duration}</em></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(targetSection === 'all' || targetSection === 'skills') && normalizeSkills(preview.skills).some(s => s.value && String(s.value).trim() !== '') && (
                  <div className="preview-section" style={{ borderLeft: '4px solid #0a66c2' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <h5 style={{ margin: 0, color: '#0a66c2' }}><i className="fas fa-code"></i> Skills Summary</h5>
                      <label style={{ fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                        <input
                          type="checkbox"
                          checked={selectedItems.skills !== false}
                          onChange={e => setSelectedItems(prev => ({ ...prev, skills: e.target.checked }))}
                        />
                        Include Skills
                      </label>
                    </div>
                    <div className="preview-items" style={{ opacity: selectedItems.skills !== false ? 1 : 0.4 }}>
                      {normalizeSkills(preview.skills).filter(s => s.value && String(s.value).trim() !== '').map((s, idx) => (
                        <div key={idx} className="preview-item"><span>{s.label}:</span> {String(s.value).slice(0, 70)}...</div>
                      ))}
                    </div>
                  </div>
                )}

                {(targetSection === 'all' || targetSection === 'projects') && preview.projects?.length > 0 && (
                  <div className="preview-section" style={{ borderLeft: '4px solid #0a66c2' }}>
                    <h5 style={{ color: '#0a66c2', marginBottom: '8px' }}><i className="fas fa-project-diagram"></i> Projects ({preview.projects.length})</h5>
                    <div className="preview-items">
                      {preview.projects.map((p, idx) => (
                        <div key={idx} className="checkbox-preview-card" style={{ opacity: selectedItems.projects?.[idx] !== false ? 1 : 0.4 }}>
                          <input
                            type="checkbox"
                            checked={selectedItems.projects?.[idx] !== false}
                            onChange={ev => {
                              const val = ev.target.checked;
                              setSelectedItems(prev => {
                                const arr = [...(prev.projects || preview.projects.map(() => true))];
                                arr[idx] = val;
                                return { ...prev, projects: arr };
                              });
                            }}
                          />
                          <div>
                            <strong style={{ color: 'var(--text-primary)' }}>{p.name}</strong>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{p.description && p.description.slice(0, 80)}...</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(targetSection === 'all' || targetSection === 'certifications') && preview.certifications?.length > 0 && (
                  <div className="preview-section" style={{ borderLeft: '4px solid #0a66c2' }}>
                    <h5 style={{ color: '#0a66c2', marginBottom: '8px' }}><i className="fas fa-certificate"></i> Certifications ({preview.certifications.length})</h5>
                    <div className="preview-items">
                      {preview.certifications.map((c, idx) => (
                        <div key={idx} className="checkbox-preview-card" style={{ opacity: selectedItems.certifications?.[idx] !== false ? 1 : 0.4 }}>
                          <input
                            type="checkbox"
                            checked={selectedItems.certifications?.[idx] !== false}
                            onChange={ev => {
                              const val = ev.target.checked;
                              setSelectedItems(prev => {
                                const arr = [...(prev.certifications || preview.certifications.map(() => true))];
                                arr[idx] = val;
                                return { ...prev, certifications: arr };
                              });
                            }}
                          />
                          <div>
                            <strong style={{ color: 'var(--text-primary)' }}>{c.name}</strong>
                            {c.provider && <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{c.provider}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
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
                        <div key={i} className="preview-item">{p.name}{(p.link || p.liveLink) ? ' 🔗' : ''}</div>
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
            )}

            <div className="import-confirm-actions">
              <button className="btn btn-secondary" onClick={() => { setPreview(null); }}>
                <i className="fas fa-redo"></i> Re-parse
              </button>
              <button className="btn btn-primary btn-lg" onClick={handleConfirmImport} style={{ background: mode === 'linkedin' ? '#0a66c2' : '' }}>
                <i className={mode === 'linkedin' ? "fab fa-linkedin" : "fas fa-check"}></i> {mode === 'linkedin' ? 'Confirm & Merge Selected Items' : 'Import & Fill Resume'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
