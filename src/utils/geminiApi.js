async function callGemini(prompt, temperature = 0.7) {
  try {
    const response = await fetch('/api/generateWithGemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt, temperature })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.text;
  } catch (err) {
    console.error('Gemini Backend Error:', err);
    throw new Error('AI request failed. Please try again.');
  }
}

export async function parseResumeWithAI(text, apiKey) {
  const prompt = `
  You are an expert resume parser. Extract the following resume text into a JSON object.
  The JSON structure MUST EXACTLY match this schema:
  {
    "personalInfo": { "name": "", "email": "", "phone": "", "linkedin": "", "github": "" },
    "education": [ { "institution": "", "duration": "", "degree": "", "note": "" } ],
    "skills": { "languages": "", "frameworksMlDl": "", "frameworksDev": "", "toolkit": "", "platforms": "", "softSkills": "", "interests": "" },
    "projects": [ { "name": "", "link": "", "description": "" } ],
    "experience": [ { "title": "", "duration": "", "subtitle": "", "bullets": [""] } ],
    "achievements": [ { "bold": "", "text": "", "link": "" } ],
    "certifications": [ { "name": "", "provider": "", "link": "" } ],
    "customSections": [ { "title": "", "items": [""] } ]
  }
  
  Rules:
  - If a field is missing in the text, leave it as an empty string.
  - Format dates as string (e.g., "Jan 2020 - Dec 2021").
  - Keep bullet points concise.
  - Return ONLY valid JSON, no markdown formatting blocks, no explanation.

  Resume Text:
  ${text}
  `;

  let rawJson = await callGemini(prompt, 0.1);
  rawJson = rawJson.replace(/^\s*```json/i, '').replace(/```\s*$/i, '').trim();
  return JSON.parse(rawJson);
}

export async function rewriteBulletPoint(bullet) {
  const prompt = `
  You are an expert technical resume writer. Rewrite the following resume bullet point to make it much stronger, action-oriented, and professional. 
  If possible, imply quantifiable results or strong technical ownership. 
  Keep it to ONE concise sentence. Do not add any introductory text, just return the improved bullet point.
  
  Original bullet: "${bullet}"
  `;
  const result = await callGemini(prompt, 0.7);
  return result.replace(/^"|"$|^- /g, '').trim();
}

export async function checkAtsMatch(resumeJson, jobDescription) {
  const prompt = `
  You are an expert ATS (Applicant Tracking System) parser.
  Compare the candidate's resume data to the Job Description.
  
  Calculate a Match Score (0-100).
  Identify important missing keywords or skills from the Job Description that the candidate does not have in their resume.
  Provide a brief 1-2 sentence suggestion on how they can improve.

  Output MUST be STRICT JSON matching this schema:
  {
    "score": 0,
    "missingKeywords": ["keyword1", "keyword2"],
    "suggestions": "..."
  }
  Return ONLY valid JSON, no markdown formatting blocks.

  Job Description:
  ${jobDescription}

  Resume Data:
  ${JSON.stringify(resumeJson)}
  `;

  let rawJson = await callGemini(prompt, 0.2);
  rawJson = rawJson.replace(/^\s*```json/i, '').replace(/```\s*$/i, '').trim();
  return JSON.parse(rawJson);
}

export async function generateCoverLetter(resumeJson, jobTitle, companyName) {
  const prompt = `
  You are an expert career coach. Write a professional, modern cover letter for the role of "${jobTitle}" at "${companyName}".
  
  Use the candidate's resume data below to highlight their most relevant skills and experiences.
  Do not include placeholders like "[Your Address]" - just start directly with the letter body or a generic professional greeting if contact info is missing.
  Keep it concise (3-4 paragraphs) and highly persuasive.

  Candidate Resume Data:
  ${JSON.stringify(resumeJson)}
  `;

  return await callGemini(prompt, 0.7);
}

export async function applyGlobalInstruction(resumeJson, instruction) {
  const prompt = `
  You are an expert AI resume editor. The user wants to apply the following global instruction to their resume data:
  
  USER INSTRUCTION: "${instruction}"
  
  Your task is to take the provided Resume Data, apply the requested changes (e.g., rewriting bullet points, expanding sections, changing tone, etc.), and return the FULLY UPDATED Resume Data.
  
  The output MUST EXACTLY match this JSON schema:
  {
    "personalInfo": { "name": "", "email": "", "phone": "", "linkedin": "", "github": "" },
    "education": [ { "institution": "", "duration": "", "degree": "", "note": "" } ],
    "skills": { "languages": "", "frameworksMlDl": "", "frameworksDev": "", "toolkit": "", "platforms": "", "softSkills": "", "interests": "" },
    "projects": [ { "name": "", "link": "", "description": "" } ],
    "experience": [ { "title": "", "duration": "", "subtitle": "", "bullets": [""] } ],
    "achievements": [ { "bold": "", "text": "", "link": "" } ],
    "certifications": [ { "name": "", "provider": "", "link": "" } ],
    "customSections": [ { "title": "", "items": [""] } ]
  }
  
  Rules:
  - DO NOT change the structure of the JSON.
  - Retain all information that is not explicitly altered by the instruction.
  - DO NOT include markdown blocks (\`\`\`json) or any explanations. Return ONLY the raw JSON string.

  Original Resume Data:
  ${JSON.stringify(resumeJson)}
  `;

  let rawJson = await callGemini(prompt, 0.7);
  rawJson = rawJson.replace(/^\s*```json/i, '').replace(/```\s*$/i, '').trim();
  return JSON.parse(rawJson);
}
