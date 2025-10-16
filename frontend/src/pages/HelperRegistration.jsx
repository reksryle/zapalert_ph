import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { useNavigate } from "react-router-dom";
import axios from "../api/axios";
import { toast } from "react-hot-toast";

// Fix for default markers
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

const HelperRegistration = () => {
  const navigate = useNavigate();
  const [position, setPosition] = useState(null);
  const [form, setForm] = useState({
    name: "",
    skills: [],
    contact: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Skills options
  const skillOptions = [
    { id: "medical", label: "🏥 Medical Assistance", description: "First aid, medical training" },
    { id: "rescue", label: "🚨 Rescue Operations", description: "Search and rescue, evacuation" },
    { id: "supplies", label: "📦 Supplies Distribution", description: "Food, water, essentials" },
    { id: "transport", label: "🚗 Transportation", description: "Vehicle for transport" },
    { id: "communication", label: "📞 Communication", description: "Translation, coordination" },
    { id: "other", label: "🛠️ Other Skills", description: "Other helpful skills" }
  ];

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
          setPosition({ lat: 10.3157, lng: 123.8854 }); // Default Cebu area
        }
      );
    }
  }, []);

  const handleSkillToggle = (skillId) => {
    setForm(prev => ({
      ...prev,
      skills: prev.skills.includes(skillId)
        ? prev.skills.filter(s => s !== skillId)
        : [...prev.skills, skillId]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!position) {
      toast.error("Please set your location on the map");
      return;
    }

    if (form.skills.length === 0) {
      toast.error("Please select at least one skill you can offer");
      return;
    }

    setIsSubmitting(true);

    try {
      const helperData = {
        name: form.name || "Anonymous Helper",
        location: {
          latitude: position.lat,
          longitude: position.lng
        },
        skills: form.skills,
        contact: form.contact
      };

      await axios.post("/helpers", helperData);
      
      toast.success("Thank you for registering as a helper! You'll be notified of nearby emergencies.");
      setTimeout(() => navigate("/"), 2000);
      
    } catch (error) {
      console.error("Error registering helper:", error);
      toast.error("Failed to register. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-500 to-green-600 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <button 
            onClick={() => navigate("/")}
            className="text-white text-sm mb-4 hover:underline"
          >
            ← Back to Home
          </button>
          <h1 className="text-3xl font-bold text-white mb-2">Register as Helper</h1>
          <p className="text-white/80">Offer your skills to help people in need</p>
        </div>

        {/* Form */}
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-6 border border-white/30">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name (Optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Name (Optional)
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="How would you like to be called?"
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-green-400"
              />
            </div>

            {/* Skills Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                What skills can you offer? *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {skillOptions.map((skill) => (
                  <label
                    key={skill.id}
                    className={`flex items-start p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      form.skills.includes(skill.id)
                        ? "border-green-500 bg-green-50"
                        : "border-gray-200 hover:border-green-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={form.skills.includes(skill.id)}
                      onChange={() => handleSkillToggle(skill.id)}
                      className="mt-1 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                    <div className="ml-3">
                      <div className="font-medium text-gray-900">{skill.label}</div>
                      <div className="text-sm text-gray-500">{skill.description}</div>
                    </div>
                  </label>
                ))}
              </div>
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
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-green-400"
              />
              <p className="text-xs text-gray-500 mt-1">
                This will only be shared with people you choose to help
              </p>
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
                  : "bg-green-600 hover:bg-green-700 hover:scale-105 text-white"
              }`}
            >
              {isSubmitting ? "Registering..." : "🦺 Register as Helper"}
            </button>
          </form>
        </div>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <h3 className="font-semibold text-blue-800 mb-2">How it works:</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• You'll be notified of emergencies near your location</li>
            <li>• Only share your contact info when you choose to help someone</li>
            <li>• You can update your availability anytime</li>
            <li>• Thank you for helping your community! 🙏</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default HelperRegistration;