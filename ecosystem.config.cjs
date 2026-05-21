module.exports = {
  apps: [{
    name: "pln-monitor",
    script: "server.js",
    cwd: "/opt/pln-monitor/backend",
    env: {
      NODE_ENV: "production",
      PORT: "3001",
      DB_DIR: "/opt/pln-monitor/data",
    },
  }],
};
