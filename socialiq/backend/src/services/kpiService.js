import { db } from '../db/client.js';

const WEIGHTS = {
  engagement_rate: 0.30,
  reach_growth:    0.25,
  consistency:     0.20,
  innovation:      0.15,
  timeliness:      0.10,
};

function getWeekStart(date = new Date()) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function calculateScore({ engagement_rate, reach_growth, consistency, innovation, timeliness }) {
  return (
    engagement_rate * WEIGHTS.engagement_rate +
    reach_growth    * WEIGHTS.reach_growth +
    consistency     * WEIGHTS.consistency +
    innovation      * WEIGHTS.innovation +
    timeliness      * WEIGHTS.timeliness
  );
}

// ─── Calculate scores for a member based on their posts ───────
export async function calculateMemberScore(memberId, ownerId, weekStart) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const { rows: posts } = await db.query(
    `SELECT pm.likes, pm.comments, pm.shares, pm.reach,
            pm.impressions, pm.engagement_rate, p.posted_at, p.content_type
     FROM posts p
     JOIN LATERAL (
       SELECT * FROM post_metrics
       WHERE post_id = p.id
       ORDER BY recorded_at DESC LIMIT 1
     ) pm ON true
     WHERE p.user_id = $1
       AND p.posted_at >= $2
       AND p.posted_at < $3`,
    [ownerId, weekStart, weekEnd]
  );

  if (!posts.length) {
    return {
      engagement_rate: 0,
      reach_growth:    0,
      consistency:     0,
      innovation:      0,
      timeliness:      0,
      total_score:     0,
      posts_count:     0,
      total_likes:     0,
      total_comments:  0,
      total_reach:     0,
    };
  }

  const totalLikes    = posts.reduce((s, p) => s + (p.likes    || 0), 0);
  const totalComments = posts.reduce((s, p) => s + (p.comments || 0), 0);
  const totalReach    = posts.reduce((s, p) => s + (p.reach    || 0), 0);
  const avgEngagement = posts.reduce((s, p) => s + parseFloat(p.engagement_rate || 0), 0) / posts.length;

  // Engagement rate score (0-100): avg engagement * 100, capped at 100
  const engagementScore = Math.min(avgEngagement * 100 * 10, 100);

  // Reach growth score (0-100): based on total reach
  const reachScore = Math.min((totalReach / 1000) * 10, 100);

  // Consistency score (0-100): posts per week (7 = perfect = 100)
  const consistencyScore = Math.min((posts.length / 7) * 100, 100);

  // Innovation score (0-100): variety of content types
  const contentTypes = new Set(posts.map((p) => p.content_type).filter(Boolean));
  const innovationScore = Math.min(contentTypes.size * 25, 100);

  // Timeliness score (0-100): based on having posts across different days
  const postDays = new Set(posts.map((p) => new Date(p.posted_at).getDay()));
  const timelinessScore = Math.min((postDays.size / 7) * 100, 100);

  const totalScore = calculateScore({
    engagement_rate: engagementScore,
    reach_growth:    reachScore,
    consistency:     consistencyScore,
    innovation:      innovationScore,
    timeliness:      timelinessScore,
  });

  return {
    engagement_rate: parseFloat(engagementScore.toFixed(2)),
    reach_growth:    parseFloat(reachScore.toFixed(2)),
    consistency:     parseFloat(consistencyScore.toFixed(2)),
    innovation:      parseFloat(innovationScore.toFixed(2)),
    timeliness:      parseFloat(timelinessScore.toFixed(2)),
    total_score:     parseFloat(totalScore.toFixed(2)),
    posts_count:     posts.length,
    total_likes:     totalLikes,
    total_comments:  totalComments,
    total_reach:     totalReach,
  };
}

// ─── Calculate + save scores for all members ──────────────────
export async function calculateAllScores(ownerId) {
  const { rows: members } = await db.query(
    'SELECT * FROM team_members WHERE owner_id = $1',
    [ownerId]
  );

  const weekStart = getWeekStart();
  const results   = [];

  for (const member of members) {
    const scores = await calculateMemberScore(member.id, ownerId, weekStart);

    await db.query(
      `INSERT INTO kpi_scores
         (member_id, owner_id, week_start, engagement_rate, reach_growth,
          consistency, innovation, timeliness, total_score,
          posts_count, total_likes, total_comments, total_reach)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (member_id, week_start) DO UPDATE SET
         engagement_rate = EXCLUDED.engagement_rate,
         reach_growth    = EXCLUDED.reach_growth,
         consistency     = EXCLUDED.consistency,
         innovation      = EXCLUDED.innovation,
         timeliness      = EXCLUDED.timeliness,
         total_score     = EXCLUDED.total_score,
         posts_count     = EXCLUDED.posts_count,
         total_likes     = EXCLUDED.total_likes,
         total_comments  = EXCLUDED.total_comments,
         total_reach     = EXCLUDED.total_reach,
         calculated_at   = NOW()`,
      [
        member.id, ownerId, weekStart.toISOString().split('T')[0],
        scores.engagement_rate, scores.reach_growth, scores.consistency,
        scores.innovation, scores.timeliness, scores.total_score,
        scores.posts_count, scores.total_likes, scores.total_comments, scores.total_reach,
      ]
    );

    results.push({ member, scores });
  }

  return results;
}
