import { CacheModuleAsyncOptions } from "@nestjs/cache-manager";
import { redisStore } from "cache-manager-redis-store";

export const CacheRedisOptions: CacheModuleAsyncOptions = {
    isGlobal: true,
    useFactory: async () => {
      const store = await redisStore({
        socket: {
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 10001,
        },
        ttl: process.env.REDIS_CACHE_TTL?  Number(process.env.REDIS_CACHE_TTL) :  60 * 60,
        database: process.env.REDIS_DATABASE?  Number(process.env.REDIS_DATABASE) : 0,
        username: process.env.REDIS_USERNAME || '',
        password: process.env.REDIS_PASSWORD || '',
      });
      return {
        store: () => store
      };
    },
  };


  export const PicCacheRedisOptions: CacheModuleAsyncOptions = {
    useFactory: async () => {
      const store = await redisStore({
        socket: {
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 10001,
        },
        ttl: process.env.REDIS_CACHE_TTL_PIC?  Number(process.env.REDIS_CACHE_TTL_PIC) :  24 * 60 * 60,
        database: process.env.REDIS_DATABASE_PIC?  Number(process.env.REDIS_DATABASE_PIC) : 1,
        username: process.env.REDIS_USERNAME || '',
        password: process.env.REDIS_PASSWORD || '',
      });
      return {
        store: () => store,
        name: "PicCacheRedisOptions"
      };
    },
  };
