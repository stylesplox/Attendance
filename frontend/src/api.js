const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || body.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function login(password) {
  return request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
}

export async function logout() {
  return request('/auth/logout', { method: 'POST' });
}

export async function checkAuth() {
  return request('/auth/status');
}

export async function getMembers() {
  return request('/members');
}

export async function getAttendance() {
  return request('/attendance');
}

export async function getFellowships() {
  return request('/attendance/fellowships');
}

export async function getNonComplianceTypes() {
  return request('/offenders/types');
}

export async function getOffenders() {
  return request('/offenders');
}

export async function uploadOffenders(file, date, fellowshipId, nonComplianceId) {
  const form = new FormData();
  form.append('file', file);
  form.append('date', date);
  form.append('fellowship_id', fellowshipId);
  form.append('non_compliance_id', nonComplianceId);
  return request('/offenders/upload', { method: 'POST', body: form });
}

export async function uploadAttendance(file, date, fellowshipId) {
  const form = new FormData();
  form.append('file', file);
  form.append('date', date);
  form.append('fellowship_id', fellowshipId);
  return request('/attendance/upload', { method: 'POST', body: form });
}
