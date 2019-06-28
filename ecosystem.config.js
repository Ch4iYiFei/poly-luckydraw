module.exports = {
  apps : [{
    name: 'wxDraw',
    script: './index.js',
    source_map_support: false,
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production'
    }
  }],

  deploy : {
    production : {
      user : 'root',
      host : '103.209.102.252',
      ref  : 'origin/master',
      repo : 'git@github.com:Ch4iYiFei/poly-luckydraw.git',
      path : '/root/test',
      'post-deploy' : 'npm install && pm2 reload ecosystem.config.js --env production'
    }
  }
};
