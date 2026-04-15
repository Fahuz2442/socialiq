import { useState } from 'react';
import { useTrends } from '../../hooks/useTrends.js';

const PLATFORM_COLOR = {
  instagram: '#E1306C',
  twitter:   '#1DA1F2',
  youtube:   '#FF0000',
};

const PLATFORM_LABEL = {
  instagram: 'Instagram',
  twitter:   'X',
  youtube:   'YouTube',
};

function TrendCard({ item, rank }) {
  const color = PLATFORM_COLOR[item.platform] || '#888';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 16px',
      background: 'rgba(255,255,255,0.03)',
      borderRadius: 10,
      border: '1px solid rgba(255,255,255,0.07)',
      marginBottom: 8,
    }}>
      <span style={{
        width: 28, height: 28, borderRadius: '50%',
        background: 'rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, color: '#8892a4', flexShrink: 0,
      }}>
        {rank}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: '#e8ecf5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.tag}
        </div>
        <div style={{ fontSize: 12, color: '#8892a4', marginTop: 2 }}>
          {item.count?.toLocaleString()} mentions
          {item.likes > 0 && ` · ${item.likes?.toLocaleString()} likes`}
        </div>
      </div>
      <span style={{
        fontSize: 11, padding: '3px 8px', borderRadius: 20,
        background: `${color}22`, color, fontWeight: 500, flexShrink: 0,
      }}>
        {PLATFORM_LABEL[item.platform] || item.platform}
      </span>
    </div>
  );
}

function PlatformSection({ title, items, color }) {
  if (!items || items.length === 0) return null;
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: '#8892a4', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {title}
        </span>
        <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 20, background: 'rgba(255,255,255,0.06)', color: '#8892a4' }}>
          {items.length}
        </span>
      </div>
      {items.slice(0, 10).map((item, i) => (
        <TrendCard key={`${item.tag}-${i}`} item={item} rank={i + 1} />
      ))}
    </div>
  );
}

export default function Trends() {
  const { trends, allTrends, loading, syncing, error, source, sync } = useTrends();
  const [activeTab, setActiveTab] = useState('all');

  const tabs = [
    { id: 'all',       label: 'All' },
    { id: 'instagram', label: 'Instagram' },
    { id: 'twitter',   label: 'X (Twitter)' },
    { id: 'youtube',   label: 'YouTube' },
  ];

  const getTabData = () => {
    if (!trends) return [];
    if (activeTab === 'all') return allTrends;
    return trends[activeTab] || [];
  };

  return (
    <div style={{ color: '#e8ecf5', maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Trend Intelligence</h2>
          <p style={{ fontSize: 13, color: '#8892a4', margin: '4px 0 0' }}>
            {source === 'cache' ? 'Cached trends (updates hourly)' : 'Live trends from connected platforms'}
          </p>
        </div>
        <button onClick={sync} disabled={syncing} style={{
          padding: '8px 16px', borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.12)',
          background: syncing ? 'rgba(255,255,255,0.05)' : 'rgba(99,102,241,0.15)',
          color: syncing ? '#8892a4' : '#818cf8',
          cursor: syncing ? 'not-allowed' : 'pointer',
          fontSize: 13, fontWeight: 500,
        }}>
          {syncing ? 'Syncing...' : 'Sync Now'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding: '6px 14px', borderRadius: 20, border: 'none',
            background: activeTab === tab.id ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)',
            color: activeTab === tab.id ? '#818cf8' : '#8892a4',
            cursor: 'pointer', fontSize: 13,
            fontWeight: activeTab === tab.id ? 600 : 400,
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#8892a4', fontSize: 14 }}>
          Loading trends...
        </div>
      )}

      {error && (
        <div style={{
          padding: 16, borderRadius: 10,
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.2)',
          color: '#f87171', fontSize: 14, marginBottom: 16,
        }}>
          {error} — Make sure your social platforms are connected.
        </div>
      )}

      {!loading && !error && (
        activeTab === 'all' ? (
          <>
            <PlatformSection title="Instagram" items={trends?.instagram} color={PLATFORM_COLOR.instagram} />
            <PlatformSection title="X (Twitter)" items={trends?.twitter} color={PLATFORM_COLOR.twitter} />
            <PlatformSection title="YouTube" items={trends?.youtube} color={PLATFORM_COLOR.youtube} />
            {allTrends.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#8892a4' }}>
                <div style={{ fontSize: 14, marginBottom: 8 }}>No trends found</div>
                <div style={{ fontSize: 13 }}>Connect your platforms and click Sync Now.</div>
              </div>
            )}
          </>
        ) : (
          <>
            {getTabData().slice(0, 20).map((item, i) => (
              <TrendCard key={`${item.tag}-${i}`} item={item} rank={i + 1} />
            ))}
            {getTabData().length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#8892a4' }}>
                <div style={{ fontSize: 14 }}>No {activeTab} trends yet</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>Connect your {activeTab} account and click Sync Now.</div>
              </div>
            )}
          </>
        )
      )}
    </div>
  );
}
