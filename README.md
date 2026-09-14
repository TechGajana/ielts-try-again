Step 1:
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

Step 2:
npm run dev

Step 3:
npm install firebase firebase-admin
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
npm install openai
npm install zod
npx shadcn@latest init


Step 4:
Firebase Project Setup

Step 5:
Cloudflare R2 Setup

Step 6: 
OpenAI Setup

Step 7:
Environment Variables

Step 8:
src/lib/firebase-admin.ts

Step 9:
src/lib/firebase-client.ts

Step 10:
src/lib/r2.ts

Step 11:
src/lib/openai.ts

Step 12: Sanity-Check Route (prove all three services work)
src/app/api/health/route.ts


Step 13:
git add .
git status   # double check .env.local is NOT listed
git commit -m "Phase 0: project scaffold + Firebase/R2/OpenAI wiring"
git push

