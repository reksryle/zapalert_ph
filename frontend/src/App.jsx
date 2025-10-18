// App.jsx - Clean version
import React from "react";
import { Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import VictimDashboard from "./pages/VictimDashboard";
import HelperRegistration from "./pages/HelperRegistration";
import EmergencyMap from "./pages/EmergencyMap";
import HelperDashboard from "./pages/HelperDashboard";
import 'leaflet/dist/leaflet.css';
import './index.css';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/victim-dashboard" element={<VictimDashboard />} />
      <Route path="/helper-registration" element={<HelperRegistration />} />
      <Route path="/map" element={<EmergencyMap />} />
      <Route path="/helper-dashboard" element={<HelperDashboard />} />
    </Routes>
  );
}

export default App;