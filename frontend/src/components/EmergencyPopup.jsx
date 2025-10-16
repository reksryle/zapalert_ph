import React from 'react';

const EmergencyPopup = ({ emergency, onOfferHelp, helpTypes, formatEmergencyType, getSeverityColor, getTimeAgo }) => {
  return (
    <div className="p-2">
      <h3 className="font-bold text-red-600">{formatEmergencyType(emergency.type)}</h3>
      <p className="text-sm">{emergency.description}</p>
      <div className={`text-xs px-2 py-1 rounded-full mt-1 inline-block ${getSeverityColor(emergency.severity)}`}>
        {emergency.severity}
      </div>
      
      {/* HELP INDICATORS - ADD THIS SECTION */}
      <div className="flex space-x-2 mt-2 text-xs">
        <div className="bg-green-100 text-green-800 px-2 py-1 rounded">
          🆘 {emergency.helpOffersCount || 0}
        </div>
        <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
          🔄 {emergency.ongoingHelpCount || 0}
        </div>
      </div>
      
      <p className="text-xs text-gray-500 mt-1">
        {getTimeAgo(emergency.reportedAt)}
      </p>
      {emergency.contact && (
        <p className="text-xs text-blue-600 mt-1">Contact: {emergency.contact}</p>
      )}
    </div>
  );
};

export default EmergencyPopup;