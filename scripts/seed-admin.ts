import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

const envFile = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envFile)) {
  const lines = fs.readFileSync(envFile, 'utf-8').split('\n');
  for (const line of lines) {
    const [k, ...v] = line.split('=');
    if (k && v.length) process.env[k.trim()] = v.join('=').trim();
  }
}

const UserSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: String,
    avatar: { type: String, default: '' },
    phone: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    isBanned: { type: Boolean, default: false },
    banReason: { type: String, default: '' },
    subscriptionExpiry: { type: Date, default: null },
    subscriptionType: { type: String, default: null },
    installmentPending: { type: Boolean, default: false },
    installmentAmount: { type: Number, default: null },
    installmentDueDate: { type: Date, default: null },
    bio: { type: String, default: '' },
    specialization: { type: String, default: '' },
    isGuestLecturer: { type: Boolean, default: false },
  },
  { timestamps: true }
);

interface SeedUser {
  name: string;
  email: string;
  password: string;
  role: string;
  phone?: string;
  bio?: string;
  specialization?: string;
  subscriptionType?: string;
  subscriptionExpiry?: Date;
}

const SEED_USERS: SeedUser[] = [
  {
    name: 'Admin',
    email: 'admin@learnspace.com',
    password: 'admin123',
    role: 'admin',
  },
  {
    name: 'Priya Sharma',
    email: 'teacher@learnspace.com',
    password: 'teacher123',
    role: 'teacher',
    phone: '9876543210',
    specialization: 'Full Stack Development',
    bio: 'Senior software engineer with 8 years of experience in web development.',
  },
  {
    name: 'Arjun Mehta',
    email: 'student@learnspace.com',
    password: 'student123',
    role: 'student',
    phone: '9123456789',
    subscriptionType: '6month',
    subscriptionExpiry: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
  },
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI!);
  console.log('Connected to MongoDB\n');

  const User = mongoose.models.User ?? mongoose.model('User', UserSchema);

  for (const u of SEED_USERS) {
    const existing = await User.findOne({ email: u.email });
    if (existing) {
      console.log(`  ✓ Already exists: ${u.email}`);
      continue;
    }
    const hashed = await bcrypt.hash(u.password, 12);
    await User.create({ ...u, password: hashed });
    console.log(`  ✓ Created [${u.role}] ${u.email} / ${u.password}`);
  }

  console.log('\nSeed complete.');
  process.exit(0);
}

seed().catch((e) => { console.error(e); process.exit(1); });
