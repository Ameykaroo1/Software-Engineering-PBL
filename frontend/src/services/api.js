const API_BASE = '/api';

class ApiClient {
  /**
   * Helper to parse CSRF double-submit token from non-httpOnly cookie
   */
  static getCsrfToken() {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(new RegExp('(^|;\\s*)medicore_csrf=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  }

  // Token is managed strictly via secure HTTP-only cookies; stubs kept for interface stability
  static getToken() {
    return null;
  }

  static setToken(_token) {
    // No-op: localStorage token storage eliminated for security
    localStorage.removeItem('medicore_token');
  }

  static async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    // Attach CSRF token on state-changing requests when present
    const method = (options.method || 'GET').toUpperCase();
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      const csrfToken = this.getCsrfToken();
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
      }
    }

    const config = {
      ...options,
      headers,
      credentials: 'include' // Transmit HTTP-only secure cookies with every request
    };

    if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
      config.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, config);

      if (response.status === 204) {
        return null;
      }

      // Handle file download e.g. CSV export
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/csv')) {
        const blob = await response.blob();
        return blob;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Request failed with status ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error.message);
      throw error;
    }
  }

  static buildQuery(params = {}) {
    const clean = {};
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '' && v !== 'undefined' && v !== 'null') {
        clean[k] = v;
      }
    }
    const q = new URLSearchParams(clean).toString();
    return q ? `?${q}` : '';
  }

  // Auth
  static login(credentials) {
    return this.request('/auth/login', { method: 'POST', body: credentials });
  }

  static logout() {
    return this.request('/auth/logout', { method: 'POST' });
  }

  static getMe() {
    return this.request('/auth/me');
  }

  // Resources
  static getResources(params = {}) {
    return this.request(`/resources${this.buildQuery(params)}`);
  }

  static getResourceById(id) {
    return this.request(`/resources/${id}`);
  }

  static createResource(data) {
    return this.request('/resources', { method: 'POST', body: data });
  }

  static updateResource(id, data) {
    return this.request(`/resources/${id}`, { method: 'PUT', body: data });
  }

  static updateResourceStatus(id, { status, reason }) {
    return this.request(`/resources/${id}/status`, { method: 'PATCH', body: { status, reason } });
  }

  static retireResource(id, reason) {
    return this.request(`/resources/${id}/retire`, { method: 'POST', body: { reason } });
  }

  static getAvailabilitySummary(departmentID = null) {
    const q = departmentID && departmentID !== 'undefined' ? `?departmentID=${departmentID}` : '';
    return this.request(`/resources/availability${q}`);
  }

  // Allocations
  static getAllocations(params = {}) {
    return this.request(`/allocations${this.buildQuery(params)}`);
  }

  static getAllocationById(id) {
    return this.request(`/allocations/${id}`);
  }

  static createAllocation(data) {
    return this.request('/allocations', { method: 'POST', body: data });
  }

  static releaseAllocation(id, data) {
    return this.request(`/allocations/${id}/release`, { method: 'POST', body: data });
  }

  // Ambulance
  static getAmbulanceFleet() {
    return this.request('/ambulances/available');
  }

  static allocateEmergencyAmbulance(id, data) {
    return this.request(`/ambulances/${id}/allocate`, { method: 'POST', body: data });
  }

  // Reports
  static getUtilizationReport(params = {}) {
    return this.request(`/reports/utilization${this.buildQuery(params)}`);
  }

  static getAllocationsReport(params = {}) {
    return this.request(`/reports/allocations${this.buildQuery(params)}`);
  }

  static async exportCSV(params = {}) {
    const blob = await this.request(`/reports/export${this.buildQuery(params)}`);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medicore-hospital-report-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  static getReportSnapshots(params = {}) {
    return this.request(`/reports/snapshots${this.buildQuery(params)}`);
  }

  static saveReportSnapshot(data) {
    return this.request('/reports/snapshot', { method: 'POST', body: data });
  }

  // Users
  static getUsers(params = {}) {
    return this.request(`/users${this.buildQuery(params)}`);
  }

  static getUserById(id) {
    return this.request(`/users/${id}`);
  }

  static createUser(data) {
    return this.request('/users', { method: 'POST', body: data });
  }

  static updateUser(id, data) {
    return this.request(`/users/${id}`, { method: 'PUT', body: data });
  }

  static toggleUserStatus(id, isActive) {
    return this.request(`/users/${id}/status`, { method: 'PATCH', body: { isActive } });
  }

  static resetUserPassword(id, newPassword) {
    return this.request(`/users/${id}/reset-password`, { method: 'POST', body: { newPassword } });
  }

  // Departments
  static getDepartments() {
    return this.request('/departments');
  }

  static createDepartment(data) {
    return this.request('/departments', { method: 'POST', body: data });
  }

  // Audit Logs
  static getAuditLogs(params = {}) {
    return this.request(`/audit-logs${this.buildQuery(params)}`);
  }
}

export default ApiClient;
