import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import { useNavigate } from "react-router-dom";
import axios from "../api/axios";
import { toast } from "react-hot-toast";
import { io } from "socket.io-client";

// Custom marker icon using your marker.png
const markerIcon = new L.Icon({
  iconUrl: "/icons/marker.png",
  iconSize: [40, 40],
  iconAnchor: [16, 32],
});

const RecenterMap = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 18);
  }, [lat, lng]);
  return null;
};

const RecenterControl = ({ lat, lng }) => {
  const map = useMap();
  
  const handleRecenter = (e) => {
    e.stopPropagation();
    e.preventDefault();
    
    map.setView([lat, lng], 18);
    map.flyTo([lat, lng], 18, {
      duration: 1
    });
  };

  return (
    <div className="leaflet-bottom" style={{ width: '100%', display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
      <div className="leaflet-control" style={{ pointerEvents: 'auto' }}>
        <button
          onClick={handleRecenter}
          type="button"
          className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-semibold py-2 px-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95 border border-white/20 whitespace-nowrap"
          title="Find your pinned location"
          style={{ 
            margin: '2px',
            zIndex: 1000,
            fontSize: '9px',
            minWidth: '120px'
          }}
        >
          <span className="flex items-center justify-center gap-1">
            Find My Location
          </span>
        </button>
      </div>
    </div>
  );
};

const DraggableMarker = ({ position, setPosition, mapRef }) => {
  const markerRef = useRef(null);

  const eventHandlers = {
    dragend() {
      const marker = markerRef.current;
      if (marker != null) {
        const newPosition = marker.getLatLng();
        setPosition(newPosition);
        if (mapRef.current) {
          mapRef.current.setView(newPosition, mapRef.current.getZoom());
        }
      }
    },
  };

  useEffect(() => {
    if (mapRef.current && position) {
      mapRef.current.setView(position, mapRef.current.getZoom());
    }
  }, [position, mapRef]);

  return (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
      icon={markerIcon}
    >
      <Tooltip
        permanent
        direction="top"
        offset={[3, -33]}
        opacity={1}
      >
        <div
          style={{
            background: "linear-gradient(135deg, #e6bebecc, #f1a4a454)",
            padding: "6px 10px",
            fontSize: "11px",
            boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
            textAlign: "center",
            lineHeight: 1.3,
            color: "#b91c1c",
            backdropFilter: "blur(6px)",
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.3)'
          }}
        >
          <div style={{ fontWeight: "700", fontSize: "12px", color: "#7f1d1d" }}>
            Your Location
          </div>
          <div style={{ fontSize: "10px", color: "#444" }}>
            Drag to adjust
          </div>
        </div>
      </Tooltip>
    </Marker>
  );
};

const LocationSearch = ({ onLocationSelect, position }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeoutRef = useRef(null);

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (query.length > 2) {
      searchTimeoutRef.current = setTimeout(() => {
        searchLocations(query);
      }, 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const searchLocations = async (query) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`
      );
      const results = await response.json();
      setSuggestions(results);
      setShowSuggestions(true);
    } catch (error) {
      console.error("Search error:", error);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    const newPosition = {
      lat: parseFloat(suggestion.lat),
      lng: parseFloat(suggestion.lon)
    };
    onLocationSelect(newPosition);
    setSearchQuery(suggestion.display_name);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newPosition = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          };
          onLocationSelect(newPosition);
          setSearchQuery("Current Location");
          toast.success("Location found using GPS!");
        },
        (err) => {
          toast.error("Could not get current location");
        }
      );
    }
  };

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-4 mb-4 border border-white/30 mx-2">
      <h3 className="font-semibold text-gray-800 mb-3">Set Your Location</h3>
      
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search for your location..."
          className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400 text-sm bg-white/80"
        />
        
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-20 mt-1 max-h-60 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="w-full text-left p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
              >
                <div className="font-medium text-gray-800 text-sm">
                  {suggestion.display_name}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={handleUseCurrentLocation}
        className="w-full mt-3 p-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 transition-colors text-sm shadow-lg"
      >
        Use My Current Location
      </button>
    </div>
  );
};

// Important Notes Modal Component
const ImportantNotesModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

 return (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 animate-popup">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            Important Notes
          </h3>
          <button 
            onClick={onClose}
            className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:text-gray-800 transition-colors text-lg"
          >
            ✕
          </button>
        </div>
        
        <div className="space-y-4 text-sm text-gray-700">
          <div className="flex items-start gap-3 p-3 bg-red-50 rounded-xl">
            <span className="text-red-500 text-lg mt-0.5">📍</span>
            <p className="flex-1">Stay at your set location until help arrives</p>
          </div>
          <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl">
            <span className="text-blue-500 text-lg mt-0.5">📱</span>
            <p className="flex-1">Keep this app open for real-time updates</p>
          </div>
          <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-xl">
            <span className="text-purple-500 text-lg mt-0.5">👁️</span>
            <p className="flex-1">Helpers can see your exact pinned location</p>
          </div>
          <div className="flex items-start gap-3 p-3 bg-green-50 rounded-xl">
            <span className="text-green-500 text-lg mt-0.5">✅</span>
            <p className="flex-1">Only mark "Help Received" when assistance is complete</p>
          </div>
          <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-xl">
            <span className="text-orange-500 text-lg mt-0.5">🚨</span>
            <p className="flex-1">Contact emergency services if in immediate danger</p>
          </div>
        </div>
        
        <button
          onClick={onClose}
          className="w-full mt-6 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-bold hover:from-red-600 hover:to-red-700 transition-all shadow-lg hover:scale-[1.02] active:scale-95"
        >
          Got It
        </button>
      </div>
    </div>
  );
};

const VictimDashboard = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState("location");
  const [position, setPosition] = useState(null);
  const [selectedRequests, setSelectedRequests] = useState([]);
  const [form, setForm] = useState({
    description: "",
    contact: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [myEmergencies, setMyEmergencies] = useState([]);
  const [helpOffers, setHelpOffers] = useState([]);
  const [showImportantNotes, setShowImportantNotes] = useState(false);
  const socketRef = useRef(null);
  const mapRef = useRef(null);

  // Request types
  const requestTypes = [
    { id: "medical", label: "Medical Assistance", color: "red", bgColor: "bg-red-100", borderColor: "border-red-500", textColor: "text-red-700" },
    { id: "rescue", label: "Rescue Needed", color: "orange", bgColor: "bg-orange-100", borderColor: "border-orange-500", textColor: "text-orange-700" },
    { id: "food", label: "Food Supplies", color: "amber", bgColor: "bg-amber-100", borderColor: "border-amber-500", textColor: "text-amber-700" },
    { id: "water", label: "Clean Water", color: "blue", bgColor: "bg-blue-100", borderColor: "border-blue-500", textColor: "text-blue-700" },
    { id: "shelter", label: "Emergency Shelter", color: "purple", bgColor: "bg-purple-100", borderColor: "border-purple-500", textColor: "text-purple-700" },
    { id: "clothing", label: "Clothing", color: "green", bgColor: "bg-green-100", borderColor: "border-green-500", textColor: "text-green-700" },
    { id: "transport", label: "Transportation", color: "indigo", bgColor: "bg-indigo-100", borderColor: "border-indigo-500", textColor: "text-indigo-700" },
    { id: "other", label: "Other Help", color: "gray", bgColor: "bg-gray-100", borderColor: "border-gray-500", textColor: "text-gray-700" }
  ];

  const getHelpTypeEmoji = (type) => {
    const emojis = {
      medical: "🏥",
      rescue: "🚨",
      food: "🍲",
      water: "💧",
      shelter: "🏠",
      clothing: "👕",
      transport: "🚗",
      other: "🛠️"
    };
    return emojis[type] || "🆘";
  };

  // Auto-pin location on load
  useEffect(() => {
    if (navigator.geolocation && !position) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const autoPosition = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          };
          setPosition(autoPosition);
        },
        (err) => {
          console.log('Auto-location failed, user will set manually');
        },
        { timeout: 5000 }
      );
    }
  }, []);

  // Check for active emergency on component mount and block navigation
  useEffect(() => {
    const checkActiveSession = () => {
      const savedEmergencies = localStorage.getItem('victimEmergencies');
      if (savedEmergencies) {
        try {
          const parsed = JSON.parse(savedEmergencies);
          if (parsed.length > 0) {
            setMyEmergencies(parsed);
            setCurrentStep("request");
            loadHelpOffers(parsed[0]._id);
            window.history.pushState(null, '', window.location.href);
          }
        } catch (error) {
          console.error('Error parsing saved emergencies:', error);
          setMyEmergencies([]);
        }
      }
    };

    checkActiveSession();
  }, []);

  // Save data to localStorage
  useEffect(() => {
    localStorage.setItem('victimCurrentStep', currentStep);
    if (position) localStorage.setItem('victimPosition', JSON.stringify(position));
    if (myEmergencies.length > 0) localStorage.setItem('victimEmergencies', JSON.stringify(myEmergencies));
  }, [currentStep, position, myEmergencies]);

  // Load help offers for active emergency
  const loadHelpOffers = async (emergencyId) => {
    try {
      const response = await axios.get(`/help-offers/emergency/${emergencyId}`);
      setHelpOffers(response.data);
    } catch (error) {
      console.error('Error loading help offers:', error);
    }
  };

  // Socket connection for real-time updates
useEffect(() => {
  socketRef.current = io(import.meta.env.VITE_SOCKET_URL);
  
  // FIXED: Listen for help-offer-created event
  socketRef.current.on("help-offer-created", (helpOffer) => {
    if (myEmergencies.length > 0 && helpOffer.emergencyId === myEmergencies[0]._id) {
      setHelpOffers(prev => [helpOffer, ...prev]);
      setMyEmergencies(prev => 
        prev.map(emergency => 
          emergency._id === helpOffer.emergencyId 
            ? { 
                ...emergency, 
                helpOffersCount: (emergency.helpOffersCount || 0) + 1,
              } 
            : emergency
        )
      );
      toast.success(`${helpOffer.helperName} offered to help!`);
    }
  });

  socketRef.current.on("help-responded", (helpOffer) => {
    if (myEmergencies.length > 0 && helpOffer.emergencyId === myEmergencies[0]._id) {
      setHelpOffers(prev => [helpOffer, ...prev]);
      setMyEmergencies(prev => 
        prev.map(emergency => 
          emergency._id === helpOffer.emergencyId 
            ? { 
                ...emergency, 
                ongoingHelpCount: (emergency.ongoingHelpCount || 0) + 1
              } 
            : emergency
        )
      );
      toast.success(`${helpOffer.helperName} is coming to help! 🚗`);
    }
  });

  socketRef.current.on("help-offer-updated", (updatedOffer) => {
    if (myEmergencies.length > 0 && updatedOffer.emergencyId === myEmergencies[0]._id) {
      setHelpOffers(prev =>
        prev.map(offer =>
          offer._id === updatedOffer._id ? updatedOffer : offer
        )
      );
      
      if (updatedOffer.status === 'completed') {
        setMyEmergencies(prev => 
          prev.map(emergency => 
            emergency._id === updatedOffer.emergencyId 
              ? { 
                  ...emergency, 
                  ongoingHelpCount: Math.max(0, (emergency.ongoingHelpCount || 0) - 1),
                  completedHelpCount: (emergency.completedHelpCount || 0) + 1
                } 
              : emergency
          )
        );
        toast.success(`${updatedOffer.helperName} has completed helping!`);
      }
    }
  });

  return () => {
    if (socketRef.current) socketRef.current.disconnect();
  };
}, [myEmergencies]);

  const handleLocationConfirm = () => {
    if (!position) {
      toast.error("Please set your location first");
      return;
    }
    setCurrentStep("request");
  };

  const toggleRequestSelection = (requestId) => {
    setSelectedRequests(prev => 
      prev.includes(requestId) 
        ? prev.filter(id => id !== requestId)
        : [...prev, requestId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!position) {
      toast.error("Please set your location first");
      return;
    }

    if (selectedRequests.length === 0) {
      toast.error("Please select at least one type of help needed");
      return;
    }

    if (!form.contact || form.contact.trim() === '') {
      toast.error("Please provide your contact information");
      return;
    }

    setIsSubmitting(true);

    try {
      const primaryType = selectedRequests[0];
      
      const emergencyData = {
        type: primaryType,
        location: {
          latitude: position.lat,
          longitude: position.lng
        },
        description: form.description || `Need help with: ${selectedRequests.map(req => requestTypes.find(r => r.id === req)?.label).join(', ')}`,
        severity: "high",
        contact: form.contact,
        requestedItems: selectedRequests
      };

      const response = await axios.post("/emergencies", emergencyData);
      const newEmergency = response.data.emergency;
      
      setMyEmergencies([newEmergency]);
      setSelectedRequests([]);
      setForm({ description: "", contact: "" });
      loadHelpOffers(newEmergency._id);
      toast.success("Help request submitted!");
      
    } catch (error) {
      console.error("Error reporting emergency:", error);
      if (error.response?.data?.error) {
        toast.error(`Failed to submit: ${error.response.data.error}`);
      } else {
        toast.error("Failed to submit request");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const markHelpReceived = async (emergencyId) => {
    try {
      await axios.patch(`/emergencies/${emergencyId}`, { status: 'resolved' });
      setMyEmergencies([]);
      setHelpOffers([]);
      localStorage.removeItem('victimEmergencies');
      setCurrentStep("location");
      toast.success("Help received! Thank you.");
    } catch (error) {
      console.error("Error updating emergency:", error);
      toast.error("Failed to update request");
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

  const getRequestStyle = (requestId) => {
    return requestTypes.find(r => r.id === requestId) || requestTypes.find(r => r.id === 'other');
  };

  const activeEmergency = myEmergencies[0];

  // Block back button if there's an active emergency
  useEffect(() => {
    if (activeEmergency) {
      window.history.pushState(null, '', window.location.href);
      
      const handleBackButton = (event) => {
        window.history.pushState(null, '', window.location.href);
        toast.error("Please wait for help to arrive or mark as received before leaving");
      };

      window.addEventListener('popstate', handleBackButton);
      
      return () => {
        window.removeEventListener('popstate', handleBackButton);
      };
    }
  }, [activeEmergency]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-500 to-orange-500 safe-area-padding">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-red-600 to-orange-600 p-4 shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <button 
            onClick={() => {
              if (activeEmergency) {
                toast.error("🚫 Please wait for help or mark as received before leaving");
                return;
              }
              navigate("/");
            }}
            className={`text-lg p-2 rounded-full transition-colors ${
              activeEmergency 
                ? "bg-gray-400 cursor-not-allowed text-gray-300" 
                : "bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white"
            }`}
            disabled={activeEmergency}
          >
            ←
          </button>
          <h1 className="text-xl font-bold text-white">
            {currentStep === "location" ? "Set Location" : "Waiting for Help"}
          </h1>
          <div className="w-8">
            {currentStep === "request" && activeEmergency && (
              <button 
                onClick={() => setShowImportantNotes(true)}
                className="w-8 h-8 bg-yellow-400 hover:bg-yellow-500 rounded-full flex items-center justify-center text-yellow-800 font-bold shadow-lg hover:scale-110 transition-all duration-200"
                title="Important Notes"
              >
                ⚠️
              </button>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-center space-x-2">
          <div className={`w-3 h-3 rounded-full transition-all ${currentStep === "location" ? "bg-white scale-110" : "bg-white/50"}`}></div>
          <div className={`w-3 h-3 rounded-full transition-all ${currentStep === "request" ? "bg-white scale-110" : "bg-white/50"}`}></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pb-24">
        {currentStep === "location" ? (
          /* Location Setup Step */
          <div className="space-y-4">
            <LocationSearch onLocationSelect={setPosition} position={position} />

            {/* Floating Map Container */}
            <div className="mx-2 mb-4">
              <div className="h-[calc(100vh-380px)] min-h-[300px] rounded-2xl overflow-hidden border-2 border-white/40 shadow-2xl bg-gray-100">
                {position ? (
                  <MapContainer
                    center={position}
                    zoom={18}
                    style={{ height: "100%", width: "100%" }}
                    zoomControl={true}
                    ref={mapRef}
                    className="rounded-xl"
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    />
                    <DraggableMarker 
                      position={position} 
                      setPosition={setPosition}
                      mapRef={mapRef}
                    />
                    <RecenterMap lat={position.lat} lng={position.lng} />
                    <RecenterControl lat={position.lat} lng={position.lng} />
                  </MapContainer>
                ) : (
                  <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-3"></div>
                      <p className="text-gray-500 text-sm">Getting your location...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Floating Confirm Button */}
            <div className="fixed bottom-6 left-4 right-4 z-20">
              <button
                onClick={handleLocationConfirm}
                disabled={!position}
                className={`w-full py-4 rounded-2xl font-bold text-base transition-all shadow-2xl ${
                  !position
                    ? "bg-gray-300 cursor-not-allowed text-gray-500"
                    : "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white hover:scale-[1.02] active:scale-95"
                }`}
              >
                {position ? "Confirm Location" : "Set Your Location First"}
              </button>
            </div>
          </div>
        ) : (
          /* Request Step - Always shows waiting state when active */
          <div className="space-y-4 p-4">
            {activeEmergency ? (
              /* Active Request - Waiting for Help */
              <div className="space-y-4">
                {/* Status Header */}
                <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-white/30 text-center">
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">⏳</span>
                  </div>
                  <h2 className="text-xl font-bold text-gray-800 mb-2">Waiting for Help</h2>
                  <p className="text-gray-600 text-sm">Helpers are being notified of your request</p>
                </div>

                {/* Request Details */}
                <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg p-4 border border-white/30">
                  <h3 className="font-semibold text-gray-800 mb-3">Your Request</h3>
                  
                  <div className="flex flex-wrap gap-2 mb-3">
                    {(activeEmergency.requestedItems || [activeEmergency.type]).map((requestId, index) => {
                      const requestStyle = getRequestStyle(requestId);
                      return (
                        <span 
                          key={index}
                          className={`px-3 py-1 rounded-full ${requestStyle.bgColor} ${requestStyle.textColor} border ${requestStyle.borderColor} text-sm font-medium`}
                        >
                          {requestStyle.label}
                        </span>
                      );
                    })}
                  </div>
                  
                  <p className="text-sm text-gray-700 mb-4">{activeEmergency.description}</p>
                  

{/* Help Progress */}
<div className="grid grid-cols-2 gap-3 mb-4">
  <div className="text-center p-3 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl shadow-lg text-white">
    <div className="font-bold text-2xl mb-1">
      {helpOffers.filter(offer => offer.status === 'ongoing').length}
    </div>
    <div className="text-xs font-medium opacity-90">HELPERS COMING</div>
  </div>
  <div className="text-center p-3 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl shadow-lg text-white">
    <div className="font-bold text-2xl mb-1">
      {helpOffers.filter(offer => offer.status === 'completed').length}
    </div>
    <div className="text-xs font-medium opacity-90">HELP COMPLETED</div>
  </div>
</div>
                  
                  <div className="text-xs text-gray-500 text-center">
                    Requested {getTimeAgo(activeEmergency.reportedAt)}
                  </div>
                </div>

                {/* Real-time Help Updates */}
                {helpOffers.length > 0 ? (
                  <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg p-4 border border-white/30">
                    <h4 className="font-semibold text-gray-800 mb-3">Helpers Responding</h4>
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {helpOffers.map((offer, index) => (
                        <div key={offer._id || index} className="p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200 space-y-3">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="font-semibold text-gray-800 text-lg">{offer.helperName}</div>
                              <div className="text-sm text-gray-600">
                                Offering: {offer.helpTypes && offer.helpTypes.length > 1 ? (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {offer.helpTypes.map((type, idx) => (
                                      <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                                        {getHelpTypeEmoji(type)} {type}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="capitalize">{offer.helpType} Help</span>
                                )}
                              </div>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                              offer.status === 'ongoing' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                              offer.status === 'completed' ? 'bg-green-100 text-green-800 border border-green-300' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {offer.status === 'ongoing' ? 'ON THE WAY' : 
                               offer.status === 'completed' ? 'COMPLETED' : 'OFFERED'}
                            </span>
                          </div>
                          
                          {/* Additional Helper Details */}
                          <div className="text-xs text-gray-500 space-y-2">
                            <div className="flex justify-between">
                              <span>📞 Contact:</span>
                              <span className="font-semibold text-blue-600">{offer.helperContact}</span>
                            </div>
                            {offer.helperOtherContact && (
                              <div className="flex justify-between">
                                <span>📱 Alt. Contact:</span>
                                <span className="font-semibold">{offer.helperOtherContact}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span>🕐 Started:</span>
                              <span>{new Date(offer.startedAt || offer.offeredAt).toLocaleTimeString()}</span>
                            </div>
                            {offer.completedAt && (
                              <div className="flex justify-between">
                                <span>✅ Completed:</span>
                                <span className="text-green-600 font-semibold">
                                  {new Date(offer.completedAt).toLocaleTimeString()}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-center">
                    <p className="text-sm text-yellow-700">
                      Waiting for helpers to respond to your request...
                    </p>
                  </div>
                )}

                {/* Help Received Button */}
                <button
                  onClick={() => markHelpReceived(activeEmergency._id)}
                  className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold text-base hover:bg-green-700 transition-colors shadow-lg hover:scale-[1.02] active:scale-95"
                >
                  I Have Received Help
                </button>
              </div>
            ) : (
              /* New Request Form - Only shown when no active emergency */
              <div className="space-y-4">
                {/* Multiple Help Selection */}
                <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg p-4 border border-white/30">
                  <h3 className="font-semibold text-gray-800 mb-3">What help do you need? *</h3>
                  <p className="text-sm text-gray-600 mb-3">Select all that apply</p>
                  <div className="grid grid-cols-2 gap-2">
                    {requestTypes.map(request => (
                      <button
                        key={request.id}
                        onClick={() => toggleRequestSelection(request.id)}
                        className={`p-3 rounded-xl border transition-all text-left ${
                          selectedRequests.includes(request.id)
                            ? `${request.borderColor} ${request.bgColor} scale-95 shadow-inner`
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className={`text-sm font-medium ${
                          selectedRequests.includes(request.id) ? request.textColor : 'text-gray-700'
                        }`}>
                          {request.label}
                        </div>
                      </button>
                    ))}
                  </div>
                  {selectedRequests.length > 0 && (
                    <p className="text-sm text-green-600 mt-2 font-medium text-center">
                      Selected: {selectedRequests.length} type(s) of help
                    </p>
                  )}
                </div>

                {/* Additional Details */}
                <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg p-4 border border-white/30">
                  <h3 className="font-semibold text-gray-800 mb-3">Additional Details (Optional)</h3>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Describe your situation, specific needs, or any important details..."
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400 resize-none text-sm bg-white/80"
                  />
                </div>

                {/* Contact Info */}
                <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg p-4 border border-white/30">
                  <h3 className="font-semibold text-gray-800 mb-3">Contact Information *</h3>
                  <input
                    type="text"
                    value={form.contact}
                    onChange={(e) => setForm({ ...form, contact: e.target.value })}
                    placeholder="Phone number or how to find you..."
                    className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400 text-sm bg-white/80"
                    required
                  />
                  <p className="text-xs text-red-500 mt-2">This information is required for helpers to contact you</p>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || selectedRequests.length === 0 || !form.contact}
                  className={`w-full py-3 rounded-xl font-semibold text-base transition-all shadow-lg ${
                    isSubmitting || selectedRequests.length === 0 || !form.contact
                      ? "bg-gray-300 cursor-not-allowed text-gray-500"
                      : "bg-red-600 hover:bg-red-700 text-white hover:scale-[1.02] active:scale-95"
                  }`}
                >
                  {isSubmitting ? "Submitting..." : `Request Help (${selectedRequests.length})`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Important Notes Modal */}
      <ImportantNotesModal 
        isOpen={showImportantNotes} 
        onClose={() => setShowImportantNotes(false)} 
      />
    </div>
  );
};

export default VictimDashboard;