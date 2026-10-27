import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Invalid email format']
  },
  passwordHash: { type: String, required: true },
  role: {
    type: String,
    enum: ['ADMIN', 'ENGINEER'],
    default: 'ENGINEER'
  },
  active: { type: Boolean, default: true }
}, { timestamps: true });

// Helper to set password
userSchema.methods.setPassword = async function (plain) {
  this.passwordHash = await bcrypt.hash(plain, SALT_ROUNDS);
};

userSchema.methods.validatePassword = async function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

export default mongoose.model('User', userSchema);
