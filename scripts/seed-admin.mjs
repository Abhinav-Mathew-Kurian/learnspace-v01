import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Parse .env.local manually
const envPath = join(__dirname, '../.env.local');
const envVars = readFileSync(envPath, 'utf8').split('\n');
for (const line of envVars) {
  const [key, ...rest] = line.split('=');
  if (key && rest.length && !process.env[key.trim()]) process.env[key.trim()] = rest.join('=').trim();
}

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); }

const UserSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  email:    { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role:     { type: String, required: true },
  isActive: { type: Boolean, default: true },
  isBanned: { type: Boolean, default: false },
}, { timestamps: true });

const User = mongoose.models.User ?? mongoose.model('User', UserSchema);

await mongoose.connect(MONGODB_URI);

const email = 'admin@hfa.com';
const existing = await User.findOne({ email });

if (existing) {
  console.log('Admin already exists:', email);
} else {
  const hash = await bcrypt.hash('admin@9745', 12);
  await User.create({ name: 'Admin', email, password: hash, role: 'admin' });
  console.log('✅ Admin created:', email);
}

await mongoose.disconnect();
