import React from "react";
import { Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import EmergencyReport from "./pages/EmergencyReport";
import HelperRegistration from "./pages/HelperRegistration";
import EmergencyMap from "./pages/EmergencyMap";
import 'leaflet/dist/leaflet.css';
import './index.css';
import HelperDashboard from './components/HelperDashboard';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/emergency" element={<EmergencyReport />} />
      <Route path="/helper" element={<HelperRegistration />} />
      <Route path="/map" element={<EmergencyMap />} />
      <Route path="/helper-dashboard" element={<HelperDashboard />} />
    </Routes>
  );
}

export default App;