// validationUtils.ts
import type { OnboardingFormData } from '../types/onboarding';

// Validation patterns and functions
export const validationPatterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[0-9]{10}$/,
  ifsc: /^[A-Z]{4}0[A-Z0-9]{6}$/,
  pan: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
  accountNumber: /^[0-9]{9,18}$/,
};

export interface ValidationError {
  [key: string]: string;
}

export const validateOnboardingForm = (formData: OnboardingFormData): ValidationError => {
  const errors: ValidationError = {};

  // Email validation
  if (!formData.email || !formData.email.trim()) {
    errors.email = 'Email is required';
  } else if (!validationPatterns.email.test(formData.email)) {
    errors.email = 'Please enter a valid email address';
  }

  // Password validation - REMOVED
  // Employee ID validation - REMOVED

  // First Name validation
  if (!formData.firstName || !formData.firstName.trim()) {
    errors.firstName = 'First Name is required';
  }

  // Last Name validation
  if (!formData.lastName || !formData.lastName.trim()) {
    errors.lastName = 'Last Name is required';
  }

  // Personal Email validation
  if (!formData.personalEmail || !formData.personalEmail.trim()) {
    errors.personalEmail = 'Personal Email is required';
  } else if (!validationPatterns.email.test(formData.personalEmail)) {
    errors.personalEmail = 'Please enter a valid email address';
  }

  // Designation validation
  if (!formData.designation || !formData.designation.trim()) {
    errors.designation = 'Designation is required';
  }

  // Department optional (warn if blank but not blocking)
  if (!formData.department || !formData.department.trim()) {
    // Not marking as error – optional per spec
  }

  // Joining Date validation
  if (!formData.joiningDate) {
    errors.joiningDate = 'Joining Date is required';
  }

  // Annual CTC validation
  if (!formData.annualCTC) { // Check for empty string
    errors.annualCTC = 'Annual CTC is required';
  } else if (isNaN(parseInt(formData.annualCTC)) || parseInt(formData.annualCTC) <= 0) {
    errors.annualCTC = 'Annual CTC must be a positive number';
  }

  // Phone validation
  if (!formData.phone || !formData.phone.trim()) {
    errors.phone = 'Phone number is required';
  } else if (!validationPatterns.phone.test(formData.phone.replace(/\s/g, ''))) {
    errors.phone = 'Phone number must be 10 digits';
  }

  // Bank Name validation (required for onboarding initial salary setup)
  if (!formData.bankName || !formData.bankName.trim()) {
    errors.bankName = 'Bank Name is required';
  }

  if (!formData.accountNumber || !formData.accountNumber.trim()) {
    errors.accountNumber = 'Account Number is required';
  } else if (!validationPatterns.accountNumber.test(formData.accountNumber.replace(/\s/g, ''))) {
    errors.accountNumber = 'Account Number must be 9-18 digits';
  }

  // IFSC Code validation
  if (!formData.ifscCode || !formData.ifscCode.trim()) {
    errors.ifscCode = 'IFSC Code is required';
  } else if (!validationPatterns.ifsc.test(formData.ifscCode.toUpperCase())) {
    errors.ifscCode = 'Please enter a valid IFSC Code (e.g., EXAM0001234)';
  }

  // PAN validation
  if (!formData.pan || !formData.pan.trim()) {
    errors.pan = 'PAN is required';
  } else if (!validationPatterns.pan.test(formData.pan.toUpperCase())) {
    errors.pan = 'Please enter a valid PAN (e.g., ABCDE1234F)';
  }

  return errors;
};