# Backend Requirements - Daily Attendance System

## 🎯 EXECUTIVE SUMMARY

The frontend attendance module has been redesigned from **monthly aggregates** to **daily records** for better UX. HR can now click calendar dates to mark attendance instead of filling forms.

**Backend Impact**: 4 new endpoints + 1 new database collection required.

---

## 📊 SYSTEM OVERVIEW

### What Changed
- **Before**: 1 record per employee per month (e.g., "Employee worked 20/22 days in November")
- **After**: 1 record per employee per date (e.g., "Employee was Present on 2025-11-17")

### Why Changed
- **UX**: Click-to-mark calendar interface is more intuitive than bulk forms
- **Granularity**: Better audit trail and flexibility
- **Accuracy**: Mark attendance as it happens, not end-of-month

### User Workflow
1. HR clicks calendar date
2. Selects status from menu (Present/Absent/Leave/etc.)
3. Backend saves individual day record
4. Calendar updates with color-coded event

---

## 🔴 REQUIRED: NEW API ENDPOINTS

### 1. Get Daily Attendance Records
```
GET /api/hr/employees/:employeeId/attendance/daily
```

**Query Parameters**:
- `year` (optional): Filter by year (e.g., 2025)
- `month` (optional): Filter by month (1-12)

**Example Request**:
```
GET /api/hr/employees/507f1f77bcf86cd799439012/attendance/daily?year=2025&month=11
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
[
  {
    "_id": "673abc123def456789012345",
    "employee": "507f1f77bcf86cd799439012",
    "date": "2025-11-17",
    "status": "P",
    "checkIn": "09:00",
    "checkOut": "18:00",
    "hoursWorked": 8,
    "overtimeHours": 0,
    "notes": "Regular shift",
    "createdAt": "2025-11-17T09:05:00.000Z",
    "updatedAt": "2025-11-17T09:05:00.000Z"
  },
  {
    "_id": "673abc123def456789012346",
    "employee": "507f1f77bcf86cd799439012",
    "date": "2025-11-18",
    "status": "PL",
    "notes": "Sick leave",
    "createdAt": "2025-11-18T08:30:00.000Z",
    "updatedAt": "2025-11-18T08:30:00.000Z"
  }
]
```

**Authentication**: HR role required

**Error Responses**:
- `401`: Unauthorized (invalid/missing token)
- `403`: Forbidden (not HR role)
- `404`: Employee not found

---

### 2. Create/Update Daily Attendance (UPSERT)
```
POST /api/hr/attendance/daily
```

**Purpose**: Create new record OR update existing if same employee+date already exists.

**Request Body**:
```json
{
  "employee": "507f1f77bcf86cd799439012",
  "date": "2025-11-17",
  "status": "P",
  "checkIn": "09:00",
  "checkOut": "18:00",
  "hoursWorked": 8,
  "overtimeHours": 0,
  "notes": "Regular shift"
}
```

**Required Fields**:
- `employee` (string): Employee MongoDB ObjectId
- `date` (string): Date in YYYY-MM-DD format
- `status` (string): One of: `P`, `A`, `LOP`, `PL`, `H`, `WO`

**Optional Fields**:
- `checkIn` (string): Check-in time in HH:mm format (24-hour)
- `checkOut` (string): Check-out time in HH:mm format (24-hour)
- `hoursWorked` (number): Total hours worked (decimal)
- `overtimeHours` (number): Overtime hours (decimal)
- `notes` (string): Free text notes

**Response** (201 Created or 200 OK):
```json
{
  "_id": "673abc123def456789012345",
  "employee": "507f1f77bcf86cd799439012",
  "date": "2025-11-17",
  "status": "P",
  "checkIn": "09:00",
  "checkOut": "18:00",
  "hoursWorked": 8,
  "overtimeHours": 0,
  "notes": "Regular shift",
  "createdAt": "2025-11-17T09:05:00.000Z",
  "updatedAt": "2025-11-17T09:05:00.000Z"
}
```

**Implementation Note**: Use `findOneAndUpdate()` with `upsert: true` option to handle both create and update in single operation.

**Error Responses**:
- `400`: Invalid data (e.g., invalid status, invalid date format)
- `401`: Unauthorized
- `403`: Forbidden (not HR role)
- `404`: Employee not found

---

### 3. Update Daily Attendance (Optional)
```
PUT /api/hr/attendance/daily/:recordId
```

**Note**: This endpoint is optional if using UPSERT in POST endpoint.

**Purpose**: Update specific fields of existing record.

**Request Body** (all fields optional):
```json
{
  "status": "PL",
  "notes": "Approved sick leave"
}
```

**Response** (200 OK):
```json
{
  "_id": "673abc123def456789012345",
  "employee": "507f1f77bcf86cd799439012",
  "date": "2025-11-17",
  "status": "PL",
  "notes": "Approved sick leave",
  "updatedAt": "2025-11-17T11:00:00.000Z"
}
```

**Error Responses**:
- `400`: Invalid data
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Record not found

---

### 4. Delete Daily Attendance
```
DELETE /api/hr/attendance/daily/:recordId
```

**Purpose**: Delete a specific daily attendance record.

**Example Request**:
```
DELETE /api/hr/attendance/daily/673abc123def456789012345
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
{
  "message": "Daily attendance record deleted successfully"
}
```

**Error Responses**:
- `401`: Unauthorized
- `403`: Forbidden (not HR role)
- `404`: Record not found

---

## 🗄️ DATABASE SCHEMA

### New Collection: `DailyAttendance`

**Schema Definition** (Mongoose):
```javascript
const dailyAttendanceSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: String,  // Store as YYYY-MM-DD for easy querying/indexing
    required: true,
    validate: {
      validator: function(v) {
        return /^\d{4}-\d{2}-\d{2}$/.test(v);
      },
      message: 'Date must be in YYYY-MM-DD format'
    }
  },
  status: {
    type: String,
    enum: ['P', 'A', 'LOP', 'PL', 'H', 'WO'],
    required: true,
    default: 'P'
  },
  checkIn: {
    type: String,  // HH:mm format
    validate: {
      validator: function(v) {
        return !v || /^\d{2}:\d{2}$/.test(v);
      },
      message: 'Check-in time must be in HH:mm format'
    }
  },
  checkOut: {
    type: String,  // HH:mm format
    validate: {
      validator: function(v) {
        return !v || /^\d{2}:\d{2}$/.test(v);
      },
      message: 'Check-out time must be in HH:mm format'
    }
  },
  hoursWorked: {
    type: Number,
    min: 0,
    max: 24
  },
  overtimeHours: {
    type: Number,
    min: 0,
    default: 0
  },
  notes: {
    type: String,
    maxlength: 500
  }
}, { 
  timestamps: true 
});

// CRITICAL: Unique index to prevent duplicate records for same employee+date
dailyAttendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

// Index for fast range queries
dailyAttendanceSchema.index({ employee: 1, date: 1 });

module.exports = mongoose.model('DailyAttendance', dailyAttendanceSchema);
```

### Status Code Meanings

| Code | Label | Description |
|------|-------|-------------|
| `P` | Present | Employee was present and worked |
| `A` | Absent | Employee was absent without leave |
| `LOP` | Leave Without Pay | Unpaid leave/absence |
| `PL` | Paid Leave | Vacation, sick leave, or other paid time off |
| `H` | Holiday | Company/public holiday |
| `WO` | Week Off | Regular weekly off day |

---

## 🔧 IMPLEMENTATION GUIDE

### Controller Example (Node.js/Express)

```javascript
const DailyAttendance = require('../models/DailyAttendance');

// GET daily attendance
exports.getDailyAttendance = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { year, month } = req.query;
    
    // Build query
    let query = { employee: employeeId };
    
    // Add date range filter if year/month provided
    if (year && month) {
      const monthStr = String(month).padStart(2, '0');
      const startDate = `${year}-${monthStr}-01`;
      const endDate = `${year}-${monthStr}-31`;
      query.date = { $gte: startDate, $lte: endDate };
    } else if (year) {
      query.date = { $gte: `${year}-01-01`, $lte: `${year}-12-31` };
    }
    
    const records = await DailyAttendance.find(query).sort({ date: 1 });
    res.status(200).json(records);
  } catch (error) {
    console.error('Get daily attendance error:', error);
    res.status(500).json({ message: 'Failed to fetch attendance records' });
  }
};

// POST/UPSERT daily attendance
exports.setDailyAttendance = async (req, res) => {
  try {
    const { employee, date, status, checkIn, checkOut, hoursWorked, overtimeHours, notes } = req.body;
    
    // Validate required fields
    if (!employee || !date || !status) {
      return res.status(400).json({ message: 'Employee, date, and status are required' });
    }
    
    // Upsert: Update if exists, create if not
    const record = await DailyAttendance.findOneAndUpdate(
      { employee, date },  // Filter: find by employee+date
      { employee, date, status, checkIn, checkOut, hoursWorked, overtimeHours, notes },  // Update data
      { 
        upsert: true,      // Create if doesn't exist
        new: true,         // Return updated document
        runValidators: true // Run schema validators
      }
    );
    
    // Check if it was a new record or update
    const statusCode = record.isNew ? 201 : 200;
    res.status(statusCode).json(record);
  } catch (error) {
    console.error('Set daily attendance error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Failed to save attendance record' });
  }
};

// DELETE daily attendance
exports.deleteDailyAttendance = async (req, res) => {
  try {
    const { recordId } = req.params;
    
    const record = await DailyAttendance.findByIdAndDelete(recordId);
    
    if (!record) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }
    
    res.status(200).json({ message: 'Daily attendance record deleted successfully' });
  } catch (error) {
    console.error('Delete daily attendance error:', error);
    res.status(500).json({ message: 'Failed to delete attendance record' });
  }
};
```

### Routes Example

```javascript
const router = require('express').Router();
const { authenticate, authorizeHR } = require('../middleware/auth');
const attendanceController = require('../controllers/attendanceController');

// All routes require authentication and HR role
router.use(authenticate);
router.use(authorizeHR);

// Daily attendance endpoints
router.get('/employees/:employeeId/attendance/daily', attendanceController.getDailyAttendance);
router.post('/attendance/daily', attendanceController.setDailyAttendance);
router.delete('/attendance/daily/:recordId', attendanceController.deleteDailyAttendance);

module.exports = router;
```

---

## 🔄 EXISTING ENDPOINTS - REQUIRED MODIFICATIONS

### 1. Attendance Summary Endpoint

**Endpoint**: `GET /api/hr/attendance/summary?month=11&year=2025`

**Current Behavior**: Returns monthly aggregate records

**Required Change**: Aggregate from daily records OR return both daily and monthly records

**New Response** (should maintain same structure for backwards compatibility):
```json
[
  {
    "_id": "673abc...",
    "employee": {
      "_id": "507f...",
      "employeeId": "EMP001",
      "firstName": "John",
      "lastName": "Doe"
    },
    "month": 11,
    "year": 2025,
    "totalWorkingDays": 22,
    "daysPresent": 18,
    "leaveWithoutPay": 2,
    "overtimeHours": 5.5
  }
]
```

**Implementation Logic**:
```javascript
// Aggregate daily records into monthly summary
const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

const summary = await DailyAttendance.aggregate([
  { $match: { date: { $gte: startDate, $lte: endDate } } },
  { $group: {
      _id: '$employee',
      totalWorkingDays: { $sum: 1 },
      daysPresent: { $sum: { $cond: [{ $eq: ['$status', 'P'] }, 1, 0] } },
      leaveWithoutPay: { $sum: { $cond: [{ $eq: ['$status', 'LOP'] }, 1, 0] } },
      overtimeHours: { $sum: '$overtimeHours' }
  }},
  { $lookup: {
      from: 'users',
      localField: '_id',
      foreignField: '_id',
      as: 'employee'
  }},
  // ... format response
]);
```

---

### 2. Attendance Upload Endpoint

**Endpoint**: `POST /api/hr/attendance/upload`

**Current Behavior**: Handles CSV upload with `mode=daily` or `mode=monthly`

**Required Change**: When `mode=daily`, write to `DailyAttendance` collection

**Implementation**:
```javascript
if (mode === 'daily') {
  // For each CSV row
  for (const row of csvData) {
    await DailyAttendance.findOneAndUpdate(
      { employee: row.employeeId, date: row.date },
      { 
        employee: row.employeeId,
        date: row.date,
        status: row.status || 'P',
        checkIn: row.checkIn,
        checkOut: row.checkOut,
        hoursWorked: row.hoursWorked,
        overtimeHours: row.overtimeHours,
        notes: row.notes
      },
      { upsert: true, new: true }
    );
  }
}
```

**No Breaking Changes**: Monthly mode continues to work with existing collection

---

## 🚀 MIGRATION STRATEGY

### Recommended Approach: Dual System

**Phase 1 - Add Daily System** (Week 1)
1. Create `DailyAttendance` collection with schema
2. Implement 4 new daily endpoints
3. Deploy to staging
4. Frontend tests with new endpoints

**Phase 2 - Modify Existing** (Week 2)
1. Update summary endpoint to aggregate daily records
2. Update upload endpoint to support daily mode
3. Test backwards compatibility
4. Deploy to production

**Phase 3 - Optional Migration** (Future)
1. Script to convert existing monthly → daily records
2. Gradual deprecation of monthly system
3. Archive old monthly data

**Benefits**:
- No breaking changes
- Backwards compatible
- Gradual rollout
- Easy rollback

### Alternative: Full Migration

Replace monthly system entirely. **Not recommended** due to:
- Breaking changes for existing data
- Higher risk
- Requires downtime
- Complex rollback

---

## ✅ VALIDATION RULES

### Date Validation
- **Format**: Must be `YYYY-MM-DD` (ISO 8601)
- **Regex**: `/^\d{4}-\d{2}-\d{2}$/`
- **Example**: `2025-11-17`

### Status Validation
- **Must be**: One of `P`, `A`, `LOP`, `PL`, `H`, `WO`
- **Case-sensitive**: Use uppercase only

### Time Validation
- **Format**: `HH:mm` (24-hour)
- **Regex**: `/^\d{2}:\d{2}$/`
- **Examples**: `09:00`, `18:30`, `23:45`

### Employee Validation
- Must be valid MongoDB ObjectId
- Must exist in User collection
- Must not be deleted/inactive

### Uniqueness
- **Key**: `(employee, date)` combination must be unique
- **Enforced by**: Database unique index
- **Error**: Duplicate key error handled by upsert logic

---

## 🧪 TESTING CHECKLIST

### Unit Tests
- [ ] Create daily attendance record
- [ ] Update daily attendance record (upsert)
- [ ] Delete daily attendance record
- [ ] Get daily attendance with no filters
- [ ] Get daily attendance filtered by year
- [ ] Get daily attendance filtered by year+month
- [ ] Validate status enum values
- [ ] Validate date format
- [ ] Validate time format
- [ ] Handle invalid employee ID
- [ ] Handle duplicate records (upsert)

### Integration Tests
- [ ] POST then GET same record
- [ ] POST twice (upsert updates existing)
- [ ] DELETE then GET (should be empty)
- [ ] Upload CSV with daily mode
- [ ] Summary aggregates daily records correctly
- [ ] Filter by month returns correct records

### API Tests (Postman/Thunder Client)
- [ ] Unauthorized access returns 401
- [ ] Non-HR user returns 403
- [ ] Invalid status returns 400
- [ ] Invalid date format returns 400
- [ ] Record not found returns 404
- [ ] Successful create returns 201
- [ ] Successful update returns 200

---

## 📊 PERFORMANCE CONSIDERATIONS

### Indexes
```javascript
// Unique index (prevents duplicates)
{ employee: 1, date: 1 } - UNIQUE

// Query optimization
{ employee: 1, date: 1 } - for range queries
{ date: 1 } - for date-based queries
```

### Query Optimization
- Use `lean()` for read-only queries
- Limit result sets with date ranges
- Use aggregation pipeline for summary calculations
- Consider caching summary results (Redis)

### Estimated Document Size
- ~200-300 bytes per record
- 250 employees × 30 days/month = 7,500 records/month
- ~1.8 MB/month
- ~22 MB/year

---

## 🔒 SECURITY CONSIDERATIONS

### Authorization
- All endpoints require HR role
- Employees cannot view/edit others' attendance
- Only HR can create/update/delete records

### Input Validation
- Validate all dates against regex
- Sanitize notes field (prevent XSS)
- Limit notes to 500 characters
- Validate employee ObjectId format

### Rate Limiting
- Consider rate limiting upload endpoint
- Prevent bulk spam requests

---

## 📝 SUMMARY

**What to Implement**:
1. Create `DailyAttendance` schema with unique index
2. Implement 4 new REST endpoints (GET, POST, DELETE, optional PUT)
3. Modify summary endpoint to aggregate daily records
4. Modify upload endpoint to support daily mode

**Estimated Effort**:
- Backend development: 6-8 hours
- Testing: 4-6 hours
- Deployment: 1-2 hours
- **Total**: 11-16 hours

**Priority**: HIGH (frontend depends on these endpoints)

**Breaking Changes**: None (dual system approach)

**Dependencies**: 
- Mongoose (already in use)
- Express (already in use)
- Authentication middleware (already exists)

---

## 📞 QUESTIONS?

Contact frontend team for:
- Clarification on data formats
- Additional field requirements
- Edge case scenarios
- Integration testing support

---

**Document Version**: 1.0  
**Last Updated**: November 17, 2025  
**Author**: Frontend Team  
**Status**: Ready for Implementation
