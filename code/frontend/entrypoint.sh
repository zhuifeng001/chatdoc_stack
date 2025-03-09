#!/bin/sh

sed -i 's~__KB_API__~'$KB_API'~g' /app/.output/public/config.js;
sed -i 's~__AI_API__~'$AI_API'~g' /app/.output/public/config.js;
sed -i 's~__KB_API__~'$KB_API'~g' /app/.output/public/_nuxt/**.js;
sed -i 's~__AI_API__~'$AI_API'~g' /app/.output/public/_nuxt/**.js;
sed -i 's~__KB_API__~'$KB_API'~g' /app/.output/server/chunks/build/**.mjs;
sed -i 's~__AI_API__~'$AI_API'~g' /app/.output/server/chunks/build/**.mjs;

echo 'KB_API='$KB_API 
echo 'AI_API='$AI_API 

node -v
node /app/.output/server/index.mjs