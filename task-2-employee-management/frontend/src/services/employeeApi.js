// All communication with the Express REST API lives in this file.

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');

// Error with a message that is safe to show to the user.
//   status       HTTP status, or 0 when the server could not be reached
//   fieldErrors  { field: message } returned by the API for invalid data
export class ApiError extends Error {
  constructor(message, { status = 0, fieldErrors = {} } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

async function request(path, { method = 'GET', body, signal } = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      signal,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError('Could not reach the server. Check that the API is running, then try again.');
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    // The response was not JSON; handled below as a server error.
  }

  if (!response.ok || !payload?.success) {
    throw new ApiError(payload?.message || `The server returned an error (${response.status}).`, {
      status: response.status,
      fieldErrors: payload?.errors || {},
    });
  }
  return payload;
}

export async function getEmployees(signal) {
  const payload = await request('/employees', { signal });
  return payload.data;
}

export async function createEmployee(employee) {
  const payload = await request('/employees', { method: 'POST', body: employee });
  return payload.data;
}

export async function updateEmployee(id, employee) {
  const payload = await request(`/employees/${encodeURIComponent(id)}`, { method: 'PUT', body: employee });
  return payload.data;
}

export async function deleteEmployee(id) {
  const payload = await request(`/employees/${encodeURIComponent(id)}`, { method: 'DELETE' });
  return payload.data;
}
