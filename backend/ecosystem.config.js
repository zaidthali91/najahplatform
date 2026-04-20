// backend/ecosystem.config.js — PM2 Cluster Mode
module.exports = {
  apps: [{
    name:         'najah-api',
    script:       'src/server.js',
    instances:    'max',          // استخدام كل الـ CPU cores
    exec_mode:    'cluster',
    watch:        false,
    max_memory_restart: '512M',
    env_production: {
      NODE_ENV:   'production',
      PORT:       3001,
    },
    error_file:   'logs/pm2-error.log',
    out_file:     'logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    // إعادة التشغيل التلقائي
    autorestart:  true,
    restart_delay:5000,
    max_restarts: 10,
    // مراقبة الأداء
    merge_logs:   true,
    // Grace period عند إغلاق الخادم
    kill_timeout: 5000,
    listen_timeout: 8000,
  }]
}
