/**
 * Employee Onboarding API Service
 */

import { OnboardEmployeeRequest, OnboardEmployeeResponse } from '../types/onboarding';
import { API_BASE_URL } from '../apiConfig';

export const onboardEmployeeApi = async (
  data: OnboardEmployeeRequest,
  token: string
): Promise<OnboardEmployeeResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/hr/onboard`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    const responseData: OnboardEmployeeResponse = await response.json();

    if (!response.ok) {
      throw new Error(responseData.message || `HTTP error! status: ${response.status}`);
    }

    return responseData;
  } catch (error) {
    console.error('Onboarding API call failed:', error);
    throw error;
  }
};

export default onboardEmployeeApi;
