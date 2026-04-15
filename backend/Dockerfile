FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN apk add --no-cache python3 make g++ && \
    npm install --production && \
    apk del python3 make g++ && \
    rm -rf /tmp/* /root/.npm

COPY server.js ./

RUN mkdir -p /app/data

EXPOSE 3001

ENV NODE_ENV=development
ENV PORT=3001
ENV DB_DIR=/app/data

CMD ["node", "server.js"]
