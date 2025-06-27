module.exports = {
  devServer: {
    // Use polling instead of file watching to avoid issues
    watchOptions: {
      poll: 1000,
      ignored: /node_modules/
    },
    // Disable the problematic middleware
    setupMiddlewares: (middlewares, devServer) => {
      return middlewares;
    }
  }
};