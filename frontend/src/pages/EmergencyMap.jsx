import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { useNavigate } from "react-router-dom";
import axios from "../api/axios";
import { io } from "socket.io-client";
import { toast } from "react-hot-toast";

// Fix for default markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom emergency icons (using your existing icons)
const emergencyIcons = {
  medical: new L.Icon({
    iconUrl: '/icons/medical.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  }),
  rescue: new L.Icon({
    iconUrl: '/icons/rescue.png', 
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  }),
  food: new L.Icon({
    iconUrl: '/icons/food.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  }),
  shelter: new L.Icon({
    iconUrl: '/icons/shelter.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  }),
  other: new L.Icon({
    iconUrl: '/icons/other.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  })
};

// Helper icon
const helperIcon = new L.Icon({
  iconUrl: '/icons/helper.png',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

// Center on Visayas
const VISAYAS_CENTER = [10.3157, 123.8854]; // Cebu area
const DEFAULT_ZOOM = 7;

// Map controller component
function MapController({ bounds }) {
  const map = useMap();
  
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
      map.setView(VISAYAS_CENTER, DEFAULT_ZOOM);
    }, 100);

    return () => clearTimeout(timer);
  }, [map]);

  return null;
}

const EmergencyMap = () => {
  const navigate = useNavigate();
  const [emergencies, setEmergencies] = useState([]);
  const [helpers, setHelpers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const socketRef = useRef(null);

  // Socket.io connection
  useEffect(() => {
    socketRef.current = io(import.meta.env.VITE_SOCKET_URL);

    socketRef.current.on("new-emergency", (emergency) => {
      setEmergencies(prev => [emergency, ...prev]);
      if (emergency.severity === 'critical' || emergency.severity === 'high') {
        toast.success(`🚨 ${emergency.type.toUpperCase()} emergency reported!`, {
          duration: 5000,
        });
      }
    });

    socketRef.current.on("emergency-updated", (updatedEmergency) => {
      setEmergencies(prev => 
        prev.map(emergency => 
          emergency._id === updatedEmergency._id ? updatedEmergency : emergency
        )
      );
    });

    socketRef.current.on("helper-joined", (helper) => {
      setHelpers(prev => [helper, ...prev]);
      toast.success(`🦺 New helper registered: ${helper.name}`, {
        duration: 3000,
      });
    });

    socketRef.current.on("help-offered", (helpOffer) => {
      // Update emergency counters when help is offered
      setEmergencies(prev => 
        prev.map(emergency => 
          emergency._id === helpOffer.emergencyId 
            ? { 
                ...emergency, 
                helpOffersCount: (emergency.helpOffersCount || 0) + 1,
                ongoingHelpCount: (emergency.ongoingHelpCount || 0) + (helpOffer.status === 'ongoing' ? 1 : 0)
              } 
            : emergency
        )
      );
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      const [emergenciesRes, helpersRes] = await Promise.all([
        axios.get("/emergencies"), 
        axios.get("/helpers")      
      ]);
      setEmergencies(emergenciesRes.data);
      setHelpers(helpersRes.data);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load emergency data");
    } finally {
      setIsLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-600 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-yellow-900';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const reported = new Date(timestamp);
    const diffMs = now - reported;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const formatEmergencyType = (type) => {
    const types = {
      medical: 'Medical',
      rescue: 'Rescue',
      food: 'Food/Water',
      shelter: 'Shelter',
      other: 'Other'
    };
    return types[type] || type;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading emergency map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-600 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <button 
            onClick={() => navigate("/")}
            className="text-white text-sm mb-4 hover:underline"
          >
            ← Back to Home
          </button>
          <h1 className="text-3xl font-bold text-white mb-2">Philippines Emergency Map</h1>
          <p className="text-white/80">Real-time emergency coordination across the Philippines</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-4 text-center border border-white/30">
            <div className="text-2xl font-bold text-red-600">{emergencies.length}</div>
            <div className="text-sm font-medium text-gray-700">Active Emergencies</div>
          </div>
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-4 text-center border border-white/30">
            <div className="text-2xl font-bold text-green-600">{helpers.length}</div>
            <div className="text-sm font-medium text-gray-700">Available Helpers</div>
          </div>
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-4 text-center border border-white/30">
            <div className="text-2xl font-bold text-blue-600">
              {emergencies.reduce((total, emergency) => total + (emergency.helpOffersCount || 0), 0)}
            </div>
            <div className="text-sm font-medium text-gray-700">Total Help Responses</div>
          </div>
        </div>

        {/* Map Container */}
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-6 border border-white/30">
          <div className="h-[600px] rounded-xl overflow-hidden border-2 border-gray-200">
            <MapContainer
              center={VISAYAS_CENTER}
              zoom={DEFAULT_ZOOM}
              style={{ height: "100%", width: "100%" }}
              zoomControl={true}
            >
              <MapController />
              
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />
              
              {/* Emergency markers */}
              {emergencies.map((emergency) => (
                <Marker
                  key={emergency._id}
                  position={[emergency.location.latitude, emergency.location.longitude]}
                  icon={emergencyIcons[emergency.type] || emergencyIcons.other}
                >
                  <Popup>
                    <div className="p-3 min-w-[280px]">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-bold text-red-600 text-lg">
                          {formatEmergencyType(emergency.type)} Emergency
                        </h3>
                        <span className={`text-xs px-3 py-1 rounded-full ${getSeverityColor(emergency.severity)}`}>
                          {emergency.severity}
                        </span>
                      </div>
                      
                      <p className="text-gray-700 mb-3 text-sm">{emergency.description}</p>
                      
                      {/* Help Counters */}
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="text-center p-2 bg-green-50 rounded-lg border border-green-200">
                          <div className="font-bold text-green-600 text-sm">{emergency.helpOffersCount || 0}</div>
                          <div className="text-xs text-green-700">HELP OFFERED</div>
                        </div>
                        <div className="text-center p-2 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="font-bold text-blue-600 text-sm">{emergency.ongoingHelpCount || 0}</div>
                          <div className="text-xs text-blue-700">ONGOING HELP</div>
                        </div>
                      </div>
                      
                      <div className="text-xs text-gray-500 space-y-1">
                        <div>🕐 {getTimeAgo(emergency.reportedAt)}</div>
                        {emergency.contact && (
                          <div className="text-blue-600">Contact: {emergency.contact}</div>
                        )}
                      </div>

                      <button
                        onClick={() => navigate("/helper-dashboard")}
                        className="w-full mt-3 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors text-sm"
                      >
                        🦺 I Can Help Here
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}
              
              {/* Helper markers */}
              {helpers.map((helper) => (
                <Marker
                  key={helper._id}
                  position={[helper.location.latitude, helper.location.longitude]}
                  icon={helperIcon}
                >
                  <Popup>
                    <div className="p-3 min-w-[200px]">
                      <h4 className="font-bold text-green-600 mb-2">Available Helper</h4>
                      <div className="text-sm text-gray-700">
                        <div className="font-medium">{helper.name || "Anonymous Helper"}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          Skills: {helper.skills?.join(', ') || "Various"}
                        </div>
                        {helper.contact && (
                          <div className="text-xs text-blue-600 mt-1">Contact: {helper.contact}</div>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <button
              onClick={() => navigate("/emergency")}
              className="flex-1 py-4 bg-red-600 text-white rounded-xl font-bold text-lg hover:bg-red-700 transition-all shadow-lg hover:scale-105"
            >
              🆘 Report Emergency
            </button>
            <button
              onClick={() => navigate("/helper-dashboard")}
              className="flex-1 py-4 bg-green-600 text-white rounded-xl font-bold text-lg hover:bg-green-700 transition-all shadow-lg hover:scale-105"
            >
              🦺 Become a Helper
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="fixed bottom-6 left-6 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-4 border border-white/30 z-[1000]">
          <h4 className="font-semibold text-gray-800 mb-3">Map Legend</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center space-x-3">
              <img src="/icons/medical.png" alt="Medical" className="w-5 h-5" />
              <span className="text-gray-700">Medical Emergency</span>
            </div>
            <div className="flex items-center space-x-3">
              <img src="/icons/rescue.png" alt="Rescue" className="w-5 h-5" />
              <span className="text-gray-700">Rescue Needed</span>
            </div>
            <div className="flex items-center space-x-3">
              <img src="/icons/food.png" alt="Food" className="w-5 h-5" />
              <span className="text-gray-700">Food/Water</span>
            </div>
            <div className="flex items-center space-x-3">
              <img src="/icons/shelter.png" alt="Shelter" className="w-5 h-5" />
              <span className="text-gray-700">Shelter</span>
            </div>
            <div className="flex items-center space-x-3">
              <img src="/icons/helper.png" alt="Helper" className="w-5 h-5" />
              <span className="text-gray-700">Available Helper</span>
            </div>
          </div>
        </div>
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[2000]">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/30">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-700 text-lg">Loading map data...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmergencyMap;