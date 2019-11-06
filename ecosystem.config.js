const path = require('path');

module.exports = {
  apps: [{
    name: 'app',
    script: 'REDIS_HOST=redis npm start',
    instances: 3,
    autorestart: true,
    watch: true,
    ignore_watch: [
      'node_modules',
      'logs',
      'tmp_data',
      '.git',
      'ecosystem.config.js'
    ],
    max_memory_restart: '1G'
  }]
}
