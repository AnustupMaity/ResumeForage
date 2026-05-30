/**
 * Text Resume Parser
 * Attempts to parse plain text (from PDF or text file) into a resume data object.
 * Uses heuristics to identify sections by common heading patterns.
 */

const SECTION_PATTERNS = [
  { key: 'education', patterns: [/^education$/i, /^academic/i, /^qualification/i] },
  { key: 'skills', patterns: [/^skills/i, /^technical skills/i, /^skills summary/i, /^core competenc/i] },
  { key: 'projects', patterns: [/^projects?$/i, /^personal projects/i, /^key projects/i] },
  { key: 'experience', patterns: [/^experience/i, /^work experience/i, /^professional experience/i, /^internship/i, /^employment/i] },
  { key: 'achievements', patterns: [/^achievements?/i, /^awards?/i, /^honors?/i, /^accomplishments?/i] },
  { key: 'certifications', patterns: [/^certifications?/i, /^certificates?/i, /^courses?/i, /^professional development/i] },
];

export function parseTextResume(text) {
  const resume = {
    personalInfo: { name: '', email: '', phone: '', linkedin: '', github: '' },
    education: [],
    skills: {
      languages: '',
      frameworksMlDl: '',
      frameworksDev: '',
      toolkit: '',
      platforms: '',
      softSkills: '',
      interests: ''
    },
    projects: [],
    experience: [],
    achievements: [],
    certifications: [],
    customSections: []
  };

  if (!text || !text.trim()) return resume;

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return resume;

  // --- Extract personal info from top of resume ---
  // Name is usually the first non-empty line
  resume.personalInfo.name = lines[0];

  // Scan first 8 lines for contact info
  const topLines = lines.slice(0, 8).join(' ');

  // Email
  const emailMatch = topLines.match(/[\w.+-]+@[\w.-]+\.\w{2,}/);
  if (emailMatch) resume.personalInfo.email = emailMatch[0];

  // Phone
  const phoneMatch = topLines.match(/(\+?\d[\d\s\-().]{7,}\d)/);
  if (phoneMatch) resume.personalInfo.phone = phoneMatch[0].trim();

  // LinkedIn
  const linkedinMatch = topLines.match(/(?:linkedin\.com\/in\/|linkedin:\s*)([\w-]+)/i);
  if (linkedinMatch) resume.personalInfo.linkedin = linkedinMatch[1];

  // GitHub
  const githubMatch = topLines.match(/(?:github\.com\/|github:\s*)([\w-]+)/i);
  if (githubMatch) resume.personalInfo.github = githubMatch[1];

  // --- Identify sections ---
  const sectionBlocks = [];
  let currentSection = null;
  let currentLines = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const sectionType = identifySection(line);

    if (sectionType) {
      if (currentSection) {
        sectionBlocks.push({ type: currentSection.key, name: currentSection.name, lines: currentLines });
      }
      currentSection = { key: sectionType, name: line };
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }
  // Push last section
  if (currentSection) {
    sectionBlocks.push({ type: currentSection.key, name: currentSection.name, lines: currentLines });
  }

  // --- Parse each section ---
  for (const block of sectionBlocks) {
    const content = block.lines;
    switch (block.type) {
      case 'education':
        resume.education = parseTextEducation(content);
        break;
      case 'skills':
        parseTextSkills(content, resume.skills);
        break;
      case 'projects':
        resume.projects = parseTextProjects(content);
        break;
      case 'experience':
        resume.experience = parseTextExperience(content);
        break;
      case 'achievements':
        resume.achievements = parseTextAchievements(content);
        break;
      case 'certifications':
        resume.certifications = parseTextCertifications(content);
        break;
      default:
        // Custom section
        resume.customSections.push({
          title: block.name,
          items: content.filter(l => l.length > 2)
        });
    }
  }

  return resume;
}

function identifySection(line) {
  const cleaned = line.replace(/[^a-zA-Z\s]/g, '').trim();
  if (cleaned.length < 3 || cleaned.length > 40) return null;

  // Check if this line looks like a heading (all caps, short, or ends with colon)
  const isHeadingLike = cleaned === cleaned.toUpperCase() ||
    line.endsWith(':') ||
    /^[A-Z][a-zA-Z\s]+$/.test(cleaned);

  if (!isHeadingLike) return null;

  for (const section of SECTION_PATTERNS) {
    for (const pattern of section.patterns) {
      if (pattern.test(cleaned)) return section.key;
    }
  }

  // Unknown section — treat as custom if it looks like a heading
  if (isHeadingLike && cleaned.split(' ').length <= 4) {
    return 'custom';
  }

  return null;
}

function parseTextEducation(lines) {
  const items = [];
  let current = null;

  for (const line of lines) {
    // Lines with years/dates typically start a new entry
    const hasDate = /\d{4}/.test(line);
    const isInstitution = /university|institute|school|college|iit|nit|iiit/i.test(line);

    if (isInstitution || (hasDate && line.length > 20 && !current)) {
      if (current) items.push(current);
      // Try to split institution and date
      const parts = line.split(/\s{2,}|(?<=\w)\s*[|–-]\s*(?=\w*\d{4})/);
      current = {
        institution: parts[0]?.trim() || line,
        duration: parts[1]?.trim() || '',
        degree: '',
        note: ''
      };
    } else if (current) {
      // This is probably degree info
      if (!current.degree) {
        const parts = line.split(/\s{2,}/);
        current.degree = parts[0]?.trim() || line;
        if (parts[1]) current.duration = current.duration || parts[1].trim();
      }
    }
  }
  if (current) items.push(current);
  return items;
}

function parseTextSkills(lines, skills) {
  for (const line of lines) {
    const lower = line.toLowerCase();
    const value = line.replace(/^[^:]+:\s*/, '').trim();

    if (lower.startsWith('language')) {
      skills.languages = value;
    } else if (lower.includes('ml') || lower.includes('deep learning') || lower.includes('machine learning')) {
      skills.frameworksMlDl = value;
    } else if (lower.includes('development') || lower.includes('web') || lower.includes('framework')) {
      skills.frameworksDev = value;
    } else if (lower.startsWith('tool') || lower.includes('toolkit')) {
      skills.toolkit = value;
    } else if (lower.startsWith('platform')) {
      skills.platforms = value;
    } else if (lower.includes('soft skill')) {
      skills.softSkills = value;
    } else if (lower.startsWith('interest')) {
      skills.interests = value;
    }
  }
}

function parseTextProjects(lines) {
  const items = [];
  let current = null;

  for (const line of lines) {
    // Project name typically starts with a bullet or is bold/capitalized
    const isTitle = line.length < 80 && (/^[•\-*]\s/.test(line) || /^[A-Z]/.test(line));
    const urlMatch = line.match(/(https?:\/\/\S+)/);

    if (isTitle && !current) {
      current = {
        name: line.replace(/^[•\-*]\s*/, '').split(/[:|–]/)[0].trim(),
        link: urlMatch ? urlMatch[1] : '',
        description: ''
      };
    } else if (current) {
      if (urlMatch && !current.link) current.link = urlMatch[1];
      if (line.length > 20) {
        current.description += (current.description ? ' ' : '') + line.replace(/^[•\-*]\s*/, '');
      }
      if (line.length < 20 || lines.indexOf(line) === lines.length - 1) {
        items.push(current);
        current = null;
      }
    } else {
      // Single-line project
      const name = line.replace(/^[•\-*]\s*/, '').split(/[:|–]/)[0].trim();
      const desc = line.includes(':') ? line.split(':').slice(1).join(':').trim() : '';
      items.push({ name, link: urlMatch ? urlMatch[1] : '', description: desc });
    }
  }
  if (current) items.push(current);
  return items;
}

function parseTextExperience(lines) {
  const items = [];
  let current = null;

  for (const line of lines) {
    const hasDate = /\d{4}/.test(line);
    const isTitle = hasDate && line.length > 15;

    if (isTitle) {
      if (current) items.push(current);
      const parts = line.split(/\s{2,}/);
      current = {
        title: parts[0]?.trim() || line,
        duration: parts[1]?.trim() || '',
        subtitle: '',
        bullets: []
      };
    } else if (current) {
      const cleaned = line.replace(/^[•\-*]\s*/, '').trim();
      if (cleaned.length > 5) {
        if (!current.subtitle && !line.startsWith('•') && !line.startsWith('-') && !line.startsWith('*')) {
          current.subtitle = cleaned;
        } else {
          current.bullets.push(cleaned);
        }
      }
    }
  }
  if (current) items.push(current);
  return items;
}

function parseTextAchievements(lines) {
  return lines.filter(l => l.length > 3).map(line => {
    const cleaned = line.replace(/^[•\-*]\s*/, '').trim();
    const urlMatch = cleaned.match(/(https?:\/\/\S+)/);
    return {
      bold: '',
      text: cleaned.replace(/(https?:\/\/\S+)/, '').trim(),
      link: urlMatch ? urlMatch[1] : ''
    };
  });
}

function parseTextCertifications(lines) {
  return lines.filter(l => l.length > 3).map(line => {
    const cleaned = line.replace(/^[•\-*]\s*/, '').trim();
    const urlMatch = cleaned.match(/(https?:\/\/\S+)/);
    const providerMatch = cleaned.match(/\(([^)]+)\)/);
    const name = cleaned.split(/[:(]/)[0].trim();
    return {
      name,
      provider: providerMatch ? providerMatch[1].trim() : '',
      link: urlMatch ? urlMatch[1] : ''
    };
  });
}
