module.exports = {
  apps : [{
    name   : "LU-PAYMENTS",
    script : "./dist/index.js",
    watch: true, // any changes to app folder will get pm2 to restart app
    exec_mode: 'cluster', // Set the execution mode to 'cluster'
  }]
}
