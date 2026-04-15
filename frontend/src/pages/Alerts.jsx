import { useState, useEffect } from 'react';
import api from '../api/client.js';

const ALERT_TYPES = {
  token_expired:     { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   icon: '⚠', label: 'Token Expired'      },
  low_engagement:    { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  icon: '↓', label: 'Low Engagement'     },
  high_performance:  { color: '#34d399', bg: 'rgba(52,211,153,0.1)',  icon: '↑', label: 'High Performance'   },
  no_posts:          { color: '#818cf8', bg: 'rgba(129,140,248,0.1)', icon: '!', label: 'No Posts'           },
  scheduled_soon:    { color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',  icon: '🕐', label: 'Scheduled Soon'   },
  sync_needed:       { color: '#f472b6', bg: 'rgba(244,114,182,0.1)', icon: '↻', label: 'Sync Needed'       },
};

function AlertCard({ alert, onDismiss }) {
  const type = ALERT_TYPES[alert.type] || ALERT_TYPES.sync_needed;

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 14,
      padding: 16, borderRadius: 12, marginBottom: 10,
      background: type.bg,
      border: `1px solid ${type.color}33`,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: `${type.color}22`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, color: type.color, flexShrink: 0,
      }}>
        {type.icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: type.color }}>{type.label}</span>
          <span style={{ fontSize: 11, color: '#8892a4' }}>{alert.time}</span>
        </div>
        <div style={{ fontSize: 13, color: '#c8d0e0', lineHeight: 1.5 }}>{alert.message}</div>
        {alert.action && (
          <a href={alert.actionUrl || '#'} style={{
            display: 'inline-block', marginTop: 8,
            fontSize: 12, color: type.color, textDecoration: 'none', fontWeight: 500,
          }}>
            {alert.action} →
          </a>
        )}
      </div>
      <button onClick={() => onDismiss(alert.id)} style={{
        background: 'none', border: 'none', color: '#8892a4',
        cursor: 'pointer', fontSize: 16, padding: 4, flexShrink: 0,
      }}>✕</button>
    </div>
  );
}

function generateAlerts(platforms, posts, scheduledPosts) {
  const alerts = [];
  const now = new Date();

  // Check for expired tokens
  platforms.forEach((p) => {
    if (p.is_expired) {
      alerts.push({
        id: `expired-${p.platform}`,
        type: 'token_expired',
        message: `Your ${p.platform} token has expired. Reconnect to continue syncing data.`,
        action: 'Reconnect',
        actionUrl: '/settings/platforms',
        time: 'Now',
        priority: 1,
      });
    }
  });

  // Check for no posts synced
  if (platforms.length > 0 && posts.length === 0) {
    alerts.push({
      id: 'no-posts',
      type: 'no_posts',
      message: 'No posts have been synced yet. Go to your connected platforms and trigger a sync.',
      action: 'Sync now',
      actionUrl: '/settings/platforms',
      time: 'Now',
      priority: 2,
    });
  }

  // Check for no platforms connected
  if (platforms.length === 0) {
    alerts.push({
      id: 'no-platforms',
      type: 'sync_needed',
      message: 'No social media platforms connected. Connect at least one platform to start tracking performance.',
      action: 'Connect platforms',
      actionUrl: '/settings/platforms',
      time: 'Now',
      priority: 1,
    });
  }

  // Check for high performing posts
  const topPost = posts.find((p) => p.engagement_rate > 0.05);
  if (topPost) {
    alerts.push({
      id: `top-${topPost.id}`,
      type: 'high_performance',
      message: `Your ${topPost.platform} post is performing above average with ${(topPost.engagement_rate * 100).toFixed(1)}% engagement rate!`,
      time: 'This week',
      priority: 3,
    });
  }

  // Check for low engagement posts
  const lowPost = posts.find((p) => p.engagement_rate !== null && p.engagement_rate < 0.01 && p.reach > 100);
  if (lowPost) {
    alerts.push({
      id: `low-${lowPost.id}`,
      type: 'low_engagement',
      message: `A recent ${lowPost.platform} post has low engagement (${(lowPost.engagement_rate * 100).toFixed(2)}%). Consider boosting or revisiting your content strategy.`,
      time: 'This week',
      priority: 2,
    });
  }

  // Check for scheduled posts in next 2 hours
  const soon = scheduledPosts.filter((p) => {
    const diff = new Date(p.scheduled_at) - now;
    return diff > 0 && diff < 2 * 60 * 60 * 1000 && p.status === 'pending';
  });
  if (soon.length > 0) {
    alerts.push({
      id: 'scheduled-soon',
      type: 'scheduled_soon',
      message: `You have ${soon.length} post${soon.length > 1 ? 's' : ''} scheduled in the next 2 hours on ${soon.map(p => p.platform).join(', ')}.`,
      action: 'View schedule',
      actionUrl: '/schedule',
      time: 'Upcoming',
      priority: 2,
    });
  }

  // Sync reminder if last sync was more than 24 hours ago
  const lastSync = posts[0]?.synced_at;
  if (lastSync) {
    const hoursSinceSync = (now - new Date(lastSync)) / (1000 * 60 * 60);
    if (hoursSinceSync > 24) {
      alerts.push({
        id: 'sync-needed',
        type: 'sync_needed',
        message: `Your posts haven't been synced in ${Math.floor(hoursSinceSync)} hours. Sync to get the latest metrics.`,
        time: `${Math.floor(hoursSinceSync)}h ago`,
        priority: 2,
      });
    }
  }

  return alerts.sort((a, b) => a.priority - b.priority);
}

export default function Alerts() {
  const [alerts,    setAlerts]    = useState([]);
  const [dismissed, setDismissed] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [platformsRes, postsRes, scheduleRes] = await Promise.allSettled([
          api.get('/auth/platforms'),
          api.get('/posts?limit=20'),
          api.get('/schedule?status=pending'),
        ]);

        const platforms      = platformsRes.status  === 'fulfilled' ? platformsRes.value.data.platforms   || [] : [];
        const posts          = postsRes.status       === 'fulfilled' ? postsRes.value.data.posts            || [] : [];
        const scheduledPosts = scheduleRes.status    === 'fulfilled' ? scheduleRes.value.data.posts         || [] : [];

        const generated = generateAlerts(platforms, posts, scheduledPosts);
        setAlerts(generated);
      } catch (err) {
        console.error('Alerts fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const dismiss = (id) => setDismissed((prev) => [...prev, id]);

  const visible = alerts.filter((a) => {
    if (dismissed.includes(a.id)) return false;
    if (filter === 'all') return true;
    return a.type === filter;
  });

  const counts = {};
  alerts.forEach((a) => { counts[a.type] = (counts[a.type] || 0) + 1; });

  const btnStyle = (active) => ({
    padding: '6px 14px', borderRadius: 20, border: 'none',
    background: active ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)',
    color: active ? '#818cf8' : '#8892a4',
    cursor: 'pointer', fontSize: 13,
    fontWeight: active ? 600 : 400,
  });

  return (
    <div style={{ color: '#e8ecf5', maxWidth: 800 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Alerts</h2>
          <p style={{ fontSize: 13, color: '#8892a4', margin: '4px 0 0' }}>
            Smart notifications based on your account activity
          </p>
        </div>
        {visible.length > 0 && (
          <button onClick={() => setDismissed(alerts.map((a) => a.id))} style={{
            padding: '7px 14px', borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'transparent', color: '#8892a4',
            cursor: 'pointer', fontSize: 13,
          }}>
            Dismiss all
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <button onClick={() => setFilter('all')} style={btnStyle(filter === 'all')}>
          All {alerts.length > 0 && `(${alerts.length})`}
        </button>
        {Object.entries(ALERT_TYPES).map(([key, { label }]) => counts[key] ? (
          <button key={key} onClick={() => setFilter(key)} style={btnStyle(filter === key)}>
            {label} ({counts[key]})
          </button>
        ) : null)}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#8892a4', fontSize: 14 }}>
          Checking for alerts...
        </div>
      ) : visible.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#8892a4' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
          <div style={{ fontSize: 14, marginBottom: 4 }}>All clear!</div>
          <div style={{ fontSize: 13 }}>No alerts at the moment. Keep up the great work!</div>
        </div>
      ) : (
        visible.map((alert) => (
          <AlertCard key={alert.id} alert={alert} onDismiss={dismiss} />
        ))
      )}
    </div>
  );
}
