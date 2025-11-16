import { API_BASE_URL } from '../apiConfig';

type UploadParams = {
  mode?: 'daily' | 'monthly';
  action?: 'preview' | 'append' | 'overwrite';
  dedupeStrategy?: 'skip' | 'update' | 'error';
  delimiter?: string;
  year?: number;
  month?: number;
};

export const uploadAttendanceFile = async (file: File, token: string, params: UploadParams = {}) => {
  const { mode = 'daily', action = 'preview', dedupeStrategy = 'skip', delimiter, year, month } = params;
  const url = new URL(`${API_BASE_URL}/hr/attendance/upload`);
  url.searchParams.set('mode', mode);
  url.searchParams.set('action', action);
  url.searchParams.set('dedupeStrategy', dedupeStrategy);
  if (delimiter) url.searchParams.set('delimiter', delimiter);
  if (year) url.searchParams.set('year', String(year));
  if (month) url.searchParams.set('month', String(month));

  const fd = new FormData();
  fd.append('payrollFile', file, file.name);

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: fd,
  });

  const data = await res.json().catch(() => ({ message: 'Invalid JSON response' }));
  if (!res.ok) throw new Error(data?.message || `Upload failed: ${res.status}`);
  return data;
};

export default { uploadAttendanceFile };
