import mongoose from 'mongoose';
import User from '@/models/User';
import Course from '@/models/Course';
import Video from '@/models/Video';

import Comment from '@/models/Comment';
import Enrollment from '@/models/Enrollment';
import Rating from '@/models/Rating';
import Enquiry from '@/models/Enquiry';

describe('User model', () => {
  it('throws validation error when email is missing', async () => {
    const user = new User({ name: 'Test', password: 'hash', role: 'student' });
    await expect(user.save()).rejects.toThrow();
  });

  it('throws validation error for invalid role', async () => {
    const user = new User({ name: 'Test', email: 'test@x.com', password: 'hash', role: 'superadmin' });
    await expect(user.save()).rejects.toThrow();
  });

  it('saves a valid user with correct defaults', async () => {
    const user = await User.create({
      name: 'Valid User',
      email: 'validuser@models.test',
      password: 'hashedpass',
      role: 'student',
    });
    expect(user._id).toBeDefined();
    expect(user.isActive).toBe(true);
    expect(user.isBanned).toBe(false);
    expect(user.avatar).toBe('');
    expect(user.subscriptionExpiry).toBeNull();
  });

  it('stores email in lowercase', async () => {
    const user = await User.create({
      name: 'Case User',
      email: 'UPPER@MODELS.TEST',
      password: 'hashedpass',
      role: 'student',
    });
    expect(user.email).toBe('upper@models.test');
  });
});

describe('Course model', () => {
  let teacherId: mongoose.Types.ObjectId;

  beforeAll(async () => {
    const teacher = await User.create({
      name: 'Teacher',
      email: 'teacher@course.test',
      password: 'hash',
      role: 'teacher',
    });
    teacherId = teacher._id;
  });

  it('defaults isPublished to false', async () => {
    const course = await Course.create({
      title: 'Test Course',
      description: 'A course description here',
      teacher: teacherId,
    });
    expect(course.isPublished).toBe(false);
  });

  it('defaults totalVideos to 0', async () => {
    const course = await Course.create({
      title: 'Another Course',
      description: 'Another course description',
      teacher: teacherId,
    });
    expect(course.totalVideos).toBe(0);
  });

  it('requires title', async () => {
    const course = new Course({ description: 'No title', teacher: teacherId });
    await expect(course.save()).rejects.toThrow();
  });

  it('requires teacher', async () => {
    const course = new Course({ title: 'No Teacher', description: 'Description here' });
    await expect(course.save()).rejects.toThrow();
  });
});

describe('Video model', () => {
  let courseId: mongoose.Types.ObjectId;

  beforeAll(async () => {
    const teacher = await User.create({
      name: 'VideoTeacher',
      email: 'videoteacher@video.test',
      password: 'hash',
      role: 'teacher',
    });
    const course = await Course.create({
      title: 'Video Course',
      description: 'Course for video tests',
      teacher: teacher._id,
    });
    courseId = course._id;
  });

  it('throws validation error when order is missing', async () => {
    const video = new Video({
      course: courseId,
      title: 'Test Video',
      youtubeId: 'dQw4w9WgXcQ',
    });
    await expect(video.save()).rejects.toThrow();
  });

  it('stores youtubeId as a plain string, not a URL', async () => {
    const video = await Video.create({
      course: courseId,
      title: 'YT Video',
      youtubeId: 'dQw4w9WgXcQ',
      order: 1,
    });
    expect(video.youtubeId).toBe('dQw4w9WgXcQ');
    expect(video.youtubeId).not.toContain('http');
  });

  it('defaults isPublished to true', async () => {
    const video = await Video.create({
      course: courseId,
      title: 'Published Video',
      youtubeId: 'abc1234WXYZ',
      order: 2,
    });
    expect(video.isPublished).toBe(true);
  });
});


describe('Comment model', () => {
  let userId: mongoose.Types.ObjectId;
  let courseId: mongoose.Types.ObjectId;
  let videoId: mongoose.Types.ObjectId;

  beforeAll(async () => {
    const user = await User.create({
      name: 'CommentUser',
      email: 'commentuser@comment.test',
      password: 'hash',
      role: 'student',
    });
    const teacher = await User.create({
      name: 'CommentTeacher',
      email: 'commentteacher@comment.test',
      password: 'hash',
      role: 'teacher',
    });
    const course = await Course.create({
      title: 'Comment Course',
      description: 'Course for comment tests',
      teacher: teacher._id,
    });
    const video = await Video.create({
      course: course._id,
      title: 'Comment Video',
      youtubeId: 'commentVid123',
      order: 1,
    });
    userId = user._id;
    courseId = course._id;
    videoId = video._id;
  });

  it('saves a comment linked to a course', async () => {
    const comment = await Comment.create({
      author: userId,
      content: 'Great course!',
      course: courseId,
    });
    expect(comment.course?.toString()).toBe(courseId.toString());
    expect(comment.isPinned).toBe(false);
    expect(comment.isDeleted).toBe(false);
  });

  it('saves a comment linked to a video', async () => {
    const comment = await Comment.create({
      author: userId,
      content: 'Great video!',
      video: videoId,
    });
    expect(comment.video?.toString()).toBe(videoId.toString());
  });

  it('saves a reply with parentComment', async () => {
    const parent = await Comment.create({
      author: userId,
      content: 'Parent comment',
      course: courseId,
    });
    const reply = await Comment.create({
      author: userId,
      content: 'Reply comment',
      course: courseId,
      parentComment: parent._id,
    });
    expect(reply.parentComment?.toString()).toBe(parent._id.toString());
  });
});

describe('Enrollment model', () => {
  it('defaults isActive to true', async () => {
    const student = await User.create({ name: 'EnrollS', email: 'enrolls@enroll.test', password: 'hash', role: 'student' });
    const admin = await User.create({ name: 'EnrollA', email: 'enrolla@enroll.test', password: 'hash', role: 'admin' });
    const teacher = await User.create({ name: 'EnrollT', email: 'enrollt@enroll.test', password: 'hash', role: 'teacher' });
    const course = await Course.create({ title: 'Enroll Course', description: 'Enrollment test', teacher: teacher._id });

    const enrollment = await Enrollment.create({
      student: student._id,
      course: course._id,
      enrolledBy: admin._id,
    });
    expect(enrollment.isActive).toBe(true);
  });
});

describe('Rating model', () => {
  it('throws validation error for rating of 0', async () => {
    const rating = new Rating({ name: 'Test', rating: 0, comment: 'A comment here that is long enough' });
    await expect(rating.save()).rejects.toThrow();
  });

  it('throws validation error for rating of 6', async () => {
    const rating = new Rating({ name: 'Test', rating: 6, comment: 'A comment here that is long enough' });
    await expect(rating.save()).rejects.toThrow();
  });

  it('saves successfully with rating of 5', async () => {
    const rating = await Rating.create({ name: 'Happy', rating: 5, comment: 'Excellent course content!' });
    expect(rating.rating).toBe(5);
    expect(rating.isApproved).toBe(false);
  });

  it('throws validation error when comment is too short', async () => {
    const rating = new Rating({ name: 'Test', rating: 4, comment: 'Short' });
    await expect(rating.save()).rejects.toThrow();
  });
});

describe('Enquiry model', () => {
  it('throws validation error when name is missing', async () => {
    const enquiry = new Enquiry({ email: 'x@x.com', subject: 'Test', message: 'This is a test message' });
    await expect(enquiry.save()).rejects.toThrow();
  });

  it('throws validation error when email is missing', async () => {
    const enquiry = new Enquiry({ name: 'Test', subject: 'Test', message: 'This is a test message' });
    await expect(enquiry.save()).rejects.toThrow();
  });

  it('throws validation error when subject is missing', async () => {
    const enquiry = new Enquiry({ name: 'Test', email: 'x@x.com', message: 'This is a test message' });
    await expect(enquiry.save()).rejects.toThrow();
  });

  it('saves a valid enquiry with isRead defaulting to false', async () => {
    const enquiry = await Enquiry.create({
      name: 'Test User',
      email: 'test@enquiry.test',
      subject: 'Course inquiry',
      message: 'I want to know more about this course',
    });
    expect(enquiry.isRead).toBe(false);
  });
});
