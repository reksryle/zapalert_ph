import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { useNavigate } from "react-router-dom";
import axios from "../api/axios";
import { toast } from "react-hot-toast";
import { io } from "socket.io-client";

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const LocationMarker = ({ position, setPosition }) => {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  return position === null ? null : (
    <Marker position={position} />
  );
};

const EmergencyReport = () => {
  const navigate = useNavigate();
  const [position, setPosition] = useState(null);
  const [form, setForm] = useState({
    type: "",
    description: "",
    severity: "medium",
    contact: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentEmergency, setCurrentEmergency] = useState(null);
  const [helpOffers, setHelpOffers] = useState([]);
  const [showHelpStatus, setShowHelpStatus] = useState(false);
  const socketRef = useRef(null);

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setPosition({ lat: latitude, lng: longitude });
        },
        (err) => {
          console.error("Location error:", err);
          setPosition({ lat: 10.3157, lng: 123.8854 });
        }
      );
    }
  }, []);

  // Socket connection for real-time updates
  useEffect(() => {
    if (currentEmergency) {
      socketRef.current = io(import.meta.env.VITE_SOCKET_URL);
      
      // Listen for new help offers
      socketRef.current.on("help-offered", (helpOffer) => {
        if (helpOffer.emergencyId === currentEmergency._id) {
          setHelpOffers(prev => [helpOffer, ...prev]);
          toast.success(`🦺 ${helpOffer.helperName} is coming to help with ${helpOffer.helpType}!`, {
            duration: 6000,
          });
        }
      });

      // Listen for help status updates
      socketRef.current.on("help-offer-updated", (updatedOffer) => {
        if (updatedOffer.emergencyId === currentEmergency._id) {
          setHelpOffers(prev =>
            prev.map(offer =>
              offer._id === updatedOffer._id ? updatedOffer : offer
            )
          );
          
          if (updatedOffer.status === 'completed') {
            toast.success(`✅ ${updatedOffer.helperName} has completed helping!`, {
              duration: 5000,
            });
          }
        }
      });

      // Listen for emergency updates (counter changes)
      socketRef.current.on("emergency-updated", (updatedEmergency) => {
        if (updatedEmergency._id === currentEmergency._id) {
          setCurrentEmergency(updatedEmergency);
        }
      });

      return () => {
        if (socketRef.current) socketRef.current.disconnect();
      };
    }
  }, [currentEmergency]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!position) {
      toast.error("Please set your location on the map");
      return;
    }

    if (!form.type || !form.description) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      const emergencyData = {
        type: form.type,
        location: {
          latitude: position.lat,
          longitude: position.lng
        },
        description: form.description,
        severity: form.severity,
        contact: form.contact
      };

      const response = await axios.post("/emergencies", emergencyData);
      const newEmergency = response.data.emergency;
      
      setCurrentEmergency(newEmergency);
      setShowHelpStatus(true);
      toast.success("Emergency reported successfully! Help is on the way.");
      
    } catch (error) {
      console.error("Error reporting emergency:", error);
      toast.error("Failed to report emergency. Please try again.");
      setIsSubmitting(false);
    }
  };

  const handleCloseHelpStatus = () => {
    setCurrentEmergency(null);
    setHelpOffers([]);
    setShowHelpStatus(false);
    setForm({ type: "", description: "", severity: "medium", contact: "" });
    setIsSubmitting(false);
    navigate("/");
  };

  // If showing help status, display the monitoring card instead of the form
  if (showHelpStatus && currentEmergency) {
    const ongoingHelpers = helpOffers.filter(offer => offer.status === 'ongoing');
    const completedHelpers = helpOffers.filter(offer => offer.status === 'completed');

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-500 to-green-600 p-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-white mb-2">Help is Coming!</h1>
            <p className="text-white/80">People are responding to your emergency</p>
          </div>

          {/* Help Status Card */}
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-6 border border-white/30">
            {/* Emergency Details */}
            <div className="mb-6 p-4 bg-red-50 rounded-xl border border-red-200">
              <h3 className="font-bold text-red-700 text-lg mb-2">Your Emergency</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">Type:</span>
                  <span className="capitalize">{currentEmergency.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Severity:</span>
                  <span className="capitalize">{currentEmergency.severity}</span>
                </div>
                <div>
                  <span className="font-medium">Description:</span>
                  <p className="mt-1 text-gray-700">{currentEmergency.description}</p>
                </div>
              </div>
            </div>

            {/* Help Counters */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="text-center p-4 bg-green-50 rounded-xl border border-green-200">
                <div className="text-2xl font-bold text-green-600">
                  {currentEmergency.helpOffersCount || 0}
                </div>
                <div className="text-sm font-medium text-green-700">TOTAL HELPERS</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-200">
                <div className="text-2xl font-bold text-blue-600">
                  {currentEmergency.ongoingHelpCount || 0}
                </div>
                <div className="text-sm font-medium text-blue-700">ONGOING HELP</div>
              </div>
            </div>

            {/* Active Helpers */}
            {ongoingHelpers.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-800 mb-3">Helpers On The Way</h3>
                <div className="space-y-3">
                  {ongoingHelpers.map(offer => (
                    <div key={offer._id} className="flex items-center justify-between p-3 border rounded-lg bg-blue-50 border-blue-200">
                      <div>
                        <div className="font-medium text-gray-800">{offer.helperName}</div>
                        <div className="text-sm text-gray-600 capitalize">{offer.helpType} Help</div>
                        {offer.helperContact && (
                          <div className="text-xs text-blue-600 mt-1">Contact: {offer.helperContact}</div>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">
                          ON THE WAY
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Completed Help */}
            {completedHelpers.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-800 mb-3">Helpers Who Completed</h3>
                <div className="space-y-2">
                  {completedHelpers.map(offer => (
                    <div key={offer._id} className="flex items-center justify-between p-2 border rounded-lg bg-green-50 border-green-200">
                      <div>
                        <div className="font-medium text-gray-800">{offer.helperName}</div>
                        <div className="text-sm text-gray-600 capitalize">{offer.helpType} Help</div>
                      </div>
                      <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800">
                        COMPLETED
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200">
              <h4 className="font-semibold text-yellow-800 mb-2">What to do now:</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Stay in your current location</li>
                <li>• Keep your phone accessible</li>
                <li>• Wait for helpers to arrive</li>
                <li>• Helpers will contact you if they provided contact info</li>
              </ul>
            </div>

            {/* Close Button */}
            <button
              onClick={handleCloseHelpStatus}
              className="w-full mt-6 py-3 bg-gray-600 text-white rounded-xl font-semibold hover:bg-gray-700 transition-colors"
            >
              Close and Return Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Original form for reporting new emergency
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-500 to-orange-500 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <button 
            onClick={() => navigate("/")}
            className="text-white text-sm mb-4 hover:underline"
          >
            ← Back to Home
          </button>
          <h1 className="text-3xl font-bold text-white mb-2">Report Emergency</h1>
          <p className="text-white/80">Please provide details about your situation</p>
        </div>

        {/* Form */}
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-6 border border-white/30">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Emergency Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type of Emergency *
              </label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400"
                required
              >
                <option value="">Select emergency type</option>
                <option value="medical">🏥 Medical Emergency</option>
                <option value="rescue">🚨 Rescue Needed</option>
                <option value="food">🍲 Food/Water Needed</option>
                <option value="shelter">🏠 Shelter Needed</option>
                <option value="other">⚠️ Other Emergency</option>
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Please describe your emergency situation..."
                rows={3}
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400 resize-none"
                required
              />
            </div>

            {/* Severity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Severity Level
              </label>
              <select
                value={form.severity}
                onChange={(e) => setForm({ ...form, severity: e.target.value })}
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400"
              >
                <option value="low">🟢 Low - Need assistance but not urgent</option>
                <option value="medium">🟡 Medium - Need help soon</option>
                <option value="high">🟠 High - Urgent help needed</option>
                <option value="critical">🔴 Critical - Life-threatening emergency</option>
              </select>
            </div>

            {/* Contact (Optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Information (Optional)
              </label>
              <input
                type="text"
                value={form.contact}
                onChange={(e) => setForm({ ...form, contact: e.target.value })}
                placeholder="Phone number or other contact info"
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400"
              />
            </div>

            {/* Location Map */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Location *
                <span className="text-xs text-gray-500 ml-2">
                  Click on the map to set your exact location
                </span>
              </label>
              <div className="h-64 rounded-xl overflow-hidden border-2 border-gray-200">
                {position ? (
                  <MapContainer
                    center={position}
                    zoom={13}
                    style={{ height: "100%", width: "100%" }}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    />
                    <LocationMarker position={position} setPosition={setPosition} />
                  </MapContainer>
                ) : (
                  <div className="h-full flex items-center justify-center bg-gray-100">
                    <p className="text-gray-500">Loading map...</p>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-all shadow-lg ${
                isSubmitting
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-red-600 hover:bg-red-700 hover:scale-105 text-white"
              }`}
            >
              {isSubmitting ? "Reporting Emergency..." : "🚨 Report Emergency"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EmergencyReport;