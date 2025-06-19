"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { usePageTitleUpdater } from "../../utils/usePageTitleUpdater";

interface ConnectionStatus {
  state: 'disconnected' | 'connecting' | 'connected';
  lastUpdated: string;
  phoneNumber: string | null;
  info: string | null;
}

export default function WhatsAppConnectPage() {
  const [qr, setQr] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshCountdown, setRefreshCountdown] = useState<number>(10);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);

  // Set the page title when component mounts
  usePageTitleUpdater('WhatsApp Connect');

  const fetchQrCode = async () => {
    try {
      // Only fetch QR if not connected
      if (connectionStatus?.state !== 'connected') {
        setLoading(true);
        const response = await fetch("http://localhost:3001/wa-qr");
        
        if (!response.ok) {
          if (response.status !== 404) { // 404 is expected when already connected
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
        } else {
          const data = await response.json();
          setQr(data.qr);
          setError(null);
        }
        
        setRefreshCountdown(10);
      }
    } catch (err) {
      setError("Gagal memuat QR Code. Silakan coba lagi nanti.");
      console.error("Error fetching QR code:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchConnectionStatus = async () => {
    try {
      const response = await fetch("http://localhost:3001/wa-status");
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const status = await response.json();
      setConnectionStatus(status);

      // If connected, we don't need to show loading state or fetch QR
      if (status.state === 'connected') {
        setLoading(false);
        setQr(null);
      }
    } catch (err) {
      console.error("Error fetching connection status:", err);
    }
  };

  const handleDisconnect = async () => {
    // This would typically call an API endpoint to disconnect
    // For now we'll just show an alert
    alert('Fitur disconnect belum diimplementasikan.');
  };

  useEffect(() => {
    // Fetch connection status first
    fetchConnectionStatus();
    
    // Then fetch QR code if needed
    fetchQrCode();

    // Set up intervals to refresh data
    const qrIntervalId = setInterval(fetchQrCode, 10000);
    const statusIntervalId = setInterval(fetchConnectionStatus, 5000);

    // Countdown timer for QR refresh
    const countdownId = setInterval(() => {
      setRefreshCountdown((prev) => (prev > 0 ? prev - 1 : 10));
    }, 1000);

    // Clean up intervals on component unmount
    return () => {
      clearInterval(qrIntervalId);
      clearInterval(statusIntervalId);
      clearInterval(countdownId);
    };
  }, []);

  return (
    <div className="flex items-center justify-center bg-gradient-to-br from-[#f5e0e8] via-white to-[#f5e0e8] p-4 h-full">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full mx-auto bg-white shadow-lg rounded-2xl overflow-hidden border border-gray-100"
      >
        {/* Header - Changes color based on connection state */}
        <div 
          className={`p-5 text-white ${connectionStatus?.state === 'connected' 
            ? 'bg-gradient-to-r from-green-500 to-green-600' 
            : connectionStatus?.state === 'connecting' 
              ? 'bg-gradient-to-r from-yellow-400 to-orange-500'
              : 'bg-gradient-to-r from-[#c32260] to-[#8e003b]'}`}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <h1 className="text-2xl font-bold mb-1">
              {connectionStatus?.state === 'connected' 
                ? 'WhatsApp Terhubung' 
                : 'Sambungkan WhatsApp'}
            </h1>
            <p className="text-sm opacity-90">
              {connectionStatus?.state === 'connected' 
                ? `Terhubung dengan nomor ${connectionStatus.phoneNumber}` 
                : 'Scan QR code untuk menghubungkan akun WhatsApp Anda ke bot'}
            </p>
          </motion.div>
        </div>
        
        {/* Content */}
        <div className="p-6 text-center">
          {/* Connection Status Badge */}
          <div className="mb-4">
            <span 
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${connectionStatus?.state === 'connected' 
                ? 'bg-green-100 text-green-800' 
                : connectionStatus?.state === 'connecting' 
                  ? 'bg-yellow-100 text-yellow-800' 
                  : 'bg-gray-100 text-gray-800'}`}
            >
              <span className={`w-2 h-2 rounded-full mr-2 ${connectionStatus?.state === 'connected' 
                ? 'bg-green-500' 
                : connectionStatus?.state === 'connecting' 
                  ? 'bg-yellow-500' 
                  : 'bg-gray-500'}`}></span>
              {connectionStatus?.state === 'connected' 
                ? 'Terhubung' 
                : connectionStatus?.state === 'connecting' 
                  ? 'Menghubungkan' 
                  : 'Terputus'}
            </span>
          </div>

          {/* Connected State */}
          {connectionStatus?.state === 'connected' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 bg-green-50 rounded-xl p-6 border border-green-100 shadow-inner"
            >
              <div className="flex flex-col items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-4">
                  <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-green-800 mb-1">WhatsApp Berhasil Terhubung</h3>
                <p className="text-sm text-green-600 mb-4">{connectionStatus.info}</p>
                <p className="text-xs text-green-700 mb-4">Nomor: {connectionStatus.phoneNumber}</p>
                <button 
                  onClick={handleDisconnect}
                  className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 text-sm rounded-lg transition-colors duration-200"
                >
                  Putuskan Koneksi
                </button>
              </div>
            </motion.div>
          )}

          {/* QR Code or Loading State */}
          {connectionStatus?.state !== 'connected' && (
            <div className="relative mb-6 bg-gray-50 rounded-xl p-4 border border-gray-100 shadow-inner">
              {loading && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center w-64 h-64 mx-auto"
                >
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mb-2"></div>
                  <p className="text-gray-600">Menunggu QR Code...</p>
                </motion.div>
              )}
              
              {error && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mx-auto w-64 h-64 flex flex-col items-center justify-center"
                >
                  <svg className="w-12 h-12 text-red-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <p>{error}</p>
                  <button 
                    onClick={fetchQrCode}
                    className="mt-3 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 text-sm rounded-lg transition-colors duration-200"
                  >
                    Coba Lagi
                  </button>
                </motion.div>
              )}
              
              {!loading && !error && qr && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="relative"
                >
                  <img 
                    src={qr} 
                    alt="WhatsApp QR Code" 
                    className="mx-auto w-64 h-64 rounded-lg shadow-sm"
                  />
                  <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center shadow-md">
                    {refreshCountdown}
                  </div>
                </motion.div>
              )}
            </div>
          )}
          
          {/* Instructions */}
          <div className="space-y-3">
            {connectionStatus?.state !== 'connected' && (
              <>
                <p className="text-sm text-gray-600">
                  <svg className="w-4 h-4 inline-block mr-1 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  Silakan scan QR ini menggunakan WhatsApp pada ponsel Anda
                </p>
                <p className="text-xs text-gray-500">
                  QR code akan diperbarui setiap 10 detik
                </p>
              </>
            )}
            {connectionStatus?.state === 'connected' && (
              <p className="text-sm text-gray-600">
                <svg className="w-4 h-4 inline-block mr-1 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                Anda dapat kembali ke dashboard untuk melihat pesan masuk
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
