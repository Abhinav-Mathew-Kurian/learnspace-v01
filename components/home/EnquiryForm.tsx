'use client';

import { useState } from 'react';
import { Send, CheckCircle } from 'lucide-react';

const SUBJECTS = [
  'Course Information',
  'Enrollment & Admissions',
  'Technical Support',
  'Payment & Billing',
  'Live Classes',
  'Other',
];

export default function EnquiryForm() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    subject: SUBJECTS[0],
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Submission failed. Please try again.');
      } else {
        setSuccess(true);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
          <CheckCircle size={32} className="text-emerald-400" />
        </div>
        <h3 className="text-lg font-bold text-white">Message sent successfully!</h3>
        <p className="text-sm text-slate-400 max-w-sm">
          {"We'll get back to you at"} <span className="text-indigo-400">{form.email}</span> within 24 hours.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Name *</label>
          <input
            type="text"
            name="name"
            required
            value={form.name}
            onChange={handleChange}
            className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-white placeholder-slate-500"
            placeholder="Your full name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Email *</label>
          <input
            type="email"
            name="email"
            required
            value={form.email}
            onChange={handleChange}
            className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-white placeholder-slate-500"
            placeholder="you@example.com"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Phone</label>
          <input
            type="tel"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-white placeholder-slate-500"
            placeholder="+91 XXXXX XXXXX"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Subject *</label>
          <select
            name="subject"
            value={form.subject}
            onChange={handleChange}
            className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-white"
          >
            {SUBJECTS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">Message *</label>
        <textarea
          name="message"
          required
          rows={4}
          value={form.message}
          onChange={handleChange}
          className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-white placeholder-slate-500 resize-none"
          placeholder="Describe your question or inquiry in detail..."
        />
      </div>

      {error && (
        <p className="text-sm text-red-400 bg-red-900/30 px-3 py-2 rounded-lg">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-60"
      >
        {loading ? 'Sending...' : (
          <>
            <Send size={15} /> Send Message
          </>
        )}
      </button>
    </form>
  );
}
