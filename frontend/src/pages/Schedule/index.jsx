import { useState } from 'react';
import { useSchedule } from '../../hooks/useSchedule.js';

const PLATFORMS = ['Instagram', 'YouTube', 'LinkedIn', 'X (Twitter)', 'Facebook'];

const PLATFORM_COLOR = {
  Instagram: '#E1306C',
  YouTube:   '#FF0000',
  LinkedIn:  '#0077B5',
  'X (Twitter)': '#000000',
  Facebook:  '#1877F2',
};

const STATUS_COLOR = {
  pending:   '#f59e0b',
  published: '#22c55e',
  failed:    '#ef4444',
  cancelled: '#6b7280',
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function getWeekDates(offset = 0) {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay() + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function PostForm({ onSubmit, onClose, initial = {} }) {
  const [platform,    setPlatform]    = useState(initial.platform    || 'Instagram');
  const [caption,     setCaption]     = useState(initial.caption     || '');
  const [hashtags,    setHashtags]    = useState(initial.hashtags?.join(' ') || '');
  const [scheduledAt, setScheduledAt] = useState(initial.scheduled_at
    ? new Date(initial.scheduled_at).toISOString().slice(0, 16)
    : '');
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState(null);

  const handleSubmit = async () => {
    if (!caption || !scheduledAt) {
      setError('Caption and scheduled time are required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        platform,
        caption,
        hashtags: hashtags.split(/\s+/).filter(Boolean),
        scheduledAt: new Date(scheduledAt).toISOString(),
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save post');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '8px 12px', borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.05)',
    color: '#e8ecf5', fontSize: 13, outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: '#1a1f2e', borderRadius: 16,
        border: '1px solid rgba(255,255,255,0.1)',
        padding: 24, width: 480, maxWidth: '90vw',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#e8ecf5', margin: 0 }}>
            {initial.id ? 'Edit post' : 'Schedule new post'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#8892a4', cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>

        {error && (
          <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', color: '#f87171', fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, color: '#8892a4', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Platform</label>
            <select value={platform} onChange={(e) => setPlatform(e.target.value)} style={inputStyle}>
              {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 11, color: '#8892a4', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Caption</label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write your caption..."
              rows={4}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, color: '#8892a4', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Hashtags</label>
            <input
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              placeholder="#socialmedia #marketing #content"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, color: '#8892a4', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Schedule date & time</label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={handleSubmit} disabled={saving} style={{
            flex: 1, padding: '10px', borderRadius: 8, border: 'none',
            background: saving ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.8)',
            color: '#fff', cursor: saving ? 'not-allowed' : 'pointer',
            fontSize: 14, fontWeight: 600,
          }}>
            {saving ? 'Saving...' : initial.id ? 'Update Post' : 'Schedule Post'}
          </button>
          <button onClick={onClose} style={{
            padding: '10px 20px', borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'transparent', color: '#8892a4',
            cursor: 'pointer', fontSize: 14,
          }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Schedule() {
  const { posts, loading, createPost, updatePost, cancelPost } = useSchedule();
  const [weekOffset,  setWeekOffset]  = useState(0);
  const [showForm,    setShowForm]    = useState(false);
  const [editingPost, setEditingPost] = useState(null);

  const weekDates = getWeekDates(weekOffset);
  const today = new Date();

  const getPostsForDay = (date) =>
    posts.filter((p) =>
      p.status !== 'cancelled' && isSameDay(new Date(p.scheduled_at), date)
    );

  const handleCreate = async (data) => { await createPost(data); };
  const handleUpdate = async (data) => { await updatePost(editingPost.id, data); };

  return (
    <div style={{ color: '#e8ecf5' }}>
      {(showForm || editingPost) && (
        <PostForm
          initial={editingPost || {}}
          onSubmit={editingPost ? handleUpdate : handleCreate}
          onClose={() => { setShowForm(false); setEditingPost(null); }}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Content Schedule</h2>
          <p style={{ fontSize: 13, color: '#8892a4', margin: '4px 0 0' }}>
            Plan and schedule your posts across all platforms
          </p>
        </div>
        <button onClick={() => setShowForm(true)} style={{
          padding: '9px 18px', borderRadius: 8, border: 'none',
          background: 'rgba(99,102,241,0.8)', color: '#fff',
          cursor: 'pointer', fontSize: 13, fontWeight: 600,
        }}>
          + Schedule Post
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button onClick={() => setWeekOffset(w => w - 1)} style={{
          padding: '6px 12px', borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.1)',
          background: 'transparent', color: '#8892a4', cursor: 'pointer', fontSize: 13,
        }}>← Prev</button>

        <span style={{ fontSize: 14, fontWeight: 500, color: '#e8ecf5', minWidth: 200, textAlign: 'center' }}>
          {MONTHS[weekDates[0].getMonth()]} {weekDates[0].getDate()} — {MONTHS[weekDates[6].getMonth()]} {weekDates[6].getDate()}, {weekDates[6].getFullYear()}
        </span>

        <button onClick={() => setWeekOffset(w => w + 1)} style={{
          padding: '6px 12px', borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.1)',
          background: 'transparent', color: '#8892a4', cursor: 'pointer', fontSize: 13,
        }}>Next →</button>

        {weekOffset !== 0 && (
          <button onClick={() => setWeekOffset(0)} style={{
            padding: '6px 12px', borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'transparent', color: '#818cf8', cursor: 'pointer', fontSize: 13,
          }}>Today</button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
        {weekDates.map((date, i) => {
          const dayPosts = getPostsForDay(date);
          const isToday  = isSameDay(date, today);
          const isPast   = date < today && !isToday;

          return (
            <div key={i} style={{
              minHeight: 160,
              background: isToday ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${isToday ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.06)'}`,
              borderRadius: 10, padding: 10,
              opacity: isPast ? 0.6 : 1,
            }}>
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: '#8892a4', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {DAYS[date.getDay()]}
                </div>
                <div style={{
                  fontSize: 18, fontWeight: 600,
                  color: isToday ? '#818cf8' : '#e8ecf5',
                }}>
                  {date.getDate()}
                </div>
              </div>

              {loading ? null : dayPosts.map((post) => (
                <div
                  key={post.id}
                  onClick={() => setEditingPost(post)}
                  style={{
                    padding: '6px 8px', borderRadius: 6, marginBottom: 4,
                    background: `${PLATFORM_COLOR[post.platform] || '#888'}22`,
                    borderLeft: `3px solid ${PLATFORM_COLOR[post.platform] || '#888'}`,
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: 10, fontWeight: 600, color: PLATFORM_COLOR[post.platform] || '#888', marginBottom: 2 }}>
                    {post.platform}
                  </div>
                  <div style={{ fontSize: 11, color: '#c8d0e0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {post.caption}
                  </div>
                  <div style={{ fontSize: 10, color: STATUS_COLOR[post.status] || '#888', marginTop: 2 }}>
                    {new Date(post.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {post.status}
                  </div>
                </div>
              ))}

              {!isPast && dayPosts.length === 0 && (
                <div
                  onClick={() => setShowForm(true)}
                  style={{ fontSize: 11, color: 'rgba(255,255,255,0.15)', textAlign: 'center', paddingTop: 20, cursor: 'pointer' }}
                >
                  + add
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 32 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: '#e8ecf5' }}>
          Upcoming posts
        </h3>
        {posts.filter(p => p.status === 'pending').length === 0 ? (
          <div style={{ color: '#8892a4', fontSize: 14 }}>No upcoming scheduled posts.</div>
        ) : (
          posts.filter(p => p.status === 'pending').map((post) => (
            <div key={post.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 16px', marginBottom: 8,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 10,
            }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: PLATFORM_COLOR[post.platform] || '#888', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: '#e8ecf5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {post.caption}
                </div>
                <div style={{ fontSize: 12, color: '#8892a4', marginTop: 2 }}>
                  {post.platform} · {new Date(post.scheduled_at).toLocaleString()}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setEditingPost(post)} style={{
                  padding: '5px 10px', borderRadius: 6,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'transparent', color: '#8892a4',
                  cursor: 'pointer', fontSize: 12,
                }}>Edit</button>
                <button onClick={() => cancelPost(post.id)} style={{
                  padding: '5px 10px', borderRadius: 6,
                  border: '1px solid rgba(239,68,68,0.3)',
                  background: 'transparent', color: '#f87171',
                  cursor: 'pointer', fontSize: 12,
                }}>Cancel</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
