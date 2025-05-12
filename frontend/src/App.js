// App.js
// Main entry point for the React frontend. Sets up routing between the landing page and the tracker page.

import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./LandingPage";
import TrackerPage from "./TrackerPage";
import './App.css';

// App component: Sets up the main routes for the application
function App() {
  return (
    <Router>
      {/* Define routes for landing and tracker pages */}
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/tracker" element={<TrackerPage />} />
      </Routes>
    </Router>
  );
}

export default App;
