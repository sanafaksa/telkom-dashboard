import { apiDelete, apiDownload, apiGet, apiPatch, apiPost, apiPut } from '../../lib/api';

export const adminApi = {
  overview: () => apiGet('/admin/overview'),

  users: (params) => apiGet('/admin/users', params),
  createUser: (body) => apiPost('/admin/users', body),
  updateUser: (id, body) => apiPut(`/admin/users/${id}`, body),
  setUserStatus: (id, isActive) => apiPatch(`/admin/users/${id}/status`, { is_active: isActive }),
  resetPassword: (id, password) => apiPut(`/admin/users/${id}/password`, { password }),
  deleteUser: (id) => apiDelete(`/admin/users/${id}`),

  roles: () => apiGet('/admin/roles'),
  updateRole: (role, permissions) => apiPut(`/admin/roles/${role}`, { permissions }),
  createRole: (body) => apiPost('/admin/roles', body),
  deleteRole: (role) => apiDelete(`/admin/roles/${role}`),
  verifyRolePassword: (password) => apiPost('/admin/roles/verify-password', { password }),

  settings: (group) => apiGet(`/admin/settings/${group}`),
  saveSettings: (group, values) => apiPut(`/admin/settings/${group}`, values),
  testMail: (to) => apiPost('/admin/settings/mail/test', { to }),

  security: () => apiGet('/admin/security/overview'),
  sessions: () => apiGet('/admin/security/sessions'),
  revokeSession: (id) => apiDelete(`/admin/security/sessions/${id}`),

  auditLogs: (params) => apiGet('/audit-logs', params),

  helpRequests: (status) => apiGet('/admin/help-requests', { status }),
  updateHelpRequest: (id, status) => apiPatch(`/admin/help-requests/${id}`, { status }),

  maintenance: () => apiGet('/admin/maintenance'),
  saveMaintenance: (body) => apiPut('/admin/maintenance', body),

  database: () => apiGet('/admin/database'),
  table: (name) => apiGet(`/admin/database/tables/${encodeURIComponent(name)}`),

  apiKeys: () => apiGet('/admin/api-keys'),
  createApiKey: (body) => apiPost('/admin/api-keys', body),
  revokeApiKey: (id) => apiDelete(`/admin/api-keys/${id}`),

  backups: () => apiGet('/admin/backups'),
  createBackup: (note) => apiPost('/admin/backups', { note }),
  downloadBackup: (name) => apiDownload(`/admin/backups/${name}/download`, {}, name),
  restoreBackup: (name, password, confirm) => apiPost(`/admin/backups/${name}/restore`, { password, confirm }),
  deleteBackup: (name) => apiDelete(`/admin/backups/${name}`),

  monitoring: () => apiGet('/admin/monitoring'),

  dev: () => apiGet('/admin/dev'),
  runDev: (action) => apiPost(`/admin/dev/actions/${action}`),

  profile: () => apiGet('/profile'),
  saveProfile: (body) => apiPut('/profile', body),
  changePassword: (body) => apiPut('/profile/password', body),
  revokeMySession: (id) => apiDelete(`/profile/sessions/${id}`),
  revokeOtherSessions: () => apiPost('/profile/sessions/revoke-others'),
};
