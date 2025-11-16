// controllers/employee.controller.ts
import { Request, Response } from 'express';
import * as EmployeeService from '../services/employee.service';

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

// @desc    Download a specific payslip
// @route   GET /api/employee/payslips/:id/download
// @access  Private (Employee)
export const downloadPayslip = async (req: Request, res: Response) => {
  try {
    const payslipId = req.params.id;
    const doc = await EmployeeService.downloadPayslip(
      req.user!.employee,
      payslipId
    );

    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="payslip-${payslipId}.pdf"`
    );

    // Pipe the PDF to the response
    doc.pipe(res);
    doc.end();
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