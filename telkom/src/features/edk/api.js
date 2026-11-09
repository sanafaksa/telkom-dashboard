import { apiDownload, apiGet, apiPost } from '../../lib/api';

export const edkApi = {
  populations: () => apiGet('/edk/populations'),

  uploads: () => apiGet('/edk/uploads'),

  upload: (file, reportDate) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('report_date', reportDate);
    return apiPost('/edk/uploads', fd);
  },

  activate: (id) => apiPost(`/edk/uploads/${id}/activate`),

  summary: (by, filters) => apiGet(`/edk/summary/${by}`, filters),

  cards: (filters) => apiGet('/edk/cards', filters),

  options: (uploadId) => apiGet('/edk/options', { upload_id: uploadId }),

  topCustomers: (filters, { limit = 10, sort = 'abonemen_desc' } = {}) =>
    apiGet('/edk/top-customers', { ...filters, limit, sort }),

  customerDetails: (filters, customerKey) =>
    apiGet('/edk/top-customers/detail', { ...filters, customer_key: customerKey }),

  exportFile: (filters, by, format = 'xlsx') =>
    apiDownload('/edk/export', { ...filters, by, format }, `EDK_Monitoring_${by}.${format}`),

  template: () => apiDownload(
    '/edk/template',
    {},
    'Template_Import_EDK_Monitoring_SOLO_JT_Okt2026_9kolom.xlsx'
  ),

  auditLogs: (page = 1) => apiGet('/audit-logs', { page }),
};
