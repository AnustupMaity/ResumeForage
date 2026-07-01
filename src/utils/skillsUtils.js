/**
 * Utility functions for managing dynamic skill categories in Resume Builder.
 */

export const DEFAULT_SKILLS = [
  { id: 'languages', label: 'Languages', value: '' },
  { id: 'frameworksMlDl', label: 'Frameworks — ML/DL', value: '' },
  { id: 'frameworksDev', label: 'Frameworks — Development', value: '' },
  { id: 'toolkit', label: 'Toolkit', value: '' },
  { id: 'platforms', label: 'Platforms', value: '' },
  { id: 'softSkills', label: 'Soft Skills', value: '' },
  { id: 'interests', label: 'Interests', value: '' }
];

export function normalizeSkills(skills) {
  if (Array.isArray(skills)) {
    return skills.map((item, index) => {
      if (typeof item === 'object' && item !== null) {
        return {
          id: item.id || `skill_${index}`,
          label: item.label !== undefined ? item.label : (item.name !== undefined ? item.name : 'Category'),
          value: item.value !== undefined ? item.value : ''
        };
      }
      return { id: `skill_${index}`, label: 'Skill', value: String(item || '') };
    });
  }

  if (!skills || typeof skills !== 'object') {
    return DEFAULT_SKILLS.map(item => ({ ...item }));
  }

  const s = skills;
  const list = [];

  if (s.languages !== undefined) list.push({ id: 'languages', label: 'Languages', value: s.languages || '' });
  if (s.frameworksMlDl !== undefined) list.push({ id: 'frameworksMlDl', label: 'Frameworks — ML/DL', value: s.frameworksMlDl || '' });
  if (s.frameworksDev !== undefined) list.push({ id: 'frameworksDev', label: 'Frameworks — Development', value: s.frameworksDev || '' });
  if (s.toolkit !== undefined) list.push({ id: 'toolkit', label: 'Toolkit', value: s.toolkit || '' });
  if (s.platforms !== undefined) list.push({ id: 'platforms', label: 'Platforms', value: s.platforms || '' });
  if (s.softSkills !== undefined) list.push({ id: 'softSkills', label: 'Soft Skills', value: s.softSkills || '' });
  if (s.interests !== undefined) list.push({ id: 'interests', label: 'Interests', value: s.interests || '' });

  // Add any custom properties that might be in the legacy object
  Object.keys(s).forEach(key => {
    if (!['languages', 'frameworksMlDl', 'frameworksDev', 'toolkit', 'platforms', 'softSkills', 'interests'].includes(key)) {
      list.push({ id: key, label: key.charAt(0).toUpperCase() + key.slice(1), value: s[key] || '' });
    }
  });

  // If the object was totally empty {}, return default structure with empty values
  if (list.length === 0) {
    return DEFAULT_SKILLS.map(item => ({ ...item }));
  }

  return list;
}

export function skillsToObject(skillsInput) {
  const list = normalizeSkills(skillsInput);
  const obj = {
    languages: '',
    frameworksMlDl: '',
    frameworksDev: '',
    toolkit: '',
    platforms: '',
    softSkills: '',
    interests: ''
  };

  list.forEach(item => {
    if (item.id && obj.hasOwnProperty(item.id)) {
      obj[item.id] = item.value || '';
    } else if (item.label) {
      const lower = item.label.toLowerCase();
      if (lower === 'languages') obj.languages = item.value || '';
      else if (lower.includes('ml/dl') || lower.includes('machine learning')) obj.frameworksMlDl = item.value || '';
      else if (lower.includes('dev') || lower.includes('development') || lower.includes('framework')) obj.frameworksDev = item.value || '';
      else if (lower.includes('tool')) obj.toolkit = item.value || '';
      else if (lower.includes('platform')) obj.platforms = item.value || '';
      else if (lower.includes('soft')) obj.softSkills = item.value || '';
      else if (lower.includes('interest')) obj.interests = item.value || '';
      else obj[item.id || item.label] = item.value || '';
    }
  });

  return obj;
}
