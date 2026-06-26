/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Menu, 
  Plus, 
  Calendar, 
  RotateCw, 
  Undo2, 
  LogOut, 
  Home, 
  Flame, 
  AlertTriangle, 
  MapPin,
  ClipboardList,
  Building,
  QrCode,
  Briefcase,
  Mail,
  BarChart3,
  AlertOctagon
} from 'lucide-react';

interface SidebarRailProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onAddInspectionClick?: () => void;
  onRefreshClick?: () => void;
  onRecenterMap?: () => void;
  onLogoutClick: () => void;
  role: 'contractor' | 'bureau';
}

export default function SidebarRail({
  activeTab,
  setActiveTab,
  onAddInspectionClick,
  onRefreshClick,
  onRecenterMap,
  onLogoutClick,
  role
}: SidebarRailProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div 
      className={`bg-[#0f172a] border-r border-[#dc2626]/20 flex flex-col justify-between select-none shrink-0 h-full shadow-lg transition-all duration-300 ease-in-out ${
        isExpanded ? 'w-64 px-4 py-5 items-stretch' : 'w-16 px-1.5 py-4 items-center'
      }`}
    >
      {/* Top Section */}
      <div className="flex flex-col gap-4 w-full">
        {/* Toggle Menu Button */}
        <button 
          id="btn-sidebar-menu"
          onClick={() => setIsExpanded(!isExpanded)}
          className={`p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition duration-200 cursor-pointer flex items-center justify-center gap-3 ${
            isExpanded ? 'w-full px-3 justify-start bg-slate-900/40 border border-slate-800' : ''
          }`}
          title={isExpanded ? "Collapse Navigation" : "Expand Navigation Menu"}
        >
          <Menu className="w-5 h-5 shrink-0" />
          {isExpanded && (
            <span className="text-xs font-black uppercase text-slate-200 tracking-wider">
              Collapse menu
            </span>
          )}
        </button>

        <div className={`h-[1px] bg-slate-800 my-1 ${isExpanded ? 'w-full' : 'w-8 mx-auto'}`} />

        {/* Dashboard Home */}
        <button
          id="btn-sidebar-home"
          onClick={() => setActiveTab('overview')}
          className={`p-3 rounded-lg transition-all duration-200 relative group cursor-pointer flex items-center ${
            isExpanded ? 'w-full px-4 gap-3 justify-start' : 'justify-center'
          } ${
            activeTab === 'overview' 
              ? 'bg-[#dc2626] text-white shadow-md font-bold' 
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Dashboard Home"
        >
          <Home className="w-5 h-5 shrink-0" />
          {isExpanded ? (
            <span className="text-xs font-bold leading-none">Dashboard Home</span>
          ) : (
            <span className="absolute left-18 bg-[#0f172a] border border-slate-700 text-white text-xs px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
              Dashboard Home
            </span>
          )}
        </button>

        {/* Compliance Dashboard (New upgrade for fully functioning portal) */}
        <button
          id="btn-sidebar-dashboard"
          onClick={() => setActiveTab('dashboard')}
          className={`p-3 rounded-lg transition-all duration-200 relative group cursor-pointer flex items-center ${
            isExpanded ? 'w-full px-4 gap-3 justify-start' : 'justify-center'
          } ${
            activeTab === 'dashboard' 
              ? 'bg-[#dc2626] text-white shadow-md font-bold' 
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Compliance Analytics & Charts"
        >
          <BarChart3 className="w-5 h-5 shrink-0" />
          {isExpanded ? (
            <span className="text-xs font-bold leading-none">Compliance Charts</span>
          ) : (
            <span className="absolute left-18 bg-[#0f172a] border border-slate-700 text-white text-xs px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
              Compliance Charts
            </span>
          )}
        </button>

        {/* Outstanding Deficiencies Tracker */}
        <button
          id="btn-sidebar-deficiencies"
          onClick={() => setActiveTab('deficiencies')}
          className={`p-3 rounded-lg transition-all duration-200 relative group cursor-pointer flex items-center ${
            isExpanded ? 'w-full px-4 gap-3 justify-start' : 'justify-center'
          } ${
            activeTab === 'deficiencies' 
              ? 'bg-[#dc2626] text-white shadow-md font-bold' 
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Deficiencies Tracker"
        >
          <AlertOctagon className="w-5 h-5 shrink-0" />
          {isExpanded ? (
            <span className="text-xs font-bold leading-none">Deficiencies Board</span>
          ) : (
            <span className="absolute left-18 bg-[#0f172a] border border-slate-700 text-white text-xs px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
              Deficiencies Board
            </span>
          )}
        </button>

        {/* Upload Action (Only relevant for Contractor tab) */}
        {role === 'contractor' && (
          <button
            id="btn-sidebar-upload"
            onClick={onAddInspectionClick}
            className={`p-3 rounded-lg transition-all duration-200 text-slate-400 hover:text-white hover:bg-slate-800 relative group cursor-pointer flex items-center ${
              isExpanded ? 'w-full px-4 gap-3 justify-start' : 'justify-center'
            }`}
            title="Upload Completed Report"
          >
            <Plus className="w-5 h-5 text-emerald-400 hover:scale-110 transition-transform shrink-0" />
            {isExpanded ? (
              <span className="text-xs font-bold leading-none text-emerald-400">Upload Report</span>
            ) : (
              <span className="absolute left-18 bg-[#0f172a] border border-slate-700 text-white text-xs px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                Upload Report
              </span>
            )}
          </button>
        )}

        {/* Inspections Calendar */}
        <button
          id="btn-sidebar-calendar"
          onClick={() => setActiveTab('calendar')}
          className={`p-3 rounded-lg transition-all duration-200 relative group cursor-pointer flex items-center ${
            isExpanded ? 'w-full px-4 gap-3 justify-start' : 'justify-center'
          } ${
            activeTab === 'calendar' 
              ? 'bg-[#dc2626] text-white shadow-md font-bold' 
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Inspections Calendar"
        >
          <Calendar className="w-5 h-5 shrink-0" />
          {isExpanded ? (
            <span className="text-xs font-bold leading-none">Inspections Calendar</span>
          ) : (
            <span className="absolute left-18 bg-[#0f172a] border border-slate-700 text-white text-xs px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
              Inspections Calendar
            </span>
          )}
        </button>

        {/* All Reports List tab */}
        <button
          id="btn-sidebar-reports"
          onClick={() => setActiveTab('reports')}
          className={`p-3 rounded-lg transition-all duration-200 relative group cursor-pointer flex items-center ${
            isExpanded ? 'w-full px-4 gap-3 justify-start' : 'justify-center'
          } ${
            activeTab === 'reports' 
              ? 'bg-[#dc2626] text-white shadow-md font-bold' 
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="All Reports"
        >
          <ClipboardList className="w-5 h-5 shrink-0" />
          {isExpanded ? (
            <span className="text-xs font-bold leading-none">Inspection submittals</span>
          ) : (
            <span className="absolute left-18 bg-[#0f172a] border border-slate-700 text-white text-xs px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
              All Inspection Reports
            </span>
          )}
        </button>

        {/* Properties / Businesses List */}
        <button
          id="btn-sidebar-properties"
          onClick={() => setActiveTab('properties')}
          className={`p-3 rounded-lg transition-all duration-200 relative group cursor-pointer flex items-center ${
            isExpanded ? 'w-full px-4 gap-3 justify-start' : 'justify-center'
          } ${
            activeTab === 'properties' 
              ? 'bg-[#dc2626] text-white shadow-md font-bold' 
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Properties"
        >
          <Building className="w-5 h-5 shrink-0" />
          {isExpanded ? (
            <span className="text-xs font-bold leading-none">Property Map Grid</span>
          ) : (
            <span className="absolute left-18 bg-[#0f172a] border border-slate-700 text-white text-xs px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
              Audited Properties
            </span>
          )}
        </button>

        {/* Registered Contractors (Only relevant for Bureau - activates the contractors tab!) */}
        {role === 'bureau' && (
          <button
            id="btn-sidebar-contractors"
            onClick={() => setActiveTab('contractors')}
            className={`p-3 rounded-lg transition-all duration-200 relative group cursor-pointer flex items-center ${
              isExpanded ? 'w-full px-4 gap-3 justify-start' : 'justify-center'
            } ${
              activeTab === 'contractors' 
                ? 'bg-[#dc2626] text-white shadow-md font-bold' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Registered Contractors"
          >
            <Briefcase className="w-5 h-5 shrink-0" />
            {isExpanded ? (
              <span className="text-xs font-bold leading-none">Registered Contractors</span>
            ) : (
              <span className="absolute left-18 bg-[#0f172a] border border-slate-700 text-white text-xs px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                Registered Contractors
              </span>
            )}
          </button>
        )}

        {/* QR Code Tag Scanner & Generator */}
        <button
          id="btn-sidebar-qr"
          onClick={() => setActiveTab('qr')}
          className={`p-3 rounded-lg transition-all duration-200 relative group cursor-pointer flex items-center ${
            isExpanded ? 'w-full px-4 gap-3 justify-start' : 'justify-center'
          } ${
            activeTab === 'qr' 
              ? 'bg-[#dc2626] text-white shadow-md font-bold' 
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="QR System Tags"
        >
          <QrCode className="w-5 h-5 shrink-0" />
          {isExpanded ? (
            <span className="text-xs font-bold leading-none">QR Systems tagging</span>
          ) : (
            <span className="absolute left-18 bg-[#0f172a] border border-slate-700 text-white text-xs px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
              QR Tag Hub & Scanner
            </span>
          )}
        </button>

        {/* Email Ingestion Hub & Settings */}
        <button
          id="btn-sidebar-email"
          onClick={() => setActiveTab('email')}
          className={`p-3 rounded-lg transition-all duration-200 relative group cursor-pointer flex items-center ${
            isExpanded ? 'w-full px-4 gap-3 justify-start' : 'justify-center'
          } ${
            activeTab === 'email' 
              ? 'bg-[#dc2626] text-white shadow-md font-bold' 
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Email Ingestion"
        >
          <Mail className="w-5 h-5 shrink-0" />
          {isExpanded ? (
            <span className="text-xs font-bold leading-none">Email Ingestion</span>
          ) : (
            <span className="absolute left-18 bg-[#0f172a] border border-slate-700 text-white text-xs px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
              Email-to-Page Ingestion
            </span>
          )}
        </button>

        {/* Sync Data State (Full Refresh action) */}
        {onRefreshClick && (
          <button
            id="btn-sidebar-sync"
            onClick={onRefreshClick}
            className={`p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition duration-200 relative group cursor-pointer flex items-center ${
              isExpanded ? 'w-full px-4 gap-3 justify-start' : 'justify-center'
            }`}
            title="Sync & Reload Data"
          >
            <RotateCw className="w-5 h-5 text-red-550 hover:rotate-180 transition-transform duration-300 shrink-0" />
            {isExpanded ? (
              <span className="text-xs font-bold leading-none text-red-450">Sync System Portal</span>
            ) : (
              <span className="absolute left-18 bg-[#0f172a] border border-slate-700 text-white text-xs px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                Sync Portal Data
              </span>
            )}
          </button>
        )}

        <div className={`h-[1px] bg-slate-805 my-1 ${isExpanded ? 'w-full' : 'w-8 mx-auto'}`} />

        {/* Quick status/warning indicators */}
        <div className={`flex gap-3 text-slate-400 ${isExpanded ? 'flex-row px-4 items-center gap-4 py-1.5' : 'flex-col items-center py-1'}`}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center bg-red-950/40 border border-[#dc2626]/40 text-rose-500 text-xs font-semibold cursor-help" title="Active Equipment">
            <Flame className="w-4 h-4 animate-pulse" />
          </div>
          {isExpanded && <span className="text-[10px] font-mono uppercase text-slate-400 font-bold select-none leading-none">Systems running</span>}
        </div>
        <div className={`flex gap-3 text-slate-400 ${isExpanded ? 'flex-row px-4 items-center gap-4' : 'flex-col items-center py-1'}`}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center bg-amber-950/40 border border-amber-900/40 text-amber-500 text-xs font-semibold cursor-help" title="System Deficiencies Or Overdue Insps">
            <AlertTriangle className="w-4 h-4" />
          </div>
          {isExpanded && <span className="text-[10px] font-mono uppercase text-slate-400 font-bold select-none leading-none">Deficiencies logged</span>}
        </div>
      </div>

      {/* Bottom Section */}
      <div className="flex flex-col gap-4 w-full">
        {/* Recenter Map Target */}
        {onRecenterMap && (
          <button
            id="btn-sidebar-recenter"
            onClick={onRecenterMap}
            className={`p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors duration-200 relative group cursor-pointer flex items-center ${
              isExpanded ? 'w-full px-4 gap-3 justify-start' : 'justify-center'
            }`}
            title="Recenter Map Grid"
          >
            <MapPin className="w-5 h-5 text-amber-400 hover:scale-110 transition-transform shrink-0" />
            {isExpanded ? (
              <span className="text-xs font-bold leading-none text-amber-400">Recenter Active Map</span>
            ) : (
              <span className="absolute left-18 bg-[#0f172a] border border-slate-700 text-white text-xs px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                Recenter Active Map
              </span>
            )}
          </button>
        )}

        {/* Power Logout Button */}
        <button
          id="btn-sidebar-logout"
          onClick={onLogoutClick}
          className={`p-3 text-red-500 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition duration-200 relative group cursor-pointer flex items-center ${
            isExpanded ? 'w-full px-4 gap-3 justify-start' : 'justify-center'
          }`}
          title="Sign Out to Main Portal"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {isExpanded ? (
            <span className="text-xs font-black uppercase text-red-400">Log Out Portal</span>
          ) : (
            <span className="absolute left-18 bg-[#0f172a] border border-slate-700 text-white text-xs px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
              Log Out Gate
            </span>
          )}
        </button>

        <div className={`text-slate-500 font-mono tracking-widest leading-none select-none font-bold text-center mt-2 ${isExpanded ? 'text-xs border-t border-slate-800 pt-3 flex justify-between' : 'text-[9px] uppercase'}`}>
          {isExpanded ? (
            <>
              <span className="text-red-500 font-black">FIREGRID</span>
              <span className="text-slate-500">v1.2.6</span>
            </>
          ) : (
            "FG"
          )}
        </div>
      </div>
    </div>
  );
}
