// ============================================================
// VALIDATE.JS — Centralized input validation
// Email, Password, Name, Company, Salary, Job fields, Resume
// ============================================================

const SPAM_COMPANY_WORDS = ['earn fast', 'no work', 'easy money', 'work from home earn', 'get rich'];
const SPAM_JOB_TITLE_WORDS = ['easy job', 'no skill', 'no experience needed', 'earn fast', 'work from home easy'];
const SPAM_DESC_PHRASES = ['pay fee', 'no interview', 'earn money easily', 'registration fee', 'send money', 'wire transfer', 'upfront payment', 'starter kit fee'];
const COMMON_PASSWORDS = ['123456', 'password', '12345678', 'qwerty', '111111', 'abc123', 'letmein', 'welcome'];

// ---- EMAIL ----
function validateEmail(email) {
  if (!email) return { ok: false, msg: 'Email is required.' };
  if (/^\s/.test(email)) return { ok: false, msg: 'Email must not start with a space.' };
  if (/\s$/.test(email)) return { ok: false, msg: 'Email must not end with a space.' };
  if (email !== email.trim()) return { ok: false, msg: 'Email must not start or end with spaces.' };
  if (email.length < 5) return { ok: false, msg: 'Email must be at least 5 characters.' };
  if (/\s/.test(email)) return { ok: false, msg: 'Email must not contain spaces.' };
  if ((email.match(/@/g) || []).length !== 1) return { ok: false, msg: 'Email must contain exactly one @ symbol.' };
  if (/^[@._\-]/.test(email)) return { ok: false, msg: 'Email must not start with a special character.' };
  if (email.endsWith('.')) return { ok: false, msg: 'Email must not end with a dot.' };
  const emailRegex = /^[a-zA-Z0-9][a-zA-Z0-9._\-]*@[a-zA-Z0-9][a-zA-Z0-9.\-]*\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) return { ok: false, msg: 'Invalid email format. Use: user@domain.com' };
  return { ok: true };
}

// ---- PASSWORD ----
function validatePassword(password) {
  if (!password) return { ok: false, msg: 'Password is required.' };
  if (password !== password.trim()) return { ok: false, msg: 'Password must not start or end with spaces.' };
  if (password.length < 8) return { ok: false, msg: 'Password must be at least 8 characters.' };
  if (!/[A-Z]/.test(password)) return { ok: false, msg: 'Password must contain at least one uppercase letter.' };
  if (!/[a-z]/.test(password)) return { ok: false, msg: 'Password must contain at least one lowercase letter.' };
  if (!/[0-9]/.test(password)) return { ok: false, msg: 'Password must contain at least one number.' };
  if (!/[@#$%&*!]/.test(password)) return { ok: false, msg: 'Password must contain at least one special character: @ # $ % & * !' };
  if (COMMON_PASSWORDS.includes(password.toLowerCase())) return { ok: false, msg: 'Password is too common. Choose a stronger one.' };
  return { ok: true };
}

// ---- NAME ----
function validateName(name) {
  if (!name || name !== name.trim()) return { ok: false, msg: 'Name must not start or end with spaces.' };
  if (!/^[a-zA-Z]+(?: [a-zA-Z]+)*$/.test(name)) return { ok: false, msg: 'Name must contain only letters and single spaces between words.' };
  return { ok: true };
}

// ---- COMPANY NAME ----
function validateCompanyName(name) {
  if (!name || name !== name.trim()) return { ok: false, msg: 'Company name must not start or end with spaces.' };
  if (name.length < 3 || name.length > 100) return { ok: false, msg: 'Company name must be 3–100 characters.' };
  if (!/^[a-zA-Z0-9 ]+$/.test(name)) return { ok: false, msg: 'Company name must contain only letters, numbers, and spaces.' };
  const lower = name.toLowerCase();
  for (const w of SPAM_COMPANY_WORDS) {
    if (lower.includes(w)) return { ok: false, msg: `Company name contains suspicious phrase: "${w}".` };
  }
  return { ok: true };
}

// ---- SALARY ----
function validateSalary(salary) {
  if (!salary || salary.toString().trim() === '') return { ok: false, msg: 'Salary is required.' };
  const val = Number(String(salary).replace(/,/g, '').trim());
  if (isNaN(val) || !/^\d[\d,]*$/.test(String(salary).trim())) return { ok: false, msg: 'Salary must be a number only (no letters or symbols).' };
  if (val < 1000) return { ok: false, msg: 'Salary must be at least 1,000.' };
  if (val > 5000000) return { ok: false, msg: 'Salary must not exceed 50,00,000.' };
  return { ok: true };
}

// ---- JOB TITLE ----
function validateJobTitle(title) {
  if (!title || title !== title.trim()) return { ok: false, msg: 'Job title must not start or end with spaces.' };
  if (!/^[a-zA-Z]+(?: [a-zA-Z]+)*$/.test(title)) return { ok: false, msg: 'Job title must contain only letters and spaces.' };
  const lower = title.toLowerCase();
  for (const w of SPAM_JOB_TITLE_WORDS) {
    if (lower.includes(w)) return { ok: false, msg: `Job title contains suspicious phrase: "${w}".` };
  }
  return { ok: true };
}

// ---- JOB DESCRIPTION ----
function validateJobDescription(desc) {
  if (!desc || desc !== desc.trim()) return { ok: false, msg: 'Description must not start or end with spaces.' };
  if (desc.trim().length < 50) return { ok: false, msg: 'Job description must be at least 50 characters.' };
  const lower = desc.toLowerCase();
  for (const p of SPAM_DESC_PHRASES) {
    if (lower.includes(p)) return { ok: false, msg: `Description contains suspicious phrase: "${p}".` };
  }
  return { ok: true };
}

// ---- LOCATION ----
function validateLocation(loc) {
  if (!loc || loc !== loc.trim()) return { ok: false, msg: 'Location must not start or end with spaces.' };
  if (!/^[a-zA-Z]+(?: [a-zA-Z]+)*$/.test(loc)) return { ok: false, msg: 'Location must contain only letters and spaces (no numbers or special characters).' };
  return { ok: true };
}

// ---- SKILLS ----
function validateSkills(skills) {
  if (!skills || skills !== skills.trim()) return { ok: false, msg: 'Skills must not start or end with spaces.' };
  if (!/^[a-zA-Z]+(,\s*[a-zA-Z]+)*$/.test(skills.trim())) return { ok: false, msg: 'Skills must be alphabets separated by commas. Example: Python, Java, ML' };
  return { ok: true };
}

// ---- EDUCATION ----
function validateEducation(edu) {
  if (!edu || edu !== edu.trim()) return { ok: false, msg: 'Education must not start or end with spaces.' };
  if (!/^[a-zA-Z]+(?: [a-zA-Z]+)*$/.test(edu)) return { ok: false, msg: 'Education must contain only letters and spaces.' };
  return { ok: true };
}

// ---- RESUME FILE ----
function validateResume(file) {
  if (!file) return { ok: false, msg: 'Please upload a resume.' };
  const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  const ext = file.name.split('.').pop().toLowerCase();
  if (!allowed.includes(file.type) && !['pdf','docx'].includes(ext)) {
    return { ok: false, msg: 'Resume must be a PDF or DOCX file.' };
  }
  if (file.size > 2 * 1024 * 1024) return { ok: false, msg: 'Resume file size must not exceed 2MB.' };
  return { ok: true };
}

// ---- GENERAL: no leading/trailing/multiple spaces ----
function validateNoSpaceAbuse(value, fieldName) {
  if (value !== value.trim()) return { ok: false, msg: `${fieldName} must not start or end with spaces.` };
  if (/  /.test(value)) return { ok: false, msg: `${fieldName} must not contain multiple consecutive spaces.` };
  return { ok: true };
}

// ---- UI HELPERS ----

// Find the element after which the error div should be inserted
// (handles inputs inside .password-wrap)
function _errorAnchor(inputEl) {
  return inputEl.closest('.password-wrap') || inputEl;
}

function showFieldError(inputEl, msg) {
  clearFieldError(inputEl);
  inputEl.style.borderColor = '#dc2626';
  inputEl.style.outline = 'none';
  const anchor = _errorAnchor(inputEl);
  const err = document.createElement('div');
  err.className = '_val_err';
  err.style.cssText = 'color:#dc2626;font-size:12px;margin-top:4px;line-height:1.4;';
  err.textContent = '⚠ ' + msg;
  anchor.parentNode.insertBefore(err, anchor.nextSibling);
}

function setFieldValid(inputEl) {
  clearFieldError(inputEl);
  inputEl.style.borderColor = '#16a34a';
}

function clearFieldError(inputEl) {
  inputEl.style.borderColor = '';
  const anchor = _errorAnchor(inputEl);
  const next = anchor.nextSibling;
  if (next && next.classList && next.classList.contains('_val_err')) next.remove();
}

function clearAllFieldErrors(formEl) {
  formEl.querySelectorAll('._val_err').forEach(e => e.remove());
  formEl.querySelectorAll('input, textarea').forEach(el => el.style.borderColor = '');
}

// ---- LIVE VALIDATION ----
// Attach real-time oninput validation to a field.
// validatorFn: function(value) => { ok, msg }
function liveValidate(inputEl, validatorFn) {
  if (!inputEl) return;

  // For email fields: block space key entirely
  if (inputEl.type === 'email' || inputEl.dataset.valType === 'email') {
    inputEl.addEventListener('keydown', function (e) {
      if (e.key === ' ') e.preventDefault();
    });
  }

  function check() {
    const val = inputEl.value;
    if (!val) { clearFieldError(inputEl); return; }
    // Check leading/trailing space immediately (before any other rule)
    if (/^\s/.test(val)) { showFieldError(inputEl, 'Must not start with a space.'); return; }
    if (/\s$/.test(val)) { showFieldError(inputEl, 'Must not end with a space.'); return; }
    const result = validatorFn(val);
    if (!result.ok) showFieldError(inputEl, result.msg);
    else setFieldValid(inputEl);
  }

  inputEl.addEventListener('input', check);
  inputEl.addEventListener('blur', function () {
    if (this.value) check();
  });
}

// Convenience: attach live validation to all standard fields by their element id
// map: { elementId: validatorFn }
function attachLiveValidation(map) {
  for (const [id, fn] of Object.entries(map)) {
    const el = document.getElementById(id);
    if (el) liveValidate(el, fn);
  }
}
