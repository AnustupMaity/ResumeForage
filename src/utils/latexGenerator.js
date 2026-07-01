import { normalizeSkills } from './skillsUtils';

/**
 * LaTeX Generator
 * Converts resume data object into compilable LaTeX source code.
 */

export function generateLatex(resume) {
  if (!resume) return '';

  // Helper to strip HTML tags and convert basic formatting to LaTeX
  const htmlToLatex = (htmlStr) => {
    if (!htmlStr) return '';
    let tex = htmlStr;

    // Convert HTML formatting to LaTeX BEFORE stripping tags
    tex = tex.replace(/<strong>(.*?)<\/strong>/g, '\\textbf{$1}');
    tex = tex.replace(/<em>(.*?)<\/em>/g, '\\textit{$1}');
    tex = tex.replace(/<u>(.*?)<\/u>/g, '\\underline{$1}');

    // Strip remaining HTML tags (p, span, br, etc.)
    tex = tex.replace(/<br\s*\/?>/g, ' ');
    tex = tex.replace(/<\/p><p>/g, ' ');
    tex = tex.replace(/<[^>]*>/g, '');

    // Decode HTML entities
    tex = tex.replace(/&amp;/g, '\\&');
    tex = tex.replace(/&lt;/g, '<');
    tex = tex.replace(/&gt;/g, '>');
    tex = tex.replace(/&nbsp;/g, ' ');

    // Escape remaining LaTeX special characters (but NOT backslashes we just inserted)
    // We use a temporary placeholder for our LaTeX commands
    const commands = [];
    tex = tex.replace(/\\(textbf|textit|underline)\{([^}]*)\}/g, (match) => {
      commands.push(match);
      return `__LATEX_CMD_${commands.length - 1}__`;
    });

    // Strip stray LaTeX commands that Gemini might have hallucinated into the raw text
    tex = tex.replace(/\\(begin|end)\{[^}]*\}/g, '');
    
    // Now safely escape special characters
    tex = tex.replace(/%/g, '\\%');
    tex = tex.replace(/\$/g, '\\$');
    tex = tex.replace(/#/g, '\\#');
    tex = tex.replace(/_/g, '\\_');
    tex = tex.replace(/\{/g, '\\{');
    tex = tex.replace(/\}/g, '\\}');

    // Restore LaTeX commands
    commands.forEach((cmd, i) => {
      tex = tex.replace(`__LATEX_CMD_${i}__`, cmd);
    });

    return tex.trim();
  };

  const marginV = resume.settings?.marginV || resume.settings?.marginUniform || '0.5';
  const marginH = resume.settings?.marginH || resume.settings?.marginUniform || '0.5';
  const itemSpacing = resume.settings?.itemSpacing !== undefined ? resume.settings.itemSpacing : '2';

  let latex = `\\documentclass[a4paper,10pt]{article}
\\usepackage[left=${marginH}in, right=${marginH}in, top=${marginV}in, bottom=${marginV}in]{geometry}
\\usepackage{hyperref}
\\usepackage{xcolor}
\\usepackage{enumitem}
\\setlist{itemsep=${itemSpacing}pt, parsep=0pt, topsep=2pt}

\\begin{document}
\\pagestyle{empty}

`;

  const p = resume.personalInfo || {};
  if (p.name) {
    latex += `\\begin{center}\n\\Huge \\bfseries ${p.name} \\\\\n\\vspace{2pt}\n\\normalsize\n`;
  }

  const contacts = [];
  if (p.email) contacts.push(`\\href{mailto:${p.email}}{${p.email}}`);
  if (p.phone) contacts.push(`${p.phone}`);
  if (p.linkedin) {
    const linkedinUrl = p.linkedin.startsWith('http') ? p.linkedin : `https://linkedin.com/in/${p.linkedin}`;
    contacts.push(`\\href{${linkedinUrl}}{LinkedIn}`);
  }
  if (p.github) {
    const githubUrl = p.github.startsWith('http') ? p.github : `https://github.com/${p.github}`;
    contacts.push(`\\href{${githubUrl}}{GitHub}`);
  }
  if (Array.isArray(p.customLinks)) {
    p.customLinks.forEach(link => {
      if (!link || (!link.value && !link.label)) return;
      const val = (link.value || '').trim();
      const lbl = (link.label || '').trim();
      if (!val && !lbl) return;
      if (val.startsWith('http://') || val.startsWith('https://') || val.startsWith('www.')) {
        const href = val.startsWith('www.') ? `https://${val}` : val;
        const display = lbl || val.replace(/https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
        contacts.push(`\\href{${href}}{${display}}`);
      } else if (val && lbl) {
        contacts.push(`\\textbf{${lbl}:} ${val}`);
      } else {
        contacts.push(`${val || lbl}`);
      }
    });
  }
  
  if (contacts.length > 0) {
    latex += `${contacts.join(' $|$ ')}\n\\end{center}\n\n`;
  } else if (p.name) {
    latex += `\\end{center}\n\n`;
  }

  const sectionOrder = resume.settings?.sectionOrder || ['education', 'skills', 'projects', 'experience', 'achievements', 'certifications', 'customSections'];

  sectionOrder.forEach(section => {
    if (section === 'education' && resume.education?.length) {
      latex += `\\section*{Education}\n\\hrule\n\\vspace{0.2cm}\n\\begin{itemize}[leftmargin=*]\n`;
      resume.education.forEach(edu => {
        latex += `  \\item \\textbf{${edu.institution || ''}}${edu.note ? ` (${edu.note})` : ''} \\hfill \\textit{${edu.duration || ''}} \\\\\n`;
        if (edu.degree) latex += `  ${edu.degree}\n`;
      });
      latex += `\\end{itemize}\n\n`;
    }

    if (section === 'skills' && resume.skills) {
      const skillsList = normalizeSkills(resume.skills).filter(item => item.value && String(item.value).trim() !== '');
      if (skillsList.length > 0) {
        latex += `\\section*{Skills Summary}\n\\hrule\n\\vspace{0.2cm}\n\\begin{itemize}[leftmargin=*]\n`;
        skillsList.forEach(item => {
          latex += `  \\item \\textbf{${htmlToLatex(item.label || 'Category')}:} ${htmlToLatex(item.value)}\n`;
        });
        latex += `\\end{itemize}\n\n`;
      }
    }

    if (section === 'projects' && resume.projects?.length) {
      latex += `\\section*{Projects}\n\\hrule\n\\vspace{0.2cm}\n\\begin{itemize}[leftmargin=*]\n`;
      resume.projects.forEach(proj => {
        latex += `  \\item \\textbf{${proj.name || ''}}`;
        if (proj.link) latex += ` $|$ \\href{${proj.link}}{LINK}`;
        if (proj.liveLink) latex += ` $|$ \\href{${proj.liveLink}}{Deployed LINK}`;
        if (proj.description) latex += ` - ${htmlToLatex(proj.description)}`;
        latex += `\n`;
      });
      latex += `\\end{itemize}\n\n`;
    }

    if (section === 'experience' && resume.experience?.length) {
      latex += `\\section*{Experience}\n\\hrule\n\\vspace{0.2cm}\n\\begin{itemize}[leftmargin=*]\n`;
      resume.experience.forEach(exp => {
        latex += `  \\item \\textbf{${exp.title || ''}} \\hfill \\textit{${exp.duration || ''}} \\\\\n`;
        if (exp.subtitle) latex += `  ${exp.subtitle} \\\\\n`;
        if (exp.bullets?.length) {
          latex += `  \\begin{itemize}\n`;
          exp.bullets.forEach(b => {
            const cleaned = htmlToLatex(b);
            if (cleaned) latex += `    \\item ${cleaned}\n`;
          });
          latex += `  \\end{itemize}\n`;
        }
      });
      latex += `\\end{itemize}\n\n`;
    }

    if (section === 'achievements' && resume.achievements?.length) {
      latex += `\\section*{Achievements}\n\\hrule\n\\vspace{0.2cm}\n\\begin{itemize}[leftmargin=*]\n`;
      resume.achievements.forEach(ach => {
        let line = '';
        if (ach.bold) line += `\\textbf{${ach.bold}} `;
        line += htmlToLatex(ach.text);
        if (ach.link) line += ` $|$ \\href{${ach.link}}{LINK}`;
        latex += `  \\item ${line.trim()}\n`;
      });
      latex += `\\end{itemize}\n\n`;
    }

    if (section === 'certifications' && resume.certifications?.length) {
      latex += `\\section*{Certifications}\n\\hrule\n\\vspace{0.2cm}\n\\begin{itemize}[leftmargin=*]\n`;
      resume.certifications.forEach(cert => {
        let line = `\\textbf{${(cert.name || '').replace(/:$/, '')}}`;
        if (cert.provider) line += ` (${cert.provider.replace(/:$/, '')})`;
        if (cert.link) line += ` $|$ \\href{${cert.link}}{CERTIFICATE LINK}`;
        latex += `  \\item ${line}\n`;
      });
      latex += `\\end{itemize}\n\n`;
    }

    if (section === 'customSections' && resume.customSections?.length) {
      resume.customSections.forEach(cs => {
        if (cs.title && cs.items?.length) {
          latex += `\\section*{${cs.title}}\n\\hrule\n\\vspace{0.2cm}\n\\begin{itemize}[leftmargin=*]\n`;
          cs.items.forEach(item => {
            const cleaned = htmlToLatex(item);
            if (cleaned) latex += `  \\item ${cleaned}\n`;
          });
          latex += `\\end{itemize}\n\n`;
        }
      });
    }
  });

  latex += `\\end{document}`;
  return latex;
}
