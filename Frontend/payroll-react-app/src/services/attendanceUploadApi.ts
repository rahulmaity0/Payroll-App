import { API_BASE_URL } from '../apiConfig';

type UploadParams = {
  mode?: 'daily' | 'monthly';
  action?: 'preview' | 'append' | 'overwrite';
  dedupeStrategy?: 'skip' | 'update' | 'error';
  delimiter?: string;
  year?: number;
  month?: number;
};

export interface UploadResponse {
  message: string;
  mode: 'daily' | 'monthly';
  action: 'preview' | 'append' | 'overwrite';
  processed: number;
  successCount: number;
  failureCount: number;
  skippedCount?: number;
  errors?: Array<{
    row: number;
    employeeId?: string;
    date?: string;
    error: string;
  }>;
  issues?: any[];
}

export const uploadAttendanceFile = async (
  file: File, 
  token: string, 
  params: UploadParams = {}
): Promise<UploadResponse> => {
  const { mode, action = 'preview', dedupeStrategy = 'skip', delimiter = ',', year, month } = params;
  
  // Build URL with query parameters
  const url = new URL(`${API_BASE_URL}/hr/attendance/upload`);
  
  // Only set mode if explicitly provided (allow auto-detection)
  if (mode) url.searchParams.set('mode', mode);
  
  url.searchParams.set('action', action);
  url.searchParams.set('dedupeStrategy', dedupeStrategy);
  
  if (delimiter !== ',') url.searchParams.set('delimiter', delimiter);
  if (year) url.searchParams.set('year', String(year));
  if (month) url.searchParams.set('month', String(month));

  // Create FormData with correct field name 'payrollFile' as per backend spec
  const formData = new FormData();
  formData.append('payrollFile', file, file.name);

  try {
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        // Don't set Content-Type - browser will set it with boundary for multipart/form-data
      },
      body: formData,
    });

    // Parse JSON response
    const data = await response.json().catch(() => ({ 
      message: 'Invalid JSON response from server' 
    }));

    // Handle error responses
    if (!response.ok) {
      throw new Error(data?.message || `Upload failed with status ${response.status}`);
    }

    return data as UploadResponse;
  } catch (error) {
    console.error('[AttendanceUploadAPI] Error:', error);
    throw error;
  }
};

export default { uploadAttendanceFile };
