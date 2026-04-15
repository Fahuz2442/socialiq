import Redis from 'ioredis';
import 'dotenv/config';

let redis = null;

try {
  redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 1,
    lazyConnect: true,
    enableOfflineQueue: false,
  });

  redis.on('error', (err) => console.warn('Redis not available:', err.message));
  redis.on('connect', () => console.log('Redis connected'));
} catch (err) {
  console.warn('Redis disabled:', err.message);
}

export default redis;