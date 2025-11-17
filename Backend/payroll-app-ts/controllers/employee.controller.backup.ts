// controllers/employee.controller.ts
import { Request, Response } from 'express';
import * as EmployeeService from '../services/employee.service';

// --- Profile Controllers ---

// @desc    Get my complete profile with salary breakdown
// @route   GET /api/employee/profile
// @access  Private (Employee)
export const getMyProfile = async (req: Request, res: Response) => {
  try {
    const profile = await EmployeeService.getMyProfileWithSalary(
      req.user!.employee
    );
    res.status(200).json(profile);
  } catch (error) {
    const message = (error as Error).message;
    res.status(404).json({ message });
  }
};

// @desc    Update my profile (employee-editable fields only)
// @route   PUT /api/employee/profile
// @access  Private (Employee)
export const updateMyProfile = async (req: Request, res: Response) => {
  try {
    const updatedProfile = await EmployeeService.updateMyProfile(
      req.user!.employee,
      req.body
    );
    res.status(200).json(updatedProfile);
  } catch (error) {
    const message = (error as Error).message;
    res.status(400).json({ message });
  }
};

// --- Payslip Controllers ---

// @desc    View all my payslips (can filter by year)
// @route   GET /api/employee/payslips
// @access  Private (Employee)
export const viewMyPayslips = async (req: Request, res: Response) => {
  try {
    const payslips = await EmployeeService.getMyPayslips(
      req.user!.employee,
      req.query
    );
    res.status(200).json(payslips);
  } catch (error) {
    const message = (error as Error).message;
    res.status(404).json({ message });
  }
};

// @desc    Get payslip details with full breakdown (for frontend PDF generation)
// @route   GET /api/employee/payslips/:id/download
// @access  Private (Employee)
export const downloadPayslip = async (req: Request, res: Response) => {
  try {
    const payslipId = req.params.id;
    const payslipData = await EmployeeService.getPayslipDetails(
      req.user!.employee,
      payslipId
    );

    res.status(200).json(payslipData);
  } catch (error) {
    const message = (error as Error).message;
    res.status(404).json({ message });
  }
};

// @desc    View my attendance records (filter by year/month)
// @route   GET /api/employee/attendance
// @access  Private (Employee)
export const viewMyAttendance = async (req: Request, res: Response) => {
  try {
    const attendance = await EmployeeService.getMyAttendance(
      req.user!.employee,
      req.query
    );
    res.status(200).json(attendance);
  } catch (error) {
    const message = (error as Error).message;
    res.status(404).json({ message });
  }
};

// @desc    Download my attendance records as CSV
// @route   GET /api/employee/attendance/download
// @access  Private (Employee)
export const downloadMyAttendance = async (req: Request, res: Response) => {
  try {
    const csv = await EmployeeService.downloadMyAttendance(
      req.user!.employee,
      req.query
    );

    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="attendance.csv"'
    );
    res.status(200).send(csv);
  } catch (error) {
    const message = (error as Error).message;
    res.status(404).json({ message });
  }
};