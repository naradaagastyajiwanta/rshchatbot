"use client";

import React, { useState, useEffect } from 'react';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { supabase } from '../../lib/supabaseClient';

export default function SettingsPage() {
  // Set page title
  const { setPageTitle } = usePageTitle();
  useEffect(() => {
    setPageTitle("CS Settings");
  }, [setPageTitle]);

  // State for form fields
  const [csNumber, setCsNumber] = useState<string>("");
  const [csStatus, setCsStatus] = useState<string>("active");
  const [loading, setLoading] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Fetch settings on component mount
  useEffect(() => {
    async function fetchSettings() {
      try {
        setLoading(true);
        
        // Fetch CS number
        const { data: csNumberData, error: csNumberError } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'cs_number')
          .single();
        
        if (csNumberError && csNumberError.code !== 'PGRST116') {
          console.error('Error fetching CS number:', csNumberError);
        } else if (csNumberData) {
          setCsNumber(csNumberData.value);
        }
        
        // Fetch CS status
        const { data: csStatusData, error: csStatusError } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'cs_status')
          .single();
        
        if (csStatusError && csStatusError.code !== 'PGRST116') {
          console.error('Error fetching CS status:', csStatusError);
        } else if (csStatusData) {
          setCsStatus(csStatusData.value);
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchSettings();
  }, []);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate CS number
    if (!csNumber.startsWith('+62')) {
      setToast({
        message: 'CS number must start with +62',
        type: 'error'
      });
      return;
    }
    
    try {
      setLoading(true);
      
      // Update CS number
      const { error: csNumberError } = await supabase
        .from('settings')
        .upsert({ key: 'cs_number', value: csNumber }, { onConflict: 'key' });
      
      if (csNumberError) {
        throw new Error(`Error updating CS number: ${csNumberError.message}`);
      }
      
      // Update CS status
      const { error: csStatusError } = await supabase
        .from('settings')
        .upsert({ key: 'cs_status', value: csStatus }, { onConflict: 'key' });
      
      if (csStatusError) {
        throw new Error(`Error updating CS status: ${csStatusError.message}`);
      }
      
      // Show success toast
      setToast({
        message: 'Settings updated successfully',
        type: 'success'
      });
      
      // Hide toast after 3 seconds
      setTimeout(() => {
        setToast(null);
      }, 3000);
    } catch (error) {
      console.error('Error updating settings:', error);
      
      // Show error toast
      setToast({
        message: error instanceof Error ? error.message : 'Error updating settings',
        type: 'error'
      });
      
      // Hide toast after 3 seconds
      setTimeout(() => {
        setToast(null);
      }, 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white shadow-md rounded-xl p-6 border border-[#e6c0cf]">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">CS WhatsApp Settings</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* CS WhatsApp Number */}
          <div>
            <label htmlFor="cs-number" className="block text-sm font-medium text-gray-700 mb-1">
              CS WhatsApp Number
            </label>
            <input
              id="cs-number"
              type="text"
              value={csNumber}
              onChange={(e) => setCsNumber(e.target.value)}
              placeholder="+6281234567890"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#c32260] focus:border-transparent text-black"
              disabled={loading}
            />
            <p className="mt-1 text-xs text-gray-500">Format: +62 followed by number</p>
          </div>
          
          {/* CS Notification Status */}
          <div>
            <label htmlFor="cs-status" className="block text-sm font-medium text-gray-700 mb-1">
              Status Notifikasi CS
            </label>
            <select
              id="cs-status"
              value={csStatus}
              onChange={(e) => setCsStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#c32260] focus:border-transparent text-black"
              disabled={loading}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              {csStatus === 'active' 
                ? 'CS will receive notifications for high-lead users' 
                : 'CS will not receive any notifications'}
            </p>
          </div>
          
          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className={`w-full px-4 py-2 bg-gradient-to-r from-[#8e003b] to-[#c32260] text-white font-medium rounded-md shadow-md hover:from-[#7e0035] hover:to-[#b31d56] transition-all duration-200 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
        
        {/* Toast Notification */}
        {toast && (
          <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2 animate-fade-in-out ${
            toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          } text-white`}>
            {toast.type === 'success' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            )}
            <span>{toast.message}</span>
            <button 
              onClick={() => setToast(null)} 
              className="ml-2 text-white hover:text-gray-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        )}
      </div>
      
      {/* Additional Information Card */}
      <div className="bg-white shadow-md rounded-xl p-6 border border-[#e6c0cf] mt-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">About CS Notifications</h3>
        <p className="text-gray-600">
          When a user is identified as a high-lead prospect, the system can automatically send a notification
          to the CS WhatsApp number configured above. This helps your team respond quickly to potential clients.
        </p>
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <h4 className="text-sm font-medium text-blue-800">How it works:</h4>
          <ul className="mt-2 text-sm text-blue-700 list-disc list-inside space-y-1">
            <li>System identifies users with high lead status</li>
            <li>Notification is sent only once per user</li>
            <li>Format includes name, number, and complaint</li>
            <li>Toggle notifications on/off with the status selector</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
