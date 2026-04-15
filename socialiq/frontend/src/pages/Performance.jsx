import { useState, useEffect } from 'react';
import api from '../api/client.js';

const PLATFORM_COLOR = {
  instagram: '#E1306C',
  youtube:   '#FF0000',
  linkedin:  '#0077B5',
  twitter:   '#1DA1F2',
  facebook:  '#1877F2',
};

const METRICS = [
  { key: 'likes',           label: 'Likes',            color: '#E1306C' },
  { key: 'comments',        label: 'Comments',         color: '#818cf8' },
  { key: 'shares',          label: 'Shares',           color: '#34d399' },
  { key: 'reach',           label: 'Reach',            color: '#f59e0b' },
  { key: 'impressions',     label: 'Impressions',      color: '#60a5fa' },
  { key: 'engagement_rate', label: 'Engagement Rate',  color: '#f472b6' },
];

function MetricBar({ label, value, max, color }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: '#8892a4' }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#e8ecf5' }}>
          {typeof value === 'number' && value < 1 ? `${(value * 100).toFixed(2)}%` : value?.toLocaleString()}
        </span>
      </div>
      <div style={{ height: 6, borderRadius: 6, background: 'rgba(255,255,255,0.06)' }}>
        <div style={{ height: '100%', borderRadius: 6, background: color, width: `${pct}%`, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
}

function PostCard({ post }) {
  const color = PLATFORM_COLOR[post.platform] || '#888';
  const engagement = post.engagement_rate ? `${(post.engagement_rate * 100).toFixed(2)}%` : '—';

  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 10, padding: 16, marginBottom: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
        <span style={{ fontSize: 11, color, fontWeight: 600, textTransform: 'capitalize' }}>{post.platform}</span>
        <span style={{ fontSize: 11, color: '#8892a4', marginLeft: 'auto' }}>
          {post.posted_at ? new Date(post.posted_at).toLocaleDateString() : ''}
        </span>
      </div>
      <div style={{ fontSize: 13, color: '#c8d0e0', marginBottom: 10, lineHeight: 1.5,
        overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
        {post.caption || 'No caption'}
      </div>
      <div style={{ display: 'flex', gap: 16 }}>
        {[
          { label: 'Likes',    value: post.likes        || 0 },
          { label: 'Comments', value: post.comments     || 0 },
          { label: 'Shares',   value: post.shares       || 0 },
          { label: 'Reach',    value: post.reach        || 0 },
          { label: 'Engage',   value: engagement },
        ].map(({ label, value }) => (
          <div key={label}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#e8ecf5' }}>
              {typeof value === 'number' ? value.toLocaleString() : value}
            </div>
            <div style={{ fontSize: 11, color: '#8892a4' }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Performance() {
  const [posts,    setPosts]    = useState([]);
  const [summary,  setSummary]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [platform, setPlatform] = useState('all');
  const [sortBy,   setSortBy]   = useState('likes');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = platform !== 'all' ? { platform } : {};
        const [postsRes, summaryRes] = await Promise.allSettled([
          api.get('/posts', { params: { ...params, limit: 50 } }),
          api.get('/posts/metrics/summary'),
        ]);
        if (postsRes.status   === 'fulfilled') setPosts(postsRes.value.data.posts || []);
        if (summaryRes.status === 'fulfilled') setSummary(summaryRes.value.data.summary || []);
      } catch (err) {
        console.error('Performance fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [platform]);

  const sortedPosts = [...posts].sort((a, b) => {
    if (sortBy === 'engagement_rate') return (b.engagement_rate || 0) - (a.engagement_rate || 0);
    return (b[sortBy] || 0) - (a[sortBy] || 0);
  });

  const maxValues = {};
  METRICS.forEach(({ key }) => {
    maxValues[key] = Math.max(...summary.map((s) => parseFloat(s[`total_${key}`] || s[key] || 0)));
  });

  const platforms = ['all', ...new Set(posts.map((p) => p.platform))];

  const btnStyle = (active) => ({
    padding: '6px 14px', borderRadius: 20, border: 'none',
    background: active ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)',
    color: active ? '#818cf8' : '#8892a4',
    cursor: 'pointer', fontSize: 13,
    fontWeight: active ? 600 : 400,
  });

  return (
    <div style={{ color: '#e8ecf5', maxWidth: 900 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Performance</h2>
        <p style={{ fontSize: 13, color: '#8892a4', margin: '4px 0 0' }}>
          Detailed metrics across all your posts and platforms
        </p>
      </div>

      {summary.length > 0 && (
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: '#e8ecf5' }}>Platform comparison</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
            {summary.map((item) => (
              <div key={item.platform}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: PLATFORM_COLOR[item.platform] || '#888' }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#e8ecf5', textTransform: 'capitalize' }}>{item.platform}</span>
                  <span style={{ fontSize: 11, color: '#8892a4', marginLeft: 'auto' }}>{item.total_posts} posts</span>
                </div>
                <MetricBar label="Likes"       value={parseInt(item.total_likes       || 0)} max={Math.max(...summary.map(s => parseInt(s.total_likes       || 0)))} color="#E1306C" />
                <MetricBar label="Comments"    value={parseInt(item.total_comments    || 0)} max={Math.max(...summary.map(s => parseInt(s.total_comments    || 0)))} color="#818cf8" />
                <MetricBar label="Reach"       value={parseInt(item.total_reach       || 0)} max={Math.max(...summary.map(s => parseInt(s.total_reach       || 0)))} color="#f59e0b" />
                <MetricBar label="Impressions" value={parseInt(item.total_impressions || 0)} max={Math.max(...summary.map(s => parseInt(s.total_impressions || 0)))} color="#60a5fa" />
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {platforms.map((p) => (
            <button key={p} onClick={() => setPlatform(p)} style={btnStyle(platform === p)}>
              {p === 'all' ? 'All' : p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#8892a4' }}>Sort by</span>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{
            padding: '5px 10px', borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.05)',
            color: '#e8ecf5', fontSize: 12, cursor: 'pointer',
          }}>
            <option value="likes">Likes</option>
            <option value="comments">Comments</option>
            <option value="shares">Shares</option>
            <option value="reach">Reach</option>
            <option value="engagement_rate">Engagement Rate</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#8892a4', fontSize: 14 }}>Loading posts...</div>
      ) : sortedPosts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#8892a4' }}>
          <div style={{ fontSize: 14, marginBottom: 8 }}>No posts found</div>
          <div style={{ fontSize: 13 }}>Connect your platforms and sync posts to see performance data.</div>
        </div>
      ) : (
        sortedPosts.map((post) => <PostCard key={post.id} post={post} />)
      )}
    </div>
  );
}
