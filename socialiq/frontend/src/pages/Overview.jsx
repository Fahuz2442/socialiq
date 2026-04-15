import { useState, useEffect } from 'react';
import api from '../api/client.js';

const PLATFORM_COLOR = {
  instagram: '#E1306C',
  youtube:   '#FF0000',
  linkedin:  '#0077B5',
  twitter:   '#1DA1F2',
  facebook:  '#1877F2',
};

function KPICard({ label, value, sub, color }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 12, padding: '18px 20px', flex: 1,
    }}>
      <div style={{ fontSize: 12, color: '#8892a4', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: color || '#e8ecf5' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: '#8892a4', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function PlatformRow({ item }) {
  const color = PLATFORM_COLOR[item.platform] || '#888';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 16px',
      background: 'rgba(255,255,255,0.02)',
      borderRadius: 10, marginBottom: 8,
      border: '1px solid rgba(255,255,255,0.05)',
    }}>
      <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: '#e8ecf5', textTransform: 'capitalize' }}>
        {item.platform}
      </div>
      <div style={{ display: 'flex', gap: 24 }}>
        {[
          { label: 'Posts',   value: item.total_posts || 0 },
          { label: 'Likes',   value: (item.total_likes || 0).toLocaleString() },
          { label: 'Reach',   value: (item.total_reach || 0).toLocaleString() },
          { label: 'Engage',  value: `${((item.avg_engagement_rate || 0) * 100).toFixed(2)}%` },
        ].map(({ label, value }) => (
          <div key={label} style={{ textAlign: 'right', minWidth: 60 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#e8ecf5' }}>{value}</div>
            <div style={{ fontSize: 11, color: '#8892a4' }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecentPost({ post }) {
  const color = PLATFORM_COLOR[post.platform] || '#888';
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12,
      padding: '12px 0',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
    }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0, marginTop: 4 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: '#c8d0e0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {post.caption || 'No caption'}
        </div>
        <div style={{ fontSize: 11, color: '#8892a4', marginTop: 3 }}>
          {post.platform} · {post.likes || 0} likes · {post.comments || 0} comments
          · {post.posted_at ? new Date(post.posted_at).toLocaleDateString() : ''}
        </div>
      </div>
    </div>
  );
}

export default function Overview() {
  const [summary,   setSummary]   = useState([]);
  const [posts,     setPosts]     = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [summaryRes, postsRes, platformsRes] = await Promise.allSettled([
          api.get('/posts/metrics/summary'),
          api.get('/posts?limit=5'),
          api.get('/auth/platforms'),
        ]);
        if (summaryRes.status   === 'fulfilled') setSummary(summaryRes.value.data.summary || []);
        if (postsRes.status     === 'fulfilled') setPosts(postsRes.value.data.posts || []);
        if (platformsRes.status === 'fulfilled') setPlatforms(platformsRes.value.data.platforms || []);
      } catch (err) {
        console.error('Overview fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const totalLikes      = summary.reduce((s, p) => s + parseInt(p.total_likes    || 0), 0);
  const totalReach      = summary.reduce((s, p) => s + parseInt(p.total_reach    || 0), 0);
  const totalPosts      = summary.reduce((s, p) => s + parseInt(p.total_posts    || 0), 0);
  const totalImpressions = summary.reduce((s, p) => s + parseInt(p.total_impressions || 0), 0);

  return (
    <div style={{ color: '#e8ecf5', maxWidth: 900 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Dashboard Overview</h2>
        <p style={{ fontSize: 13, color: '#8892a4', margin: '4px 0 0' }}>
          Your social media performance at a glance
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#8892a4', fontSize: 14 }}>Loading...</div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
            <KPICard label="Connected platforms" value={platforms.length} sub="active accounts" color="#818cf8" />
            <KPICard label="Total posts synced"  value={totalPosts.toLocaleString()} sub="across all platforms" />
            <KPICard label="Total likes"          value={totalLikes.toLocaleString()} sub="all time" color="#E1306C" />
            <KPICard label="Total reach"          value={totalReach.toLocaleString()} sub="unique accounts" color="#34d399" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: '#e8ecf5' }}>
                Platform breakdown
              </h3>
              {summary.length === 0 ? (
                <div style={{ color: '#8892a4', fontSize: 13 }}>
                  No data yet — connect platforms and sync posts.
                </div>
              ) : (
                summary.map((item) => <PlatformRow key={item.platform} item={item} />)
              )}
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: '#e8ecf5' }}>
                Connected accounts
              </h3>
              {platforms.length === 0 ? (
                <div style={{ color: '#8892a4', fontSize: 13 }}>
                  No platforms connected yet.
                  <a href="/settings/platforms" style={{ color: '#818cf8', marginLeft: 4 }}>Connect now →</a>
                </div>
              ) : (
                platforms.map((p) => (
                  <div key={p.platform} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: PLATFORM_COLOR[p.platform] || '#888' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#e8ecf5', textTransform: 'capitalize' }}>
                        {p.platform}
                      </div>
                      <div style={{ fontSize: 11, color: '#8892a4' }}>
                        @{p.platform_username}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'rgba(52,211,153,0.1)', color: '#34d399' }}>
                      connected
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: '#e8ecf5' }}>
              Recent posts
            </h3>
            {posts.length === 0 ? (
              <div style={{ color: '#8892a4', fontSize: 13 }}>
                No posts synced yet — go to Settings and sync your platforms.
              </div>
            ) : (
              posts.map((post) => <RecentPost key={post.id} post={post} />)
            )}
          </div>
        </>
      )}
    </div>
  );
}
