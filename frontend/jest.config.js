module.exports = {
  // Set a shorter default timeout for tests (30 seconds instead of the default 5 seconds)
  testTimeout: 30000,

  // Add specific configurations for tests
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  
  // Transform files with babel
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['@babel/preset-env', '@babel/preset-react', '@babel/preset-typescript'] }],
  },
};