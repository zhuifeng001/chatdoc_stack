export const isProd = () =>
  Boolean(process?.env?.BACKEND_NODE_URL) && process.env.BACKEND_NODE_URL.includes('online');
