FROM node:20-alpine

WORKDIR /app

COPY package.json package.json
COPY packages/shared packages/shared
COPY backend backend

RUN npm install
RUN npm run build -w @bustrack/shared
RUN npm run generate -w @bustrack/backend
RUN npm run build -w @bustrack/backend

WORKDIR /app/backend
CMD ["npm", "run", "start"]
