FROM node:20-alpine

WORKDIR /app

COPY package.json package.json
COPY simulator simulator

RUN npm install
RUN npm run build -w @bustrack/simulator

WORKDIR /app/simulator
CMD ["npm", "run", "start"]
