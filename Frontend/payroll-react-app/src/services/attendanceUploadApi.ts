/**
 * Attendance Upload API Service
 * Handles bulk CSV upload for daily and monthly attendance records
 * 
 * Backend Spec: POST /api/hr/attendance/upload
 * Field Name: 'payrollFile' (CRITICAL - do not change)
 * Auto-detection: Supported (based on CSV headers)
 */

import { API_BASE_URL } from '../apiConfig';

/**
 * Upload parameters for attendance file upload
 */
export interface AttendanceUploadParams {
  /** Upload mode - auto-detected if omitted */
  mode?: 'daily' | 'monthly';
  /** Action to perform - defaults to preview for safety */
  action?: 'preview' | 'append' | 'overwrite';
  /** How to handle duplicate records - defaults to skip */
  dedupeStrategy?: 'skip' | 'update' | 'error';
  /** CSV delimiter character - defaults to comma */
  delimiter?: string;
  /** Year filter (optional, used with monthly mode) */
  year?: number;
  /** Month filter (optional, used with monthly mode) */
  month?: number;
}

/**
 * Backend response format for attendance upload
 * Spec compliant with documented API response structure
 */
export interface AttendanceUploadResponse {
  /** Response message */
  message: string;
  /** Detected or specified mode */
  mode: 'daily' | 'monthly';
  /** Action that was performed */
  action: 'preview' | 'append' | 'overwrite';
  /** Total rows processed from CSV */
  processed: number;
  /** Successfully validated/saved rows */
  success: number;
  /** Failed validation/save rows */
  failed: number;
  /** Skipped duplicate rows (when dedupeStrategy=skip) */
  skipped?: number;
  /** Array of error messages with row numbers */
  errors?: string[];
}

/**
 * Upload attendance CSV file to backend
 * 
 * @param file - CSV file object to upload
 * @param token - JWT authentication token
 * @param params - Upload parameters (mode, action, dedupeStrategy, etc.)
 * @returns Promise resolving to upload response
 * @throws Error if upload fails or backend returns error
 * 
 * @example
 * ```typescript
 * const response = await uploadAttendanceCSV(file, token, {
 *   mode: 'daily',
 *   action: 'preview',
 *   dedupeStrategy: 'skip'
 * });
 * 
 * if (response.failed > 0) {
 *   console.error('Errors:', response.errors);
 * }
 * ```
 */
export const uploadAttendanceCSV = async (
  file: File,
  token: string,
  params: AttendanceUploadParams = {}
): Promise<AttendanceUploadResponse> => {
  // Extract parameters with defaults per backend spec
  const {
    mode,                           // Auto-detect if not provided
    action = 'preview',             // Safe default - no DB writes
    dedupeStrategy = 'skip',        // Safe default - skip duplicates
    delimiter = ',',                // Standard CSV delimiter
    year,
    month
  } = params;

  // Validate inputs
  if (!file) {
    throw new Error('File is required');
  }

  if (!token) {
    throw new Error('Authentication token is required');
  }

  // Build API URL with query parameters
  const url = new URL(`${API_BASE_URL}/api/hr/attendance/upload`);

  // Only add mode if explicitly specified (allow backend auto-detection)
  if (mode) {
    url.searchParams.set('mode', mode);
  }

  // Always send action and dedupeStrategy
  url.searchParams.set('action', action);
  url.searchParams.set('dedupeStrategy', dedupeStrategy);

  // Only send delimiter if non-default
  if (delimiter !== ',') {
    url.searchParams.set('delimiter', delimiter);
  }

  // Add year/month filters if provided
  if (year !== undefined) {
    url.searchParams.set('year', String(year));
  }

  if (month !== undefined) {
    url.searchParams.set('month', String(month));
  }

  // Create FormData with EXACT field name from backend spec
  const formData = new FormData();
  formData.append('payrollFile', file, file.name);

  try {
    // Make API request
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
        // IMPORTANT: Do NOT set Content-Type header
        // Browser automatically sets multipart/form-data with boundary
      },
      body: formData
    });

    // Parse JSON response
    let data: any;
    try {
      data = await response.json();
    } catch (parseError) {
      throw new Error('Invalid JSON response from server');
    }

    // Handle HTTP error responses
    if (!response.ok) {
      const errorMessage = data?.message || `Upload failed with status ${response.status}`;
      throw new Error(errorMessage);
    }

    // Return typed response
    return data as AttendanceUploadResponse;

  } catch (error: any) {
    // Log error details for debugging
    console.error('[AttendanceUploadAPI] Upload failed:', {
      error: error.message,
      url: url.toString(),
      fileName: file.name,
      fileSize: file.size,
      params
    });

    // Provide user-friendly error messages
    if (error.message === 'Failed to fetch') {
      throw new Error(
        `Cannot connect to server at ${API_BASE_URL}. ` +
        'Please ensure the backend is running and accessible.'
      );
    }

    // Re-throw with original message
    throw error;
  }
};

/**
 * Legacy export for backward compatibility
 * @deprecated Use uploadAttendanceCSV instead
 */
export const uploadAttendanceFile = uploadAttendanceCSV;

export default {
  uploadAttendanceCSV,
  uploadAttendanceFile // Legacy
};
