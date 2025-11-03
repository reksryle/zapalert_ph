import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { useNavigate } from "react-router-dom";
import axios from "../api/axios";
import { io } from "socket.io-client";
import { toast } from "react-hot-toast";

// Custom icons for emergency types with emojis
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
  water: new L.Icon({
    iconUrl: '/icons/water.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  }),
  shelter: new L.Icon({
    iconUrl: '/icons/shelter.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  }),
  clothing: new L.Icon({
    iconUrl: '/icons/clothing.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  }),
  transport: new L.Icon({
    iconUrl: '/icons/transport.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  }),
  other: new L.Icon({
    iconUrl: '/icons/other.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  })
};

// Cluster icon for multiple emergencies (shows count)
const createClusterIcon = (count) => {
  return new L.DivIcon({
    html: `<div class="cluster-marker">${count}</div>`,
    className: 'cluster-custom',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

// Important Notes Modal Component for Helper
const HelperNotesModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 animate-popup">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            Helper Guidelines
          </h3>
          <button 
            onClick={onClose}
            className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:text-gray-800 transition-colors text-lg"
          >
            ✕
          </button>
        </div>
        
        <div className="space-y-4 text-sm text-gray-700">
          <div className="flex items-start gap-3 p-3 bg-green-50 rounded-xl">
            <span className="text-green-500 text-lg mt-0.5">📍</span>
            <p className="flex-1">Proceed to the exact pinned location</p>
          </div>
          <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl">
            <span className="text-blue-500 text-lg mt-0.5">📞</span>
            <p className="flex-1">Use provided contact info to coordinate</p>
          </div>
          <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-xl">
            <span className="text-purple-500 text-lg mt-0.5">🕐</span>
            <p className="flex-1">Click "RESPONDED" when you arrive at location</p>
          </div>
          <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-xl">
            <span className="text-orange-500 text-lg mt-0.5">🚨</span>
            <p className="flex-1">Contact emergency services if situation is critical</p>
          </div>
          <div className="flex items-start gap-3 p-3 bg-red-50 rounded-xl">
            <span className="text-red-500 text-lg mt-0.5">✅</span>
            <p className="flex-1">Mark help as completed only when assistance is fully provided</p>
          </div>
        </div>
        
        <button
          onClick={onClose}
          className="w-full mt-6 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-bold hover:from-green-600 hover:to-green-700 transition-all shadow-lg hover:scale-[1.02] active:scale-95"
        >
          Got It
        </button>
      </div>
    </div>
  );
};

const HelperDashboard = () => {
  const navigate = useNavigate();
  const [selectedEmergency, setSelectedEmergency] = useState(null);
  const [showHelpFormModal, setShowHelpFormModal] = useState(false);
  const [showHelperNotes, setShowHelperNotes] = useState(false);
  const [emergencies, setEmergencies] = useState([]);
  const [myHelpOffers, setMyHelpOffers] = useState([]);
  const [helperForm, setHelperForm] = useState({
    name: "",
    phone: "",
    otherContact: "",
    helpTypes: []
  });
  const [currentZoom, setCurrentZoom] = useState(6);
  const [currentView, setCurrentView] = useState("map"); // "map" or "offers"
  const socketRef = useRef(null);
  const mapRef = useRef(null);

  const helpTypes = [
    { id: "medical", label: "🏥 Medical Assistance", emoji: "🏥" },
    { id: "rescue", label: "🚨 Rescue Operations", emoji: "🚨" },
    { id: "food", label: "🍲 Food Supplies", emoji: "🍲" },
    { id: "water", label: "💧 Clean Water", emoji: "💧" },
    { id: "shelter", label: "🏠 Emergency Shelter", emoji: "🏠" },
    { id: "clothing", label: "👕 Clothing", emoji: "👕" },
    { id: "transport", label: "🚗 Transportation", emoji: "🚗" },
    { id: "other", label: "🛠️ Other Help", emoji: "🛠️" }
  ];

  const getEmergencyEmoji = (type) => {
    const helpType = helpTypes.find(t => t.id === type);
    return helpType ? helpType.emoji : "🆘";
  };

// Barangay Zapatera center coordinates
const philippinesCenter = [10.306711119471714, 123.9011395473235]; // Barangay Zapatera

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

  // FIXED: Load my help offers when they are created
  socketRef.current.on("help-offer-created", (newHelpOffer) => {
    // Check if this help offer belongs to current helper
    if (newHelpOffer.helperContact === helperForm.phone) {
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
}, [helperForm.phone]); // Add dependency to track phone changes

  const loadData = async () => {
    try {
      const emergenciesRes = await axios.get("/emergencies");
      setEmergencies(emergenciesRes.data);
      
      const helpOffersRes = await axios.get("/help-offers/my-offers");
      setMyHelpOffers(helpOffersRes.data);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const handlePinClick = (emergency) => {
    setSelectedEmergency(emergency);
    setShowHelpFormModal(true);
  };

const handleHelpSubmit = async (e) => {
  e.preventDefault();
  
  if (!selectedEmergency || !helperForm.name || !helperForm.phone || helperForm.helpTypes.length === 0) {
    toast.error("Please fill in all required fields");
    return;
  }

  // Validate phone number format
  if (!/^09\d{9}$/.test(helperForm.phone)) {
    toast.error("Please enter a valid Philippine phone number (09XXXXXXXXX)");
    return;
  }

  try {
    const helpOfferData = {
      helperName: helperForm.name,
      helperContact: helperForm.phone,
      helperOtherContact: helperForm.otherContact,
      emergencyId: selectedEmergency._id,
      location: {
        latitude: selectedEmergency.location.latitude,
        longitude: selectedEmergency.location.longitude
      },
      helpType: helperForm.helpTypes[0],
      helpTypes: helperForm.helpTypes,
      status: 'ongoing'
    };

    const response = await axios.post("/help-offers", helpOfferData);
    const newHelpOffer = response.data.helpOffer;
    
    // FIXED: Emit multiple events to ensure both sides update
    socketRef.current.emit("help-offer-created", newHelpOffer);
    socketRef.current.emit("help-responded", newHelpOffer);
    
    // Update local state immediately
    setMyHelpOffers(prev => [newHelpOffer, ...prev]);
    
    toast.success(`Help offered! You can now proceed to the location.`);
    setShowHelpFormModal(false);
    setSelectedEmergency(null);
    setHelperForm({ 
      name: "", 
      phone: "", 
      otherContact: "", 
      helpTypes: [] 
    });
    
  } catch (error) {
    console.error("Error submitting help offer:", error);
    toast.error("Failed to submit help offer");
  }
};

  const handleFinishHelp = async (helpOfferId) => {
    try {
      const response = await axios.patch(`/help-offers/${helpOfferId}`, { 
        status: 'completed',
        completedAt: new Date().toISOString()
      });
      const updatedOffer = response.data.helpOffer;
      
      // EMIT socket event to notify victim
      socketRef.current.emit("help-offer-updated", updatedOffer);
      
      toast.success("✅ Help completed! Thank you for your service!");
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

const activeHelpOffers = myHelpOffers.filter(offer => offer.status === 'ongoing');
const completedHelpOffers = myHelpOffers.filter(offer => offer.status === 'completed');

  // Function to get appropriate icon based on zoom level
  const getIconForEmergency = (emergency, zoom) => {
    if (zoom < 10) {
      const nearbyEmergencies = emergencies.filter(e => 
        Math.abs(e.location.latitude - emergency.location.latitude) < 0.5 &&
        Math.abs(e.location.longitude - emergency.location.longitude) < 0.5
      );
      if (nearbyEmergencies.length > 1) {
        return createClusterIcon(nearbyEmergencies.length);
      }
    }
    return emergencyIcons[emergency.type] || emergencyIcons.other;
  };

  // Map event handler to track zoom level
  const MapEvents = () => {
    const map = useMapEvents({
      zoomend: () => {
        setCurrentZoom(map.getZoom());
      },
    });
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-500 to-green-600 safe-area-padding">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-green-600 to-green-700 p-4 shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <button 
            onClick={() => navigate("/")}
            className="text-lg p-2 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white transition-colors"
          >
            ←
          </button>
          <h1 className="text-xl font-bold text-white">Helper Dashboard</h1>
          <div className="w-8">
            <button 
              onClick={() => setShowHelperNotes(true)}
              className="w-8 h-8 bg-yellow-400 hover:bg-yellow-500 rounded-full flex items-center justify-center text-yellow-800 font-bold shadow-lg hover:scale-110 transition-all duration-200"
              title="Helper Guidelines"
            >
              ⚠️
            </button>
          </div>
        </div>
        
        {/* View Toggle Buttons */}
        <div className="flex bg-white/20 backdrop-blur-sm rounded-2xl p-1 mt-2 border border-white/30">
          <button
            onClick={() => setCurrentView("map")}
            className={`flex-1 py-2 rounded-xl font-semibold transition-all ${
              currentView === "map" 
                ? "bg-white text-green-700 shadow-lg" 
                : "text-white/80 hover:text-white"
            }`}
          >
            Emergency Map
          </button>
          <button
            onClick={() => setCurrentView("offers")}
            className={`flex-1 py-2 rounded-xl font-semibold transition-all ${
              currentView === "offers" 
                ? "bg-white text-green-700 shadow-lg" 
                : "text-white/80 hover:text-white"
            }`}
          >
            My Help Offers ({activeHelpOffers.length})
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 pb-24">
        {currentView === "map" ? (
          /* Map View */
          <div className="space-y-4">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg p-4 border border-white/30">
              <h2 className="font-semibold text-gray-800 mb-3">Philippines Emergency Map</h2>
              <div className="h-[500px] rounded-xl overflow-hidden border border-gray-300 bg-gray-100 shadow-inner">
                <MapContainer
                  center={philippinesCenter}
                  zoom={16}
                  style={{ height: "100%", width: "100%" }}
                  ref={mapRef}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  />
                  <MapEvents />
                  
                  {/* Emergency markers */}
                  {emergencies.map(emergency => (
                    <Marker
                      key={emergency._id}
                      position={[emergency.location.latitude, emergency.location.longitude]}
                      icon={getIconForEmergency(emergency, currentZoom)}
                    >
                      <Popup>
                        <div className="p-4 min-w-[320px]">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">{getEmergencyEmoji(emergency.type)}</span>
                              <div>
                                <h4 className="font-bold text-red-600 capitalize text-lg">{emergency.type} Emergency</h4>
                                <p className="text-xs text-gray-500">Click "Offer Help" to assist this person</p>
                              </div>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full ${getSeverityColor(emergency.severity)}`}>
                              {emergency.severity}
                            </span>
                          </div>
                          
                          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-3">
                            <p className="text-sm text-gray-800 font-medium">{emergency.description}</p>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 mb-4">
                            <div className="text-center p-2 bg-blue-50 rounded-lg">
                              <div className="font-bold text-blue-600 text-lg">{emergency.helpOffersCount || 0}</div>
                              <div className="text-xs text-blue-700">Helpers Coming</div>
                            </div>
                            <div className="text-center p-2 bg-green-50 rounded-lg">
                              <div className="font-bold text-green-600 text-lg">{emergency.ongoingHelpCount || 0}</div>
                              <div className="text-xs text-green-700">Active Helpers</div>
                            </div>
                          </div>
                          
                          <div className="text-xs text-gray-600 space-y-2 mb-4">
                            <div className="flex justify-between">
                              <span>🕐 Reported:</span>
                              <span className="font-semibold">{getTimeAgo(emergency.reportedAt)}</span>
                            </div>
                            {emergency.contact && (
                              <div className="flex justify-between">
                                <span>📞 Victim Contact:</span>
                                <span className="font-semibold text-blue-600">{emergency.contact}</span>
                              </div>
                            )}
                          </div>

                          {/* Requested Items */}
                          {(emergency.requestedItems && emergency.requestedItems.length > 0) && (
                            <div className="mb-4">
                              <p className="text-xs font-semibold text-gray-700 mb-2">Help Needed:</p>
                              <div className="flex flex-wrap gap-1">
                                {emergency.requestedItems.map((item, index) => (
                                  <span 
                                    key={index}
                                    className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium"
                                  >
                                    {getEmergencyEmoji(item)} {item}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          <button
                            onClick={() => handlePinClick(emergency)}
                            className="w-full py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-semibold hover:from-green-600 hover:to-green-700 transition-colors shadow-lg hover:scale-[1.02] active:scale-95 text-base"
                          >
                            🦺 Offer Help Now
                          </button>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
              <p className="text-sm text-gray-600 mt-2 text-center">
                Zoom in to see individual emergencies. Numbers show multiple requests in area.
              </p>
            </div>
          </div>
        ) : (
          /* My Help Offers View */
          <div className="space-y-4">
            {/* Active Help Offers */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg p-4 border border-white/30">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800">My Active Help Missions</h3>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-600 font-medium">LIVE</span>
                </div>
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {activeHelpOffers.map(offer => (
                  <div key={offer._id} className="p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border-2 border-green-300 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-semibold text-gray-800 flex items-center gap-2 mb-1">
                          <span className="text-xl">{getEmergencyEmoji(offer.helpType)}</span>
                          <div>
                            <div>{offer.helpTypes && offer.helpTypes.length > 1 
                              ? `${offer.helpTypes.length} Types of Help` 
                              : `${offer.helpType} Help`}
                            </div>
                            <div className="text-sm text-gray-600">Emergency: {offer.emergencyDetails?.type || 'Unknown'}</div>
                          </div>
                        </div>
                        
                        {/* Show multiple help types if available */}
                        {offer.helpTypes && offer.helpTypes.length > 1 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {offer.helpTypes.map((type, index) => (
                              <span key={index} className="px-2 py-1 bg-green-200 text-green-800 rounded-full text-xs font-medium">
                                {getEmergencyEmoji(type)} {type}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-300 font-medium">
        ONGOING
      </span>
                    </div>
                    
                    <div className="text-xs text-gray-600 space-y-2">
                      <div className="flex justify-between">
                        <span>📞 Your Contact:</span>
                        <span className="font-semibold">{offer.helperContact}</span>
                      </div>
                      {offer.helperOtherContact && (
                        <div className="flex justify-between">
                          <span>📱 Other Contact:</span>
                          <span className="font-semibold text-blue-600">{offer.helperOtherContact}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>🕐 Started:</span>
                        <span className="font-semibold text-green-600">
                          {new Date(offer.startedAt || offer.offeredAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleFinishHelp(offer._id)}
                      className="w-full py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-semibold text-sm hover:from-green-600 hover:to-green-700 transition-colors shadow-lg"
                    >
                      ✅ MARK AS COMPLETED
                    </button>
                  </div>
                ))}
                {activeHelpOffers.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">🦺</div>
                    <p className="font-medium text-lg mb-1">No Active Help Missions</p>
                    <p className="text-sm">Switch to Map view to find emergencies needing help</p>
                  </div>
                )}
              </div>
            </div>

            {/* Completed Help Offers */}
            {completedHelpOffers.length > 0 && (
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg p-4 border border-white/30">
                <h3 className="font-semibold text-gray-800 mb-3">Completed Help Missions</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {completedHelpOffers.slice(0, 3).map(offer => (
                    <div key={offer._id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex justify-between items-center">
                        <div className="text-sm font-medium text-gray-700">
                          {offer.helpType} Help
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">
                          COMPLETED
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        Completed: {new Date(offer.completedAt).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Help Form Modal */}
      {showHelpFormModal && selectedEmergency && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-popup border border-white/30">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-800 mb-2">Offer Help</h3>
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
                  className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-green-400 text-sm bg-white/80"
                  required
                />
              </div>

              {/* Phone Number - Required with validation */}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Phone Number (Philippines) *
  </label>
  <input
    type="tel"
    value={helperForm.phone}
    onChange={(e) => {
      const value = e.target.value;
      // FIXED: Allow numbers and backspace properly
      if (/^\d*$/.test(value) && value.length <= 11) {
        setHelperForm({ ...helperForm, phone: value });
      }
    }}
    onBlur={(e) => {
      // Validate format on blur instead of blocking input
      const value = e.target.value;
      if (value && !/^09\d{9}$/.test(value)) {
        toast.error("Please enter a valid Philippine phone number (09XXXXXXXXX)");
      }
    }}
    placeholder="09XXXXXXXXX"
    className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-green-400 text-sm bg-white/80"
    required
    maxLength={11}
  />
  <p className="text-xs text-gray-500 mt-1">
    Must start with 09 and be 11 digits (e.g., 09123456789)
  </p>
</div>

              {/* Other Contact - Optional */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Other Contact (Optional)
                </label>
                <input
                  type="text"
                  value={helperForm.otherContact}
                  onChange={(e) => setHelperForm({ ...helperForm, otherContact: e.target.value })}
                  placeholder="Facebook, Telegram, etc."
                  className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-green-400 text-sm bg-white/80"
                />
              </div>

              {/* Multiple Help Types Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Types of Help You Can Offer *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {helpTypes.map(type => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => {
                        setHelperForm(prev => ({
                          ...prev,
                          helpTypes: prev.helpTypes.includes(type.id)
                            ? prev.helpTypes.filter(t => t !== type.id)
                            : [...prev.helpTypes, type.id]
                        }));
                      }}
                      className={`p-2 rounded-lg border transition-all text-center text-sm ${
                        helperForm.helpTypes.includes(type.id)
                          ? 'bg-green-100 border-green-500 text-green-700 scale-95 shadow-inner'
                          : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
                {helperForm.helpTypes.length > 0 && (
                  <p className="text-xs text-green-600 mt-2 text-center">
                    Selected: {helperForm.helpTypes.length} type(s) of help
                  </p>
                )}
              </div>

              {/* Emergency Details Preview */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <h4 className="font-semibold text-gray-800 mb-2">Emergency Details:</h4>
                <p className="text-sm text-gray-600 mb-3">{selectedEmergency.description}</p>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Severity: <span className="capitalize font-semibold">{selectedEmergency.severity}</span></span>
                  <span>Contact: <span className="font-semibold text-blue-600">{selectedEmergency.contact || 'Not provided'}</span></span>
                </div>
                {selectedEmergency.requestedItems && selectedEmergency.requestedItems.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-semibold text-gray-700 mb-1">Requested Help Types:</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedEmergency.requestedItems.map((item, index) => (
                        <span key={index} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                          {getEmergencyEmoji(item)} {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-semibold text-base hover:from-green-600 hover:to-green-700 transition-colors shadow-lg hover:scale-[1.02] active:scale-95"
              >
                🦺 Commit to Help
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowHelpFormModal(false);
                  setSelectedEmergency(null);
                }}
                className="w-full py-2 text-gray-600 hover:text-gray-800 transition-colors text-sm"
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Helper Guidelines Modal */}
      <HelperNotesModal 
        isOpen={showHelperNotes} 
        onClose={() => setShowHelperNotes(false)} 
      />

      {/* Add CSS for cluster markers */}
      <style jsx>{`
        .cluster-marker {
          background: #dc2626;
          color: white;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 14px;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
      `}</style>
    </div>
  );
};

export default HelperDashboard;