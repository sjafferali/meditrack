import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '../App';

// Mock ReactDOM
jest.mock('react-dom/client');

// Mock App component
jest.mock('../App', () => {
  return jest.fn(() => <div>App Component</div>);
});

// Mock CSS import
jest.mock('../index.css', () => ({}));

describe('Application Entry Point', () => {
  let mockRoot;
  let mockCreateRoot;
  let mockGetElementById;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock the DOM methods
    mockRoot = {
      render: jest.fn()
    };
    
    mockCreateRoot = jest.fn().mockReturnValue(mockRoot);
    ReactDOM.createRoot = mockCreateRoot;
    
    mockGetElementById = jest.fn().mockReturnValue(document.createElement('div'));
    document.getElementById = mockGetElementById;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('creates root element and renders App', () => {
    // Import the index.js file to trigger the execution
    require('../index.js');

    // Verify that getElementById was called with 'root'
    expect(mockGetElementById).toHaveBeenCalledWith('root');
    
    // Verify that createRoot was called with the root element
    expect(mockCreateRoot).toHaveBeenCalledWith(expect.any(HTMLElement));
    
    // Verify that render was called with App wrapped in StrictMode
    expect(mockRoot.render).toHaveBeenCalledWith(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  });

  test('imports required dependencies', () => {
    // These are implicitly tested by the successful import above
    expect(React).toBeDefined();
    expect(ReactDOM).toBeDefined();
    expect(App).toBeDefined();
  });
});