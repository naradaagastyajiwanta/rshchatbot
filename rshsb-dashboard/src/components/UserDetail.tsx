'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import ChatViewer from './ChatViewer';

interface UserProfile {
  wa_number: string;
  name: string;
  gender: string;
  domisili: string;
  keluhan: string;
  barrier: string;
  lead_status: 'Cold' | 'Warm' | 'Hot';
  last_updated: string;
  age: number;
  symptoms: string;
  medical_history: string;
  urgency_level: string;
  emotion: string;
  program_awareness: string;
}

export default function UserDetail({ waNumber }: { waNumber: string }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('wa_number', waNumber)
          .single();
        
        if (error) {
          throw error;
        }
        
        setUser(data);
      } catch (err) {
        console.error('Error fetching user profile:', err);
        setError('Failed to load user profile');
      } finally {
        setLoading(false);
      }
    };

    if (waNumber) {
      fetchUserProfile();
    }
    
    // Set up real-time subscription for user profile updates
    const subscription = supabase
      .channel(`user_profile_${waNumber}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_profiles',
          filter: `wa_number=eq.${waNumber}`
        },
        (payload) => {
          setUser(payload.new as UserProfile);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [waNumber]);

  // Get lead status color
  const getLeadStatusColor = (status: string) => {
    switch (status) {
      case 'Hot':
        return 'bg-green-100 text-green-800';
      case 'Warm':
        return 'bg-yellow-100 text-yellow-800';
      case 'Cold':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="flex justify-center p-6">Loading user profile...</div>;
  }

  if (error) {
    return <div className="text-red-500 p-6">{error}</div>;
  }

  if (!user) {
    return <div className="p-6">User profile not found</div>;
  }

  return (
    <div className="space-y-8">
      {/* User Profile Card */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">{user.name || 'Unknown'}</h2>
            <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${getLeadStatusColor(user.lead_status)}`}>
              {user.lead_status}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">{user.wa_number}</p>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-4">Personal Information</h3>
              
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-500">Age</span>
                  <p>{user.age || 'Not specified'}</p>
                </div>
                
                <div>
                  <span className="text-sm font-medium text-gray-500">Gender</span>
                  <p>{user.gender || 'Not specified'}</p>
                </div>
                
                <div>
                  <span className="text-sm font-medium text-gray-500">Domisili</span>
                  <p>{user.domisili || 'Not specified'}</p>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-4">Health Information</h3>
              
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-500">Keluhan</span>
                  <p>{user.keluhan || 'Not specified'}</p>
                </div>
                
                <div>
                  <span className="text-sm font-medium text-gray-500">Barrier</span>
                  <p>{user.barrier || 'Not specified'}</p>
                </div>
                
                <div>
                  <span className="text-sm font-medium text-gray-500">Urgency Level</span>
                  <p>{user.urgency_level || 'Not specified'}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Additional Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <span className="text-sm font-medium text-gray-500">Symptoms</span>
                <p className="mt-1">{user.symptoms || 'Not specified'}</p>
              </div>
              
              <div>
                <span className="text-sm font-medium text-gray-500">Medical History</span>
                <p className="mt-1">{user.medical_history || 'Not specified'}</p>
              </div>
              
              <div>
                <span className="text-sm font-medium text-gray-500">Emotion</span>
                <p className="mt-1">{user.emotion || 'Not specified'}</p>
              </div>
              
              <div>
                <span className="text-sm font-medium text-gray-500">Program Awareness</span>
                <p className="mt-1">{user.program_awareness || 'Not specified'}</p>
              </div>
            </div>
          </div>
          
          <div className="mt-6 text-sm text-gray-500">
            Last updated: {user.last_updated ? new Date(user.last_updated).toLocaleString() : 'Unknown'}
          </div>
        </div>
      </div>
      
      {/* Chat History */}
      <div>
        <h3 className="text-lg font-medium text-gray-800 mb-4">Chat History</h3>
        <ChatViewer waNumber={waNumber} />
      </div>
    </div>
  );
}
