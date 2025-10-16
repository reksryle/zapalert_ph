import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { useNavigate } from "react-router-dom";
import axios from "../api/axios";
import { io } from "socket.io-client";
import { toast } from "react-hot-toast";

// Custom icons for helper workflow
const helperIcons = {
  selecting: new L.Icon({
    iconUrl: '/icons/helper-select.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  }),
  offered: new L.Icon({
    iconUrl: '/icons/helper-offered.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  }),
  ongoing: new L.Icon({
    iconUrl: '/icons/helper-ongoing.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  })
};

// Emergency icons (same as your existing ones)
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

const HelperDashboard = () => {
  const navigate = useNavigate();
  const [selectedEmergency, setSelectedEmergency] = useState(null);
  const [showHelpFormModal, setShowHelpFormModal] = useState(false);
  const [emergencies, setEmergencies] = useState([]);
  const [myHelpOffers, setMyHelpOffers] = useState([]);
  const [helperForm, setHelperForm] = useState({
    name: "",
    contact: "",
    helpType: ""
  });
  const socketRef = useRef(null);

  const helpTypes = [
    { id: "medical", label: "🏥 Medical Assistance" },
    { id: "rescue", label: "🚨 Rescue Operations" },
    { id: "food", label: "🍲 Food/Water" },
    { id: "shelter", label: "🏠 Shelter" },
    { id: "transport", label: "🚗 Transportation" },
    { id: "other", label: "🛠️ Other Help" }
  ];

  useEffect(() => {
    // Socket connection for real-time updates
    socketRef.current = io(import.meta.env.VITE_SOCKET_URL);
    
    socketRef.current.on("new-emergency", (emergency) => {
      setEmergencies(prev => [emergency, ...prev]);
    });

    socketRef.current.on("emergency-updated", (updatedEmergency) => {
      setEmergencies(prev => 
        prev.map(emergency => 
          emergency._id === updatedEmergency._id ? updatedEmergency : emergency
        )
      );
    });

    socketRef.current.on("help-offered", (newHelpOffer) => {
      // If this is our help offer, add it to myHelpOffers
      if (newHelpOffer.helperName === helperForm.name) {
        setMyHelpOffers(prev => [newHelpOffer, ...prev]);
      }
    });

    socketRef.current.on("help-offer-updated", (updatedOffer) => {
      setMyHelpOffers(prev =>
        prev.map(offer =>
          offer._id === updatedOffer._id ? updatedOffer : offer
        )
      );
    });

    loadData();

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  const loadData = async () => {
    try {
      const emergenciesRes = await axios.get("/emergencies");
      setEmergencies(emergenciesRes.data);
    } catch (error) {
      console.error("Error loading emergencies:", error);
    }
  };

  const handlePinClick = (emergency) => {
    setSelectedEmergency(emergency);
    setShowHelpFormModal(true);
  };

  const handleHelpSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedEmergency || !helperForm.name || !helperForm.helpType) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const helpOfferData = {
        helperName: helperForm.name,
        helperContact: helperForm.contact,
        emergencyId: selectedEmergency._id,
        location: {
          latitude: selectedEmergency.location.latitude,
          longitude: selectedEmergency.location.longitude
        },
        helpType: helperForm.helpType,
        status: 'ongoing' // Directly mark as ongoing when they commit to help
      };

      await axios.post("/help-offers", helpOfferData);
      
      toast.success(`You're now helping with ${helpTypes.find(t => t.id === helperForm.helpType)?.label}!`);
      setShowHelpFormModal(false);
      setSelectedEmergency(null);
      setHelperForm({ name: "", contact: "", helpType: "" });
      
    } catch (error) {
      console.error("Error submitting help offer:", error);
      toast.error("Failed to submit help offer");
    }
  };

  const handleFinishHelp = async (helpOfferId) => {
    try {
      await axios.patch(`/help-offers/${helpOfferId}`, { status: 'completed' });
      toast.success("Help marked as completed!");
    } catch (error) {
      console.error("Error completing help:", error);
      toast.error("Failed to mark help as completed");
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-500 to-green-600 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <button 
            onClick={() => navigate("/")}
            className="text-white text-sm mb-4 hover:underline"
          >
            ← Back to Home
          </button>
          <h1 className="text-3xl font-bold text-white mb-2">Helper Dashboard</h1>
          <p className="text-white/80">Click on emergency pins to offer help</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map Section */}
          <div className="lg:col-span-2">
            <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-6 border border-white/30">
              <h2 className="text-lg font-semibold mb-4 text-gray-800">Emergency Map</h2>
              <div className="h-96 rounded-xl overflow-hidden border-2 border-gray-200">
                <MapContainer
                  center={[10.3157, 123.8854]}
                  zoom={13}
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap'
                  />
                  
                  {/* Emergency markers */}
                  {emergencies.map(emergency => (
                    <Marker
                      key={emergency._id}
                      position={[emergency.location.latitude, emergency.location.longitude]}
                      icon={emergencyIcons[emergency.type] || emergencyIcons.other}
                    >
                      <Popup>
                        <div className="p-2 min-w-[250px]">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-bold text-red-600 capitalize">{emergency.type}</h4>
                            <span className={`text-xs px-2 py-1 rounded-full ${getSeverityColor(emergency.severity)}`}>
                              {emergency.severity}
                            </span>
                          </div>
                          
                          <p className="text-sm mb-2">{emergency.description}</p>
                          
                          <div className="text-xs text-gray-600 space-y-1 mb-3">
                            <div>🕐 {getTimeAgo(emergency.reportedAt)}</div>
                            <div>🆘 Help Offered: {emergency.helpOffersCount || 0}</div>
                            <div>🔄 Ongoing: {emergency.ongoingHelpCount || 0}</div>
                          </div>

                          <button
                            onClick={() => handlePinClick(emergency)}
                            className="w-full py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
                          >
                            🦺 I Can Help Here
                          </button>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Click on any emergency pin to offer your help
              </p>
            </div>
          </div>

          {/* My Help Offers Sidebar */}
          <div className="space-y-4">
            <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-6 border border-white/30">
              <h3 className="font-semibold mb-3 text-gray-800">My Active Help</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {myHelpOffers.map(offer => (
                  <div key={offer._id} className="border rounded-lg p-3 bg-white">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-medium capitalize">{offer.helpType} Help</div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        offer.status === 'ongoing' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {offer.status === 'ongoing' ? 'ON GOING' : 'COMPLETED'}
                      </span>
                    </div>
                    
                    <div className="text-xs text-gray-600 space-y-1">
                      <div>📍 Emergency Location</div>
                      <div>🕐 Started: {new Date(offer.startedAt || offer.offeredAt).toLocaleTimeString()}</div>
                    </div>

                    {offer.status === 'ongoing' && (
                      <button
                        onClick={() => handleFinishHelp(offer._id)}
                        className="w-full mt-2 bg-red-600 text-white py-2 rounded text-sm font-medium hover:bg-red-700 transition-colors"
                      >
                        🏁 FINISH HELP
                      </button>
                    )}
                  </div>
                ))}
                {myHelpOffers.length === 0 && (
                  <p className="text-gray-500 text-center py-4">
                    No active help offers yet
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Help Form Modal */}
      {showHelpFormModal && selectedEmergency && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full border border-white/30">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Offer Help</h3>
              <p className="text-gray-600">You're helping with a {selectedEmergency.type} emergency</p>
            </div>

            <form onSubmit={handleHelpSubmit} className="space-y-4">
              {/* Helper Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Name *
                </label>
                <input
                  type="text"
                  value={helperForm.name}
                  onChange={(e) => setHelperForm({ ...helperForm, name: e.target.value })}
                  placeholder="Enter your full name"
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-green-400"
                  required
                />
              </div>

              {/* Contact Information */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Information (Optional)
                </label>
                <input
                  type="text"
                  value={helperForm.contact}
                  onChange={(e) => setHelperForm({ ...helperForm, contact: e.target.value })}
                  placeholder="Phone number or other contact info"
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-green-400"
                />
              </div>

              {/* Help Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type of Help You Can Offer *
                </label>
                <select
                  value={helperForm.helpType}
                  onChange={(e) => setHelperForm({ ...helperForm, helpType: e.target.value })}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-green-400"
                  required
                >
                  <option value="">Select help type</option>
                  {helpTypes.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Emergency Details Preview */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <h4 className="font-semibold text-gray-800 mb-2">Emergency Details:</h4>
                <p className="text-sm text-gray-600">{selectedEmergency.description}</p>
                <div className="text-xs text-gray-500 mt-2">
                  Severity: <span className="capitalize">{selectedEmergency.severity}</span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-4 bg-green-600 text-white rounded-xl font-bold text-lg hover:bg-green-700 hover:scale-105 transition-all shadow-lg"
              >
                🦺 Commit to Help
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowHelpFormModal(false);
                  setSelectedEmergency(null);
                }}
                className="w-full py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HelperDashboard;