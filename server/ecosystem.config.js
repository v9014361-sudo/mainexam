module.exports = {
  apps: [{
    name: 'exam-server',
    script: './server.js',
    instances: 4, // Cluster mode for 400+ concurrent students
    exec_mode: 'cluster',
    max_memory_restart: '6G',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    env_development: {
      NODE_ENV: 'development',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
