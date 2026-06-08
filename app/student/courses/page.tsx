export const dynamic = 'force-dynamic';

import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Enrollment from '@/models/Enrollment';
import Course from '@/models/Course';
import Video from '@/models/Video';
import { BookOpen } from 'lucide-react';
import StudentCoursesGrid from '@/components/student/StudentCoursesGrid';

interface CourseItem {
  _id: string;
  title: string;
  description: string;
  bannerImage: string;
  category: string;
  totalVideos: number;
  teacher: { name: string };
}

async function getEnrolledCourses(userId: string): Promise<CourseItem[]> {
  await connectDB();

  const enrollments = await Enrollment.find({ student: userId, isActive: true });
  const courseIds = enrollments.map((e) => e.course);

  const courses = await Course.find({ _id: { $in: courseIds }, isPublished: true })
    .populate('teacher', 'name');

  const publishedVideos = await Video.find({ course: { $in: courseIds }, isPublished: true })
    .select('_id course').lean();

  const videoCountByCourse = new Map<string, number>();
  for (const v of publishedVideos) {
    const cId = v.course.toString();
    videoCountByCourse.set(cId, (videoCountByCourse.get(cId) ?? 0) + 1);
  }

  return courses.map((c) => ({
    _id: c._id.toString(),
    title: c.title,
    description: c.description,
    bannerImage: c.bannerImage,
    category: c.category,
    totalVideos: videoCountByCourse.get(c._id.toString()) ?? 0,
    teacher: { name: (c.teacher as unknown as { name: string }).name },
  }));
}

export default async function StudentCoursesPage() {
  const session = await auth();
  const courses = await getEnrolledCourses(session!.user.id);

  if (courses.length === 0) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">My Courses</h1>
          <p className="text-sm text-slate-500 mt-0.5">0 enrolled</p>
        </div>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center mb-4">
            <BookOpen size={24} className="text-indigo-400" />
          </div>
          <h2 className="text-base font-semibold text-slate-700 mb-1">No courses yet</h2>
          <p className="text-sm text-slate-400">Contact your admin to get enrolled in a course.</p>
        </div>
      </div>
    );
  }

  return <StudentCoursesGrid courses={courses} />;
}
