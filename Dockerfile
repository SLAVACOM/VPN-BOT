FROM node:20-alpine

RUN apk --no-cache add \
    openssl \
    bash ncies only when needed

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install 

COPY . .

RUN npx prisma generate

RUN npm run build

EXPOSE 3000

CMD npx prisma db push && npm run start
