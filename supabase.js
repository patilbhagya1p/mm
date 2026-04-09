// ============================================================
// SUPABASE.JS — Database & Auth connection
// Project: https://sbbxzhfwmhftaxfzbacy.supabase.co
// ============================================================

const SUPABASE_URL = 'https://sbbxzhfwmhftaxfzbacy.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNiYnh6aGZ3bWhmdGF4ZnpiYWN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MTA2MDQsImV4cCI6MjA5MTI4NjYwNH0.XgzyJQeONrl0GAGwfEZh48uYzx5DF4dGfYzZR9PI0Qk';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ── AUTH ──────────────────────────────────────────────────────────────────────

async function sbRegister(name, email, password, role, company) {
  const { data, error } = await db.auth.signUp({ email, password });
  if (error) return { success: false, message: error.message };
  const { error: pe } = await db.from('profiles').insert({
    id: data.user.id, name, role, company: company || null
  });
  if (pe) return { success: false, message: pe.message };
  return { success: true, user: { id: data.user.id, email, name, role, company } };
}

async function sbLogin(email, password) {
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.message.includes('Email not confirmed')) {
      return { success: false, message: 'Please confirm your email first, or ask admin to confirm your account.' };
    }
    return { success: false, message: 'Invalid email or password.' };
  }
  const { data: profile } = await db.from('profiles')
    .select('*').eq('id', data.user.id).single();
  if (!profile) return { success: false, message: 'Account setup incomplete. Please register again.' };
  const user = { id: data.user.id, email: data.user.email, ...profile };
  sessionStorage.setItem('currentUser', JSON.stringify(user));
  return { success: true, user };
}

async function sbLogout() {
  await db.auth.signOut();
  sessionStorage.removeItem('currentUser');
  window.location.href = 'index.html';
}

async function sbGetCurrentUser() {
  const stored = sessionStorage.getItem('currentUser');
  if (stored) return JSON.parse(stored);
  const { data: { user } } = await db.auth.getUser();
  if (!user) return null;
  const { data: profile } = await db.from('profiles').select('*').eq('id', user.id).single();
  return profile ? { id: user.id, email: user.email, ...profile } : null;
}

async function sbUpdateProfile(userId, updates) {
  const { error } = await db.from('profiles').update(updates).eq('id', userId);
  if (error) return { success: false, message: error.message };
  if (updates.password) {
    const { error: pe } = await db.auth.updateUser({ password: updates.password });
    if (pe) return { success: false, message: pe.message };
  }
  const stored = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
  sessionStorage.setItem('currentUser', JSON.stringify({ ...stored, ...updates }));
  return { success: true };
}

async function sbResetPassword(email) {
  const { error } = await db.auth.resetPasswordForEmail(email);
  if (error) return { success: false, message: error.message };
  return { success: true };
}

// ── JOBS ──────────────────────────────────────────────────────────────────────

async function sbGetAllJobs() {
  const { data, error } = await db.from('jobs')
    .select('*').order('date_posted', { ascending: false });
  return error ? [] : data;
}

async function sbGetMyJobs(recruiterId) {
  const { data, error } = await db.from('jobs')
    .select('*').eq('recruiter_id', recruiterId)
    .order('date_posted', { ascending: false });
  return error ? [] : data;
}

async function sbAddJob(job) {
  const rf = detectFakeJob(job);
  const { data, error } = await db.from('jobs').insert({
    ...job,
    rf_score:      rf.score,
    rf_prediction: rf.prediction,
    rf_risk:       rf.risk,
  }).select().single();
  if (error) return { success: false, message: error.message };
  await sbLog(job.recruiter_id, 'recruiter', 'job_post', 'Posted: ' + job.title);
  return { success: true, job: data };
}

async function sbDeleteJob(id, userId, role) {
  const { error } = await db.from('jobs').delete().eq('id', id);
  if (error) return { success: false, message: error.message };
  await sbLog(userId, role, 'job_delete', 'Deleted job #' + id);
  return { success: true };
}

async function sbFlagJob(id, flagValue, userId) {
  const { error } = await db.from('jobs').update({ fraudulent: flagValue }).eq('id', id);
  if (error) return { success: false, message: error.message };
  await sbLog(userId, 'admin', 'job_flag', (flagValue ? 'Flagged' : 'Unflagged') + ' job #' + id);
  return { success: true };
}

// ── APPLICATIONS ──────────────────────────────────────────────────────────────

async function sbGetUserApplications(userId) {
  const { data, error } = await db.from('applications')
    .select('*').eq('user_id', userId).order('created_at', { ascending: false });
  return error ? [] : data;
}

async function sbApplyToJob(jobId, userId, jobTitle, company) {
  const { data: existing } = await db.from('applications')
    .select('id').eq('job_id', jobId).eq('user_id', userId).single();
  if (existing) return { success: false, message: 'Already applied to this job.' };
  const { data, error } = await db.from('applications')
    .insert({ job_id: jobId, user_id: userId, job_title: jobTitle, company })
    .select().single();
  if (error) return { success: false, message: error.message };
  await sbLog(userId, 'jobseeker', 'apply', 'Applied to: ' + jobTitle);
  return { success: true, application: data };
}

// ── ACTIVITY LOG ──────────────────────────────────────────────────────────────

async function sbLog(userId, role, action, detail) {
  await db.from('activity_log').insert({ user_id: userId, role, action, detail });
}

async function sbGetActivityLog(filterRole) {
  let query = db.from('activity_log')
    .select('*').order('created_at', { ascending: false }).limit(50);
  if (filterRole) query = query.eq('role', filterRole);
  const { data } = await query;
  return data || [];
}

// ── USERS (admin) ─────────────────────────────────────────────────────────────

async function sbGetAllUsers(role) {
  const { data } = await db.from('profiles').select('*').eq('role', role);
  return data || [];
}
