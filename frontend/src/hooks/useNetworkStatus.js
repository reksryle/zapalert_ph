import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { toast, Slide } from "react-toastify";

const BASE_URL = import.meta.env.VITE_API_URL;

export default function useNetworkStatus() {
  const [status, setStatus] = useState("checking");
  const lastStatus = useRef("checking");
  const hasBeenOffline = useRef(false);
  const initialCheck = useRef(true);
  const consecutiveFailures = useRef(0);
  const toastId = "network-status";

  const toastStyle = (type) => ({
    toastId,
    position: "top-center",
    autoClose: type === "success" ? 2500 : false,
    hideProgressBar: true,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    transition: Slide,
    style: {
      backgroundColor: "#fff",
      color: type === "success" ? "#16a34a" : "#b91c1c",
      border: `1px solid ${type === "success" ? "#16a34a" : "#f87171"}`,
      borderRadius: "12px",
      padding: "12px 16px",
      fontSize: "0.95rem",
      fontWeight: "500",
      textAlign: "center",
      boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
      width: "320px",
      marginTop: "20px",
    },
    closeButton: false,
  });

  useEffect(() => {
    const showToast = (message, type) => {
      if (!toast.isActive(toastId)) {
        toast[type](message, toastStyle(type));
      } else {
        toast.update(toastId, { render: message, type, ...toastStyle(type) });
      }
    };

    const checkConnection = async () => {
      // First check browser's native online status (most reliable)
      if (!navigator.onLine) {
        consecutiveFailures.current++;
        if (lastStatus.current !== "offline" && consecutiveFailures.current >= 1) {
          setStatus("offline");
          lastStatus.current = "offline";
          hasBeenOffline.current = true;
          if (!initialCheck.current) {
            showToast("No internet connection", "error");
          }
        }
        return;
      }

      // If browser says we're online, verify with server
      try {
        const response = await axios.get(`${BASE_URL}/health`, { 
          timeout: 3000,
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        // Reset failure counter on successful check
        consecutiveFailures.current = 0;
        
        if (lastStatus.current !== "online") {
          setStatus("online");
          lastStatus.current = "online";

          // Only show connected toast if we were previously offline
          if (hasBeenOffline.current && !initialCheck.current) {
            showToast("Connected to network", "success");
            hasBeenOffline.current = false;
          }
        }
      } catch (error) {
        consecutiveFailures.current++;
        
        // Only show offline status after multiple consecutive failures
        // This prevents false positives from temporary server issues
        if (lastStatus.current !== "offline" && consecutiveFailures.current >= 2) {
          setStatus("offline");
          lastStatus.current = "offline";
          hasBeenOffline.current = true;
          if (!initialCheck.current) {
            showToast("No internet access", "error");
          }
        }
      }

      // Mark initial check as complete
      if (initialCheck.current) {
        initialCheck.current = false;
      }
    };

    // Initial check with slightly longer delay for production
    const initialTimer = setTimeout(() => {
      checkConnection();
    }, 1500);

    // Regular checks - less frequent to reduce false positives
    const interval = setInterval(checkConnection, 8000);

    // Real-time browser events (most accurate)
    const handleOnline = () => {
      consecutiveFailures.current = 0;
      checkConnection();
    };

    const handleOffline = () => {
      consecutiveFailures.current = 2; // Immediately trigger offline
      checkConnection();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return status;
}