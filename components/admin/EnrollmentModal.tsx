'use client';

import { useEffect, useState } from 'react';
import { X, UserPlus, UserMinus, Loader2, Search } from 'lucide-react';

interface Student {
  _id: string;
  name: string;
  email: string;
}

interface Enrollment {
  _id: string;
  student: Student;
  isActive: boolean;
}

interface Props {
  courseId: string;
  courseTitle: string;
  onClose: () => void;
}

export default function EnrollmentModal({ courseId, courseTitle, onClose }: Props) {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState('');

  async function load() {
    const [enrollRes, studentsRes] = await Promise.all([
      fetch(`/api/admin/enrollments?courseId=${courseId}`),
      fetch('/api/admin/users?role=student'),
    ]);
    const [enrollData, studentsData] = await Promise.all([
      enrollRes.json(),
      studentsRes.json(),
    ]);
    if (enrollData.success) setEnrollments(enrollData.data);
    if (studentsData.success) setAllStudents(studentsData.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, [courseId]);

  const enrolledIds = new Set(
    enrollments.filter((e) => e.isActive).map((e) => e.student._id)
  );

  const unenrolledStudents = allStudents.filter(
    (s) => !enrolledIds.has(s._id) && (
      search === '' ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase())
    )
  );

  async function enroll(studentId: string) {
    setActionId(studentId);
    await fetch('/api/admin/enrollments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, courseId }),
    });
    setActionId('');
    load();
  }

  async function unenroll(studentId: string) {
    setActionId(studentId);
    await fetch(`/api/admin/enrollments?studentId=${studentId}&courseId=${courseId}`, {
      method: 'DELETE',
    });
    setActionId('');
    load();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="font-semibold text-slate-900">Manage Enrollment</h2>
            <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{courseTitle}</p>
          </div>
          <button onClick={onClose}><X size={18} className="text-slate-400 hover:text-slate-600" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={20} className="animate-spin text-indigo-500" />
            </div>
          ) : (
            <>
              {/* Enrolled students */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Enrolled ({enrolledIds.size})
                </h3>
                {enrolledIds.size === 0 ? (
                  <p className="text-sm text-slate-400 py-2">No students enrolled yet.</p>
                ) : (
                  <ul className="space-y-1">
                    {enrollments.filter((e) => e.isActive).map((e) => (
                      <li key={e._id} className="flex items-center justify-between py-2.5 px-3 bg-green-50 border border-green-100 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-slate-800">{e.student.name}</p>
                          <p className="text-xs text-slate-400">{e.student.email}</p>
                        </div>
                        <button
                          onClick={() => unenroll(e.student._id)}
                          disabled={actionId === e.student._id}
                          className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 font-medium px-2.5 py-1.5 rounded hover:bg-red-50"
                        >
                          {actionId === e.student._id
                            ? <Loader2 size={12} className="animate-spin" />
                            : <UserMinus size={13} />
                          }
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Add students */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Add Students
                </h3>
                <div className="relative mb-3">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name or email"
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                  />
                </div>
                {unenrolledStudents.length === 0 ? (
                  <p className="text-sm text-slate-400 py-2">
                    {search ? 'No matching students.' : 'All students are enrolled.'}
                  </p>
                ) : (
                  <ul className="space-y-1 max-h-48 overflow-y-auto">
                    {unenrolledStudents.map((s) => (
                      <li key={s._id} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200">
                        <div>
                          <p className="text-sm font-medium text-slate-800">{s.name}</p>
                          <p className="text-xs text-slate-400">{s.email}</p>
                        </div>
                        <button
                          onClick={() => enroll(s._id)}
                          disabled={actionId === s._id}
                          className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2.5 py-1.5 rounded hover:bg-indigo-50"
                        >
                          {actionId === s._id
                            ? <Loader2 size={12} className="animate-spin" />
                            : <UserPlus size={13} />
                          }
                          Enroll
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
