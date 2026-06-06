'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Plus, GripVertical, Trash2, Eye, EyeOff,
  BookOpen, FileText, ChevronUp, ChevronDown, Loader2, Upload, ExternalLink, Download,
} from 'lucide-react';
import AddVideoModal from '@/components/teacher/AddVideoModal';
import PDFUploadModal from '@/components/teacher/PDFUploadModal';
import DescriptionRenderer from '@/components/shared/DescriptionRenderer';
import CommentSection from '@/components/shared/CommentSection';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { toast } from 'sonner';

interface Video {
  _id: string;
  title: string;
  youtubeId: string;
  duration: number;
  order: number;
  isPublished: boolean;
}

interface Course {
  _id: string;
  title: string;
  description: string;
  bannerImage: string;
  category: string;
  totalVideos: number;
  isPublished: boolean;
  teacher: { name: string };
}

interface Material {
  _id: string;
  title: string;
  fileUrl: string;
  createdAt: string;
  uploadedBy: { name: string };
}

function fmtDuration(s: number) {
  if (!s) return '—';
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function TeacherCourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [course, setCourse] = useState<Course | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddVideo, setShowAddVideo] = useState(false);
  const [showPDF, setShowPDF] = useState(false);
  const [actionId, setActionId] = useState('');
  const [deletingMaterialId, setDeletingMaterialId] = useState('');
  const [confirmVideoId, setConfirmVideoId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'videos' | 'materials' | 'discussions' | 'video-discussions'>('videos');
  const [discussionVideoId, setDiscussionVideoId] = useState<string | null>(null);

  async function load() {
    const [courseRes, materialsRes] = await Promise.all([
      fetch(`/api/courses/${id}`, { cache: 'no-store' }),
      fetch(`/api/courses/${id}/materials`, { cache: 'no-store' }),
    ]);
    const courseData = await courseRes.json();
    const materialsData = await materialsRes.json();
    if (courseData.success) {
      setCourse(courseData.data.course);
      setVideos(courseData.data.videos);
    }
    if (materialsData.success) setMaterials(materialsData.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  async function deleteMaterial(materialId: string) {
    setDeletingMaterialId(materialId);
    await fetch(`/api/courses/${id}/materials/${materialId}`, { method: 'DELETE' });
    setDeletingMaterialId('');
    toast.success('PDF removed.');
    load();
  }

  const deleteVideo = (videoId: string) => setConfirmVideoId(videoId);
  const handleConfirmDeleteVideo = async () => {
    if (!confirmVideoId) return;
    setActionId(confirmVideoId);
    setConfirmVideoId(null);
    await fetch(`/api/courses/${id}/videos/${confirmVideoId}`, { method: 'DELETE' });
    setActionId('');
    toast.success('Video deleted.');
    load();
  };

  async function toggleVideoPublish(v: Video) {
    setActionId(v._id);
    await fetch(`/api/courses/${id}/videos/${v._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPublished: !v.isPublished }),
    });
    setActionId('');
    load();
  }

  async function moveVideo(index: number, dir: 'up' | 'down') {
    const newVideos = [...videos];
    const swapIdx = dir === 'up' ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= newVideos.length) return;
    [newVideos[index], newVideos[swapIdx]] = [newVideos[swapIdx], newVideos[index]];
    setVideos(newVideos);
    // Persist new orders
    await Promise.all(
      newVideos.map((v, i) =>
        fetch(`/api/courses/${id}/videos/${v._id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order: i + 1 }),
        })
      )
    );
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!course) {
    return <div className="p-8 text-slate-500">Course not found.</div>;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl">
      <Link href="/teacher/courses" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-6">
        <ArrowLeft size={15} /> Back to Courses
      </Link>

      {/* Course header */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6">
        {course.bannerImage && (
          <img src={course.bannerImage} alt={course.title} className="w-full h-48 object-cover" />
        )}
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900">{course.title}</h1>
              <div className="mt-2">
                <DescriptionRenderer text={course.description} />
              </div>
              {course.category && (
                <span className="inline-block mt-2 text-xs px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full font-medium">
                  {course.category}
                </span>
              )}
            </div>
            <span className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${
              course.isPublished ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {course.isPublished ? 'Published' : 'Draft'}
            </span>
          </div>
          <div className="flex gap-3 mt-5">
            <Link
              href={`/teacher/courses/${id}/edit`}
              className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg"
            >
              Edit Details
            </Link>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit mb-5 flex-wrap">
        {([
          { key: 'videos',            label: `Videos (${videos.length})` },
          { key: 'materials',         label: `Materials (${materials.length})` },
          { key: 'discussions',       label: 'Course Discussion' },
          { key: 'video-discussions', label: 'Video Discussion' },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Videos tab */}
      {activeTab === 'videos' && (
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-slate-500" />
            <h2 className="font-semibold text-slate-800">Videos</h2>
            <span className="text-xs text-slate-400">({videos.length})</span>
          </div>
          <button
            onClick={() => setShowAddVideo(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg"
          >
            <Plus size={14} /> Add Video
          </button>
        </div>

        {videos.length === 0 ? (
          <div className="py-12 flex flex-col items-center text-center text-slate-400">
            <FileText size={28} className="mb-2 text-slate-300" />
            <p className="text-sm font-medium text-slate-600 mb-1">No videos yet</p>
            <p className="text-xs">Add your first video by clicking &quot;Add Video&quot; above.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {videos.map((v, i) => (
              <li key={v._id} className="flex items-center gap-4 px-6 py-4">
                <GripVertical size={16} className="text-slate-300 flex-shrink-0" />
                <div className="flex flex-col gap-0.5 flex-shrink-0 w-6">
                  <button
                    onClick={() => moveVideo(i, 'up')}
                    disabled={i === 0}
                    className="text-slate-300 hover:text-slate-600 disabled:opacity-20"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    onClick={() => moveVideo(i, 'down')}
                    disabled={i === videos.length - 1}
                    className="text-slate-300 hover:text-slate-600 disabled:opacity-20"
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>
                <span className="text-xs text-slate-400 w-5 text-right flex-shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{v.title}</p>
                  <p className="text-xs text-slate-400">{fmtDuration(v.duration)}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => toggleVideoPublish(v)}
                    disabled={actionId === v._id}
                    className="text-xs text-slate-500 hover:text-slate-800 p-1.5 rounded hover:bg-slate-100"
                    title={v.isPublished ? 'Unpublish' : 'Publish'}
                  >
                    {v.isPublished ? <Eye size={14} /> : <EyeOff size={14} className="text-slate-400" />}
                  </button>
                  <button
                    onClick={() => deleteVideo(v._id)}
                    disabled={actionId === v._id}
                    className="text-xs text-red-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50"
                  >
                    {actionId === v._id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      )} {/* end videos tab */}

      {/* Materials tab */}
      {activeTab === 'materials' && (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-slate-500" />
              <h2 className="font-semibold text-slate-800">PDF Materials</h2>
              <span className="text-xs text-slate-400">({materials.length})</span>
            </div>
            <button
              onClick={() => setShowPDF(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg"
            >
              <Upload size={14} /> Upload PDF
            </button>
          </div>

          {materials.length === 0 ? (
            <div className="py-12 flex flex-col items-center text-center text-slate-400">
              <FileText size={28} className="mb-2 text-slate-300" />
              <p className="text-sm font-medium text-slate-600 mb-1">No PDFs uploaded yet</p>
              <p className="text-xs">Upload study material — the AI assistant will use it to answer student questions.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {materials.map((m) => (
                <li key={m._id} className="flex items-center gap-4 px-6 py-4">
                  <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                    <FileText size={16} className="text-red-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{m.title}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(m.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {m.uploadedBy?.name && ` · ${m.uploadedBy.name}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <a
                      href={`/api/download?url=${encodeURIComponent(m.fileUrl)}&filename=${encodeURIComponent(m.title)}`}
                      download={`${m.title}.pdf`}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                      title="Download PDF"
                    >
                      <Download size={14} />
                    </a>
                    <a
                      href={m.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                      title="Open in new tab"
                    >
                      <ExternalLink size={14} />
                    </a>
                    <button
                      onClick={() => deleteMaterial(m._id)}
                      disabled={deletingMaterialId === m._id}
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete PDF"
                    >
                      {deletingMaterialId === m._id
                        ? <Loader2 size={14} className="animate-spin" />
                        : <Trash2 size={14} />}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )} {/* end materials tab */}

      {/* Course-level discussion tab */}
      {activeTab === 'discussions' && (
        <div>
          <p className="text-sm text-slate-500 mb-4">
            Course-level questions and announcements visible to all enrolled students.
            Pin important replies to keep them at the top.
          </p>
          <CommentSection courseId={id} isEnrolled={true} />
        </div>
      )}

      {/* Video-level discussion tab */}
      {activeTab === 'video-discussions' && (
        <div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">Select a video to view its discussion</label>
            <select
              value={discussionVideoId ?? ''}
              onChange={(e) => setDiscussionVideoId(e.target.value || null)}
              className="border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white w-full max-w-sm"
            >
              <option value="">— Pick a video —</option>
              {videos.map((v) => (
                <option key={v._id} value={v._id}>{v.title}</option>
              ))}
            </select>
          </div>
          {discussionVideoId ? (
            <CommentSection courseId={id} videoId={discussionVideoId} isEnrolled={true} />
          ) : (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-10 text-center text-sm text-slate-400">
              Select a video above to see its student discussion.
            </div>
          )}
        </div>
      )}

      {showAddVideo && (
        <AddVideoModal
          courseId={id}
          onClose={() => setShowAddVideo(false)}
          onAdded={() => { setShowAddVideo(false); load(); }}
        />
      )}
      {showPDF && (
        <PDFUploadModal
          courseId={id}
          onClose={() => setShowPDF(false)}
          onUploaded={() => setShowPDF(false)}
        />
      )}
      <ConfirmDialog
        open={!!confirmVideoId}
        title="Delete video?"
        message="This video and all associated progress data will be removed permanently."
        confirmLabel="Delete"
        onConfirm={handleConfirmDeleteVideo}
        onCancel={() => setConfirmVideoId(null)}
      />
    </div>
  );
}
