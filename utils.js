// ============================================================
// UTILS.JS — Application utilities
// Sorting, filtering, and simple in-memory history/queue helpers.
// No DSA algorithms — pure application logic.
// ============================================================

// ---- SORT: Sort job listings by a field ----
function sortJobs(arr, key) {
  return [...arr].sort((a, b) => {
    const av = String(a[key] || '').toLowerCase();
    const bv = String(b[key] || '').toLowerCase();
    return av < bv ? -1 : av > bv ? 1 : 0;
  });
}

// Keep mergeSort as an alias so existing call sites don't break
function mergeSort(arr, key) { return sortJobs(arr, key); }

// ---- FILTER: Multi-criteria job filter ----
function filterJobs(jobs, filters) {
  return jobs.filter(job => {
    if (filters.employment_type && filters.employment_type !== 'All' &&
        job.employment_type !== filters.employment_type) return false;
    if (filters.required_experience && filters.required_experience !== 'All' &&
        job.required_experience !== filters.required_experience) return false;
    if (filters.telecommuting !== undefined && filters.telecommuting !== 'All' &&
        job.telecommuting !== (filters.telecommuting === 'true')) return false;
    if (filters.fraudulent !== undefined && filters.fraudulent !== 'All' &&
        job.fraudulent !== parseInt(filters.fraudulent)) return false;
    if (filters.query) {
      const q = filters.query.toLowerCase();
      const s = `${job.title} ${job.company} ${job.location} ${job.description}`.toLowerCase();
      if (!s.includes(q)) return false;
    }
    return true;
  });
}

// ---- RECENTLY VIEWED: last 5 jobs (newest first) ----
const recentlyViewed = {
  _items: [],
  push(job) {
    this._items = this._items.filter(j => j.id !== job.id);
    this._items.unshift(job);
    if (this._items.length > 5) this._items.pop();
  },
  getAll() { return [...this._items]; },
};

// ---- APPLICATION HISTORY: ordered list ----
const applicationHistory = {
  _items: [],
  prepend(app) { this._items.unshift(app); },
  getAll()     { return [...this._items]; },
};

// ---- APPLICATION QUEUE: pending submissions ----
const applicationQueue = {
  _items: [],
  enqueue(app) { this._items.push(app); },
  dequeue()    { return this._items.shift(); },
};
