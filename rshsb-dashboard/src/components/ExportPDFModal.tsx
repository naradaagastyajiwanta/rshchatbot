'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { UserProfile } from '../types/UserProfile';

interface ExportPDFModalProps {
  isOpen: boolean;
  onClose: () => void;
  filterOptions: {
    keluhan: string[];
    barrier: string[];
    domisili: string[];
    lead_status: string[];
  };
}

export default function ExportPDFModal({ isOpen, onClose, filterOptions }: ExportPDFModalProps) {
  // Filter states
  const [filters, setFilters] = useState({
    gender: 'all',
    ageRange: 'all',
    keluhan: [] as string[],
    domisili: '',
    leadStatus: 'all',
  });

  // Loading state
  const [loading, setLoading] = useState(false);

  // Handle filter changes
  const handleGenderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({
      ...filters,
      gender: e.target.value,
    });
  };

  const handleAgeRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({
      ...filters,
      ageRange: e.target.value,
    });
  };

  const handleKeluhanChange = (keluhan: string) => {
    setFilters(prev => {
      const updatedKeluhan = prev.keluhan.includes(keluhan)
        ? prev.keluhan.filter(k => k !== keluhan)
        : [...prev.keluhan, keluhan];
      
      return {
        ...prev,
        keluhan: updatedKeluhan,
      };
    });
  };

  const handleDomisiliChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters({
      ...filters,
      domisili: e.target.value,
    });
  };

  const handleLeadStatusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({
      ...filters,
      leadStatus: e.target.value,
    });
  };

  // Generate PDF function
  const generatePDF = async () => {
    setLoading(true);

    try {
      // Build query based on filters
      let query = supabase.from('user_profiles').select('*');

      // Apply gender filter
      if (filters.gender !== 'all') {
        query = query.eq('gender', filters.gender);
      }

      // Apply age range filter
      // Note: This will be calculated after fetching the data

      // Apply keluhan filter
      if (filters.keluhan.length > 0) {
        // Use eq for single value or in for multiple values
        if (filters.keluhan.length === 1) {
          query = query.eq('keluhan', filters.keluhan[0]);
        } else if (filters.keluhan.length > 1) {
          query = query.in('keluhan', filters.keluhan);
        }
      }

      // Apply domisili filter
      if (filters.domisili) {
        query = query.eq('domisili', filters.domisili);
      }

      // Apply lead status filter
      if (filters.leadStatus !== 'all') {
        query = query.eq('lead_status', filters.leadStatus);
      }

      // Execute query
      const { data, error } = await query;

      if (error) {
        throw error;
      }

      if (data) {
        // Filter by age range if needed
        let filteredData = data;
        
        if (filters.ageRange !== 'all') {
          filteredData = data.filter(user => {
            const age = user.age || 0;
            
            switch (filters.ageRange) {
              case 'under30':
                return age < 30;
              case '30to50':
                return age >= 30 && age <= 50;
              case 'over50':
                return age > 50;
              default:
                return true;
            }
          });
        }

        // Create PDF document with landscape orientation
        const doc = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: 'a4'
        });
        
        // Add title
        doc.setFontSize(16);
        doc.text('RSH User Profiles Report', 14, 22);
        
        // Add date
        doc.setFontSize(10);
        doc.text(`Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 14, 30);
        
        // Add filter information
        doc.setFontSize(10);
        let filterText = 'Filters applied: ';
        filterText += filters.gender !== 'all' ? `Gender: ${filters.gender}, ` : '';
        filterText += filters.ageRange !== 'all' ? `Age Range: ${filters.ageRange === 'under30' ? '<30' : filters.ageRange === '30to50' ? '30-50' : '>50'}, ` : '';
        filterText += filters.keluhan.length > 0 ? `Keluhan: ${filters.keluhan.join(', ')}, ` : '';
        filterText += filters.domisili ? `Domisili: ${filters.domisili}, ` : '';
        filterText += filters.leadStatus !== 'all' ? `Lead Status: ${filters.leadStatus}` : '';
        
        if (filterText === 'Filters applied: ') {
          filterText += 'None';
        }
        
        doc.text(filterText, 14, 38);
        
        // Define table columns
        const columns = [
          { header: 'WA Number', dataKey: 'wa_number' },
          { header: 'Name', dataKey: 'name' },
          { header: 'Gender', dataKey: 'gender' },
          { header: 'Age', dataKey: 'age' },
          { header: 'Domisili', dataKey: 'domisili' },
          { header: 'Keluhan', dataKey: 'keluhan' },
          { header: 'Barrier', dataKey: 'barrier' },
          { header: 'Lead Status', dataKey: 'lead_status' },
          { header: 'Profile Link', dataKey: 'profile_link' },
        ];
        
        // Format data for the table with wa.me links and profile links
        const tableData = filteredData.map(user => {
          const waNumber = user.wa_number?.replace(/^\+|\s+/g, '') || '';
          const baseUrl = window.location.origin;
          
          return {
            wa_number: waNumber ? `https://wa.me/${waNumber}` : '',
            name: user.name || '',
            gender: user.gender || '',
            age: user.age || '',
            domisili: user.domisili || '',
            keluhan: user.keluhan || '',
            barrier: user.barrier || '',
            lead_status: user.lead_status || '',
            profile_link: waNumber ? `${baseUrl}/user/${waNumber}` : '',
          };
        });
        
        // Add the table to the PDF with clickable links
        autoTable(doc, {
          startY: 45,
          head: [columns.map(col => col.header)],
          body: tableData.map(row => columns.map(col => row[col.dataKey as keyof typeof row])),
          theme: 'striped',
          headStyles: {
            fillColor: [142, 0, 59], // #8e003b
            textColor: [255, 255, 255],
            fontStyle: 'bold',
          },
          styles: {
            fontSize: 8,
            cellPadding: 3,
          },
          didDrawCell: (data) => {
            // Add clickable links for WA Number and Profile Link columns
            if (data.section === 'body' && data.column.index === 0 && data.cell.raw) {
              // WA Number column (index 0)
              const url = data.cell.raw as string;
              if (url && url.startsWith('https://')) {
                doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url });
              }
            }
            if (data.section === 'body' && data.column.index === 8 && data.cell.raw) {
              // Profile Link column (index 8)
              const url = data.cell.raw as string;
              if (url && url.startsWith('http')) {
                doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url });
              }
            }
          },
          columnStyles: {
            wa_number: { textColor: [0, 0, 255] }, // Blue color for links
            profile_link: { textColor: [0, 0, 255] }, // Blue color for links
          },
        });
        
        // Save the PDF
        doc.save('rsh-user-profiles.pdf');
      }
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setLoading(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black opacity-30" onClick={onClose}></div>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-white to-[#f5e0e8]">
          <h2 className="text-xl font-bold text-[#8e003b]">Export User Data to PDF</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
        <div className="p-6 space-y-6 modal-filter-text">
          <p className="text-gray-800 font-medium">Select filters to apply before exporting user data to PDF.</p>
          
          {/* Gender Filter */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">Gender</h3>
            <div className="flex space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="gender"
                  value="all"
                  checked={filters.gender === 'all'}
                  onChange={handleGenderChange}
                  className="form-radio h-4 w-4 text-[#8e003b] focus:ring-[#8e003b]"
                />
                <span className="ml-2 text-sm text-gray-700">All</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="gender"
                  value="Male"
                  checked={filters.gender === 'Male'}
                  onChange={handleGenderChange}
                  className="form-radio h-4 w-4 text-[#8e003b] focus:ring-[#8e003b]"
                />
                <span className="ml-2 text-sm text-gray-900">Male</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="gender"
                  value="Female"
                  checked={filters.gender === 'Female'}
                  onChange={handleGenderChange}
                  className="form-radio h-4 w-4 text-[#8e003b] focus:ring-[#8e003b]"
                />
                <span className="ml-2 text-sm text-gray-900">Female</span>
              </label>
            </div>
          </div>
          
          {/* Age Range Filter */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">Age Range</h3>
            <div className="flex space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="ageRange"
                  value="all"
                  checked={filters.ageRange === 'all'}
                  onChange={handleAgeRangeChange}
                  className="form-radio h-4 w-4 text-[#8e003b] focus:ring-[#8e003b]"
                />
                <span className="ml-2 text-sm text-gray-700">All</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="ageRange"
                  value="under30"
                  checked={filters.ageRange === 'under30'}
                  onChange={handleAgeRangeChange}
                  className="form-radio h-4 w-4 text-[#8e003b] focus:ring-[#8e003b]"
                />
                <span className="ml-2 text-sm text-gray-900">&lt;30</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="ageRange"
                  value="30to50"
                  checked={filters.ageRange === '30to50'}
                  onChange={handleAgeRangeChange}
                  className="form-radio h-4 w-4 text-[#8e003b] focus:ring-[#8e003b]"
                />
                <span className="ml-2 text-sm text-gray-900">30–50</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="ageRange"
                  value="over50"
                  checked={filters.ageRange === 'over50'}
                  onChange={handleAgeRangeChange}
                  className="form-radio h-4 w-4 text-[#8e003b] focus:ring-[#8e003b]"
                />
                <span className="ml-2 text-sm text-gray-900">&gt;50</span>
              </label>
            </div>
          </div>
          
          {/* Keluhan Filter (Multiselect) */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">Keluhan (Health Complaints)</h3>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-2">
              {filterOptions.keluhan.map((keluhan) => (
                <label key={keluhan} className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.keluhan.includes(keluhan)}
                    onChange={() => handleKeluhanChange(keluhan)}
                    className="form-checkbox h-4 w-4 text-[#8e003b] focus:ring-[#8e003b]"
                  />
                  <span className="ml-2 text-sm text-gray-900">{keluhan}</span>
                </label>
              ))}
              {filterOptions.keluhan.length === 0 && (
                <span className="text-sm text-gray-700 italic">No keluhan data available</span>
              )}
            </div>
          </div>
          
          {/* Domisili Filter */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">Domisili</h3>
            <select
              value={filters.domisili}
              onChange={handleDomisiliChange}
              className="w-full rounded-lg border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-[#8e003b] focus:ring-1 focus:ring-[#8e003b] transition-colors"
            >
              <option value="">All Locations</option>
              {filterOptions.domisili.map((domisili) => (
                <option key={domisili} value={domisili}>{domisili}</option>
              ))}
            </select>
          </div>
          
          {/* Lead Status Filter */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">Lead Status</h3>
            <div className="flex space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="leadStatus"
                  value="all"
                  checked={filters.leadStatus === 'all'}
                  onChange={handleLeadStatusChange}
                  className="form-radio h-4 w-4 text-[#8e003b] focus:ring-[#8e003b]"
                />
                <span className="ml-2 text-sm text-gray-700">All</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="leadStatus"
                  value="Hot"
                  checked={filters.leadStatus === 'Hot'}
                  onChange={handleLeadStatusChange}
                  className="form-radio h-4 w-4 text-green-600 focus:ring-green-600"
                />
                <span className="ml-2 text-sm text-green-700">High</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="leadStatus"
                  value="Warm"
                  checked={filters.leadStatus === 'Warm'}
                  onChange={handleLeadStatusChange}
                  className="form-radio h-4 w-4 text-yellow-600 focus:ring-yellow-600"
                />
                <span className="ml-2 text-sm text-yellow-700">Medium</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="leadStatus"
                  value="Cold"
                  checked={filters.leadStatus === 'Cold'}
                  onChange={handleLeadStatusChange}
                  className="form-radio h-4 w-4 text-red-600 focus:ring-red-600"
                />
                <span className="ml-2 text-sm text-red-700">Low</span>
              </label>
            </div>
          </div>
        </div>
        
        <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8e003b]"
          >
            Cancel
          </button>
          <button
            onClick={generatePDF}
            disabled={loading}
            className="px-4 py-2 bg-[#8e003b] border border-transparent rounded-md text-sm font-medium text-white hover:bg-[#6d002d] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8e003b] disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                </svg>
                Export PDF
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
