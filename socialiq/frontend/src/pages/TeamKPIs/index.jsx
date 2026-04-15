import { useState } from 'react';
import { useTeamKPIs } from '../../hooks/useTeamKPIs.js';

const WEIGHTS = [
  { key: 'engagement_rate', label: 'Engagement Rate', weight: '30%', color: '#818cf8' },
  { key: 'reach_growth',    label: 'Reach Growth',    weight: '25%', color: '#34d399' },
  { key: 'consistency',     label: 'Consistency',     weight: '20%', color: '#f59e0b' },
  { key: 'innovation',      label: 'Innovation',      weight: '15%', color: '#f472b6' },
  { key: 'timeliness',      label: 'Timeliness',      weight: '10%', color: '#60a5fa' },
];

const AVATAR_COLORS = ['#818cf8','#34d399','#f59e0b','#f472b6','#60a5fa','#e1306c','#a78bfa'];

function ScoreRing({ score, size = 60, color = '#818cf8' }) {
  const r   = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5"/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"/>
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
        style={{ fontSize: size * 0.22, fill: '#e8ecf5', fontWeight: 600, transform: `rotate(90deg) translate(0, -${size}px)` }}>
      </text>
    </svg>
  );
}

function MemberCard({ member, rank, onEdit, onRemove }) {
  const score = member.total_score || 0;
  const color = member.avatar_color || '#818cf8';
  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: `1px solid ${rank === 1 ? 'rgba(129,140,248,0.3)' : 'rgba(255,255,255,0.07)'}`,
      borderRadius: 12, padding: 20, marginBottom: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ fontSize: rank <= 3 ? 20 : 14, minWidth: 28, textAlign: 'center', color: '#8892a4' }}>
          {medal}
        </div>

        <div style={{
          width: 42, height: 42, borderRadius: '50%',
          background: color, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 16, fontWeight: 700,
          color: '#fff', flexShrink: 0,
        }}>
          {member.name.charAt(0).toUpperCase()}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#e8ecf5' }}>{member.name}</div>
          <div style={{ fontSize: 12, color: '#8892a4' }}>{member.role} · {member.email}</div>
        </div>

        <div style={{ textAlign: 'center', minWidth: 60 }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: score >= 70 ? '#34d399' : score >= 40 ? '#f59e0b' : '#f87171' }}>
            {score.toFixed(0)}
          </div>
          <div style={{ fontSize: 11, color: '#8892a4' }}>/ 100</div>
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => onEdit(member)} style={{
            padding: '5px 10px', borderRadius: 6,
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'transparent', color: '#8892a4',
            cursor: 'pointer', fontSize: 12,
          }}>Edit</button>
          <button onClick={() => onRemove(member.id)} style={{
            padding: '5px 10px', borderRadius: 6,
            border: '1px solid rgba(239,68,68,0.3)',
            background: 'transparent', color: '#f87171',
            cursor: 'pointer', fontSize: 12,
          }}>Remove</button>
        </div>
      </div>

      {member.total_score !== null && (
        <div style={{ marginTop: 14 }}>
          {WEIGHTS.map(({ key, label, color: c }) => (
            <div key={key} style={{ marginBottom: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 11, color: '#8892a4' }}>{label}</span>
                <span style={{ fontSize: 11, color: c, fontWeight: 600 }}>
                  {(member[key] || 0).toFixed(0)}
                </span>
              </div>
              <div style={{ height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.06)' }}>
                <div style={{
                  height: '100%', borderRadius: 4, background: c,
                  width: `${Math.min(member[key] || 0, 100)}%`,
                  transition: 'width 0.5s ease',
                }} />
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', gap: 16, marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            {[
              { label: 'Posts', value: member.posts_count || 0 },
              { label: 'Likes', value: (member.total_likes || 0).toLocaleString() },
              { label: 'Reach', value: (member.total_reach || 0).toLocaleString() },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#e8ecf5' }}>{value}</div>
                <div style={{ fontSize: 11, color: '#8892a4' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MemberForm({ initial = {}, onSubmit, onClose }) {
  const [name,        setName]        = useState(initial.name        || '');
  const [email,       setEmail]       = useState(initial.email       || '');
  const [role,        setRole]        = useState(initial.role        || 'member');
  const [avatarColor, setAvatarColor] = useState(initial.avatar_color || '#818cf8');
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState(null);

  const handleSubmit = async () => {
    if (!name || !email) { setError('Name and email are required'); return; }
    setSaving(true);
    setError(null);
    try {
      await onSubmit({ name, email, role, avatarColor });
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save member');
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
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#e8ecf5', margin: 0 }}>
            {initial.id ? 'Edit member' : 'Add team member'}
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
            <label style={{ fontSize: 11, color: '#8892a4', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="John Smith" style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: '#8892a4', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@company.com" style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: '#8892a4', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} style={inputStyle}>
              {['member', 'manager', 'admin', 'creator', 'analyst'].map((r) => (
                <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: '#8892a4', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>Avatar color</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {AVATAR_COLORS.map((c) => (
                <div key={c} onClick={() => setAvatarColor(c)} style={{
                  width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer',
                  border: avatarColor === c ? '3px solid #fff' : '3px solid transparent',
                }} />
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={handleSubmit} disabled={saving} style={{
            flex: 1, padding: '10px', borderRadius: 8, border: 'none',
            background: saving ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.8)',
            color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600,
          }}>
            {saving ? 'Saving...' : initial.id ? 'Update' : 'Add Member'}
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

export default function TeamKPIs() {
  const {
    members, loading, calculating, error,
    addMember, updateMember, removeMember, calculateScores,
  } = useTeamKPIs();

  const [showForm,    setShowForm]    = useState(false);
  const [editMember,  setEditMember]  = useState(null);

  const handleAdd    = async (data) => { await addMember(data); };
  const handleUpdate = async (data) => { await updateMember(editMember.id, data); };
  const handleRemove = async (id)   => {
    if (confirm('Remove this team member?')) await removeMember(id);
  };

  const avgScore = members.length
    ? (members.reduce((s, m) => s + (m.total_score || 0), 0) / members.length).toFixed(1)
    : 0;

  return (
    <div style={{ color: '#e8ecf5', maxWidth: 800 }}>
      {(showForm || editMember) && (
        <MemberForm
          initial={editMember || {}}
          onSubmit={editMember ? handleUpdate : handleAdd}
          onClose={() => { setShowForm(false); setEditMember(null); }}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Team KPIs</h2>
          <p style={{ fontSize: 13, color: '#8892a4', margin: '4px 0 0' }}>
            Weekly performance scores — auto-calculated from post data
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={calculateScores} disabled={calculating} style={{
            padding: '8px 16px', borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.1)',
            background: calculating ? 'rgba(255,255,255,0.05)' : 'rgba(52,211,153,0.15)',
            color: calculating ? '#8892a4' : '#34d399',
            cursor: calculating ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 500,
          }}>
            {calculating ? 'Calculating...' : 'Calculate Scores'}
          </button>
          <button onClick={() => setShowForm(true)} style={{
            padding: '8px 16px', borderRadius: 8, border: 'none',
            background: 'rgba(99,102,241,0.8)', color: '#fff',
            cursor: 'pointer', fontSize: 13, fontWeight: 600,
          }}>
            + Add Member
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Team members',  value: members.length },
          { label: 'Avg team score', value: `${avgScore}/100` },
          { label: 'Top performer', value: members[0]?.name?.split(' ')[0] || '—' },
        ].map(({ label, value }) => (
          <div key={label} style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 10, padding: '14px 16px',
          }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#e8ecf5' }}>{value}</div>
            <div style={{ fontSize: 12, color: '#8892a4', marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: '#8892a4', marginBottom: 12 }}>
          Scoring weights: Engagement 30% · Reach 25% · Consistency 20% · Innovation 15% · Timeliness 10%
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#8892a4', fontSize: 14 }}>
          Loading team...
        </div>
      )}

      {error && (
        <div style={{ padding: 16, borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: 14, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {!loading && members.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#8892a4' }}>
          <div style={{ fontSize: 14, marginBottom: 8 }}>No team members yet</div>
          <div style={{ fontSize: 13 }}>Click + Add Member to get started</div>
        </div>
      )}

      {!loading && members.map((member, i) => (
        <MemberCard
          key={member.id}
          member={member}
          rank={i + 1}
          onEdit={(m) => setEditMember(m)}
          onRemove={handleRemove}
        />
      ))}
    </div>
  );
}
