import React from "react";
import { useNavigate } from "react-router-dom";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-500 via-red-600 to-orange-500 flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-md p-8 text-center border border-white/30">
        {/* Logo */}
        <img 
          src="/icons/zapalert-logo.png" 
          alt="Emergency Response" 
          className="h-20 mx-auto mb-4"
        />
        
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          ZapAlert!
        </h1>
        <p className="text-gray-600 mb-6">
          Typhoon Emergency Coordination
        </p>

        {/* Action Buttons */}
        <div className="space-y-4">
        <button
          onClick={() => navigate('/victim-dashboard')}
          className="w-full py-4 bg-red-600 text-white rounded-xl font-bold text-lg hover:bg-red-700 transition-all shadow-lg hover:scale-105"
        >
          I NEED HELP
        </button>

        <button
          onClick={() => navigate('/helper-dashboard')}  // CHANGE THIS LINE
          className="w-full py-4 bg-green-600 text-white rounded-xl font-bold text-lg hover:bg-green-700 transition-all shadow-lg hover:scale-105"
        >
          I CAN HELP
        </button>
                  <button
          onClick={() => navigate('/map')}
          className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition-all shadow-lg hover:scale-105"
        >
          View Emergency Map
        </button>
        </div>

        {/* Emergency Notice */}
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
          <p className="text-sm text-yellow-800 font-medium">
            For immediate life-threatening emergencies, 
            call local emergency services first.
          </p>
          <p className="text-sm text-black-800 font-medium">
            EMERGENCY HOTLINE - 911 
          </p>
          <p className="text-sm text-black-800 font-medium">
            BRGY. ZAPATERA - 503-6465
          </p>
        </div>

        <p className="text-xs text-gray-500 mt-4">
          This is a community coordination tool to connect people in need with available helpers.
        </p>
      </div>
    </div>
  );
};

export default Landing;