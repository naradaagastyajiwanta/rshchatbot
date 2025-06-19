'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

interface ResetThreadButtonProps {
  waNumber: string;
  onSuccess?: () => void;
}

export default function ResetThreadButton({ waNumber, onSuccess }: ResetThreadButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleReset = async () => {
    try {
      setIsLoading(true);
      
      const { error } = await supabase
        .from('user_profiles')
        .update({ thread_id_chatbot: null, thread_id_analytic: null })
        .eq('wa_number', waNumber);
      
      if (error) throw error;
      
      setToast({ message: 'Thread ID reset successfully.', type: 'success' });
      setIsModalOpen(false);
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Error resetting thread IDs:', err);
      setToast({ message: 'Failed to reset thread IDs.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      {/* Reset Thread Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
      >
        Reset Thread
      </button>

      {/* Confirmation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-fade-in">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Reset Thread Confirmation</h3>
            <p className="text-gray-700 mb-6">
              Are you sure you want to reset this user's chatbot and analytic thread?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md text-sm font-medium transition-colors duration-200"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors duration-200 flex items-center"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  'Confirm Reset'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div 
          className={`fixed bottom-4 right-4 px-6 py-3 rounded-md shadow-lg animate-fade-in ${
            toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          } text-white`}
          style={{ zIndex: 1000 }}
        >
          <div className="flex items-center">
            {toast.type === 'success' ? (
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            ) : (
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            )}
            {toast.message}
            <button 
              onClick={() => setToast(null)} 
              className="ml-4 text-white hover:text-gray-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
