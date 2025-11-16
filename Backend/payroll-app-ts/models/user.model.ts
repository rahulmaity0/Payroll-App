// models/user.model.ts
import mongoose, { Document, Model, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

// 1. Define the Interface for a User document
export interface IUser extends Document {
  email: string;
  password: string; // Will be hashed
  role: 'employee' | 'hr';
  employee: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  matchPassword(enteredPassword: string): Promise<boolean>;
}

// 2. Define the Mongoose Schema
const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
    },
    role: {
      type: String,
      enum: ['employee', 'hr'],
      required: true,
    },
    employee: {
      type: Schema.Types.ObjectId,
      ref: 'Employee', // This must match the model name in employee.model.js
      required: true,
      unique: true,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
  }
);

// 3. Add Pre-save Hook for Password Hashing
userSchema.pre<IUser>('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// 4. Add Method for Password Comparison
userSchema.methods.matchPassword = async function (
  enteredPassword: string
): Promise<boolean> {
  return await bcrypt.compare(enteredPassword, this.password);
};

// 5. Create and Export the Model
const User: Model<IUser> = mongoose.model<IUser>('User', userSchema, 'users');
export default User;