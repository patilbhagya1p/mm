// ============================================================
// APP.JS — Core application logic
// Auth, session, jobs CRUD, notifications, activity log,
// profile management, application tracking
// ============================================================

// ---- IMAGE HELPERS ----
function getCompanyLogo(company, size = 40) {
  if (!company || company.trim() === '') {
    return `<div style="width:${size}px;height:${size}px;border-radius:8px;background:#f1f5f9;border:1px solid #e2e8f0;display:flex;align-items:center;justify-content:center;font-size:${Math.round(size*0.4)}px;color:#94a3b8;flex-shrink:0;">?</div>`;
  }
  const initials = company.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
  const colors = ['2563eb','dc2626','16a34a','d97706','7c3aed','0891b2','db2777','ea580c'];
  const bg = colors[company.charCodeAt(0) % colors.length];
  return `<img src="https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=${bg}&color=fff&size=${size}&bold=true&rounded=true" width="${size}" height="${size}" style="border-radius:8px;flex-shrink:0;" alt="${company}">`;
}

function getUserAvatarUrl(name, size = 36) {
  const colors = ['2563eb','7c3aed','dc2626','16a34a','d97706','0891b2'];
  const bg = colors[(name || 'U').charCodeAt(0) % colors.length];
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name||'U')}&background=${bg}&color=fff&size=${size}&bold=true`;
}

let currentUser = null;

// ---- AUTH ----
function login(role, email, password) {
  const lists = { admin: usersData.admin, recruiter: usersData.recruiters, jobseeker: usersData.jobseekers };
  const user = (lists[role] || []).find(u => u.email === email && u.password === password);
  if (user) {
    currentUser = { ...user };
    sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
    _logActivity(user.id, user.role, 'login', `Logged in as ${user.role}`);
    return { success: true, user };
  }
  return { success: false, message: 'Invalid email or password.' };
}

function logout() {
  const user = getStoredUser();
  if (user) _logActivity(user.id, user.role, 'logout', 'Logged out');
  sessionStorage.removeItem('currentUser');
  window.location.href = 'index.html';
}

function getStoredUser() {
  const s = sessionStorage.getItem('currentUser');
  return s ? JSON.parse(s) : null;
}

function requireAuth(role) {
  const user = getStoredUser();
  if (!user || user.role !== role) { window.location.href = 'index.html'; return null; }
  currentUser = user;
  return user;
}

function updateProfile(userId, role, updates) {
  const lists = { admin: usersData.admin, recruiter: usersData.recruiters, jobseeker: usersData.jobseekers };
  const list = lists[role] || [];
  const idx = list.findIndex(u => u.id === userId);
  if (idx === -1) return { success: false, message: 'User not found.' };
  if (updates.email) {
    const allEmails = [...usersData.admin, ...usersData.recruiters, ...usersData.jobseekers]
      .filter(u => u.id !== userId).map(u => u.email);
    if (allEmails.includes(updates.email)) return { success: false, message: 'Email already in use.' };
  }
  Object.assign(list[idx], updates);
  const stored = getStoredUser();
  if (stored && stored.id === userId) {
    const updated = { ...stored, ...updates };
    sessionStorage.setItem('currentUser', JSON.stringify(updated));
    currentUser = updated;
  }
  _logActivity(userId, role, 'profile_update', 'Updated profile');
  return { success: true, user: list[idx] };
}

// ---- JOBS CRUD ----
function getAllJobs() {
  const s = sessionStorage.getItem('jobs');
  return s ? JSON.parse(s) : jobsData;
}

function saveJobs(jobs) {
  sessionStorage.setItem('jobs', JSON.stringify(jobs));
}

function addJob(job) {
  const jobs = getAllJobs();
  job.id = Date.now();
  job.date_posted = new Date().toISOString().split('T')[0];
  job.fraudulent = 0;
  jobs.push(job);
  saveJobs(jobs);
  _logActivity(job.recruiter_id, 'recruiter', 'job_post', `Posted: "${job.title}"`);
  _addNotification('admin', `New job posted: "${job.title}" by recruiter #${job.recruiter_id}`, 'info');
  return job;
}

function deleteJob(id) {
  const jobs = getAllJobs();
  const job = jobs.find(j => j.id === id);
  if (!job) return;
  // Soft delete — move to deleted archive
  const deleted = getDeletedJobs();
  deleted.unshift({ ...job, deleted_at: new Date().toLocaleString(), deleted_by: currentUser?.name || 'Admin' });
  sessionStorage.setItem('deletedJobs', JSON.stringify(deleted));
  saveJobs(jobs.filter(j => j.id !== id));
  _logActivity(currentUser?.id, currentUser?.role, 'job_delete', `Deleted: "${job.title}"`);
}

function getDeletedJobs() {
  const s = sessionStorage.getItem('deletedJobs');
  return s ? JSON.parse(s) : [];
}

function restoreJob(id) {
  const deleted = getDeletedJobs();
  const job = deleted.find(j => j.id === id);
  if (!job) return;
  const { deleted_at, deleted_by, ...restored } = job;
  const jobs = getAllJobs();
  jobs.push(restored);
  saveJobs(jobs);
  sessionStorage.setItem('deletedJobs', JSON.stringify(deleted.filter(j => j.id !== id)));
  _logActivity(currentUser?.id, currentUser?.role, 'job_restore', `Restored: "${job.title}"`);
}

function permanentDeleteJob(id) {
  const deleted = getDeletedJobs().filter(j => j.id !== id);
  sessionStorage.setItem('deletedJobs', JSON.stringify(deleted));
  _logActivity(currentUser?.id, currentUser?.role, 'job_perm_delete', `Permanently deleted job #${id}`);
}

function updateJob(updatedJob) {
  saveJobs(getAllJobs().map(j => j.id === updatedJob.id ? updatedJob : j));
  _logActivity(currentUser?.id, currentUser?.role, 'job_edit', `Edited: "${updatedJob.title}"`);
}

function flagJob(id) {
  const jobs = getAllJobs();
  const job = jobs.find(j => j.id === id);
  if (!job) return;
  job.fraudulent = job.fraudulent === 1 ? 0 : 1;
  saveJobs(jobs);
  _logActivity(currentUser?.id, 'admin', 'job_flag', `${job.fraudulent ? 'Flagged' : 'Unflagged'}: "${job.title}"`);
  _addNotification('admin', `Job "${job.title}" manually ${job.fraudulent ? 'flagged' : 'unflagged'}`, job.fraudulent ? 'danger' : 'success');
}

// ---- JOB APPLICATIONS ----
function getApplications() {
  const s = sessionStorage.getItem('applications');
  return s ? JSON.parse(s) : [];
}

function applyToJob(jobId, userId) {
  const apps = getApplications();
  const already = apps.find(a => a.jobId === jobId && a.userId === userId);
  if (already) return { success: false, message: 'Already applied to this job.' };
  const job = getAllJobs().find(j => j.id === jobId);
  if (!job) return { success: false, message: 'Job not found.' };
  const app = {
    id: Date.now(),
    jobId,
    userId,
    jobTitle: job.title,
    company: job.company,
    date: new Date().toISOString().split('T')[0],
    status: 'Applied'
  };
  apps.push(app);
  sessionStorage.setItem('applications', JSON.stringify(apps));
  applicationHistory.prepend(app);
  applicationQueue.enqueue(app);
  _logActivity(userId, 'jobseeker', 'apply', `Applied to "${job.title}"`);
  _addNotification('jobseeker', `Application submitted for "${job.title}"`, 'success');
  return { success: true, application: app };
}

function getUserApplications(userId) {
  return getApplications().filter(a => a.userId === userId);
}

function getJobApplications(jobId) {
  return getApplications().filter(a => a.jobId === jobId);
}

function updateApplicationStatus(appId, status) {
  const apps = getApplications();
  const app = apps.find(a => a.id === appId);
  if (!app) return;
  app.status = status;
  sessionStorage.setItem('applications', JSON.stringify(apps));
  _addNotification('jobseeker', `Your application for "${app.jobTitle}" is now: ${status}`, 'info');
}

// ---- NOTIFICATIONS ----
function _addNotification(targetRole, message, type = 'info') {
  const key = `notifications_${targetRole}`;
  const notes = JSON.parse(sessionStorage.getItem(key) || '[]');
  notes.unshift({ id: Date.now(), message, type, read: false, time: new Date().toLocaleTimeString() });
  if (notes.length > 20) notes.pop();
  sessionStorage.setItem(key, JSON.stringify(notes));
}

function getNotifications(role) {
  return JSON.parse(sessionStorage.getItem(`notifications_${role}`) || '[]');
}

function markAllRead(role) {
  const notes = getNotifications(role).map(n => ({ ...n, read: true }));
  sessionStorage.setItem(`notifications_${role}`, JSON.stringify(notes));
}

function getUnreadCount(role) {
  return getNotifications(role).filter(n => !n.read).length;
}

// ---- ACTIVITY LOG ----
function _logActivity(userId, role, action, detail) {
  const log = JSON.parse(sessionStorage.getItem('activityLog') || '[]');
  log.unshift({
    id: Date.now(),
    userId, role, action, detail,
    time: new Date().toLocaleString()
  });
  if (log.length > 50) log.pop();
  sessionStorage.setItem('activityLog', JSON.stringify(log));
}

function getActivityLog(filterRole) {
  const log = JSON.parse(sessionStorage.getItem('activityLog') || '[]');
  return filterRole ? log.filter(l => l.role === filterRole) : log;
}

// ---- UI HELPERS ----
function getRiskBadge(risk) {
  const cls = { High: 'badge-danger', Medium: 'badge-warning', Low: 'badge-info', 'Very Low': 'badge-success' };
  return `<span class="badge ${cls[risk] || 'badge-secondary'}">${risk} Risk</span>`;
}

function getPredictionBadge(prediction) {
  return prediction === 'FAKE'
    ? `<span class="badge badge-danger">⚠ FAKE</span>`
    : `<span class="badge badge-success">✓ LEGITIMATE</span>`;
}

function getStatusBadge(status) {
  const cls = { Applied: 'badge-info', Reviewed: 'badge-warning', Interview: 'badge-secondary', Hired: 'badge-success', Rejected: 'badge-danger' };
  return `<span class="badge ${cls[status] || 'badge-secondary'}">${status}</span>`;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast toast-${type} show`;
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// Render notification bell with badge
function renderNotifBell(role, containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const count = getUnreadCount(role);
  el.innerHTML = `
    <div style="position:relative;cursor:pointer;" onclick="toggleNotifPanel('${role}')">
      <span style="font-size:20px;">🔔</span>
      ${count > 0 ? `<span style="position:absolute;top:-4px;right:-6px;background:#dc2626;color:white;
        border-radius:50%;width:16px;height:16px;font-size:10px;font-weight:700;
        display:flex;align-items:center;justify-content:center;">${count}</span>` : ''}
    </div>`;
}

function toggleNotifPanel(role) {
  let panel = document.getElementById('notifPanel');
  if (panel) { panel.remove(); return; }
  const notes = getNotifications(role);
  markAllRead(role);
  renderNotifBell(role, 'notifBell');
  panel = document.createElement('div');
  panel.id = 'notifPanel';
  panel.style.cssText = `position:fixed;top:60px;right:20px;width:300px;max-height:400px;overflow-y:auto;
    background:white;border:1px solid #e2e8f0;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,0.12);z-index:300;`;
  panel.innerHTML = `
    <div style="padding:12px 16px;border-bottom:1px solid #f1f5f9;font-weight:600;font-size:14px;display:flex;justify-content:space-between;">
      Notifications <button onclick="document.getElementById('notifPanel').remove()" style="background:none;border:none;cursor:pointer;color:#94a3b8;">✕</button>
    </div>
    ${notes.length === 0
      ? `<div style="padding:24px;text-align:center;color:#94a3b8;font-size:13px;">No notifications</div>`
      : notes.map(n => `
        <div style="padding:10px 16px;border-bottom:1px solid #f8fafc;font-size:13px;">
          <div style="color:${n.type==='danger'?'#dc2626':n.type==='success'?'#16a34a':'#1e293b'}">${n.message}</div>
          <div style="font-size:11px;color:#94a3b8;margin-top:2px;">${n.time}</div>
        </div>`).join('')}`;
  document.body.appendChild(panel);
  document.addEventListener('click', function handler(e) {
    if (!panel.contains(e.target) && !e.target.closest('#notifBell')) {
      panel.remove(); document.removeEventListener('click', handler);
    }
  }, true);
}

// Profile modal
function openProfileModal(user) {
  let modal = document.getElementById('profileModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'profileModal';
    modal.className = 'modal-overlay';
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div class="modal" style="max-width:440px;">
      <div class="modal-header">
        <span class="modal-title">Edit Profile</span>
        <button class="modal-close" onclick="document.getElementById('profileModal').classList.remove('open')">✕</button>
      </div>
      <div class="form-group">
        <label>Full Name</label>
        <input type="text" id="pName" value="${user.name}" style="width:100%;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:14px;">
      </div>
      <div class="form-group">
        <label>Email</label>
        <input type="email" id="pEmail" value="${user.email}" style="width:100%;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:14px;">
      </div>
      ${user.role === 'recruiter' ? `
      <div class="form-group">
        <label>Company</label>
        <input type="text" id="pCompany" value="${user.company || ''}" style="width:100%;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:14px;">
      </div>` : ''}
      <div class="form-group">
        <label>New Password <span style="color:#94a3b8;font-size:12px;">(leave blank to keep current)</span></label>
        <input type="password" id="pPassword" placeholder="New password" style="width:100%;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:14px;">
      </div>
      <div id="profileErr" style="color:#dc2626;font-size:13px;margin-bottom:8px;display:none;"></div>
      <div style="display:flex;gap:10px;margin-top:8px;">
        <button class="btn btn-primary" style="flex:1;" onclick="saveProfile('${user.role}', ${user.id})">Save Changes</button>
        <button class="btn btn-outline" onclick="document.getElementById('profileModal').classList.remove('open')">Cancel</button>
      </div>
    </div>`;
  modal.classList.add('open');

  // Attach live validation after modal renders
  liveValidate(document.getElementById('pName'),  validateName);
  liveValidate(document.getElementById('pEmail'), validateEmail);
  liveValidate(document.getElementById('pPassword'), v => {
    if (!v) return { ok: true };
    return validatePassword(v);
  });
  const pCompany = document.getElementById('pCompany');
  if (pCompany) liveValidate(pCompany, validateCompanyName);
}

function saveProfile(role, userId) {
  const name = document.getElementById('pName').value.trim();
  const email = document.getElementById('pEmail').value.trim();
  const password = document.getElementById('pPassword').value;
  const company = document.getElementById('pCompany')?.value.trim();

  const showErr = (msg) => {
    document.getElementById('profileErr').textContent = msg;
    document.getElementById('profileErr').style.display = 'block';
  };

  const nv = validateName(name);
  if (!nv.ok) return showErr(nv.msg);

  const ev = validateEmail(email);
  if (!ev.ok) return showErr(ev.msg);

  if (password) {
    const pv = validatePassword(password);
    if (!pv.ok) return showErr(pv.msg);
  }

  if (company !== undefined && company.trim()) {
    const cv = validateCompanyName(company);
    if (!cv.ok) return showErr(cv.msg);
  }

  const updates = { name, email };
  if (password) updates.password = password;
  if (company !== undefined) updates.company = company;
  const result = updateProfile(userId, role, updates);
  if (!result.success) {
    document.getElementById('profileErr').textContent = result.message;
    document.getElementById('profileErr').style.display = 'block';
    return;
  }
  document.getElementById('profileModal').classList.remove('open');
  showToast('Profile updated!', 'success');
  const nameEl = document.getElementById('adminName') || document.getElementById('recName') || document.getElementById('seekName');
  const emailEl = document.getElementById('adminEmail') || document.getElementById('recEmail') || document.getElementById('seekEmail');
  const avatarEl = document.getElementById('adminAvatar') || document.getElementById('recAvatar') || document.getElementById('seekAvatar');
  if (nameEl) nameEl.textContent = name;
  if (emailEl) emailEl.textContent = email;
  if (avatarEl) avatarEl.textContent = name[0];
}
