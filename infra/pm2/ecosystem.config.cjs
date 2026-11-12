module.exports = {
  apps: [
    {
      name: 'sharon-contactless-api',
      script: './services/contactless-api/dist/server.js',
      cwd: '/var/www/sharon-contactless-ordering',
      instances: 1, // Single instance (or add Redis adapter before scaling >1 for Socket.io rooms)
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 4100,
        TZ: 'UTC',
      },
      error_file: '/var/log/pm2/contactless-api-error.log',
      out_file: '/var/log/pm2/contactless-api-out.log',
      merge_logs: true,
      time: true,
    },
  ],
};
