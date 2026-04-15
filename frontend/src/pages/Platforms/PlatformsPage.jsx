import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePlatforms } from '../../hooks/usePlatforms.js';

const PLATFORM_META = {
  instagram: { label: 'Instagram',  color: '#E1306C', icon: '📸' },
  youtube:   { label: 'YouTube',    color: '#FF0000', icon: '▶' },
  linkedin:  { label: 'LinkedIn',   color: '#0077B5', icon: '💼' },
  twitter:   { label: 'X (Twitter)', color: '#000000', icon: '✕' },
  facebook:  { label: 'Facebook',   color: '#1877F2', icon: 'f' },
};

export default function PlatformsPage() {
  const { platforms, loading, connect, disconnect, isConnected, refetch } = usePlatforms();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Refresh after OAuth redirect back
    if (searchParams.get('connected') || searchParams.get('error')) {
      refetch();
    }
  }, [searchParams]);

  const connected = searchParams.get('connected');
  const error = searchParams.get('error');

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: 8 }}>Platform connections</h1>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: 24 }}>
        Connect your social accounts to start syncing post metrics.
      </p>

      {connected && (
        <div style={{
          background: 'var(--color-background-success)',
          color: 'var(--color-text-success)',
          padding: '10px 14px',
          borderRadius: 8,
          marginBottom: 16,
          fontSize: 14,
        }}>
          Successfully connected {PLATFORM_META[connected]?.label || connected}!
        </div>
      )}

      {error && (
        <div style={{
          background: 'var(--color-background-danger)',
          color: 'var(--color-text-danger)',
          padding: '10px 14px',
          borderRadius: 8,
          marginBottom: 16,
          fontSize: 14,
        }}>
          Connection failed: {error.replace(/_/g, ' ')}
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--color-text-secondary)' }}>Loading...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {Object.entries(PLATFORM_META).map(([key, meta]) => {
            const connection = platforms.find((p) => p.platform === key);
            const connected = !!connection;

            return (
              <div key={key} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '14px 16px',
                background: 'var(--color-background-secondary)',
                borderRadius: 12,
                border: '1px solid var(--color-border-tertiary)',
              }}>
                <span style={{ fontSize: 20, width: 28, textAlign: 'center' }}>{meta.icon}</span>

                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{meta.label}</div>
                  {connection && (
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                      @{connection.platform_username}
                      {connection.is_expired && (
                        <span style={{ color: 'var(--color-text-warning)', marginLeft: 6 }}>
                          · Token expired
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {connected ? (
                  <button
                    onClick={() => disconnect(key)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 6,
                      border: '1px solid var(--color-border-secondary)',
                      background: 'transparent',
                      color: 'var(--color-text-secondary)',
                      cursor: 'pointer',
                      fontSize: 13,
                    }}
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={() => connect(key)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 6,
                      border: 'none',
                      background: meta.color,
                      color: '#fff',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 500,
                    }}
                  >
                    Connect
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
