import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      toast.success('ZAPALERT installed successfully! 🎉');
    } else {
      toast.error('Installation cancelled');
    }
    
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const handleDismiss = () => {
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
    // Don't show again for 30 days
    localStorage.setItem('installPromptDismissed', Date.now().toString());
  };

  // Check if user recently dismissed the prompt
  useEffect(() => {
    const dismissed = localStorage.getItem('installPromptDismissed');
    if (dismissed) {
      const timeSinceDismissal = Date.now() - parseInt(dismissed);
      const thirtyDays = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
      if (timeSinceDismissal < thirtyDays) {
        setShowInstallPrompt(false);
      }
    }
  }, []);

  if (!showInstallPrompt) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-4 border border-white/30 z-[9999] max-w-sm animate-popupIn">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
          <span className="text-red-600 text-lg">📱</span>
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-gray-800 text-sm">Install ZAPALERT</h3>
          <p className="text-xs text-gray-600 mt-1">
            Install for faster access and offline functionality
          </p>
          <div className="flex space-x-2 mt-2">
            <button
              onClick={handleInstall}
              className="flex-1 bg-red-600 text-white py-2 rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors"
            >
              Install
            </button>
            <button
              onClick={handleDismiss}
              className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg text-xs font-semibold hover:bg-gray-300 transition-colors"
            >
              Later
            </button>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes popupIn {
          0% { transform: translateY(20px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        .animate-popupIn {
          animation: popupIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default PWAInstallPrompt;