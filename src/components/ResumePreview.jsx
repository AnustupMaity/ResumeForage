import { useRef, useEffect, useState } from 'react';
import { normalizeSkills } from '../utils/skillsUtils';
import '../styles/resumeTemplate.css';

function cleanInlineHtml(html) {
  if (!html) return '';
  let cleaned = String(html).trim();
  cleaned = cleaned.replace(/<\/?(p|div)[^>]*>/gi, ' ').replace(/(<br\s*\/?>\s*)+/gi, ' ').replace(/\s+/g, ' ').trim();
  return cleaned;
}

export default function ResumePreview({ resume, themeId = 'latex', updateField }) {
  const wrapperRef = useRef(null);
  const [dynamicScale, setDynamicScale] = useState(1);

  useEffect(() => {
    if (!wrapperRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        // Page width is 8.5in = 816px (assuming 96dpi). Add some padding logic.
        const containerWidth = entry.contentRect.width;
        // Target scale is container width divided by 816, max 1.2, min 0.3.
        // We subtract a little padding (e.g. 40px) to ensure it's not flush with edges.
        const calculatedScale = Math.min(1.2, Math.max(0.3, (containerWidth - 40) / 816));
        setDynamicScale(calculatedScale);
      }
    });
    observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, []);

  if (!resume) return null;

  const { personalInfo, education, skills, projects, experience, achievements, certifications, customSections } = resume;

  // Default section order if not set
  const defaultOrder = [
    'education',
    'skills',
    'projects',
    'experience',
    'achievements',
    'certifications',
    'customSections'
  ];

  const sectionOrder = resume.settings?.sectionOrder || defaultOrder;
  const sectionFontSizes = resume.settings?.sectionFontSizes || {};

  const sectionSpacing = resume.settings?.sectionSpacing !== undefined ? resume.settings.sectionSpacing : '12';
  const getSectionStyle = (key) => {
    const size = sectionFontSizes[key];
    return {
      ...(size && { fontSize: `${size}pt` }),
      marginBottom: `${sectionSpacing}px`
    };
  };

  const hasContent = (section) => {
    if (Array.isArray(section)) {
      return section.some(item => {
        if (typeof item === 'object' && item !== null) {
          if ('value' in item) return !!(item.value && String(item.value).trim() !== '');
          return Object.values(item).some(v => v && String(v).trim() !== '');
        }
        return !!item;
      });
    }
    if (typeof section === 'object' && section !== null) {
      return Object.values(section).some(v => v && String(v).trim() !== '');
    }
    return !!section;
  };

  const renderSection = (key) => {
    switch (key) {
      case 'education':
        if (!hasContent(education)) return null;
        return (
          <div key="education" style={getSectionStyle('education')}>
            <div className="resume-section-title">Education</div>
            <ul className="resume-list">
              {education.map((edu, i) => (
                <li key={i}>
                  <div className="resume-item-header">
                    <span className="resume-item-title">
                      {edu.institution}
                      {edu.note ? ` (${edu.note})` : ''}
                    </span>
                    <span className="resume-item-date">{edu.duration}</span>
                  </div>
                  {edu.degree && <span className="resume-item-subtitle">{edu.degree}</span>}
                </li>
              ))}
            </ul>
          </div>
        );

      case 'skills': {
        const skillsList = normalizeSkills(skills).filter(item => item.value && String(item.value).trim() !== '');
        if (skillsList.length === 0) return null;
        return (
          <div key="skills" style={getSectionStyle('skills')}>
            <div className="resume-section-title">Skills Summary</div>
            <ul className="resume-list">
              {skillsList.map((item, idx) => (
                <li key={item.id || idx}>
                  <strong>{item.label || 'Category'}:</strong> {item.value}
                </li>
              ))}
            </ul>
          </div>
        );
      }

      case 'projects':
        if (!hasContent(projects)) return null;
        return (
          <div key="projects" style={getSectionStyle('projects')}>
            <div className="resume-section-title">Projects</div>
            <ul className="resume-list">
              {projects.map((proj, i) => (
                <li key={i} style={{ marginBottom: '6px' }}>
                  <strong style={{ fontWeight: 600 }}>{proj.name}</strong>
                  {proj.link && (
                    <span style={{ whiteSpace: 'nowrap' }}>
                      {' '}|{' '}
                      <a className="resume-link" href={proj.link} target="_blank" rel="noreferrer">
                        Repo LINK
                      </a>
                    </span>
                  )}
                  {proj.liveLink && (
                    <span style={{ whiteSpace: 'nowrap' }}>
                      {' '}|{' '}
                      <a className="resume-link" href={proj.liveLink} target="_blank" rel="noreferrer">
                        Live LINK
                      </a>
                    </span>
                  )}
                  {proj.description && (
                    <span className="project-desc-inline">
                      {' '}-{' '}
                      <span dangerouslySetInnerHTML={{ __html: cleanInlineHtml(proj.description) }} />
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );

      case 'experience':
        if (!hasContent(experience)) return null;
        return (
          <div key="experience" style={getSectionStyle('experience')}>
            <div className="resume-section-title">Experience</div>
            <ul className="resume-list">
              {experience.map((exp, i) => (
                <li key={i}>
                  <div className="resume-item-header">
                    <span className="resume-item-title">{exp.title}</span>
                    <span className="resume-item-date">{exp.duration}</span>
                  </div>
                  {exp.subtitle && <span className="resume-item-note">{exp.subtitle}</span>}
                  {exp.bullets && exp.bullets.length > 0 && (
                    <ul className="resume-sublist">
                      {exp.bullets.map((b, j) => (
                        <li key={j} dangerouslySetInnerHTML={{ __html: cleanInlineHtml(b) }}></li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );

      case 'achievements':
        if (!hasContent(achievements)) return null;
        return (
          <div key="achievements" style={getSectionStyle('achievements')}>
            <div className="resume-section-title">Achievements</div>
            <div className="resume-two-col">
              <ul className="resume-list">
                {achievements.filter((_, i) => i % 2 === 0).map((ach, i) => (
                  <li key={i}>
                    {ach.bold && <strong>{ach.bold}</strong>}
                    {ach.bold && ach.text ? ' ' : ''}
                    <span dangerouslySetInnerHTML={{ __html: cleanInlineHtml(ach.text || '') }} />
                    {ach.link && (
                      <span style={{ whiteSpace: 'nowrap' }}>{' '}|{' '}<a className="resume-link" href={ach.link} target="_blank" rel="noreferrer">LINK</a></span>
                    )}
                  </li>
                ))}
              </ul>
              <ul className="resume-list">
                {achievements.filter((_, i) => i % 2 === 1).map((ach, i) => (
                  <li key={i}>
                    {ach.bold && <strong>{ach.bold}</strong>}
                    {ach.bold && ach.text ? ' ' : ''}
                    <span dangerouslySetInnerHTML={{ __html: cleanInlineHtml(ach.text || '') }} />
                    {ach.link && (
                      <span style={{ whiteSpace: 'nowrap' }}>{' '}|{' '}<a className="resume-link" href={ach.link} target="_blank" rel="noreferrer">LINK</a></span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        );

      case 'certifications':
        if (!hasContent(certifications)) return null;
        return (
          <div key="certifications" style={getSectionStyle('certifications')}>
            <div className="resume-section-title">Certifications</div>
            <ul className="resume-list">
              {certifications.map((cert, i) => (
                <li key={i}>
                  <strong>{cert.name}</strong>
                  {cert.provider && <> ({cert.provider})</>}
                  {cert.link && (
                    <span style={{ whiteSpace: 'nowrap' }}>{': '}<a className="resume-link" href={cert.link} target="_blank" rel="noreferrer">CERTIFICATE LINK</a></span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );

      case 'customSections':
        if (!hasContent(customSections)) return null;
        return (
          <div key="customSections" style={getSectionStyle('customSections')}>
            {customSections.map((section, idx) => (
              section.title && section.items && section.items.length > 0 && (
                <div key={idx}>
                  <div className="resume-section-title">{section.title}</div>
                  <ul className="resume-list">
                    {section.items.map((item, i) => (
                      <li key={i} dangerouslySetInnerHTML={{ __html: cleanInlineHtml(item) }}></li>
                    ))}
                  </ul>
                </div>
              )
            ))}
          </div>
        );
      
      default:
        return null;
    }
  };

  const marginV = resume.settings?.marginV || resume.settings?.marginUniform || '0.5';
  const marginH = resume.settings?.marginH || resume.settings?.marginUniform || '0.5';
  const itemSpacing = resume.settings?.itemSpacing !== undefined ? resume.settings.itemSpacing : '4';

  const customStyle = {
    ...(resume.settings?.fontFamily && resume.settings.fontFamily !== 'inherit' && { '--theme-font': resume.settings.fontFamily }),
    ...(resume.settings?.accentColor && { '--theme-accent': resume.settings.accentColor }),
    paddingTop: `${marginV}in`,
    paddingBottom: `${marginV}in`,
    paddingLeft: `${marginH}in`,
    paddingRight: `${marginH}in`,
    '--item-gap': `${itemSpacing}px`
  };

  const renderInteractiveSection = (sectionKey, idx) => {
    const content = renderSection(sectionKey);
    if (!content) return null;
    if (!updateField) return content;

    const canMoveUp = idx > 0;
    const canMoveDown = idx < sectionOrder.length - 1;

    return (
      <div
        key={sectionKey}
        className="live-preview-section"
        draggable={true}
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', idx);
          e.dataTransfer.effectAllowed = 'move';
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        }}
        onDrop={(e) => {
          e.preventDefault();
          const fromIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
          if (!isNaN(fromIdx) && fromIdx !== idx) {
            const newOrder = [...sectionOrder];
            const [moved] = newOrder.splice(fromIdx, 1);
            newOrder.splice(idx, 0, moved);
            updateField('settings.sectionOrder', newOrder);
          }
        }}
        style={{ position: 'relative' }}
      >
        <div className="live-section-controls">
          <button
            type="button"
            title="Move Section Up"
            disabled={!canMoveUp}
            onClick={() => {
              const newOrder = [...sectionOrder];
              [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
              updateField('settings.sectionOrder', newOrder);
            }}
          >
            ▲
          </button>
          <span className="live-section-handle" title="Drag section to reorder">⋮⋮</span>
          <button
            type="button"
            title="Move Section Down"
            disabled={!canMoveDown}
            onClick={() => {
              const newOrder = [...sectionOrder];
              [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
              updateField('settings.sectionOrder', newOrder);
            }}
          >
            ▼
          </button>
        </div>
        {content}
      </div>
    );
  };

  return (
    <div className="resume-preview-wrapper" ref={wrapperRef}>
      <div className="resume-preview-scaler" style={{ transform: `scale(${dynamicScale})`, height: `${11 * 96 * dynamicScale}px` }}>
        {/* The theme class is applied to the root page element */}
        <div className={`resume-page theme-${themeId}`} id="resume-content" style={customStyle}>
          
          {/* Header & Contact are always at the top */}
          {personalInfo?.name && (
            <div className="resume-name">{personalInfo.name}</div>
          )}

          {(() => {
            const items = [];
            if (personalInfo?.email) {
              items.push({
                icon: 'fas fa-envelope',
                content: <a href={`mailto:${personalInfo.email}`}>{personalInfo.email}</a>
              });
            }
            if (personalInfo?.phone) {
              items.push({
                icon: 'fas fa-phone',
                content: <a href={`tel:${personalInfo.phone}`}>{personalInfo.phone}</a>
              });
            }
            if (personalInfo?.linkedin) {
              const url = personalInfo.linkedin.startsWith('http') ? personalInfo.linkedin : `https://linkedin.com/in/${personalInfo.linkedin}`;
              const text = personalInfo.linkedin.replace(/https?:\/\/(www\.)?linkedin\.com\/in\//i, '').replace(/\/$/, '');
              items.push({
                icon: 'fab fa-linkedin',
                content: <a href={url} target="_blank" rel="noreferrer">{text}</a>
              });
            }
            if (personalInfo?.github) {
              const url = personalInfo.github.startsWith('http') ? personalInfo.github : `https://github.com/${personalInfo.github}`;
              const text = personalInfo.github.replace(/https?:\/\/(www\.)?github\.com\//i, '').replace(/\/$/, '');
              items.push({
                icon: 'fab fa-github',
                content: <a href={url} target="_blank" rel="noreferrer">{text}</a>
              });
            }
            if (Array.isArray(personalInfo?.customLinks)) {
              personalInfo.customLinks.forEach(link => {
                if (!link || (!link.value && !link.label)) return;
                const val = (link.value || '').trim();
                const lbl = (link.label || '').trim();
                if (!val && !lbl) return;
                
                let iconClass = 'fas fa-link';
                const lower = (lbl + ' ' + val).toLowerCase();
                if (lower.includes('portfolio') || lower.includes('website') || lower.includes('site') || lower.includes('.dev') || lower.includes('.com') || lower.includes('.io') || lower.includes('.org') || lower.includes('.net')) iconClass = 'fas fa-globe';
                else if (lower.includes('twitter') || lower.includes('x.com')) iconClass = 'fab fa-twitter';
                else if (lower.includes('leetcode')) iconClass = 'fas fa-code';
                else if (lower.includes('hackerrank')) iconClass = 'fab fa-hackerrank';
                else if (lower.includes('medium') || lower.includes('blog')) iconClass = 'fab fa-medium';
                else if (lower.includes('location') || lower.includes('address') || lower.includes('city') || lower.includes('state') || lower.includes('country') || lower.includes('india') || lower.includes('usa')) iconClass = 'fas fa-map-marker-alt';

                let content;
                if (val.startsWith('http://') || val.startsWith('https://') || val.startsWith('www.')) {
                  const href = val.startsWith('www.') ? `https://${val}` : val;
                  const display = lbl || val.replace(/https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
                  content = <a href={href} target="_blank" rel="noreferrer">{display}</a>;
                } else if (val && lbl) {
                  content = <span><strong>{lbl}:</strong> {val}</span>;
                } else {
                  content = <span>{val || lbl}</span>;
                }

                items.push({
                  icon: link.icon || iconClass,
                  content
                });
              });
            }

            if (items.length === 0) return null;

            return (
              <div className="resume-contact">
                {items.map((item, index) => (
                  <span key={index} style={{ display: 'inline-flex', alignItems: 'center' }}>
                    {index > 0 && <span className="contact-sep" style={{ margin: '0 6px' }}>|</span>}
                    <span className="contact-item">
                      {item.icon && <i className={item.icon} style={{ marginRight: '4px' }}></i>}
                      {item.content}
                    </span>
                  </span>
                ))}
              </div>
            );
          })()}

          {/* Render sections based on user's custom order */}
          {sectionOrder.map((sectionKey, idx) => renderInteractiveSection(sectionKey, idx))}

        </div>
      </div>
    </div>
  );
}
