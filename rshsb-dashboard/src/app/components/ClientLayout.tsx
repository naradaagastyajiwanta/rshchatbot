"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { PageTitleProvider, usePageTitle } from '../../contexts/PageTitleContext';

// Wrapper component that uses the context
function ClientLayoutContent({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Use the page title context
  const { pageTitle } = usePageTitle();
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* improved UI: Ultra-modern sidebar with advanced gradient and enhanced styling */}
      <motion.div 
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-64 bg-gradient-to-br from-white via-blue-50 to-blue-100 border-r border-blue-100 shadow-lg flex-shrink-0 fixed h-full z-20 backdrop-blur-sm"
      >
        <div className="p-5 border-b border-blue-100 bg-white bg-opacity-90 backdrop-blur-sm">
          <motion.h2 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-500 tracking-tight"
          >
            RSH SB
          </motion.h2>
          <motion.p 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="text-xs text-gray-500 mt-1"
          >
            Healthcare Analytics Dashboard
          </motion.p>
        </div>
        <nav className="mt-6 space-y-2 px-3">
          <ul className="space-y-3">
            {[
              { href: "/dashboard", label: "Live Chat", icon: (
                <svg className="w-5 h-5 mr-3 text-blue-400 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
                </svg>
              ), delay: 0.6 },
              { href: "/users", label: "Users", icon: (
                <svg className="w-5 h-5 mr-3 text-blue-400 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                </svg>
              ), delay: 0.7 },
              { href: "/analytics", label: "Analytics", icon: (
                <svg className="w-5 h-5 mr-3 text-blue-400 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                </svg>
              ), delay: 0.8 },
              { href: "/wa-connect", label: "WhatsApp Connect", icon: (
                <svg className="w-5 h-5 mr-3 text-blue-400 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                </svg>
              ), delay: 0.9 }
            ].map((item, index) => (
              <motion.li 
                key={index}
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: item.delay, duration: 0.5 }}
              >
                <a 
                  href={item.href} 
                  className="flex items-center px-4 py-3 text-gray-700 hover:bg-white hover:shadow-md hover:text-blue-600 transition-all duration-200 rounded-xl group mx-1 relative overflow-hidden"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-blue-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                  {item.icon}
                  <span className="font-medium relative z-10">{item.label}</span>
                  <span className="absolute right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-blue-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                  </span>
                </a>
              </motion.li>
            ))}
          </ul>
        </nav>
        
        {/* improved UI: Ultra-modern footer with enhanced branding and animations */}
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.4 }}
          className="absolute bottom-0 w-full p-5 border-t border-blue-100 bg-gradient-to-r from-white to-blue-50 bg-opacity-90 backdrop-blur-sm"
        >
          <div className="text-xs relative">
            <div className="absolute -top-10 left-0 w-full h-10 bg-gradient-to-t from-white to-transparent opacity-50"></div>
            <p className="font-medium bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-500">Rumah Sehat Holistik</p>
            <p className="mt-1 text-gray-500 flex items-center">
              <span>Satu Bumi</span>
              <span className="ml-2 inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            </p>
          </div>
        </motion.div>
      </motion.div>

      {/* improved UI: Ultra-modern main content area with enhanced styling and animations */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="flex-1 overflow-auto ml-64 relative z-10"
      >
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-full h-64 bg-gradient-to-b from-blue-50 to-transparent opacity-40 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-full h-64 bg-gradient-to-t from-blue-50 to-transparent opacity-40 pointer-events-none"></div>
        <div className="absolute top-20 right-20 w-72 h-72 rounded-full bg-gradient-to-br from-blue-100 to-cyan-50 opacity-30 blur-3xl pointer-events-none"></div>
        
        {/* improved UI: Ultra-modern header with enhanced shadow and styling */}
        <motion.header 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="bg-white bg-opacity-90 backdrop-blur-sm border-b border-blue-100 shadow-md p-5 sticky top-0 z-30"
        >
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-800 to-gray-600">{pageTitle}</h1>
            <div className="text-sm bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-1.5 rounded-full text-white font-medium shadow-md flex items-center space-x-1">
              <span className="inline-block w-2 h-2 bg-white rounded-full animate-pulse mr-2"></span>
              <span>Admin Dashboard</span>
            </div>
          </div>
        </motion.header>

        {/* improved UI: Ultra-modern page content with enhanced padding, spacing and animations */}
        <motion.main 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="p-6 space-y-6 w-full relative z-10"
        >
          <div className="relative">
            {children}
          </div>
        </motion.main>
      </motion.div>
    </div>
  );
}

// Export the layout with the context provider
export default function ClientLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <PageTitleProvider>
      <ClientLayoutContent children={children} />
    </PageTitleProvider>
  );
}
