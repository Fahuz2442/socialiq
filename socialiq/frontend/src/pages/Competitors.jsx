import { useState, useEffect } from 'react';
import api from '../api/client.js';

const PLATFORMS = ['instagram', 'youtube', 'linkedin', 'twitter', 'facebook'];

const PLATFORM_COLOR = {
  instagram: '#E1306C',
  youtube:   '#FF0000',
  linkedin:  '#0077B5',
  twitter:   '#1DA1F2',
  facebook:  '#1877F2',
};

function StatBox({ label, value, color }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: color || '#e8ecf5' }}>{value}</div>
      <div style={{ fontSize: 11, color: '#8892a4', marginTop: 2 }}>{label}</div>
    </div>
  );
}

function CompetitorCard({ competitor, onSync, onRemove, onViewPosts }) {
  const [syncing, setSyncing] = useState(false);
  const color = PLATFORM_COLOR[competitor.platform] || '#888';

  const handleSync = async () => {
    setSyncing(true);
    await onSync(competitor.id);
    setSyncing(false);
  };

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 12, padding: 20, marginBottom: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{
          width: 42, height: 42, borderRadius: '50%',
          background: `${color}22`,
          border: `2px solid ${color}44`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, fontWeight: 700, color, flexShrink: 0,
        }}>
          {competitor.name.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#e8ecf5' }}>{competitor.name}</div>
          <div style={{ fontSize: 12, color, marginTop: 2 }}>
            @{competitor.handle} · {competitor.platform}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={handleSync} disabled={syncing} style={{
            padding: '5px 10px', borderRadius: 6,
            border: '1px solid rgba(255,255,255,0.1)',
            background: syncing ? 'rgba(255,255,255,0.03)' : 'rgba(52,211,153,0.1)',
            color: syncing ? '#8892a4' : '#34d399',
            cursor: syncing ? 'not-allowed' : 'pointer', fontSize: 12,
          }}>
            {syncing ? 'Syncing...' : 'Sync'}
          </button>
          <button onClick={() => onViewPosts(competitor)} style={{
            padding: '5px 10px', borderRadius: 6,
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'transparent', color: '#818cf8',
            cursor: 'pointer', fontSize: 12,
          }}>Posts</button>
          <button onClick={() => onRemove(competitor.id)} style={{
            padding: '5px 10px', borderRadius: 6,
            border: '1px solid rgba(239,68,68,0.3)',
            background: 'transparent', color: '#f87171',
            cursor: 'pointer', fontSize: 12,
          }}>Remove</button>
        </div>
      </div>

      <div style={{
        display: 'flex', justifyContent: 'space-around',
        padding: '12px 0', borderTop: '1px solid rgba(255,255,255,0.05)',
        borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: 12,
      }}>
        <StatBox label="Followers"  value={(competitor.followers  || 0).toLocaleString()} color="#e8ecf5" />
        <StatBox label="Posts"      value={(competitor.total_posts || 0).toLocaleString()} />
        <StatBox label="Avg Likes"  value={(competitor.avg_likes   || 0).toLocaleString()} color="#E1306C" />
        <StatBox label="Avg Comments" value={(competitor.avg_comments || 0).toLocaleString()} color="#818cf8" />
        <StatBox label="Synced Posts" value={competitor.synced_posts || 0} color="#34d399" />
      </div>

      {competitor.last_synced_at ? (
        <div style={{ fontSize: 11, color: '#8892a4' }}>
          Last synced: {new Date(competitor.last_synced_at).toLocaleString()}
        </div>
      ) : (
        <div style={{ fontSize: 11, color: '#8892a4' }}>
          Not synced yet — click Sync to fetch data
        </div>
      )}
    </div>
  );
}

function AddForm({ onSubmit, onClose }) {
  const [name,     setName]     = useState('');
  const [platform, setPlatform] = useState('instagram');
  const [handle,   setHandle]   = useState('');
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState(null);

  const handleSubmit = async () => {
    if (!name || !handle) { setError('Name and handle are required'); return; }
    setSaving(true);
    setError(null);
    try {
      await onSubmit({ name, platform, handle });
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add competitor');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '8px 12px', borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.05)',
    color: '#e8ecf5', fontSize: 13, outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#1a1f2e', borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', padding: 24, width: 420, maxWidth: '90vw' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#e8ecf5', margin: 0 }}>Track competitor</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#8892a4', cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>

        {error && (
          <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', color: '#f87171', fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, color: '#8892a4', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Brand name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nike, Apple, etc." style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: '#8892a4', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Platform</label>
            <select value={platform} onChange={(e) => setPlatform(e.target.value)} style={inputStyle}>
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: '#8892a4', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Handle / username</label>
            <input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@username or channel name" style={inputStyle} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={handleSubmit} disabled={saving} style={{
            flex: 1, padding: '10px', borderRadius: 8, border: 'none',
            background: saving ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.8)',
            color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600,
          }}>
            {saving ? 'Adding...' : 'Track Competitor'}
          </button>
          <button onClick={onClose} style={{
            padding: '10px 20px', borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'transparent', color: '#8892a4', cursor: 'pointer', fontSize: 14,
          }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function PostsModal({ competitor, onClose }) {
  const [posts,   setPosts]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/competitors/${competitor.id}/posts`)
      .then((r) => setPosts(r.data.posts || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [competitor.id]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#1a1f2e', borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', padding: 24, width: 560, maxWidth: '90vw', maxHeight: '80vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#e8ecf5', margin: 0 }}>
            {competitor.name} — recent posts
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#8892a4', cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#8892a4' }}>Loading...</div>
        ) : posts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#8892a4', fontSize: 13 }}>
            No posts synced yet. Click Sync on the competitor card first.
          </div>
        ) : (
          posts.map((post) => (
            <div key={post.id} style={{
              padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}>
              <div style={{ fontSize: 13, color: '#c8d0e0', marginBottom: 6, lineHeight: 1.5,
                overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {post.caption || 'No caption'}
              </div>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#E1306C' }}>{(post.likes || 0).toLocaleString()} likes</span>
                <span style={{ fontSize: 12, color: '#818cf8' }}>{(post.comments || 0).toLocaleString()} comments</span>
                <span style={{ fontSize: 11, color: '#8892a4', marginLeft: 'auto' }}>
                  {post.posted_at ? new Date(post.posted_at).toLocaleDateString() : ''}
                </span>
                {post.permalink && (
                  <a href={post.permalink} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#818cf8' }}>View →</a>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function Competitors() {
  const [competitors, setCompetitors] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showForm,    setShowForm]    = useState(false);
  const [viewPosts,   setViewPosts]   = useState(null);

  useEffect(() => {
    api.get('/competitors')
      .then((r) => setCompetitors(r.data.competitors || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const addCompetitor = async (data) => {
    const { data: res } = await api.post('/competitors', data);
    setCompetitors((prev) => [res.competitor, ...prev]);
  };

  const removeCompetitor = async (id) => {
    if (!confirm('Remove this competitor?')) return;
    await api.delete(`/competitors/${id}`);
    setCompetitors((prev) => prev.filter((c) => c.id !== id));
  };

  const syncCompetitor = async (id) => {
    try {
      await api.post(`/competitors/${id}/sync`);
      const { data } = await api.get('/competitors');
      setCompetitors(data.competitors || []);
    } catch (err) {
      alert(err.response?.data?.error || 'Sync failed');
    }
  };

  return (
    <div style={{ color: '#e8ecf5', maxWidth: 860 }}>
      {showForm && (
        <AddForm onSubmit={addCompetitor} onClose={() => setShowForm(false)} />
      )}
      {viewPosts && (
        <PostsModal competitor={viewPosts} onClose={() => setViewPosts(null)} />
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Competitor Analysis</h2>
          <p style={{ fontSize: 13, color: '#8892a4', margin: '4px 0 0' }}>
            Track and compare competitor social media performance
          </p>
        </div>
        <button onClick={() => setShowForm(true)} style={{
          padding: '9px 18px', borderRadius: 8, border: 'none',
          background: 'rgba(99,102,241,0.8)', color: '#fff',
          cursor: 'pointer', fontSize: 13, fontWeight: 600,
        }}>
          + Track Competitor
        </button>
      </div>

      {competitors.length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          {[
            { label: 'Competitors tracked', value: competitors.length },
            { label: 'Avg competitor followers', value: Math.round(competitors.reduce((s, c) => s + (c.followers || 0), 0) / competitors.length).toLocaleString() },
            { label: 'Avg competitor likes', value: Math.round(competitors.reduce((s, c) => s + parseFloat(c.avg_likes || 0), 0) / competitors.length).toLocaleString() },
          ].map(({ label, value }) => (
            <div key={label} style={{
              flex: 1, minWidth: 160,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 10, padding: '14px 16px',
            }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#e8ecf5' }}>{value}</div>
              <div style={{ fontSize: 12, color: '#8892a4', marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#8892a4', fontSize: 14 }}>
          Loading competitors...
        </div>
      ) : competitors.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#8892a4' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⊕</div>
          <div style={{ fontSize: 14, marginBottom: 4 }}>No competitors tracked yet</div>
          <div style={{ fontSize: 13 }}>Click + Track Competitor to start monitoring your competition</div>
        </div>
      ) : (
        competitors.map((c) => (
          <CompetitorCard
            key={c.id}
            competitor={c}
            onSync={syncCompetitor}
            onRemove={removeCompetitor}
            onViewPosts={setViewPosts}
          />
        ))
      )}
    </div>
  );
}
