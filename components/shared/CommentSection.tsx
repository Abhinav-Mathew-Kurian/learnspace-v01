'use client';

import { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { formatDistanceToNow } from 'date-fns';
import {
  Pin, Trash2, Pencil, Reply, Send, Loader2,
  MessageSquare, ChevronDown, ChevronUp, Check, X,
} from 'lucide-react';

interface Author {
  _id: string;
  name: string;
  avatar?: string;
  role: 'admin' | 'teacher' | 'student';
}

interface CommentData {
  _id: string;
  author: Author;
  content: string;
  course: string | null;
  video: string | null;
  parentComment: string | null;
  isPinned: boolean;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: string;
  replies: CommentData[];
}

interface Props {
  courseId?: string;
  videoId?: string;
  isEnrolled: boolean;
}

const ROLE_BADGE: Record<string, string> = {
  admin:   'bg-violet-100 text-violet-700',
  teacher: 'bg-sky-100 text-sky-700',
  student: 'bg-emerald-100 text-emerald-700',
};

function Avatar({ author }: { author: Author }) {
  return (
    <div className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden bg-indigo-100 flex items-center justify-center">
      {author.avatar
        ? <img src={author.avatar} alt={author.name} className="w-full h-full object-cover" />
        : <span className="text-indigo-700 text-xs font-bold">{author.name.charAt(0).toUpperCase()}</span>
      }
    </div>
  );
}

function CommentSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3 animate-pulse">
          <div className="w-8 h-8 rounded-full bg-slate-200 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-slate-200 rounded w-1/4" />
            <div className="h-3 bg-slate-200 rounded w-3/4" />
            <div className="h-3 bg-slate-200 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function CommentItem({
  comment, courseId, onUpdate, onReplyPosted, depth = 0,
}: {
  comment: CommentData;
  courseId?: string;
  onUpdate: (updated: CommentData) => void;
  onReplyPosted: (reply: CommentData, parentId: string) => void;
  depth?: number;
}) {
  const { data: session } = useSession();
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);
  const [loading, setLoading] = useState(false);
  const [showReplies, setShowReplies] = useState(true);

  const isOwn = session?.user?.id === comment.author._id;
  const isAdmin = session?.user?.role === 'admin';
  const isTeacher = session?.user?.role === 'teacher';

  const patch = async (body: Record<string, unknown>) => {
    setLoading(true);
    const res = await fetch(`/api/comments/${comment._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setLoading(false);
    if (data.success) onUpdate({ ...comment, ...data.data, replies: comment.replies });
  };

  const submitEdit = async () => {
    if (!editText.trim()) return;
    await patch({ content: editText.trim() });
    setEditing(false);
  };

  const submitReply = async () => {
    if (!replyText.trim()) return;
    setLoading(true);
    // Resolve courseId/videoId — never send null (Zod rejects it; only string | undefined allowed)
    const effectiveCourseId = courseId || comment.course || undefined;
    const effectiveVideoId = comment.video || undefined;
    const res = await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: replyText.trim(),
        ...(effectiveCourseId ? { courseId: effectiveCourseId } : {}),
        ...(effectiveVideoId ? { videoId: effectiveVideoId } : {}),
        parentCommentId: comment._id,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.success) {
      onReplyPosted(data.data, comment._id);
      setReplyText('');
      setShowReply(false);
      setShowReplies(true);
    }
  };

  if (comment.isDeleted && (comment.replies ?? []).length === 0) return null;

  return (
    <div className={`${depth > 0 ? 'pl-4 border-l-2 border-slate-100' : ''}`}>
      <div className={`flex gap-3 ${comment.isPinned ? 'bg-amber-50/60 border border-amber-100 rounded-xl p-3' : 'py-2'}`}>
        <Avatar author={comment.author} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-semibold text-slate-900">{comment.author.name}</span>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize ${ROLE_BADGE[comment.author.role]}`}>
              {comment.author.role}
            </span>
            {comment.isPinned && (
              <span className="flex items-center gap-0.5 text-[10px] font-semibold text-amber-600">
                <Pin size={10} /> Pinned
              </span>
            )}
            {comment.isEdited && <span className="text-[10px] text-slate-400">edited</span>}
            <span className="text-[11px] text-slate-400 ml-auto">
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
            </span>
          </div>

          {comment.isDeleted ? (
            <p className="text-sm text-slate-400 italic">[Comment removed]</p>
          ) : editing ? (
            <div className="space-y-2">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={2}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                autoFocus
              />
              <div className="flex gap-2">
                <button onClick={submitEdit} disabled={loading} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 disabled:opacity-60">
                  <Check size={12} /> Save
                </button>
                <button onClick={() => { setEditing(false); setEditText(comment.content); }} className="flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs text-slate-600 hover:bg-slate-50">
                  <X size={12} /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{comment.content}</p>
          )}

          {/* Action bar */}
          {!comment.isDeleted && !editing && (
            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
              {depth === 0 && session && (
                <button
                  onClick={() => setShowReply(!showReply)}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-indigo-600 px-1.5 py-0.5 rounded transition-colors"
                >
                  <Reply size={11} /> Reply
                </button>
              )}
              {isOwn && (
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-700 px-1.5 py-0.5 rounded transition-colors"
                >
                  <Pencil size={11} /> Edit
                </button>
              )}
              {(isOwn || isAdmin || isTeacher) && (
                <button
                  onClick={() => patch({ isDeleted: true })}
                  disabled={loading}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-red-600 px-1.5 py-0.5 rounded transition-colors"
                >
                  <Trash2 size={11} /> Delete
                </button>
              )}
              {(isAdmin || isTeacher) && (
                <button
                  onClick={() => patch({ isPinned: !comment.isPinned })}
                  disabled={loading}
                  className={`flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded transition-colors ${comment.isPinned ? 'text-amber-600 hover:text-amber-800' : 'text-slate-400 hover:text-amber-600'}`}
                >
                  <Pin size={11} /> {comment.isPinned ? 'Unpin' : 'Pin'}
                </button>
              )}
            </div>
          )}

          {/* Reply form */}
          {showReply && (
            <div className="mt-2 flex gap-2 items-start">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={1}
                placeholder="Write a reply…"
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitReply(); } }}
              />
              <button onClick={submitReply} disabled={loading || !replyText.trim()} className="p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 flex-shrink-0">
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Replies */}
      {(comment.replies ?? []).length > 0 && depth === 0 && (
        <div className="mt-1 pl-11">
          <button
            onClick={() => setShowReplies(!showReplies)}
            className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 mb-1.5"
          >
            {showReplies ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
          </button>
          {showReplies && (
            <div className="space-y-2">
              {comment.replies.map((r) => (
                <CommentItem
                  key={r._id}
                  comment={r}
                  courseId={courseId}
                  onUpdate={(updated) => { /* replies don't need top-level update */ }}
                  onReplyPosted={onReplyPosted}
                  depth={1}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CommentSection({ courseId, videoId, isEnrolled }: Props) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<CommentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [newText, setNewText] = useState('');
  const [posting, setPosting] = useState(false);

  const fetchComments = async () => {
    // videoId takes priority — video comments are scoped to the video, not the course
    const param = videoId ? `videoId=${videoId}` : `courseId=${courseId}`;
    const res = await fetch(`/api/comments?${param}`);
    const data = await res.json();
    if (data.success) setComments(data.data);
    setLoading(false);
  };

  useEffect(() => { fetchComments(); }, [courseId, videoId]);

  const postComment = async () => {
    if (!newText.trim()) return;
    setPosting(true);
    const res = await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newText.trim(), courseId, videoId }),
    });
    const data = await res.json();
    setPosting(false);
    if (data.success) {
      setComments((prev) => [data.data, ...prev]);
      setNewText('');
    }
  };

  const handleUpdate = (updated: CommentData) => {
    setComments((prev) => prev.map((c) => c._id === updated._id ? updated : c));
  };

  const handleReplyPosted = (reply: CommentData, parentId: string) => {
    setComments((prev) => prev.map((c) =>
      c._id === parentId ? { ...c, replies: [...(c.replies ?? []), reply] } : c
    ));
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
        <MessageSquare size={16} className="text-indigo-500" />
        <h3 className="font-semibold text-slate-800">
          {videoId ? 'Video Discussion' : 'Course Discussion'}
        </h3>
        {!loading && <span className="text-xs text-slate-400 ml-1">({comments.length})</span>}
      </div>

      {/* New comment */}
      {session && (isEnrolled || session.user.role !== 'student') && (
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <span className="text-indigo-700 text-xs font-bold">
                {session.user.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <textarea
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                rows={2}
                placeholder="Ask a question or leave a comment…"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) postComment(); }}
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-[11px] text-slate-400">Ctrl+Enter to submit</span>
                <button
                  onClick={postComment}
                  disabled={posting || !newText.trim()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {posting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                  Post
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comment list */}
      <div className="px-5 py-4 space-y-4">
        {loading && <CommentSkeleton />}
        {!loading && comments.length === 0 && (
          <div className="py-8 text-center">
            <MessageSquare size={28} className="text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No comments yet.</p>
            {(isEnrolled || session?.user?.role !== 'student') && (
              <p className="text-xs text-slate-400 mt-1">Be the first to ask a question!</p>
            )}
          </div>
        )}
        {!loading && comments.map((c) => (
          <CommentItem
            key={c._id}
            comment={c}
            courseId={courseId}
            onUpdate={handleUpdate}
            onReplyPosted={handleReplyPosted}
          />
        ))}
      </div>
    </div>
  );
}
