module.exports = {
  apps: [
    {
      name: "cookshare-api",
      script: "dist/index.js",
      cwd: __dirname,
      env_production: {
        NODE_ENV: "production",
        PORT: 4000,
      },
    },
  ],
};
