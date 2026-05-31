import { useState, useEffect, useCallback } from 'react';
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
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
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
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeSection, setActiveSection] = useState('personalInfo');
  const [showPreview, setShowPreview] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showAtsChecker, setShowAtsChecker] = useState(false);
  const [showCoverLetter, setShowCoverLetter] = useState(false);

  const pushToHistory = useCallback((currentState) => {
    if (!currentState) return;
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(JSON.parse(JSON.stringify(currentState)));
      return newHistory;
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      setResume(JSON.parse(JSON.stringify(history[historyIndex - 1])));
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
      setResume(JSON.parse(JSON.stringify(history[historyIndex + 1])));
    }
  };

  const handleImport = useCallback((importedData) => {
    setResume(prev => {
      pushToHistory(prev);
      const merged = { ...prev };
      if (importedData.personalInfo) merged.personalInfo = { ...merged.personalInfo, ...importedData.personalInfo };
      if (importedData.education?.length) merged.education = importedData.education;
      if (importedData.skills) merged.skills = { ...merged.skills, ...importedData.skills };
      if (importedData.projects?.length) merged.projects = importedData.projects;
      if (importedData.experience?.length) merged.experience = importedData.experience;
      if (importedData.achievements?.length) merged.achievements = importedData.achievements;
      if (importedData.certifications?.length) merged.certifications = importedData.certifications;
      if (importedData.customSections?.length) merged.customSections = importedData.customSections;
      return merged;
    });
    setShowImport(false);
    setSaved(false);
  }, [pushToHistory]);

  useEffect(() => {
    if (!currentUser || !userData) return;

    if (resumeId && !resume && history.length === 0) {
      getDoc(doc(db, 'users', currentUser.uid, 'resumes', resumeId)).then(rDoc => {
        if (rDoc.exists()) {
          const dbResume = rDoc.data().data || rDoc.data();
          setResume(dbResume);
          setHistory([JSON.parse(JSON.stringify(dbResume))]);
          setHistoryIndex(0);
          setResumeRef(doc(db, 'users', currentUser.uid, 'resumes', resumeId));
        } else {
          alert('Resume not found!');
          navigate('/resumes');
        }
      }).catch(console.error);
    } else if (!resumeId && userData.resume && !resume && history.length === 0) {
      const initialResume = JSON.parse(JSON.stringify(userData.resume));
      setResume(initialResume);
      setHistory([initialResume]);
      setHistoryIndex(0);
    }
  }, [currentUser, userData, resumeId, resume, history.length, navigate]);

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
    { id: 'reorder', label: 'Reorder / Theme', icon: 'fa-sort' },
    { id: 'aiAssistant', label: 'AI Assistant', icon: 'fa-magic' },
  ];

  return (
    <div className="editor-layout">
      {/* Mobile preview toggle */}
      <button className="preview-toggle btn btn-primary btn-sm" onClick={() => setShowPreview(!showPreview)}>
        <i className={`fas ${showPreview ? 'fa-edit' : 'fa-eye'}`}></i>
        {showPreview ? 'Edit' : 'Preview'}
      </button>

      {/* Left panel - Form */}
      <div className={`editor-panel ${showPreview ? 'hide-mobile' : ''}`}>
        <div className="editor-toolbar">
          <h3 className="dot-font"><i className="fas fa-edit"></i> Resume Editor</h3>
          <div className="toolbar-actions">
            <button className="btn btn-icon btn-secondary" onClick={undo} disabled={historyIndex <= 0} title="Undo">
              <i className="fas fa-undo"></i>
            </button>
            <button className="btn btn-icon btn-secondary" onClick={redo} disabled={historyIndex >= history.length - 1} title="Redo">
              <i className="fas fa-redo"></i>
            </button>
            <div style={{ width: '1px', height: '24px', background: 'var(--border-subtle)', margin: '0 4px' }}></div>
            
            <button className="btn btn-sm btn-outline" onClick={() => setShowImport(true)}>
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
          {activeSection === 'personalInfo' && (
            <PersonalInfoForm resume={resume} updateField={updateField} />
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

      {/* Right panel - Preview */}
      <div className={`preview-panel ${showPreview ? '' : 'hide-mobile'}`}>
        <ResumePreview resume={resume} themeId={resume.settings?.templateId || 'latex'} />
      </div>

      {showImport && (
        <ResumeImport 
          onImport={handleImport}
          onClose={() => setShowImport(false)}
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
    </div>
  );
}

/* ---- Section Form Components ---- */

function PersonalInfoForm({ resume, updateField }) {
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
  const s = resume.skills || {};
  return (
    <div className="form-section animate-fade-in">
      <h4 className="form-section-title">Skills Summary</h4>
      <p className="form-section-desc">List your technical skills, frameworks, and tools.</p>
      <div className="form-stack">
        <div className="form-group">
          <label className="form-label">Languages</label>
          <input className="form-input" value={s.languages || ''} onChange={e => updateField('skills.languages', e.target.value)} placeholder="Python, C, JavaScript, SQL" />
        </div>
        <div className="form-group">
          <label className="form-label">Frameworks — ML/DL</label>
          <input className="form-input" value={s.frameworksMlDl || ''} onChange={e => updateField('skills.frameworksMlDl', e.target.value)} placeholder="Pandas, NumPy, TensorFlow, PyTorch" />
        </div>
        <div className="form-group">
          <label className="form-label">Frameworks — Development</label>
          <input className="form-input" value={s.frameworksDev || ''} onChange={e => updateField('skills.frameworksDev', e.target.value)} placeholder="Django, Flask, ReactJS, Vue.js" />
        </div>
        <div className="form-group">
          <label className="form-label">Toolkit</label>
          <input className="form-input" value={s.toolkit || ''} onChange={e => updateField('skills.toolkit', e.target.value)} placeholder="GIT, PostgreSQL, MongoDB, Firebase" />
        </div>
        <div className="form-group">
          <label className="form-label">Platforms</label>
          <input className="form-input" value={s.platforms || ''} onChange={e => updateField('skills.platforms', e.target.value)} placeholder="VS Code, Jupyter Notebook, Linux" />
        </div>
        <div className="form-group">
          <label className="form-label">Soft Skills</label>
          <input className="form-input" value={s.softSkills || ''} onChange={e => updateField('skills.softSkills', e.target.value)} placeholder="Leadership, Team Work, Public Speaking" />
        </div>
        <div className="form-group">
          <label className="form-label">Interests</label>
          <input className="form-input" value={s.interests || ''} onChange={e => updateField('skills.interests', e.target.value)} placeholder="Machine Learning, Web Development" />
        </div>
      </div>
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
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Project Name</label>
                <input className="form-input" value={proj.name || ''} onChange={e => updateField(`projects.${i}.name`, e.target.value)} placeholder="My Awesome Project" />
              </div>
              <div className="form-group">
                <label className="form-label">Link (optional)</label>
                <input className="form-input" value={proj.link || ''} onChange={e => updateField(`projects.${i}.link`, e.target.value)} placeholder="https://github.com/..." />
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
      <button className="btn btn-outline btn-sm" onClick={() => addToArray('projects', { name: '', link: '', description: '' })}>
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
      <h4 className="form-section-title">Reorder Layout</h4>
      <p className="form-section-desc">Change the order of main sections or items within them before downloading.</p>

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
