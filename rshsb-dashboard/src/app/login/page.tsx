"use client";

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    console.log('Login attempt with email:', email);

    // Basic validation
    if (!email || !password) {
      setError('Email dan password harus diisi');
      setIsLoading(false);
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Format email tidak valid');
      setIsLoading(false);
      return;
    }

    try {
      // Attempt sign in with debug logging
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log('Auth response:', { data, error });

      if (error) {
        throw error;
      }

      if (data?.session) {
        // On successful login
        console.log('Login successful, session established');
        console.log('User:', data.user);
        
        // First try to set cookies manually if needed
        document.cookie = `sb-auth-token=${data.session.access_token}; path=/; max-age=${60 * 60 * 24 * 7}`;
        
        // Force a hard refresh to ensure cookies are properly set
        window.location.href = '/dashboard';
      } else {
        // This should not happen in normal circumstances
        console.error('No session returned despite successful login');
        setError('Gagal membuat sesi login. Silakan coba lagi.');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Login gagal, silakan coba lagi');
    } finally {
      // Always reset loading state, regardless of success or failure
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-white via-[#f5e0e8] to-[#e6c0cf] p-4">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="p-6 sm:p-8">
            <div className="flex flex-col items-center justify-center mb-6">
              <div className="mb-4">
                <Image 
                  src="/images/logo-rsh.png" 
                  alt="RSH Satubumi Logo" 
                  width={80} 
                  height={80} 
                  className="rounded-full"
                />
              </div>
              <div className="text-center">
                <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#8e003b] via-[#a5114c] to-[#c32260] tracking-tight">
                  Chatbot RSH
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Rumah Sehat Holistik Satu Bumi
                </p>
              </div>
            </div>

            <h1 className="text-xl font-semibold text-gray-800 text-center mb-6">
              Login Admin
            </h1>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm border border-red-200"
              >
                {error}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c32260] focus:border-transparent outline-none transition-all text-gray-900"
                  placeholder="nama@email.com"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c32260] focus:border-transparent outline-none transition-all text-gray-900"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-2.5 px-4 bg-gradient-to-r from-[#8e003b] to-[#c32260] text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-200 ${
                  isLoading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Memproses...
                  </span>
                ) : (
                  'Login'
                )}
              </button>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
