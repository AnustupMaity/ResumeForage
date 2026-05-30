/**
 * LaTeX Resume Parser
 * Parses LaTeX source code (matching the specific template format) into a resume data object.
 */

export function parseLatex(latexCode) {
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

  try {
    // --- Personal Info ---
    // Name: {\Huge \bfseries \color{headercolor} Name}
    const nameMatch = latexCode.match(/\\Huge\s*\\bfseries\s*(?:\\color\{[^}]*\}\s*)?([^}]+)\}/);
    if (nameMatch) resume.personalInfo.name = nameMatch[1].trim();

    // Contact info: \contactinfo{icon}{url}{display}
    const contactMatches = [...latexCode.matchAll(/\\contactinfo\{([^}]*)\}\{([^}]*)\}\{([^}]*)\}/g)];
    for (const m of contactMatches) {
      const [, icon, url, display] = m;
      if (icon === 'envelope') {
        resume.personalInfo.email = display.trim();
      } else if (icon === 'phone') {
        resume.personalInfo.phone = display.trim();
      } else if (icon === 'linkedin') {
        resume.personalInfo.linkedin = url.trim();
      } else if (icon === 'github') {
        resume.personalInfo.github = url.trim();
      }
    }

    // --- Extract sections ---
    const sectionRegex = /\\section\*\{([^}]+)\}([\s\S]*?)(?=\\section\*\{|\\end\{document\})/g;
    let sectionMatch;
    const knownSections = ['education', 'skills summary', 'projects', 'experience', 'achievements', 'certifications'];

    while ((sectionMatch = sectionRegex.exec(latexCode)) !== null) {
      const sectionName = sectionMatch[1].trim().toLowerCase();
      const sectionContent = sectionMatch[2];

      if (sectionName === 'education') {
        resume.education = parseEducation(sectionContent);
      } else if (sectionName === 'skills summary' || sectionName === 'skills') {
        parseSkills(sectionContent, resume.skills);
      } else if (sectionName === 'projects') {
        resume.projects = parseProjects(sectionContent);
      } else if (sectionName === 'experience') {
        resume.experience = parseExperience(sectionContent);
      } else if (sectionName === 'achievements') {
        resume.achievements = parseAchievements(sectionContent);
      } else if (sectionName === 'certifications') {
        resume.certifications = parseCertifications(sectionContent);
      } else {
        // Custom section
        const items = parseGenericItems(sectionContent);
        if (items.length > 0) {
          resume.customSections.push({
            title: sectionMatch[1].trim(),
            items
          });
        }
      }
    }
  } catch (err) {
    console.error('LaTeX parse error:', err);
  }

  return resume;
}

function cleanLatex(text) {
  return text
    .replace(/\\textbf\{([^}]*)\}/g, '$1')
    .replace(/\\textit\{([^}]*)\}/g, '$1')
    .replace(/\\emph\{([^}]*)\}/g, '$1')
    .replace(/\\color\{[^}]*\}/g, '')
    .replace(/\\href\{[^}]*\}\{([^}]*)\}/g, '$1')
    .replace(/\\\\/g, '')
    .replace(/\\hfill/g, '')
    .replace(/\\quad/g, ' ')
    .replace(/\\&/g, '&')
    .replace(/\\%/g, '%')
    .replace(/\\\$/g, '$')
    .replace(/\\#/g, '#')
    .replace(/\$([^$]*)\$/g, '$1')
    .replace(/~+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractHref(text) {
  const match = text.match(/\\href\{([^}]*)\}/);
  return match ? match[1] : '';
}

function parseEducation(content) {
  const items = [];
  // Match \item blocks
  const itemRegex = /\\item\s+([\s\S]*?)(?=\\item|$)/g;
  let match;

  while ((match = itemRegex.exec(content)) !== null) {
    const block = match[1];

    // Institution: \textbf{Name} \hfill \textit{Duration}
    const instMatch = block.match(/\\textbf\{([^}]*)\}/);
    const durationMatch = block.match(/\\textit\{([^}]*)\}/);
    const noteMatch = block.match(/\(([^)]*Learning[^)]*|[^)]*Distance[^)]*)\)/i);

    // Degree line: after \\ or on the next line
    const lines = block.split(/\\\\/).map(l => cleanLatex(l).trim()).filter(Boolean);
    const degreeLine = lines.length > 1 ? lines[1] : '';

    items.push({
      institution: instMatch ? cleanLatex(instMatch[1]) : '',
      duration: durationMatch ? cleanLatex(durationMatch[1]) : '',
      degree: degreeLine,
      note: noteMatch ? noteMatch[1].trim() : ''
    });
  }

  return items;
}

function parseSkills(content, skills) {
  const lines = content.split(/\\item\s+/).filter(Boolean);

  for (const line of lines) {
    const cleaned = cleanLatex(line);
    const lower = cleaned.toLowerCase();

    if (lower.startsWith('languages:')) {
      skills.languages = cleaned.replace(/^languages:\s*/i, '').trim();
    } else if (lower.startsWith('toolkit:')) {
      skills.toolkit = cleaned.replace(/^toolkit:\s*/i, '').trim();
    } else if (lower.startsWith('platforms:')) {
      skills.platforms = cleaned.replace(/^platforms:\s*/i, '').trim();
    } else if (lower.startsWith('soft skills:')) {
      skills.softSkills = cleaned.replace(/^soft skills:\s*/i, '').trim();
    } else if (lower.startsWith('interests:')) {
      skills.interests = cleaned.replace(/^interests:\s*/i, '').trim();
    } else if (lower.includes('frameworks:') || lower.includes('ml/dl:') || lower.includes('development:')) {
      // Parse nested frameworks
      const mlMatch = line.match(/ML\/DL:\s*\}?\s*([^\\]*?)(?=\\item|\\textbf|$)/i);
      const devMatch = line.match(/Development:\s*\}?\s*([^\\]*?)(?=\\item|\\textbf|$)/i);

      // Try to extract from sub-items
      const subItems = line.split(/\\item\s+/).filter(Boolean);
      for (const sub of subItems) {
        const subCleaned = cleanLatex(sub);
        const subLower = subCleaned.toLowerCase();
        if (subLower.startsWith('ml/dl:')) {
          skills.frameworksMlDl = subCleaned.replace(/^ml\/dl:\s*/i, '').trim();
        } else if (subLower.startsWith('development:')) {
          skills.frameworksDev = subCleaned.replace(/^development:\s*/i, '').trim();
        }
      }

      if (!skills.frameworksMlDl && mlMatch) {
        skills.frameworksMlDl = cleanLatex(mlMatch[1]).trim();
      }
      if (!skills.frameworksDev && devMatch) {
        skills.frameworksDev = cleanLatex(devMatch[1]).trim();
      }
    }
  }
}

function parseProjects(content) {
  const items = [];
  const itemRegex = /\\item\s+([\s\S]*?)(?=\\item|$)/g;
  let match;

  while ((match = itemRegex.exec(content)) !== null) {
    const block = match[1];
    const nameMatch = block.match(/\\textbf\{([^}]*)\}/);
    const link = extractHref(block);

    // Description is everything after the LINK or the project name
    let description = cleanLatex(block);
    // Remove the project name and LINK text
    if (nameMatch) {
      description = description.replace(nameMatch[1], '').trim();
    }
    description = description.replace(/\|\s*LINK/g, '').replace(/^[\s:|]+/, '').trim();

    items.push({
      name: nameMatch ? cleanLatex(nameMatch[1]) : '',
      link: link,
      description: description
    });
  }

  return items;
}

function parseExperience(content) {
  const items = [];
  // Top-level items only (not nested)
  const topItems = content.split(/(?=\\item\s+\\textbf)/);

  for (const block of topItems) {
    if (!block.includes('\\textbf')) continue;

    const titleMatch = block.match(/\\textbf\{([^}]*)\}/);
    const durationMatch = block.match(/\\textit\{([^}]*)\}/);

    // Subtitle: line after \\ before nested \begin{itemize}
    const lines = block.split(/\\\\/).map(l => cleanLatex(l).trim()).filter(Boolean);
    let subtitle = '';
    if (lines.length > 1) {
      // Second line before any \begin{itemize}
      const subLine = lines[1].split('\\begin')[0];
      subtitle = cleanLatex(subLine).trim();
    }

    // Bullets: nested \item entries
    const bullets = [];
    const nestedItemRegex = /\\begin\{itemize\}[\s\S]*?\\end\{itemize\}/g;
    const nestedMatch = block.match(nestedItemRegex);
    if (nestedMatch) {
      const innerItems = nestedMatch[nestedMatch.length - 1].match(/\\item\s+([\s\S]*?)(?=\\item|\\end\{itemize\})/g);
      if (innerItems) {
        for (const bi of innerItems) {
          const bulletText = cleanLatex(bi.replace(/^\\item\s+/, ''));
          if (bulletText) bullets.push(bulletText);
        }
      }
    }

    items.push({
      title: titleMatch ? cleanLatex(titleMatch[1]) : '',
      duration: durationMatch ? cleanLatex(durationMatch[1]) : '',
      subtitle,
      bullets
    });
  }

  return items;
}

function parseAchievements(content) {
  const items = [];
  const itemRegex = /\\item\s+([\s\S]*?)(?=\\item|$)/g;
  let match;

  while ((match = itemRegex.exec(content)) !== null) {
    const block = match[1];
    const boldMatch = block.match(/\\textbf\{([^}]*)\}/);
    const link = extractHref(block);

    let text = cleanLatex(block);
    if (boldMatch) {
      text = text.replace(boldMatch[1], '').trim();
    }
    text = text.replace(/\|\s*LINK/g, '').replace(/^[\s:|]+/, '').trim();

    items.push({
      bold: boldMatch ? cleanLatex(boldMatch[1]) : '',
      text: text,
      link: link
    });
  }

  return items;
}

function parseCertifications(content) {
  const items = [];
  const itemRegex = /\\item\s+([\s\S]*?)(?=\\item|$)/g;
  let match;

  while ((match = itemRegex.exec(content)) !== null) {
    const block = match[1];
    const nameMatch = block.match(/\\textbf\{([^}]*)\}/);
    const link = extractHref(block);

    // Provider: text in parentheses after the name, e.g., (DeepLearning.AI, Stanford)
    const providerMatch = block.match(/\(([^)]+)\)/);

    items.push({
      name: nameMatch ? cleanLatex(nameMatch[1]) : cleanLatex(block).split(':')[0].trim(),
      provider: providerMatch ? providerMatch[1].trim() : '',
      link: link
    });
  }

  return items;
}

function parseGenericItems(content) {
  const items = [];
  const itemRegex = /\\item\s+([\s\S]*?)(?=\\item|$)/g;
  let match;

  while ((match = itemRegex.exec(content)) !== null) {
    const text = cleanLatex(match[1]);
    if (text) items.push(text);
  }
  return items;
}
