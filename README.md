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

Phase 2:
Step 1:
npm install resend
get resend api key

Step 2: Create One Test Student (manually, via a one-off script)
scripts/create-test-student.ts

npm install -D tsx
npx tsx --env-file=.env.local scripts/create-test-student.ts

Step 3:
src/lib/firebase-rest.ts

Step 4:
src/lib/otp.ts

Step 5:
src/app/login/actions.ts

Step 6:
src/app/api/auth/session/route.ts

Step 7:
src/app/login/page.tsx

src/app/login/otp/page.tsx

Step 8:
middleware.ts

Step 9:
src/app/dashboard/layout.tsx

src/app/dashboard/page.tsx

Step 10:
npm run dev




