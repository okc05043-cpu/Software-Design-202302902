FROM node:18-alpine

WORKDIR /app

# 프론트엔드 의존성 설치 (vite 포함)
COPY package*.json ./
RUN npm install

# 소스 복사 및 프론트엔드 빌드
COPY . .
RUN npm run build

# 서버 의존성 설치
WORKDIR /app/server
RUN npm install --omit=dev

WORKDIR /app

EXPOSE 3001
CMD ["node", "server/index.js"]
