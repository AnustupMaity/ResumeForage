import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { doc, updateDoc, collection, addDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import ResumePreview from '../components/ResumePreview';
import ResumeImport from '../components/ResumeImport';
import AtsChecker from '../components/AtsChecker';
import CoverLetterGenerator from '../components/CoverLetterGenerator';
import { rewriteBulletPoint, applyGlobalInstruction } from '../utils/geminiApi';
import { generateLatex } from '../utils/latexGenerator';
import { normalizeSkills } from '../utils/skillsUtils';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import './ResumeEditor.css';

const quillModules = {
  toolbar: [
    [{ 'font': [] }, { 'size': [] }],
    ['bold', 'italic', 'underline'],
    [{ 'color': [] }, { 'background': [] }],
    ['clean']
  ]
};

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').trim();
}

function GlobalAIForm({ resume, setResume, pushToHistory }) {
  const [instruction, setInstruction] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleApply = async () => {
    if (!instruction.trim()) return;
    setProcessing(true);
    setError('');
    try {
      const newResumeData = await applyGlobalInstruction(resume, instruction);
      pushToHistory(resume);
      setResume(newResumeData);
      setInstruction('');
    } catch (err) {
      console.error(err);
      setError('Failed to apply AI instructions. Please try again.');
    }
    setProcessing(false);
  };

  return (
    <div className="form-section animate-fade-in">
      <h4 className="form-section-title"><i className="fas fa-magic" style={{ color: 'var(--accent-primary-light)' }}></i> AI Assistant</h4>
      <p className="form-section-desc">Give instructions to Gemini to automatically rewrite or restructure your entire resume.</p>
      
      <div className="entry-card glass-card">
        {error && (
          <div className="toast-error" style={{ position: 'static', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem', animation: 'none' }}>
            <i className="fas fa-exclamation-circle"></i> {error}
          </div>
        )}
        <label className="form-label">Custom Instruction</label>
        <textarea
          className="form-textarea"
          value={instruction}
          onChange={e => setInstruction(e.target.value)}
          placeholder="e.g. 'Make my resume sound more professional', 'Focus my skills towards machine learning', 'Translate everything to French'"
          rows={5}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}><i className="fas fa-info-circle"></i> You can Undo (↶) this action if you don't like the result.</span>
          <button className="btn btn-primary" onClick={handleApply} disabled={processing || !instruction.trim()}>
            {processing ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, marginRight: 6 }}></span> Processing...</> : <><i className="fas fa-magic"></i> Apply Changes</>}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ResumeEditor() {
  const { currentUser, userData, isSubscriptionActive, refreshUserData } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const resumeId = searchParams.get('id');
  const [resumeRef, setResumeRef] = useState(null);
  const [resume, setResume] = useState(null);
  const [history, setHistoryState] = useState([]);
  const [historyIndex, setHistoryIndexState] = useState(-1);
  const historyRef = useRef([]);
  const historyIndexRef = useRef(-1);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeSection, setActiveSection] = useState('personalInfo');
  const [showPreview, setShowPreview] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importInitialMode, setImportInitialMode] = useState(null);
  const [importTargetSection, setImportTargetSection] = useState('all');
  const [cachedLinkedInData, setCachedLinkedInData] = useState(null);
  const [showAtsChecker, setShowAtsChecker] = useState(false);
  const [showCoverLetter, setShowCoverLetter] = useState(false);
  const [leftWidth, setLeftWidth] = useState(42); // 42% form, 58% preview (default split up to red line)
  const isDraggingRef = useRef(false);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDraggingRef.current) return;
      const newLeftWidth = (e.clientX / window.innerWidth) * 100;
      if (newLeftWidth >= 20 && newLeftWidth <= 80) {
        setLeftWidth(newLeftWidth);
      }
    };

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleMouseDown = (e) => {
    e.preventDefault();
    isDraggingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const pushToHistory = useCallback((currentState) => {
    if (!currentState) return;
    const currentIdx = historyIndexRef.current;
    const currentHist = historyRef.current;
    const newHistory = currentHist.slice(0, currentIdx + 1);
    newHistory.push(JSON.parse(JSON.stringify(currentState)));
    if (newHistory.length > 50) {
      newHistory.shift();
      historyIndexRef.current = newHistory.length - 1;
      setHistoryIndexState(newHistory.length - 1);
    } else {
      historyIndexRef.current = currentIdx + 1;
      setHistoryIndexState(currentIdx + 1);
    }
    historyRef.current = newHistory;
    setHistoryState(newHistory);
  }, []);

  const undo = useCallback(() => {
    const currentIdx = historyIndexRef.current;
    const currentHist = historyRef.current;
    if (currentIdx > 0) {
      const newIdx = currentIdx - 1;
      historyIndexRef.current = newIdx;
      setHistoryIndexState(newIdx);
      setResume(JSON.parse(JSON.stringify(currentHist[newIdx])));
    }
  }, []);

  const redo = useCallback(() => {
    const currentIdx = historyIndexRef.current;
    const currentHist = historyRef.current;
    if (currentIdx < currentHist.length - 1) {
      const newIdx = currentIdx + 1;
      historyIndexRef.current = newIdx;
      setHistoryIndexState(newIdx);
      setResume(JSON.parse(JSON.stringify(currentHist[newIdx])));
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          redo();
        } else {
          e.preventDefault();
          undo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const handleImport = useCallback((importedData, targetSection = 'all', mergeMode = 'replace') => {
    setResume(prev => {
      pushToHistory(prev);
      const merged = { ...prev };
      const sec = targetSection || 'all';
      if ((sec === 'all' || sec === 'personalInfo') && importedData.personalInfo) {
        merged.personalInfo = { ...(merged.personalInfo || {}), ...importedData.personalInfo };
      }
      if ((sec === 'all' || sec === 'education') && importedData.education?.length) {
        merged.education = mergeMode === 'append' ? [...(merged.education || []), ...importedData.education] : importedData.education;
      }
      if ((sec === 'all' || sec === 'skills') && importedData.skills) {
        merged.skills = { ...(merged.skills || {}), ...importedData.skills };
      }
      if ((sec === 'all' || sec === 'projects') && importedData.projects?.length) {
        merged.projects = mergeMode === 'append' ? [...(merged.projects || []), ...importedData.projects] : importedData.projects;
      }
      if ((sec === 'all' || sec === 'experience') && importedData.experience?.length) {
        merged.experience = mergeMode === 'append' ? [...(merged.experience || []), ...importedData.experience] : importedData.experience;
      }
      if ((sec === 'all' || sec === 'achievements') && importedData.achievements?.length) {
        merged.achievements = mergeMode === 'append' ? [...(merged.achievements || []), ...importedData.achievements] : importedData.achievements;
      }
      if ((sec === 'all' || sec === 'certifications') && importedData.certifications?.length) {
        merged.certifications = mergeMode === 'append' ? [...(merged.certifications || []), ...importedData.certifications] : importedData.certifications;
      }
      if ((sec === 'all' || sec === 'customSections') && importedData.customSections?.length) {
        merged.customSections = mergeMode === 'append' ? [...(merged.customSections || []), ...importedData.customSections] : importedData.customSections;
      }
      return merged;
    });
    setShowImport(false);
    setSaved(false);
  }, [pushToHistory]);

  useEffect(() => {
    if (!currentUser || !userData) return;

    if (resumeId && !resume && historyRef.current.length === 0) {
      getDoc(doc(db, 'users', currentUser.uid, 'resumes', resumeId)).then(rDoc => {
        if (rDoc.exists()) {
          const dbResume = rDoc.data().data || rDoc.data();
          setResume(dbResume);
          const initHist = [JSON.parse(JSON.stringify(dbResume))];
          historyRef.current = initHist;
          historyIndexRef.current = 0;
          setHistoryState(initHist);
          setHistoryIndexState(0);
          setResumeRef(doc(db, 'users', currentUser.uid, 'resumes', resumeId));
        } else {
          alert('Resume not found!');
          navigate('/resumes');
        }
      }).catch(console.error);
    } else if (!resumeId && userData.resume && !resume && historyRef.current.length === 0) {
      const initialResume = JSON.parse(JSON.stringify(userData.resume));
      setResume(initialResume);
      const initHist = [initialResume];
      historyRef.current = initHist;
      historyIndexRef.current = 0;
      setHistoryState(initHist);
      setHistoryIndexState(0);
    }
  }, [currentUser, userData, resumeId, resume, navigate]);

  const updateField = useCallback((path, value) => {
    setResume(prev => {
      pushToHistory(prev);
      const updated = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let obj = updated;
      for (let i = 0; i < keys.length - 1; i++) {
        if (keys[i].match(/^\d+$/)) {
          obj = obj[parseInt(keys[i])];
        } else {
          obj = obj[keys[i]];
        }
      }
      const lastKey = keys[keys.length - 1];
      if (lastKey.match(/^\d+$/)) {
        obj[parseInt(lastKey)] = value;
      } else {
        obj[lastKey] = value;
      }
      return updated;
    });
    setSaved(false);
  }, []);

  const addToArray = useCallback((path, item) => {
    setResume(prev => {
      pushToHistory(prev);
      const updated = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let obj = updated;
      for (const key of keys) {
        obj = obj[key];
      }
      obj.push(item);
      return updated;
    });
    setSaved(false);
  }, []);

  const removeFromArray = useCallback((path, index) => {
    setResume(prev => {
      pushToHistory(prev);
      const updated = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let obj = updated;
      for (const key of keys) {
        obj = obj[key];
      }
      obj.splice(index, 1);
      return updated;
    });
    setSaved(false);
  }, []);

  const swapArrayItems = useCallback((path, indexA, indexB) => {
    setResume(prev => {
      pushToHistory(prev);
      const updated = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let obj = updated;
      for (const key of keys) {
        obj = obj[key];
      }
      if (indexB >= 0 && indexB < obj.length) {
        const temp = obj[indexA];
        obj[indexA] = obj[indexB];
        obj[indexB] = temp;
      }
      return updated;
    });
    setSaved(false);
  }, []);

  async function handleSave() {
    if (!currentUser || !resume) return;

    const nameStr = resume.personalInfo?.name || 'Untitled';
    const defaultName = `${nameStr.replace(/\s+/g, '_')}_Resume_${new Date().toISOString().split('T')[0]}`;
    const userInput = window.prompt("Enter a name to save this resume as:", defaultName);
    if (userInput === null) return; // User clicked Cancel
    const resumeName = userInput.trim() || defaultName;

    setSaving(true);
    try {
      let currentRef = resumeRef;
      
      const payload = {
        name: resumeName,
        data: resume,
        updatedAt: serverTimestamp()
      };

      if (currentRef) {
        await updateDoc(currentRef, payload);
      } else {
        payload.createdAt = serverTimestamp();
        currentRef = await addDoc(collection(db, 'users', currentUser.uid, 'resumes'), payload);
        setResumeRef(currentRef);
        navigate(`/editor?id=${currentRef.id}`, { replace: true });
      }

      // Keep legacy save updated so the main Dashboard still shows the most recent resume data
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, { resume });

      setSaved(true);
      await refreshUserData();
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Save failed:', err);
      alert('Failed to save. Please try again.');
    }
    setSaving(false);
  }

  async function handleDownloadPDF() {
    if (!isSubscriptionActive()) {
      navigate('/payment');
      return;
    }
    const element = document.getElementById('resume-content');
    if (!element) return;

    const nameStr = resume.personalInfo?.name || 'Untitled';
    const defaultName = `${nameStr.replace(/\s+/g, '_')}_Resume.pdf`;
    const userInput = window.prompt("Enter a filename for the PDF:", defaultName);
    if (userInput === null) return;
    let finalName = userInput.trim() || defaultName;
    if (!finalName.toLowerCase().endsWith('.pdf')) finalName += '.pdf';

    const html2pdf = (await import('html2pdf.js')).default;
    const opt = {
      margin: 0,
      filename: finalName,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  }

  function handleDownloadLatex() {
    if (!isSubscriptionActive()) {
      navigate('/payment');
      return;
    }

    const nameStr = resume.personalInfo?.name || 'Untitled';
    const defaultName = `${nameStr.replace(/\s+/g, '_')}_Resume.tex`;
    const userInput = window.prompt("Enter a filename for the LaTeX file:", defaultName);
    if (userInput === null) return;
    let finalName = userInput.trim() || defaultName;
    if (!finalName.toLowerCase().endsWith('.tex')) finalName += '.tex';

    const latexString = generateLatex(resume);
    const blob = new Blob([latexString], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = finalName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  if (!resume) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading your resume...</p>
      </div>
    );
  }

  const sections = [
    { id: 'personalInfo', label: 'Personal Info', icon: 'fa-user' },
    { id: 'education', label: 'Education', icon: 'fa-graduation-cap' },
    { id: 'skills', label: 'Skills', icon: 'fa-code' },
    { id: 'projects', label: 'Projects', icon: 'fa-project-diagram' },
    { id: 'experience', label: 'Experience', icon: 'fa-briefcase' },
    { id: 'achievements', label: 'Achievements', icon: 'fa-trophy' },
    { id: 'certifications', label: 'Certifications', icon: 'fa-certificate' },
    { id: 'customSections', label: 'Custom Sections', icon: 'fa-plus-square' },
    { id: 'reorder', label: 'Layout & Formatting', icon: 'fa-sliders-h' },
    { id: 'aiAssistant', label: 'AI Assistant', icon: 'fa-magic' },
  ];

  return (
    <>
      <div className="editor-layout">
        {/* Left panel - Form */}
        <div className="editor-panel" style={{ width: `${leftWidth}%`, flexShrink: 0 }}>
          <div className="editor-toolbar">
          <h3 className="dot-font"><i className="fas fa-edit"></i> Resume Editor</h3>
          <div className="toolbar-actions">
            <button className="btn btn-icon btn-secondary" onClick={undo} disabled={historyIndex <= 0} title="Undo (Ctrl+Z)">
              <i className="fas fa-undo"></i>
            </button>
            <button className="btn btn-icon btn-secondary" onClick={redo} disabled={historyIndex >= history.length - 1} title="Redo (Ctrl+Y)">
              <i className="fas fa-redo"></i>
            </button>
            <div style={{ width: '1px', height: '24px', background: 'var(--border-subtle)', margin: '0 4px' }}></div>
            
            <button className="btn btn-sm btn-outline" onClick={() => { setImportInitialMode(null); setImportTargetSection('all'); setShowImport(true); }}>
              <i className="fas fa-file-import"></i> <span className="hide-mobile">Import</span>
            </button>
            <button className="btn btn-sm btn-outline" onClick={() => setShowAtsChecker(true)} title="Check ATS Score">
              <i className="fas fa-search-dollar"></i> <span className="hide-mobile">ATS</span>
            </button>
            <button className="btn btn-sm btn-outline" onClick={() => setShowCoverLetter(true)} title="Generate Cover Letter">
              <i className="fas fa-envelope-open-text"></i> <span className="hide-mobile">Cover Letter</span>
            </button>

            <select 
              className="form-input" 
              style={{ width: '140px', padding: '6px 12px' }}
              value={resume.settings?.templateId || 'latex'}
              onChange={e => {
                if (!resume.settings) updateField('settings', {});
                updateField('settings.templateId', e.target.value);
              }}
            >
              <option value="latex">Classic (LaTeX)</option>
              <option value="modern">Modern</option>
              <option value="minimalist">Minimalist</option>
            </select>
            
            <button className="btn btn-sm btn-secondary" onClick={handleSave} disabled={saving}>
              <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-save'}`}></i>
              {saving ? 'Saving...' : saved ? 'Saved ✓' : <span className="hide-mobile">Save</span>}
            </button>
            <button className="btn btn-sm btn-primary" onClick={handleDownloadPDF}>
              <i className="fas fa-file-pdf"></i>
              <span className="hide-mobile">{isSubscriptionActive() ? 'PDF' : 'Pay to Download'}</span>
            </button>
            <button className="btn btn-sm btn-primary" style={{ background: '#2c3e50', borderColor: '#2c3e50' }} onClick={handleDownloadLatex}>
              <i className="fas fa-code"></i>
              <span className="hide-mobile">{isSubscriptionActive() ? 'LaTeX' : 'Pay to Download'}</span>
            </button>
          </div>
        </div>

        {/* Section tabs */}
        <div className="section-tabs">
          {sections.map(s => (
            <button
              key={s.id}
              className={`section-tab ${activeSection === s.id ? 'active' : ''}`}
              onClick={() => setActiveSection(s.id)}
            >
              <i className={`fas ${s.icon}`}></i>
              <span>{s.label}</span>
            </button>
          ))}
        </div>

        {/* Section forms */}
        <div className="editor-form">
          {['personalInfo', 'education', 'skills', 'projects', 'experience', 'certifications'].includes(activeSection) && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(10, 102, 194, 0.08)', border: '1px solid rgba(10, 102, 194, 0.25)', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#0a66c2', fontSize: '0.85rem' }}>
                <i className="fab fa-linkedin" style={{ fontSize: '1.2rem' }}></i>
                <span>Want to fill this section automatically from LinkedIn?</span>
              </div>
              <button 
                type="button"
                className="btn btn-sm" 
                style={{ background: '#0a66c2', color: '#fff', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px', border: 'none', cursor: 'pointer', padding: '6px 12px', borderRadius: '6px' }}
                onClick={() => {
                  setImportInitialMode('linkedin');
                  setImportTargetSection(activeSection);
                  setShowImport(true);
                }}
              >
                <i className="fab fa-linkedin"></i> Fetch {sections.find(s => s.id === activeSection)?.label || 'Section'}
              </button>
            </div>
          )}
          {activeSection === 'personalInfo' && (
            <PersonalInfoForm resume={resume} updateField={updateField} addToArray={addToArray} removeFromArray={removeFromArray} />
          )}
          {activeSection === 'education' && (
            <EducationForm resume={resume} updateField={updateField} addToArray={addToArray} removeFromArray={removeFromArray} />
          )}
          {activeSection === 'skills' && (
            <SkillsForm resume={resume} updateField={updateField} />
          )}
          {activeSection === 'projects' && (
            <ProjectsForm resume={resume} updateField={updateField} addToArray={addToArray} removeFromArray={removeFromArray} />
          )}
          {activeSection === 'experience' && (
            <ExperienceForm resume={resume} updateField={updateField} addToArray={addToArray} removeFromArray={removeFromArray} />
          )}
          {activeSection === 'achievements' && (
            <AchievementsForm resume={resume} updateField={updateField} addToArray={addToArray} removeFromArray={removeFromArray} />
          )}
          {activeSection === 'certifications' && (
            <CertificationsForm resume={resume} updateField={updateField} addToArray={addToArray} removeFromArray={removeFromArray} />
          )}
          {activeSection === 'customSections' && (
            <CustomSectionsForm resume={resume} updateField={updateField} addToArray={addToArray} removeFromArray={removeFromArray} />
          )}
          {activeSection === 'reorder' && (
            <ReorderForm resume={resume} updateField={updateField} swapArrayItems={swapArrayItems} />
          )}
          {activeSection === 'aiAssistant' && (
            <GlobalAIForm resume={resume} setResume={setResume} pushToHistory={pushToHistory} />
          )}
        </div>
      </div>

      {/* Resizable Divider Handle */}
      <div
        className="resizer-handle"
        onMouseDown={handleMouseDown}
        title="Drag left/right to resize panels"
      />

      {/* Right panel - Preview */}
      <div className="preview-panel" style={{ flex: 1, minWidth: 0 }}>
        <ResumePreview resume={resume} themeId={resume.settings?.templateId || 'latex'} updateField={updateField} />
      </div>
    </div>

      {showImport && (
        <ResumeImport 
          onImport={handleImport}
          onClose={() => setShowImport(false)}
          initialMode={importInitialMode}
          targetSection={importTargetSection}
          cachedLinkedInData={cachedLinkedInData}
          onCacheLinkedInData={(data) => setCachedLinkedInData(data)}
        />
      )}
      
      {showAtsChecker && (
        <AtsChecker 
          resume={resume} 
          onClose={() => setShowAtsChecker(false)} 
        />
      )}

      {showCoverLetter && (
        <CoverLetterGenerator 
          resume={resume} 
          onClose={() => setShowCoverLetter(false)} 
        />
      )}
    </>
  );
}

/* ---- Section Form Components ---- */

function PersonalInfoForm({ resume, updateField, addToArray, removeFromArray }) {
  const p = resume.personalInfo || {};
  return (
    <div className="form-section animate-fade-in">
      <h4 className="form-section-title">Personal Information</h4>
      <p className="form-section-desc">Your name and contact details shown at the top of the resume.</p>
      <div className="form-grid">
        <div className="form-group">
          <label className="form-label">Full Name</label>
          <input className="form-input" value={p.name || ''} onChange={e => updateField('personalInfo.name', e.target.value)} placeholder="John Doe" />
        </div>
        <div className="form-group">
          <label className="form-label">Email</label>
          <input className="form-input" type="email" value={p.email || ''} onChange={e => updateField('personalInfo.email', e.target.value)} placeholder="john@example.com" />
        </div>
        <div className="form-group">
          <label className="form-label">Phone</label>
          <input className="form-input" value={p.phone || ''} onChange={e => updateField('personalInfo.phone', e.target.value)} placeholder="+91 1234567890" />
        </div>
        <div className="form-group">
          <label className="form-label">LinkedIn (username or URL)</label>
          <input className="form-input" value={p.linkedin || ''} onChange={e => updateField('personalInfo.linkedin', e.target.value)} placeholder="johndoe" />
        </div>
        <div className="form-group">
          <label className="form-label">GitHub (username or URL)</label>
          <input className="form-input" value={p.github || ''} onChange={e => updateField('personalInfo.github', e.target.value)} placeholder="johndoe" />
        </div>
      </div>

      <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <h5 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--accent-primary-light)' }}><i className="fas fa-link"></i> Additional Links & Contact Items</h5>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Portfolio website, LeetCode, Twitter, location / address, etc.</span>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-outline"
            onClick={() => {
              if (!p.customLinks) updateField('personalInfo.customLinks', []);
              addToArray('personalInfo.customLinks', { label: '', value: '', icon: '' });
            }}
          >
            <i className="fas fa-plus"></i> Add Item
          </button>
        </div>

        {(p.customLinks || []).map((link, i) => (
          <div key={i} className="entry-card glass-card" style={{ marginBottom: '12px', padding: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-primary)' }}>Custom Item #{i + 1}</span>
              <button type="button" className="btn btn-xs btn-danger" onClick={() => removeFromArray('personalInfo.customLinks', i)}>
                <i className="fas fa-trash"></i>
              </button>
            </div>
            <div className="form-grid" style={{ gridTemplateColumns: '1fr 2fr' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Header / Label (e.g. Portfolio)</label>
                <input
                  className="form-input"
                  value={link.label || ''}
                  onChange={e => updateField(`personalInfo.customLinks.${i}.label`, e.target.value)}
                  placeholder="Portfolio"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Link or Text (e.g. https://mywebsite.com)</label>
                <input
                  className="form-input"
                  value={link.value || ''}
                  onChange={e => updateField(`personalInfo.customLinks.${i}.value`, e.target.value)}
                  placeholder="https://anustupmaity.dev or Kolkata, India"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EducationForm({ resume, updateField, addToArray, removeFromArray }) {
  return (
    <div className="form-section animate-fade-in">
      <h4 className="form-section-title">Education</h4>
      <p className="form-section-desc">Add your educational qualifications, most recent first.</p>
      {(resume.education || []).map((edu, i) => (
        <div key={i} className="entry-card glass-card">
          <div className="entry-header">
            <span className="entry-number">#{i + 1}</span>
            <button className="btn btn-sm btn-danger" onClick={() => removeFromArray('education', i)}>
              <i className="fas fa-trash"></i>
            </button>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Institution</label>
              <input className="form-input" value={edu.institution || ''} onChange={e => updateField(`education.${i}.institution`, e.target.value)} placeholder="University Name" />
            </div>
            <div className="form-group">
              <label className="form-label">Duration</label>
              <input className="form-input" value={edu.duration || ''} onChange={e => updateField(`education.${i}.duration`, e.target.value)} placeholder="Nov 2022 -- June 2026" />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Degree & Details</label>
              <input className="form-input" value={edu.degree || ''} onChange={e => updateField(`education.${i}.degree`, e.target.value)} placeholder="B.Tech in Computer Science; CGPA: 8.5" />
            </div>
            <div className="form-group">
              <label className="form-label">Note (optional, e.g. "Distance Learning")</label>
              <input className="form-input" value={edu.note || ''} onChange={e => updateField(`education.${i}.note`, e.target.value)} placeholder="" />
            </div>
          </div>
        </div>
      ))}
      <button className="btn btn-outline btn-sm" onClick={() => addToArray('education', { institution: '', degree: '', duration: '', note: '' })}>
        <i className="fas fa-plus"></i> Add Education
      </button>
    </div>
  );
}

function SkillsForm({ resume, updateField }) {
  const skillsList = normalizeSkills(resume.skills);

  const handleUpdate = (index, field, val) => {
    const newList = [...skillsList];
    newList[index] = { ...newList[index], [field]: val };
    updateField('skills', newList);
  };

  const handleAddCategory = () => {
    const newCat = { id: `custom_${Date.now()}`, label: 'New Category', value: '' };
    updateField('skills', [...skillsList, newCat]);
  };

  const handleRemoveCategory = (index) => {
    const newList = [...skillsList];
    newList.splice(index, 1);
    updateField('skills', newList);
  };

  const handleMoveUp = (index) => {
    if (index === 0) return;
    const newList = [...skillsList];
    const temp = newList[index - 1];
    newList[index - 1] = newList[index];
    newList[index] = temp;
    updateField('skills', newList);
  };

  const handleMoveDown = (index) => {
    if (index === skillsList.length - 1) return;
    const newList = [...skillsList];
    const temp = newList[index + 1];
    newList[index + 1] = newList[index];
    newList[index] = temp;
    updateField('skills', newList);
  };

  return (
    <div className="form-section animate-fade-in">
      <h4 className="form-section-title">Skills Summary</h4>
      <p className="form-section-desc">Add, edit, delete, or rearrange your technical skills and tool categories.</p>
      {skillsList.map((skill, index) => (
        <div key={skill.id || index} className="entry-card glass-card">
          <div className="entry-header">
            <span className="entry-number">#{index + 1} {skill.label || 'Category'}</span>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button
                className="btn btn-sm btn-outline"
                onClick={() => handleMoveUp(index)}
                disabled={index === 0}
                title="Move Up"
                style={{ padding: '0.2rem 0.5rem' }}
              >
                <i className="fas fa-arrow-up"></i>
              </button>
              <button
                className="btn btn-sm btn-outline"
                onClick={() => handleMoveDown(index)}
                disabled={index === skillsList.length - 1}
                title="Move Down"
                style={{ padding: '0.2rem 0.5rem' }}
              >
                <i className="fas fa-arrow-down"></i>
              </button>
              <button
                className="btn btn-sm btn-danger"
                onClick={() => handleRemoveCategory(index)}
                title="Delete Category"
              >
                <i className="fas fa-trash"></i>
              </button>
            </div>
          </div>
          <div className="form-stack">
            <div className="form-group">
              <label className="form-label">Category Name</label>
              <input
                className="form-input"
                value={skill.label || ''}
                onChange={e => handleUpdate(index, 'label', e.target.value)}
                placeholder="e.g. Languages, Frameworks, Soft Skills..."
              />
            </div>
            <div className="form-group">
              <label className="form-label">Skills / Tools</label>
              <input
                className="form-input"
                value={skill.value || ''}
                onChange={e => handleUpdate(index, 'value', e.target.value)}
                placeholder="e.g. Python, C, JavaScript, SQL..."
              />
            </div>
          </div>
        </div>
      ))}
      <button className="btn btn-outline btn-sm" onClick={handleAddCategory}>
        <i className="fas fa-plus"></i> Add Category
      </button>
    </div>
  );
}

function ProjectsForm({ resume, updateField, addToArray, removeFromArray }) {
  return (
    <div className="form-section animate-fade-in">
      <h4 className="form-section-title">Projects</h4>
      <p className="form-section-desc">Showcase your key projects with descriptions and links.</p>
      {(resume.projects || []).map((proj, i) => (
        <div key={i} className="entry-card glass-card">
          <div className="entry-header">
            <span className="entry-number">#{i + 1}</span>
            <button className="btn btn-sm btn-danger" onClick={() => removeFromArray('projects', i)}>
              <i className="fas fa-trash"></i>
            </button>
          </div>
          <div className="form-stack">
            <div className="form-group">
              <label className="form-label">Project Name</label>
              <input className="form-input" value={proj.name || ''} onChange={e => updateField(`projects.${i}.name`, e.target.value)} placeholder="My Awesome Project" />
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Link (optional)</label>
                <input className="form-input" value={proj.link || ''} onChange={e => updateField(`projects.${i}.link`, e.target.value)} placeholder="https://github.com/..." />
              </div>
              <div className="form-group">
                <label className="form-label">Live / Deployed Link (optional)</label>
                <input className="form-input" value={proj.liveLink || ''} onChange={e => updateField(`projects.${i}.liveLink`, e.target.value)} placeholder="https://my-app.vercel.app" />
              </div>
            </div>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Description</span>
                  <button 
                    className="btn btn-sm btn-outline" 
                    onClick={async () => {
                      if (!proj.description) return;
                      updateField(`projects.${i}.description`, '✨ Rewriting with AI...');
                      try {
                        const improved = await rewriteBulletPoint(proj.description);
                        updateField(`projects.${i}.description`, improved);
                      } catch (err) {
                        updateField(`projects.${i}.description`, proj.description);
                        alert('Failed to rewrite. Try again.');
                      }
                    }}
                    style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                    title="Improve description with AI"
                  >
                    <i className="fas fa-magic"></i> Rewrite
                  </button>
                </label>
                <ReactQuill theme="snow" modules={quillModules} value={proj.description || ''} onChange={val => updateField(`projects.${i}.description`, val)} placeholder="Brief description of the project, technologies used, and achievements." />
              </div>
          </div>
        </div>
      ))}
      <button className="btn btn-outline btn-sm" onClick={() => addToArray('projects', { name: '', link: '', liveLink: '', description: '' })}>
        <i className="fas fa-plus"></i> Add Project
      </button>
    </div>
  );
}

function ExperienceForm({ resume, updateField, addToArray, removeFromArray }) {
  const addBullet = (expIndex) => {
    const bullets = [...(resume.experience[expIndex].bullets || []), ''];
    updateField(`experience.${expIndex}.bullets`, bullets);
  };
  const removeBullet = (expIndex, bulletIndex) => {
    const bullets = [...resume.experience[expIndex].bullets];
    bullets.splice(bulletIndex, 1);
    updateField(`experience.${expIndex}.bullets`, bullets);
  };

  return (
    <div className="form-section animate-fade-in">
      <h4 className="form-section-title">Experience</h4>
      <p className="form-section-desc">Add your work experience, internships, and research positions.</p>
      {(resume.experience || []).map((exp, i) => (
        <div key={i} className="entry-card glass-card">
          <div className="entry-header">
            <span className="entry-number">#{i + 1}</span>
            <button className="btn btn-sm btn-danger" onClick={() => removeFromArray('experience', i)}>
              <i className="fas fa-trash"></i>
            </button>
          </div>
          <div className="form-stack">
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Title / Role</label>
                <input className="form-input" value={exp.title || ''} onChange={e => updateField(`experience.${i}.title`, e.target.value)} placeholder="Research Internship: IIT Kharagpur" />
              </div>
              <div className="form-group">
                <label className="form-label">Duration</label>
                <input className="form-input" value={exp.duration || ''} onChange={e => updateField(`experience.${i}.duration`, e.target.value)} placeholder="May 2025 -- July 2025" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Subtitle (optional)</label>
              <input className="form-input" value={exp.subtitle || ''} onChange={e => updateField(`experience.${i}.subtitle`, e.target.value)} placeholder="Under Prof. X, Department of CS" />
            </div>
            <div className="form-group">
              <label className="form-label">Bullet Points</label>
              {(exp.bullets || []).map((b, j) => (
                <div key={j} className="bullet-row" style={{ alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <ReactQuill theme="snow" modules={quillModules} value={b} onChange={val => updateField(`experience.${i}.bullets.${j}`, val)} placeholder="Describe what you did..." />
                  </div>
                  <button 
                    className="btn btn-icon btn-outline" 
                    title="Improve bullet with AI"
                    disabled={!stripHtml(b) || stripHtml(b).startsWith('✨')}
                    onClick={async () => {
                      const original = b;
                      updateField(`experience.${i}.bullets.${j}`, '✨ Rewriting with AI...');
                      try {
                        const improved = await rewriteBulletPoint(original);
                        updateField(`experience.${i}.bullets.${j}`, improved);
                      } catch (err) {
                        updateField(`experience.${i}.bullets.${j}`, original);
                        alert('Failed to rewrite bullet.');
                      }
                    }}
                  >
                    <i className="fas fa-magic" style={{ color: 'var(--accent-primary-light)' }}></i>
                  </button>
                  <button className="btn btn-icon btn-danger" onClick={() => removeBullet(i, j)}>
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              ))}
              <button className="btn btn-outline btn-sm" onClick={() => addBullet(i)} style={{ marginTop: '4px' }}>
                <i className="fas fa-plus"></i> Add Bullet
              </button>
            </div>
          </div>
        </div>
      ))}
      <button className="btn btn-outline btn-sm" onClick={() => addToArray('experience', { title: '', duration: '', subtitle: '', bullets: [''] })}>
        <i className="fas fa-plus"></i> Add Experience
      </button>
    </div>
  );
}

function AchievementsForm({ resume, updateField, addToArray, removeFromArray }) {
  return (
    <div className="form-section animate-fade-in">
      <h4 className="form-section-title">Achievements</h4>
      <p className="form-section-desc">Highlight your achievements, awards, and recognitions.</p>
      {(resume.achievements || []).map((ach, i) => (
        <div key={i} className="entry-card glass-card">
          <div className="entry-header">
            <span className="entry-number">#{i + 1}</span>
            <button className="btn btn-sm btn-danger" onClick={() => removeFromArray('achievements', i)}>
              <i className="fas fa-trash"></i>
            </button>
          </div>
          <div className="form-stack">
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Bold Prefix (optional)</label>
                <input className="form-input" value={ach.bold || ''} onChange={e => updateField(`achievements.${i}.bold`, e.target.value)} placeholder="Smart India Hackathon 2024:" />
              </div>
              <div className="form-group">
                <label className="form-label">Link (optional)</label>
                <input className="form-input" value={ach.link || ''} onChange={e => updateField(`achievements.${i}.link`, e.target.value)} placeholder="https://..." />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <ReactQuill theme="snow" modules={quillModules} value={ach.text || ''} onChange={val => updateField(`achievements.${i}.text`, val)} placeholder="Finalist" />
            </div>
          </div>
        </div>
      ))}
      <button className="btn btn-outline btn-sm" onClick={() => addToArray('achievements', { bold: '', text: '', link: '' })}>
        <i className="fas fa-plus"></i> Add Achievement
      </button>
    </div>
  );
}

function CertificationsForm({ resume, updateField, addToArray, removeFromArray }) {
  return (
    <div className="form-section animate-fade-in">
      <h4 className="form-section-title">Certifications</h4>
      <p className="form-section-desc">Add your professional certifications and courses.</p>
      {(resume.certifications || []).map((cert, i) => (
        <div key={i} className="entry-card glass-card">
          <div className="entry-header">
            <span className="entry-number">#{i + 1}</span>
            <button className="btn btn-sm btn-danger" onClick={() => removeFromArray('certifications', i)}>
              <i className="fas fa-trash"></i>
            </button>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Certification Name</label>
              <input className="form-input" value={cert.name || ''} onChange={e => updateField(`certifications.${i}.name`, e.target.value)} placeholder="Machine Learning Specialization" />
            </div>
            <div className="form-group">
              <label className="form-label">Provider (optional)</label>
              <input className="form-input" value={cert.provider || ''} onChange={e => updateField(`certifications.${i}.provider`, e.target.value)} placeholder="DeepLearning.AI, Stanford" />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Certificate Link (optional)</label>
              <input className="form-input" value={cert.link || ''} onChange={e => updateField(`certifications.${i}.link`, e.target.value)} placeholder="https://coursera.org/..." />
            </div>
          </div>
        </div>
      ))}
      <button className="btn btn-outline btn-sm" onClick={() => addToArray('certifications', { name: '', provider: '', link: '' })}>
        <i className="fas fa-plus"></i> Add Certification
      </button>
    </div>
  );
}

function CustomSectionsForm({ resume, updateField, addToArray, removeFromArray }) {
  const addCustomItem = (sectionIndex) => {
    const items = [...(resume.customSections[sectionIndex].items || []), ''];
    updateField(`customSections.${sectionIndex}.items`, items);
  };
  const removeCustomItem = (sectionIndex, itemIndex) => {
    const items = [...resume.customSections[sectionIndex].items];
    items.splice(itemIndex, 1);
    updateField(`customSections.${sectionIndex}.items`, items);
  };

  return (
    <div className="form-section animate-fade-in">
      <h4 className="form-section-title">Custom Sections</h4>
      <p className="form-section-desc">Add any additional sections you need (e.g., Publications, Volunteering, Languages).</p>
      {(resume.customSections || []).map((section, i) => (
        <div key={i} className="entry-card glass-card">
          <div className="entry-header">
            <span className="entry-number">Section #{i + 1}</span>
            <button className="btn btn-sm btn-danger" onClick={() => removeFromArray('customSections', i)}>
              <i className="fas fa-trash"></i>
            </button>
          </div>
          <div className="form-stack">
            <div className="form-group">
              <label className="form-label">Section Title</label>
              <input className="form-input" value={section.title || ''} onChange={e => updateField(`customSections.${i}.title`, e.target.value)} placeholder="Publications" />
            </div>
            <div className="form-group">
              <label className="form-label">Items</label>
              {(section.items || []).map((item, j) => (
                <div key={j} className="bullet-row" style={{ alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <ReactQuill theme="snow" modules={quillModules} value={item} onChange={val => updateField(`customSections.${i}.items.${j}`, val)} placeholder="Enter item text..." />
                  </div>
                  <button className="btn btn-icon btn-danger" onClick={() => removeCustomItem(i, j)}>
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              ))}
              <button className="btn btn-outline btn-sm" onClick={() => addCustomItem(i)} style={{ marginTop: '4px' }}>
                <i className="fas fa-plus"></i> Add Item
              </button>
            </div>
          </div>
        </div>
      ))}
      <button className="btn btn-outline btn-sm" onClick={() => addToArray('customSections', { title: '', items: [''] })}>
        <i className="fas fa-plus"></i> Add Custom Section
      </button>
    </div>
  );
}

function ReorderForm({ resume, updateField, swapArrayItems }) {
  const defaultOrder = ['education', 'skills', 'projects', 'experience', 'achievements', 'certifications', 'customSections'];
  const currentOrder = resume.settings?.sectionOrder || defaultOrder;

  const handleSectionSwap = (index, dir) => {
    const newOrder = [...currentOrder];
    const target = index + dir;
    if (target >= 0 && target < newOrder.length) {
      [newOrder[index], newOrder[target]] = [newOrder[target], newOrder[index]];
      if (!resume.settings) updateField('settings', {});
      updateField('settings.sectionOrder', newOrder);
    }
  };

  const sectionLabels = {
    education: 'Education',
    skills: 'Skills Summary',
    projects: 'Projects',
    experience: 'Experience',
    achievements: 'Achievements',
    certifications: 'Certifications',
    customSections: 'Custom Sections'
  };

  return (
    <div className="form-section animate-fade-in">
      <h4 className="form-section-title">Layout, Margins & Formatting</h4>
      <p className="form-section-desc">Change margins, compress spacing, and reorder sections or items before downloading.</p>

      {/* Margins & Spacing Sliders */}
      <div className="entry-card glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h5 style={{ margin: 0, color: 'var(--accent-primary-light)' }}><i className="fas fa-compress-arrows-alt"></i> Page Margins & Spacing</h5>
          <div style={{ display: 'flex', background: 'var(--bg-primary)', borderRadius: '16px', padding: '2px', border: '1px solid var(--border-color)' }}>
            <button 
              type="button"
              className={`btn btn-xs ${resume.settings?.marginType !== 'custom' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '14px', border: 'none' }}
              onClick={() => {
                if (!resume.settings) updateField('settings', {});
                updateField('settings.marginType', 'symmetric');
              }}
            >
              Symmetric
            </button>
            <button 
              type="button"
              className={`btn btn-xs ${resume.settings?.marginType === 'custom' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '14px', border: 'none' }}
              onClick={() => {
                if (!resume.settings) updateField('settings', {});
                updateField('settings.marginType', 'custom');
              }}
            >
              Custom
            </button>
          </div>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Compress gaps and adjust page margins so your resume fits perfectly onto 1 page!
        </p>

        <div className="form-stack">
          {resume.settings?.marginType !== 'custom' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ flex: 1, fontWeight: 500, fontSize: '0.85rem' }}>Uniform Page Margin</span>
              <input
                type="range"
                min="0.25"
                max="1.0"
                step="0.05"
                value={resume.settings?.marginUniform || '0.5'}
                onChange={e => {
                  const val = e.target.value;
                  if (!resume.settings) updateField('settings', {});
                  updateField('settings.marginUniform', val);
                  updateField('settings.marginV', val);
                  updateField('settings.marginH', val);
                }}
                style={{ width: '120px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', width: '45px', textAlign: 'right', fontWeight: 600 }}>{resume.settings?.marginUniform || '0.5'} in</span>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ flex: 1, fontWeight: 500, fontSize: '0.85rem' }}>Vertical (Top / Bottom)</span>
                <input
                  type="range"
                  min="0.25"
                  max="1.0"
                  step="0.05"
                  value={resume.settings?.marginV || '0.5'}
                  onChange={e => {
                    if (!resume.settings) updateField('settings', {});
                    updateField('settings.marginV', e.target.value);
                  }}
                  style={{ width: '120px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', width: '45px', textAlign: 'right', fontWeight: 600 }}>{resume.settings?.marginV || '0.5'} in</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ flex: 1, fontWeight: 500, fontSize: '0.85rem' }}>Horizontal (Left / Right)</span>
                <input
                  type="range"
                  min="0.25"
                  max="1.0"
                  step="0.05"
                  value={resume.settings?.marginH || '0.5'}
                  onChange={e => {
                    if (!resume.settings) updateField('settings', {});
                    updateField('settings.marginH', e.target.value);
                  }}
                  style={{ width: '120px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', width: '45px', textAlign: 'right', fontWeight: 600 }}>{resume.settings?.marginH || '0.5'} in</span>
              </div>
            </>
          )}

          <hr style={{ borderColor: 'var(--border-color)', margin: '6px 0', opacity: 0.3 }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ flex: 1, fontWeight: 500, fontSize: '0.85rem' }}>Section Spacing (Gaps between sections)</span>
            <input
              type="range"
              min="0"
              max="20"
              step="2"
              value={resume.settings?.sectionSpacing !== undefined ? resume.settings.sectionSpacing : '12'}
              onChange={e => {
                if (!resume.settings) updateField('settings', {});
                updateField('settings.sectionSpacing', e.target.value);
              }}
              style={{ width: '120px', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', width: '45px', textAlign: 'right', fontWeight: 600 }}>{resume.settings?.sectionSpacing !== undefined ? resume.settings.sectionSpacing : '12'} px</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ flex: 1, fontWeight: 500, fontSize: '0.85rem' }}>Item Spacing (Gaps within sections)</span>
            <input
              type="range"
              min="0"
              max="12"
              step="1"
              value={resume.settings?.itemSpacing !== undefined ? resume.settings.itemSpacing : '4'}
              onChange={e => {
                if (!resume.settings) updateField('settings', {});
                updateField('settings.itemSpacing', e.target.value);
              }}
              style={{ width: '120px', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', width: '45px', textAlign: 'right', fontWeight: 600 }}>{resume.settings?.itemSpacing !== undefined ? resume.settings.itemSpacing : '4'} px</span>
          </div>
        </div>
      </div>

      {/* Section Reordering */}
      <div className="entry-card glass-card">
        <h5 style={{ marginBottom: '12px', color: 'var(--accent-primary-light)' }}><i className="fas fa-layer-group"></i> Main Sections</h5>
        <div className="form-stack">
          {currentOrder.map((key, i) => (
            <div key={key} className="bullet-row" style={{ background: 'var(--bg-primary)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ flex: 1, fontWeight: 500 }}>{sectionLabels[key]}</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button className="btn btn-icon btn-secondary" onClick={() => handleSectionSwap(i, -1)} disabled={i === 0}>
                  <i className="fas fa-arrow-up"></i>
                </button>
                <button className="btn btn-icon btn-secondary" onClick={() => handleSectionSwap(i, 1)} disabled={i === currentOrder.length - 1}>
                  <i className="fas fa-arrow-down"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Design & Styling */}
      <div className="entry-card glass-card">
        <h5 style={{ marginBottom: '12px', color: 'var(--accent-primary-light)' }}><i className="fas fa-paint-brush"></i> Design Settings</h5>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Font Family</label>
            <select 
              className="form-input" 
              value={resume.settings?.fontFamily || 'inherit'}
              onChange={e => {
                if (!resume.settings) updateField('settings', {});
                updateField('settings.fontFamily', e.target.value);
              }}
            >
              <option value="inherit">Default for Theme</option>
              <option value="'Inter', sans-serif">Inter</option>
              <option value="'Roboto', sans-serif">Roboto</option>
              <option value="'Merriweather', serif">Merriweather</option>
              <option value="'Playfair Display', serif">Playfair Display</option>
              <option value="'Courier New', monospace">Courier New</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Accent Color</label>
            <input 
              type="color" 
              className="form-input" 
              style={{ padding: '2px', height: '38px', cursor: 'pointer' }}
              value={resume.settings?.accentColor || '#3b82f6'}
              onChange={e => {
                if (!resume.settings) updateField('settings', {});
                updateField('settings.accentColor', e.target.value);
              }}
            />
          </div>
        </div>
      </div>

      {/* Per-Section Font Sizes */}
      <div className="entry-card glass-card">
        <h5 style={{ marginBottom: '12px', color: 'var(--accent-primary-light)' }}><i className="fas fa-text-height"></i> Section Font Sizes</h5>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>Adjust the font size for each section individually (8pt – 14pt). Default is theme standard.</p>
        <div className="form-stack">
          {Object.entries(sectionLabels).map(([key, label]) => {
            const currentSize = resume.settings?.sectionFontSizes?.[key] || '';
            return (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ flex: 1, fontWeight: 500, fontSize: '0.85rem' }}>{label}</span>
                <input
                  type="range"
                  min="8"
                  max="14"
                  step="0.5"
                  value={currentSize || '10'}
                  onChange={e => {
                    if (!resume.settings) updateField('settings', {});
                    if (!resume.settings?.sectionFontSizes) updateField('settings.sectionFontSizes', {});
                    updateField(`settings.sectionFontSizes.${key}`, e.target.value);
                  }}
                  style={{ width: '100px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', width: '35px', textAlign: 'right' }}>{currentSize || '10'}pt</span>
                {currentSize && (
                  <button 
                    className="btn btn-icon btn-secondary" 
                    title="Reset to default"
                    onClick={() => {
                      const sizes = { ...(resume.settings?.sectionFontSizes || {}) };
                      delete sizes[key];
                      updateField('settings.sectionFontSizes', sizes);
                    }}
                    style={{ padding: '2px 6px', fontSize: '0.65rem' }}
                  >
                    <i className="fas fa-undo"></i>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Item Reordering with Drag-and-Drop */}
      <div className="entry-card glass-card">
        <h5 style={{ marginBottom: '12px', color: 'var(--accent-primary-light)' }}><i className="fas fa-list-ol"></i> Reorder Items</h5>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}><i className="fas fa-grip-vertical"></i> Drag items to reorder, or use arrows.</p>
        
        {['education', 'experience', 'projects', 'achievements', 'certifications'].map(key => {
          const arr = resume[key];
          if (!arr || arr.length <= 1) return null;
          return (
            <div key={key} style={{ marginBottom: '16px' }}>
              <h6 style={{ marginBottom: '8px', textTransform: 'capitalize' }}>{key}</h6>
              <div className="form-stack">
                {arr.map((item, i) => (
                  <div 
                    key={i} 
                    className="bullet-row drag-item" 
                    style={{ background: 'var(--bg-primary)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', cursor: 'grab' }}
                    draggable
                    onDragStart={e => {
                      e.dataTransfer.setData('text/plain', JSON.stringify({ key, index: i }));
                      e.currentTarget.classList.add('dragging');
                    }}
                    onDragEnd={e => {
                      e.currentTarget.classList.remove('dragging');
                    }}
                    onDragOver={e => {
                      e.preventDefault();
                      e.currentTarget.classList.add('drag-over');
                    }}
                    onDragLeave={e => {
                      e.currentTarget.classList.remove('drag-over');
                    }}
                    onDrop={e => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('drag-over');
                      try {
                        const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                        if (data.key === key && data.index !== i) {
                          swapArrayItems(key, data.index, i);
                        }
                      } catch {}
                    }}
                  >
                    <i className="fas fa-grip-vertical" style={{ color: 'var(--text-muted)', marginRight: '8px' }}></i>
                    <span style={{ flex: 1, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {stripHtml(item.institution || item.title || item.name || item.bold || item.text || `Item ${i+1}`)}
                    </span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button className="btn btn-icon btn-secondary" onClick={() => swapArrayItems(key, i, i - 1)} disabled={i === 0}>
                        <i className="fas fa-arrow-up"></i>
                      </button>
                      <button className="btn btn-icon btn-secondary" onClick={() => swapArrayItems(key, i, i + 1)} disabled={i === arr.length - 1}>
                        <i className="fas fa-arrow-down"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
