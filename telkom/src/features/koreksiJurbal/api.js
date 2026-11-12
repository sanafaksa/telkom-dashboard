import { apiGet, apiPost } from '../../lib/api';

export const koreksiJurbalApi = {
  uploads: () => apiGet('/koreksi-jurbal/uploads'),

  summary: () => apiGet('/koreksi-jurbal/summary'),

  upload: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return apiPost('/koreksi-jurbal/uploads', fd);
  },
};
