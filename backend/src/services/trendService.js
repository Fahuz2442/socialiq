import axios from 'axios';
import { getToken } from './tokenStore.js';

const GRAPH = 'https://graph.instagram.com';
const YT    = 'https://www.googleapis.com/youtube/v3';

async function fetchInstagramTrends(userId) {
  try {
    const token = await getToken(userId, 'instagram');
    if (!token) return [];

    const { data } = await axios.get(`${GRAPH}/me/media`, {
      params: {
        fields: 'caption,like_count,comments_count,timestamp',
        limit: 50,
        access_token: token.accessToken,
      },
    });

    const hashtagMap = {};
    for (const post of data.data || []) {
      const tags = (post.caption || '').match(/#[\w]+/g) || [];
      for (const tag of tags) {
        if (!hashtagMap[tag]) {
          hashtagMap[tag] = { tag, count: 0, likes: 0, platform: 'instagram' };
        }
        hashtagMap[tag].count++;
        hashtagMap[tag].likes += post.like_count || 0;
      }
    }

    return Object.values(hashtagMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  } catch (err) {
    console.warn('Instagram trends failed:', err.message);
    return [];
  }
}

async function fetchYoutubeTrends(userId) {
  try {
    const token = await getToken(userId, 'youtube');
    if (!token) return [];

    const { data } = await axios.get(`${YT}/videos`, {
      params: {
        part: 'snippet,statistics',
        chart: 'mostPopular',
        maxResults: 20,
        regionCode: 'US',
      },
      headers: { Authorization: `Bearer ${token.accessToken}` },
    });

    return (data.items || []).map((v) => ({
      tag: v.snippet.title,
      count: parseInt(v.statistics.viewCount || 0),
      likes: parseInt(v.statistics.likeCount || 0),
      platform: 'youtube',
      thumbnail: v.snippet.thumbnails?.default?.url,
    }));
  } catch (err) {
    console.warn('YouTube trends failed:', err.message);
    return [];
  }
}

async function fetchTwitterTrends(userId) {
  try {
    const token = await getToken(userId, 'twitter');
    if (!token) return [];

    const { data } = await axios.get(
      'https://api.twitter.com/2/tweets/search/recent',
      {
        params: {
          query: 'lang:en -is:retweet',
          max_results: 100,
          'tweet.fields': 'public_metrics,entities',
        },
        headers: { Authorization: `Bearer ${token.accessToken}` },
      }
    );

    const hashtagMap = {};
    for (const tweet of data.data || []) {
      for (const { tag } of tweet.entities?.hashtags || []) {
        const key = `#${tag.toLowerCase()}`;
        if (!hashtagMap[key]) {
          hashtagMap[key] = { tag: key, count: 0, likes: 0, platform: 'twitter' };
        }
        hashtagMap[key].count++;
        hashtagMap[key].likes += tweet.public_metrics?.like_count || 0;
      }
    }

    return Object.values(hashtagMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  } catch (err) {
    console.warn('Twitter trends failed:', err.message);
    return [];
  }
}

export async function fetchAllTrends(userId) {
  const [instagram, youtube, twitter] = await Promise.allSettled([
    fetchInstagramTrends(userId),
    fetchYoutubeTrends(userId),
    fetchTwitterTrends(userId),
  ]);

  return {
    instagram: instagram.status === 'fulfilled' ? instagram.value : [],
    youtube:   youtube.status   === 'fulfilled' ? youtube.value   : [],
    twitter:   twitter.status   === 'fulfilled' ? twitter.value   : [],
    fetchedAt: new Date().toISOString(),
  };
}
