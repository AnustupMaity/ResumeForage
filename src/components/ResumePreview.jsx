import { useRef, useEffect, useState } from 'react';
import '../styles/resumeTemplate.css';

export default function ResumePreview({ resume, themeId = 'latex' }) {
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

  const getSectionStyle = (key) => {
    const size = sectionFontSizes[key];
    return size ? { fontSize: `${size}pt` } : {};
  };

  const hasContent = (section) => {
    if (Array.isArray(section)) return section.length > 0;
    if (typeof section === 'object' && section !== null) {
      return Object.values(section).some(v => v && v.length > 0);
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

      case 'skills':
        if (!hasContent(skills)) return null;
        return (
          <div key="skills" style={getSectionStyle('skills')}>
            <div className="resume-section-title">Skills Summary</div>
            <ul className="resume-list">
              {skills.languages && (
                <li><strong>Languages:</strong> {skills.languages}</li>
              )}
              {(skills.frameworksMlDl || skills.frameworksDev) && (
                <li>
                  <strong>Frameworks:</strong>
                  <ul className="resume-skill-sub">
                    {skills.frameworksMlDl && (
                      <li><strong>ML/DL:</strong> {skills.frameworksMlDl}</li>
                    )}
                    {skills.frameworksDev && (
                      <li><strong>Development:</strong> {skills.frameworksDev}</li>
                    )}
                  </ul>
                </li>
              )}
              {skills.toolkit && (
                <li><strong>Toolkit:</strong> {skills.toolkit}</li>
              )}
              {skills.platforms && (
                <li><strong>Platforms:</strong> {skills.platforms}</li>
              )}
              {skills.softSkills && (
                <li><strong>Soft Skills:</strong> {skills.softSkills}</li>
              )}
              {skills.interests && (
                <li><strong>Interests:</strong> {skills.interests}</li>
              )}
            </ul>
          </div>
        );

      case 'projects':
        if (!hasContent(projects)) return null;
        return (
          <div key="projects" style={getSectionStyle('projects')}>
            <div className="resume-section-title">Projects</div>
            <ul className="resume-list">
              {projects.map((proj, i) => (
                <li key={i}>
                  <strong>{proj.name}</strong>
                  {proj.link && (
                    <> | <a className="resume-link" href={proj.link} target="_blank" rel="noreferrer">LINK</a></>
                  )}
                  {proj.description && <span dangerouslySetInnerHTML={{ __html: proj.description }} />}
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
                        <li key={j} dangerouslySetInnerHTML={{ __html: b }}></li>
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
                    <span dangerouslySetInnerHTML={{ __html: ach.text || '' }} />
                    {ach.link && (
                      <> | <a className="resume-link" href={ach.link} target="_blank" rel="noreferrer">LINK</a></>
                    )}
                  </li>
                ))}
              </ul>
              <ul className="resume-list">
                {achievements.filter((_, i) => i % 2 === 1).map((ach, i) => (
                  <li key={i}>
                    {ach.bold && <strong>{ach.bold}</strong>}
                    {ach.bold && ach.text ? ' ' : ''}
                    <span dangerouslySetInnerHTML={{ __html: ach.text || '' }} />
                    {ach.link && (
                      <> | <a className="resume-link" href={ach.link} target="_blank" rel="noreferrer">LINK</a></>
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
                    <>: <a className="resume-link" href={cert.link} target="_blank" rel="noreferrer">CERTIFICATE LINK</a></>
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
                      <li key={i} dangerouslySetInnerHTML={{ __html: item }}></li>
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

  const customStyle = {
    ...(resume.settings?.fontFamily && resume.settings.fontFamily !== 'inherit' && { '--theme-font': resume.settings.fontFamily }),
    ...(resume.settings?.accentColor && { '--theme-accent': resume.settings.accentColor })
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

          {(personalInfo?.email || personalInfo?.phone || personalInfo?.linkedin || personalInfo?.github) && (
            <div className="resume-contact">
              {personalInfo.email && (
                <span className="contact-item">
                  <i className="fas fa-envelope"></i>
                  <a href={`mailto:${personalInfo.email}`}>{personalInfo.email}</a>
                </span>
              )}
              {personalInfo.phone && (
                <>
                  {personalInfo.email && <span className="contact-sep">|</span>}
                  <span className="contact-item">
                    <i className="fas fa-phone"></i>
                    <a href={`tel:${personalInfo.phone}`}>{personalInfo.phone}</a>
                  </span>
                </>
              )}
              {personalInfo.linkedin && (
                <>
                  {(personalInfo.email || personalInfo.phone) && <span className="contact-sep">|</span>}
                  <span className="contact-item">
                    <i className="fab fa-linkedin"></i>
                    <a href={personalInfo.linkedin.startsWith('http') ? personalInfo.linkedin : `https://linkedin.com/in/${personalInfo.linkedin}`} target="_blank" rel="noreferrer">
                      {personalInfo.linkedin.replace(/https?:\/\/(www\.)?linkedin\.com\/in\//i, '')}
                    </a>
                  </span>
                </>
              )}
              {personalInfo.github && (
                <>
                  {(personalInfo.email || personalInfo.phone || personalInfo.linkedin) && <span className="contact-sep">|</span>}
                  <span className="contact-item">
                    <i className="fab fa-github"></i>
                    <a href={personalInfo.github.startsWith('http') ? personalInfo.github : `https://github.com/${personalInfo.github}`} target="_blank" rel="noreferrer">
                      {personalInfo.github.replace(/https?:\/\/(www\.)?github\.com\//i, '')}
                    </a>
                  </span>
                </>
              )}
            </div>
          )}

          {/* Render sections based on user's custom order */}
          {sectionOrder.map(sectionKey => renderSection(sectionKey))}

        </div>
      </div>
    </div>
  );
}
