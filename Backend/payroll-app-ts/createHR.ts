// createHR.ts
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from './config/db'; // Your DB connection
import User from './models/user.model';
import Employee from './models/employee.model';

// Load .env config
dotenv.config();

const createAdminUser = async (): Promise<void> => {
  console.log('Connecting to database...');
  await connectDB();

  try {
    // --- !! CUSTOMIZE YOUR HR ADMIN DETAILS HERE !! ---
    const adminEmail = 'ashwinjenu2002@gmail.com';
    const adminPassword = '123456';
    const adminEmployeeId = 'HR001';

    // Check if user already exists
    const userExists = await User.findOne({ email: adminEmail });
    if (userExists) {
      throw new Error('User with this email already exists.');
    }

    // Check if employee ID already exists
    const employeeExists = await Employee.findOne({
      employeeId: adminEmployeeId,
    });
    if (employeeExists) {
      throw new Error('Employee with this ID already exists.');
    }

    console.log('Creating HR employee profile...');

    // Step 1: Create the Employee profile (required by your User schema)
    const hrEmployee = new Employee({
      employeeId: adminEmployeeId,
      firstName: 'Admin',
      lastName: 'User',
      personalEmail: adminEmail,
      designation: 'HR Manager',
      joiningDate: new Date(),
    });

    await hrEmployee.save();
    console.log('Employee profile created.');

    console.log('Creating HR user account...');

    // Step 2: Create the User (login) and link it
    const hrUser = new User({
      email: adminEmail,
      password: adminPassword, // Will be hashed by your model's 'pre' hook
      role: 'hr', // Set the role to 'hr'
      employee: hrEmployee._id, // Link to the new employee profile
    });

    await hrUser.save();

    console.log('--- 🚀 HR Admin User Created Successfully! ---');
    console.log(`Email: ${hrUser.email}`);
    console.log(`Password: ${adminPassword}`);
    console.log('You can now log in and use the HR API.');
  } catch (error) {
    const message = (error as Error).message;
    console.error('Error creating HR user:', message);
  } finally {
    await mongoose.disconnect();
    console.log('Database disconnected.');
  }
};

// Run the script
createAdminUser();


// npx ts-node createHR.ts