// scripts/seed.ts
import fetch from 'node-fetch';
import { faker } from '@faker-js/faker';
import type { OnboardEmployeeRequest } from '../src/types/onboarding';

// --- CONFIGURATION ---
// IMPORTANT: Replace this with a valid HR Admin JWT token
const HR_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MWExMDBhNjBkNDk1ZmU1ZjFmZDZjNSIsInJvbGUiOiJociIsImlhdCI6MTc2MzMxNjEzMiwiZXhwIjoxNzYzNDAyNTMyfQ.M1JCzN6nqUB7RpTbA3xdjHr-Mb8hOqarpiKs-u1i7Sc';
const API_BASE_URL = 'http://localhost:5000'; 
const NUMBER_OF_EMPLOYEES = 25;

// --- HELPER FUNCTIONS ---

// This mirrors the logic from the frontend to distribute CTC
const distributeCTC = (annualCTC: number) => {
  const monthlyGross = annualCTC / 12;
  const basic = Math.round(monthlyGross * 0.50);
  const hra = Math.round(monthlyGross * 0.20);
  const allowance = Math.round(monthlyGross * 0.18);
  const employerPF = Math.round(monthlyGross * 0.12);
  const pf = Math.round(basic * 0.12);
  const insurance = Math.round(basic * 0.01);
  const profTax = 200;

  return {
    earnings: [
      { name: 'Basic Salary', amount: basic },
      { name: 'HRA', amount: hra },
      { name: 'Allowance', amount: allowance },
    ],
    deductions: [
      { name: 'Provident Fund', amount: pf },
      { name: 'Insurance', amount: insurance },
      { name: 'Professional Tax', amount: profTax },
    ],
    employerContributions: [
      { name: 'Employer PF', amount: employerPF },
    ],
  };
};

// Generates a valid-looking PAN number
const generatePAN = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const nums = '0123456789';
    let pan = '';
    for (let i = 0; i < 5; i++) pan += chars.charAt(Math.floor(Math.random() * chars.length));
    for (let i = 0; i < 4; i++) pan += nums.charAt(Math.floor(Math.random() * nums.length));
    pan += chars.charAt(Math.floor(Math.random() * chars.length));
    return pan;
};

// Generates a valid-looking IFSC code
const generateIFSC = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let ifsc = '';
    for (let i = 0; i < 4; i++) ifsc += chars.charAt(Math.floor(Math.random() * chars.length));
    ifsc += '0';
    for (let i = 0; i < 6; i++) ifsc += (Math.random() > 0.5 ? chars.charAt(Math.floor(Math.random() * chars.length)) : Math.floor(Math.random() * 10));
    return ifsc.toUpperCase();
}

// --- DATA GENERATION ---
const createRandomEmployee = (): OnboardEmployeeRequest => {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const annualCTC = faker.number.int({ min: 400000, max: 2500000 });
  const salaryComponents = distributeCTC(annualCTC);

  const email = `${firstName.toLowerCase().replace(/[^a-z0-9]/g, '')}${lastName.toLowerCase().replace(/[^a-z0-9]/g, '')}@employee.com`;

  return {
    email,
    firstName,
    lastName,
    designation: faker.person.jobTitle(),
    joiningDate: faker.date.past({ years: 5 }).toISOString(),
    annualCTC,
    personalEmail: faker.internet.email({ firstName, lastName }),
    department: faker.commerce.department(),
    phone: faker.phone.number().replace(/\D/g, '').slice(0, 10),
    bankDetails: {
      bankName: `${faker.company.name()} Bank`,
      accountNumber: faker.finance.accountNumber(12),
      ifscCode: generateIFSC(),
    },
    taxInfo: {
      pan: generatePAN(),
    },
    // Explicitly include salary structure (same as frontend)
    earnings: salaryComponents.earnings,
    deductions: salaryComponents.deductions,
    employerContributions: salaryComponents.employerContributions,
  };
};

// --- API CALL ---
const onboardEmployee = async (employeeData: OnboardEmployeeRequest) => {
  try {
    // Log the payload to verify salary structure is included
    console.log(`📝 Onboarding ${employeeData.firstName} ${employeeData.lastName}...`);
    console.log(`   CTC: ₹${employeeData.annualCTC.toLocaleString()}`);
    console.log(`   Earnings: ${employeeData.earnings.length} components`);
    console.log(`   Deductions: ${employeeData.deductions.length} components`);
    console.log(`   Employer Contributions: ${employeeData.employerContributions.length} components`);
    
    const response = await fetch(`${API_BASE_URL}/api/hr/onboard`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HR_TOKEN}`,
      },
      body: JSON.stringify(employeeData),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error(`❌ Failed to onboard ${employeeData.firstName} ${employeeData.lastName}:`, responseData.message || `HTTP ${response.status}`);
      console.error(`   Error details:`, JSON.stringify(responseData, null, 2));
      return;
    }
    
    console.log(`✅ Successfully onboarded ${responseData.data.employee.employeeId} - ${employeeData.firstName} ${employeeData.lastName}`);

  } catch (error) {
    console.error(`❌ Network or script error for ${employeeData.firstName}:`, error);
  }
};

// --- MAIN EXECUTION ---
const seedDatabase = async () => {
  console.log(`🚀 Starting to onboard ${NUMBER_OF_EMPLOYEES} employees...`);
  console.log('--------------------------------------------------');

  if (!HR_TOKEN || HR_TOKEN.includes('placeholder')) {
      console.error('🛑 ERROR: Please replace the placeholder HR_TOKEN in scripts/seed.ts with a valid JWT token.');
      return;
  }

  for (let i = 0; i < NUMBER_OF_EMPLOYEES; i++) {
    const employee = createRandomEmployee();
    await onboardEmployee(employee);
    // Add a small delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log('--------------------------------------------------');
  console.log('🎉 Seeding complete!');
};

seedDatabase();

//npx ts-node scripts/seed.ts