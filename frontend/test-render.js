import { render } from '@testing-library/react';
import React from 'react';
import App from './src/App.jsx';

try {
  render(<App />);
  console.log("App rendered successfully");
} catch (e) {
  console.error("Caught Render Error:", e);
}
