FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

# Install build tools, compile better-sqlite3, then remove build tools — all in
# one layer so the final image doesn't carry python3/make/g++ (~50MB saved)
RUN apk add --no-cache python3 make g++ && \
    npm install --production && \
    apk del python3 make g++ && \
    rm -rf /tmp/* /root/.npm

COPY server.js ./

RUN mkdir -p /app/data

EXPOSE 3001

CMD ["node", "server.js"]
