import { useState } from 'react';
import { useContentIdeas } from '../../hooks/useContentIdeas.js';

const PLATFORMS  = ['Instagram', 'YouTube', 'LinkedIn', 'X (Twitter)', 'Facebook'];
const TYPES      = ['Post', 'Reel', 'Carousel', 'Story', 'Video', 'Thread'];
const TONES      = ['Professional', 'Casual', 'Humorous', 'Inspirational', 'Educational', 'Promotional'];
const REACH_COLOR = { high: '#22c55e', medium: '#f59e0b', low: '#ef4444' };

function IdeaCard({ idea, onCopyCaption, onRegenerateCaption }) {
  const [expanded, setExpanded]   = useState(false);
  const [copied, setCopied]       = useState(false);
  const [regenLoading, setRegen]  = useState(false);
  const [currentCaption, setCaption] = useState(idea.caption);

  const copy = async () => {
    await navigator.clipboard.writeText(currentCaption);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const regen = async () => {
    setRegen(true);
    try {
      const caption = await onRegenerateCaption({ hook: idea.hook });
      setCaption(caption);
    } catch {}
    setRegen(false);
  };

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 12,
      padding: 20,
      marginBottom: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 20,
              background: 'rgba(99,102,241,0.15)', color: '#818cf8', fontWeight: 600,
            }}>
              Idea {idea.id}
            </span>
            <span style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 20,
              background: `${REACH_COLOR[idea.estimatedReach] || '#888'}22`,
              color: REACH_COLOR[idea.estimatedReach] || '#888',
            }}>
              {idea.estimatedReach} reach
            </span>
            {idea.format && (
              <span style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 20,
                background: 'rgba(255,255,255,0.06)', color: '#8892a4',
              }}>
                {idea.format}
              </span>
            )}
          </div>

          <div style={{ fontSize: 16, fontWeight: 600, color: '#e8ecf5', marginBottom: 8, lineHeight: 1.4 }}>
            {idea.hook}
          </div>

          {idea.bestTime && (
            <div style={{ fontSize: 12, color: '#8892a4', marginBottom: 12 }}>
              Best time to post: {idea.bestTime}
            </div>
          )}
        </div>

        <button onClick={() => setExpanded(!expanded)} style={{
          padding: '6px 12px', borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.1)',
          background: 'transparent', color: '#8892a4',
          cursor: 'pointer', fontSize: 12, flexShrink: 0,
        }}>
          {expanded ? 'Hide' : 'View Caption'}
        </button>
      </div>

      {expanded && (
        <div style={{ marginTop: 12 }}>
          <div style={{
            background: 'rgba(0,0,0,0.2)',
            borderRadius: 8, padding: 16,
            fontSize: 14, color: '#c8d0e0',
            lineHeight: 1.7, whiteSpace: 'pre-wrap',
            marginBottom: 12,
          }}>
            {currentCaption}
          </div>

          {idea.cta && (
            <div style={{ fontSize: 13, color: '#818cf8', marginBottom: 12 }}>
              CTA: {idea.cta}
            </div>
          )}

          {idea.hashtags?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
              {idea.hashtags.map((tag, i) => (
                <span key={i} style={{
                  fontSize: 12, padding: '3px 8px', borderRadius: 20,
                  background: 'rgba(99,102,241,0.1)', color: '#818cf8',
                }}>
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={copy} style={{
              padding: '7px 14px', borderRadius: 8,
              border: 'none',
              background: copied ? 'rgba(34,197,94,0.15)' : 'rgba(99,102,241,0.15)',
              color: copied ? '#22c55e' : '#818cf8',
              cursor: 'pointer', fontSize: 13, fontWeight: 500,
            }}>
              {copied ? 'Copied!' : 'Copy Caption'}
            </button>
            <button onClick={regen} disabled={regenLoading} style={{
              padding: '7px 14px', borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'transparent', color: '#8892a4',
              cursor: regenLoading ? 'not-allowed' : 'pointer', fontSize: 13,
            }}>
              {regenLoading ? 'Regenerating...' : 'Regenerate'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ContentIdeas() {
  const { ideas, loading, error, generate, generateCaption } = useContentIdeas();

  const [platform,    setPlatform]    = useState('Instagram');
  const [contentType, setContentType] = useState('Post');
  const [tone,        setTone]        = useState('Professional');
  const [topic,       setTopic]       = useState('');

  const handleGenerate = () => {
    generate({ platform, contentType, tone, topic });
  };

  const handleRegenCaption = async ({ hook }) => {
    return await generateCaption({ hook, platform, tone });
  };

  const selectStyle = {
    padding: '8px 12px', borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.05)',
    color: '#e8ecf5', fontSize: 13, cursor: 'pointer',
    outline: 'none',
  };

  return (
    <div style={{ color: '#e8ecf5', maxWidth: 860 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>AI Content Engine</h2>
        <p style={{ fontSize: 13, color: '#8892a4', margin: '4px 0 0' }}>
          Generate content ideas powered by Claude AI, based on your trends and top posts
        </p>
      </div>

      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12, padding: 20, marginBottom: 24,
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, color: '#8892a4', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Platform</label>
            <select value={platform} onChange={(e) => setPlatform(e.target.value)} style={selectStyle}>
              {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, color: '#8892a4', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Content type</label>
            <select value={contentType} onChange={(e) => setContentType(e.target.value)} style={selectStyle}>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, color: '#8892a4', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tone</label>
            <select value={tone} onChange={(e) => setTone(e.target.value)} style={selectStyle}>
              {TONES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 200 }}>
            <label style={{ fontSize: 11, color: '#8892a4', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Topic / niche</label>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. fitness, tech, food, travel..."
              style={{ ...selectStyle, cursor: 'text' }}
            />
          </div>
        </div>

        <button onClick={handleGenerate} disabled={loading} style={{
          padding: '10px 24px', borderRadius: 8, border: 'none',
          background: loading ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.8)',
          color: '#fff', cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: 14, fontWeight: 600,
        }}>
          {loading ? 'Generating with Claude AI...' : 'Generate 5 Content Ideas'}
        </button>
      </div>

      {error && (
        <div style={{
          padding: 16, borderRadius: 10,
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.2)',
          color: '#f87171', fontSize: 14, marginBottom: 16,
        }}>
          {error}
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#8892a4' }}>
          <div style={{ fontSize: 14, marginBottom: 8 }}>Claude AI is generating your content ideas...</div>
          <div style={{ fontSize: 13 }}>This usually takes 10-20 seconds</div>
        </div>
      )}

      {!loading && ideas.length > 0 && (
        <div>
          <div style={{ fontSize: 13, color: '#8892a4', marginBottom: 16 }}>
            {ideas.length} ideas generated for {platform} · {contentType} · {tone} tone
          </div>
          {ideas.map((idea) => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              onRegenerateCaption={handleRegenCaption}
            />
          ))}
        </div>
      )}

      {!loading && ideas.length === 0 && !error && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#8892a4' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>✦</div>
          <div style={{ fontSize: 14, marginBottom: 4 }}>Ready to generate content ideas</div>
          <div style={{ fontSize: 13 }}>Select your preferences above and click Generate</div>
        </div>
      )}
    </div>
  );
}
