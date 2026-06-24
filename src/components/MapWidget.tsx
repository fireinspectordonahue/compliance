/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Property, ProjectStatus } from '../types';
import { ZoomIn, ZoomOut, Maximize2, Layers, MapPin, Eye, FileCheck } from 'lucide-react';

interface MapWidgetProps {
  properties: Property[];
  selectedProperty: Property | null;
  onSelectProperty: (property: Property) => void;
  hoveredPropertyId: string | null;
  setHoveredPropertyId: (id: string | null) => void;
}

type MapTheme = 'street' | 'terrain' | 'satellite' | 'dark';

export default function MapWidget({
  properties,
  selectedProperty,
  onSelectProperty,
  hoveredPropertyId,
  setHoveredPropertyId,
}: MapWidgetProps) {
  const [zoom, setZoom] = useState<number>(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [mapTheme, setMapTheme] = useState<MapTheme>('street');

  // Mathematical bounding box for municipal area in standard coordinates
  const minLat = 39.680;
  const maxLat = 39.720;
  const minLng = -74.310;
  const maxLng = -74.200;

  // Converts Latitude and Longitude to standard SVG (X, Y) layout coordinates
  const latLngToXY = (lat: number, lng: number) => {
    const width = 800;
    const height = 600;
    // Map Lng to X
    const x = ((lng - minLng) / (maxLng - minLng)) * width;
    // Map Lat to Y (invert Y since SVG 0 is at top)
    const y = height - ((lat - minLat) / (maxLat - minLat)) * height;
    return { x, y };
  };

  const statusColors: Record<ProjectStatus, { bg: string; text: string; ring: string; hex: string }> = {
    'Inspection': { bg: 'bg-blue-600', text: 'text-blue-200', ring: 'ring-blue-400', hex: '#2563eb' },
    'Overdue': { bg: 'bg-rose-600', text: 'text-rose-200', ring: 'ring-rose-400', hex: '#e11d48' },
    'Incomplete': { bg: 'bg-amber-600', text: 'text-amber-200', ring: 'ring-amber-400', hex: '#d97706' },
    'Reinspect': { bg: 'bg-purple-600', text: 'text-purple-200', ring: 'ring-purple-400', hex: '#9333ea' },
    'Overdue Reinspect': { bg: 'bg-pink-600', text: 'text-pink-200', ring: 'ring-pink-400', hex: '#db2777' },
    'Complete': { bg: 'bg-emerald-600', text: 'text-emerald-200', ring: 'ring-emerald-400', hex: '#059669' },
  };

  // Drag handlers for the map sandbox
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.75));
  const handleReset = () => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Get active themes classes
  const getThemeBgClass = () => {
    switch (mapTheme) {
      case 'terrain': return 'bg-[#e2e8f0]';
      case 'dark': return 'bg-[#0f172a]';
      case 'satellite': return 'bg-[#1e293b]';
      case 'street':
      default: return 'bg-[#f4f3f0]'; // standard map off-white
    }
  };

  const getWaterColor = () => {
    switch (mapTheme) {
      case 'dark': return '#1e293b';
      case 'satellite': return '#0f172a';
      default: return '#a5f3fc'; // nice sky blue water for streets/terrain
    }
  };

  const getInterstateColor = () => {
    switch (mapTheme) {
      case 'dark': return '#334155';
      case 'satellite': return '#475569';
      default: return '#fed7aa'; // light orange highway in photo
    }
  };

  const getStreetColor = () => {
    switch (mapTheme) {
      case 'dark': return '#1e293b';
      case 'satellite': return '#334155';
      default: return '#ffffff';
    }
  };

  const getLandColor = () => {
    switch (mapTheme) {
      case 'terrain': return '#cbd5e1';
      case 'dark': return '#0f172a';
      case 'satellite': return '#1e293b';
      default: return '#fbfbfa';
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-white rounded-lg overflow-hidden shadow-md border border-[#cbd5e1]">
      
      {/* Map Control Overlay */}
      <div className="absolute top-4 right-4 z-40 flex flex-col sm:flex-row shadow-sm rounded border border-[#cbd5e1] bg-white text-[#1e293b] px-2.5 py-1.5 items-center gap-2">
        <div className="flex items-center gap-1.5 border-r border-[#cbd5e1] pr-2">
          <Layers className="w-3.5 h-3.5 text-[#dc2626]" />
          <select 
            id="map-theme-select"
            value={mapTheme} 
            onChange={(e) => setMapTheme(e.target.value as MapTheme)}
            className="bg-transparent text-xs text-[#1e293b] outline-none border-none py-1 cursor-pointer font-bold"
          >
            <option value="street">Street Map</option>
            <option value="terrain">Terrain Map</option>
            <option value="satellite">Satellite Grid</option>
            <option value="dark">Dark Minimal</option>
          </select>
        </div>

        <div className="flex items-center gap-1">
          <button 
            id="btn-map-zoomin"
            onClick={handleZoomIn} 
            className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-black transition duration-150 cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button 
            id="btn-map-zoomout"
            onClick={handleZoomOut} 
            className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-black transition duration-150 cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button 
            id="btn-map-reset"
            onClick={handleReset} 
            className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-black transition duration-150 cursor-pointer"
            title="Reset Coordinates"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>



      {/* Primary HTML5 SVG Canvas Map */}
      <div className={`flex-1 overflow-hidden relative ${getThemeBgClass()} select-none cursor-grab active:cursor-grabbing`}>
        <svg
          id="svg-municipal-map"
          className="w-full h-full"
          viewBox="0 0 800 600"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
        >
          {/* Main Pan and Zoom Group */}
          <g transform={`translate(${panOffset.x}, ${panOffset.y}) scale(${zoom})`}>
            
            {/* 1. Landmark Zones (Land / Forests / Wildlife Reserves) */}
            <rect x="0" y="0" width="800" height="600" fill={getLandColor()} />

            {/* Forge Wildlife Management Area */}
            <rect x="10" y="10" width="220" height="380" rx="15" fill={mapTheme === 'dark' ? '#0f172a' : '#dcfce7'} opacity={mapTheme === 'satellite' ? 0.15 : 0.85} />
            {/* Manahawkin Lake Park Area */}
            <rect x="420" y="210" width="150" height="110" rx="12" fill={mapTheme === 'dark' ? '#1e293b' : '#f0fdf4'} opacity={mapTheme === 'satellite' ? 0.2 : 0.9} />
            {/* Midtown Park Central Grid */}
            <rect x="180" y="80" width="185" height="140" rx="10" fill={mapTheme === 'dark' ? '#0f172a' : '#fafaf9'} stroke={mapTheme === 'dark' ? '#1e293b' : '#e7e5e4'} strokeWidth="1" />

            {/* 2. Waterways: Barnegat / Manahawkin Bay & Manahawkin Lake */}
            {/* Manahawkin Bay & Wetlands */}
            <path 
              d="M 640,650 Q 710,420 720,280 T 840,90 L 850,-10 L 850,650 Z" 
              fill={getWaterColor()} 
              opacity="0.8"
            />
            {/* Manahawkin Lake */}
            <ellipse cx="500" cy="270" rx="36" ry="18" fill={getWaterColor()} opacity="0.85" />

            {/* 3. Base Map Grid: Primary Arteries (Highways & Interstates) */}
            {/* Garden State Parkway (GSP) - N-S Corridor */}
            <path 
              d="M 340,-50 L 340,650" 
              fill="none" 
              stroke={getInterstateColor()} 
              strokeWidth="10" 
              opacity="0.9"
            />
            <path 
              d="M 340,-50 L 340,650" 
              fill="none" 
              stroke={mapTheme === 'dark' ? '#020617' : '#047857'} 
              strokeWidth="1.8" 
              strokeDasharray="5 4"
              opacity="0.4"
            />

            {/* US Route 9 (Main Street) - N-S Corridor */}
            <path 
              d="M 480,-50 L 480,650" 
              fill="none" 
              stroke={getStreetColor()} 
              strokeWidth="6" 
              opacity="0.9"
            />

            {/* NJ State Route 72 - Key E-W Connector to Long Beach Island (Causeway) */}
            <path 
              d="M -50,480 L 850,230" 
              fill="none" 
              stroke={getInterstateColor()} 
              strokeWidth="9"
              opacity="0.95"
            />
            <path 
              d="M -50,480 L 850,230" 
              fill="none" 
              stroke={mapTheme === 'dark' ? '#020617' : '#9a3412'} 
              strokeWidth="1.5" 
              strokeDasharray="4 4"
              opacity="0.3"
            />

            {/* 4. Local Primary Radial Roads */}
            {/* East / West Bay Avenue (CR 532 / CR 554) */}
            <path 
              d="M -50,280 L 850,150" 
              fill="none" 
              stroke={getStreetColor()} 
              strokeWidth="5"
              opacity="0.95"
            />

            {/* Nautilus Drive (Midtown / Medical Corridor) */}
            <path 
              d="M 340,300 C 310,240 280,180 280,120" 
              fill="none" 
              stroke={getStreetColor()} 
              strokeWidth="4"
              opacity="0.9"
            />

            {/* Doc Cramer Blvd */}
            <path 
              d="M 280,120 L 480,120" 
              fill="none" 
              stroke={getStreetColor()} 
              strokeWidth="3.5"
              opacity="0.85"
            />
            <path 
              d="M 480,120 L 650,250" 
              fill="none" 
              stroke={getStreetColor()} 
              strokeWidth="3"
              opacity="0.8"
            />

            {/* Secondary Local Connectors for Texture & Visual Density */}
            <path d="M 120,280 L 120,480" fill="none" stroke={getStreetColor()} strokeWidth="2.5" opacity="0.6" />
            <path d="M 340,150 L 480,150" fill="none" stroke={getStreetColor()} strokeWidth="2" opacity="0.6" />
            <path d="M 480,380 L 620,380" fill="none" stroke={getStreetColor()} strokeWidth="2.5" opacity="0.6" />
            <path d="M 340,480 L 480,480" fill="none" stroke={getStreetColor()} strokeWidth="2.5" opacity="0.6" />

            {/* 5. Geographic Label Nodes */}
            <text x="110" y="80" fontSize="11" fontWeight="700" fill={mapTheme === 'dark' ? '#94a3b8' : '#15803d'} opacity="0.75" textAnchor="middle" className="font-sans antialiased uppercase tracking-wide">Forge Wildlife Reserve</text>
            <text x="500" y="240" fontSize="11" fontWeight="700" fill={mapTheme === 'dark' ? '#94a3b8' : '#15803d'} opacity="0.8" textAnchor="middle" className="font-sans antialiased uppercase tracking-wide">Manahawkin Lake</text>
            <text x="270" y="100" fontSize="10" fontWeight="600" fill={mapTheme === 'dark' ? '#64748b' : '#334155'} opacity="0.85" textAnchor="middle" className="font-sans uppercase tracking-widest">Midtown Park</text>
            <text x="450" y="175" fontSize="10" fontWeight="bold" fill={mapTheme === 'dark' ? '#475569' : '#64748b'} opacity="0.6" textAnchor="middle" className="font-sans uppercase tracking-widest">Township Center</text>
            <text x="760" y="320" fontSize="12" fontWeight="700" fill={mapTheme === 'dark' ? '#cbd5e1' : '#1e3a8a'} opacity="0.8" textAnchor="middle" className="font-sans uppercase tracking-widest">Manahawkin Bay</text>
            <text x="340" y="590" fontSize="12" fontWeight="800" fill={mapTheme === 'dark' ? '#1e293b' : '#94a3b8'} textAnchor="end" className="font-mono">GSP (MP 63)</text>
            <text x="480" y="50" fontSize="12" fontWeight="800" fill={mapTheme === 'dark' ? '#1e293b' : '#94a3b8'} textAnchor="start" className="font-mono">US-9</text>
            <text x="730" y="260" fontSize="11" fontWeight="800" fill={mapTheme === 'dark' ? '#1e293b' : '#94a3b8'} textAnchor="start" className="font-mono" transform="rotate(-17 730 260)">Rte 72 to LBI</text>
            
            {/* 6. Real-Time Dynamic Property Placemark Points */}
            {properties.map((prop) => {
              const { x, y } = latLngToXY(prop.lat, prop.lng);
              const customColors = statusColors[prop.status] || { hex: '#64748b', bg: 'bg-slate-600' };
              const isSelected = selectedProperty?.id === prop.id;
              const isHovered = hoveredPropertyId === prop.id;

              return (
                <g 
                  key={prop.id}
                  transform={`translate(${x}, ${y})`}
                  className="cursor-pointer group"
                  onClick={() => onSelectProperty(prop)}
                  onMouseEnter={() => setHoveredPropertyId(prop.id)}
                  onMouseLeave={() => setHoveredPropertyId(null)}
                >
                  {/* Pulse Indicator Ring for Outstanding Warning / Selected / Hovered states */}
                  {(isSelected || isHovered || prop.status === 'Overdue' || prop.status === 'Overdue Reinspect') && (
                    <circle 
                      cx="0" 
                      cy="-14" 
                      r={isSelected ? "22" : "16"} 
                      fill="none" 
                      stroke={customColors.hex} 
                      strokeWidth="2.5" 
                      className={`animate-pulse opacity-60`}
                    />
                  )}

                  {/* Drop Shadow Base Ellipse */}
                  <ellipse cx="0" cy="0" rx="6" ry="3" fill="#000000" opacity="0.3" />

                  {/* Vector Map pin */}
                  <path
                    d="M 0,-24 C -7,-24 -12,-19 -12,-12 C -12,-4 0,0 0,0 C 0,0 12,-4 12,-12 C 12,-19 7,-24 0,-24 Z"
                    fill={customColors.hex}
                    stroke={isSelected ? "#ffffff" : "#0f172a"}
                    strokeWidth={isSelected ? "2.5" : "1.5"}
                    className="transition-all duration-200 hover:scale-110 origin-bottom"
                  />

                  {/* Tiny inner center node to indicate type */}
                  <circle cx="0" cy="-12" r="3.5" fill="#ffffff" />

                  {/* Property Quick Hover Banner (Rendered when hovered, showing critical details) */}
                  {isHovered && !isSelected && (
                    <g transform="translate(0, -38)" className="pointer-events-none z-50">
                      {/* Sub-group with white/dark filter container depending on theme */}
                      <rect
                        x="-100"
                        y="-45"
                        width="200"
                        height="40"
                        rx="4"
                        fill="#0f172a"
                        stroke="#334155"
                        strokeWidth="1.5"
                        className="opacity-95 shadow-2xl"
                      />
                      {/* Arrow Down hook */}
                      <polygon points="-6,-5 0,0 6,-5" fill="#0f172a" stroke="#334155" strokeWidth="1" />
                      <rect x="-8" y="-7" width="16" height="5" fill="#0f172a" />
                      
                      {/* Text details inside map context */}
                      <text x="0" y="-30" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#ffffff" className="font-sans">
                        {prop.name.length > 28 ? prop.name.substring(0, 26) + '...' : prop.name}
                      </text>
                      <text x="0" y="-18" textAnchor="middle" fontSize="9" fill="#94a3b8" className="font-mono">
                        {prop.address} • {prop.status}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* Selected Property Spotlight Panel - floating on bottom-right of map */}
        {selectedProperty && (
          <div className="absolute top-18 left-4 z-40 max-w-sm bg-white border border-[#cbd5e1] rounded-lg p-3.5 shadow-lg animate-fade-in text-[#1e293b]">
            <div className="flex justify-between items-start gap-3">
              <div>
                <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${statusColors[selectedProperty.status].bg} text-white mb-1.5`}>
                  {selectedProperty.status}
                </span>
                <h4 className="text-xs font-bold font-sans tracking-tight text-[#0f172a] leading-tight">
                  {selectedProperty.name}
                </h4>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                  {selectedProperty.address}, {selectedProperty.city}
                </p>
              </div>
              <button 
                id="btn-spotlight-close"
                onClick={handleReset} 
                className="text-slate-400 hover:text-[#dc2626] font-bold text-xs p-1 cursor-pointer"
                title="Deselect property"
              >
                ✕
              </button>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-200 grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] font-mono">
              <div>
                <span className="text-slate-400 block font-bold">Template:</span>
                <span className="text-[#334155] font-sans block truncate">{selectedProperty.template}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-bold">Audit Volume:</span>
                <span className="text-[#334155] font-bold block">{selectedProperty.inspectionsCount} Items</span>
              </div>
              <div className="mt-1">
                <span className="text-slate-400 block font-bold">Last Insp Date:</span>
                <span className="text-[#334155] block">{selectedProperty.lastInspectionDate}</span>
              </div>
              <div className="mt-1">
                <span className="text-slate-400 block font-bold">Due Date:</span>
                <span className={`block font-bold ${selectedProperty.status.includes('Overdue') ? 'text-[#dc2626]' : 'text-[#334155]'}`}>
                  {selectedProperty.nextInspectionDate}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Lat/Long Telemetry Bar */}
      <div className="bg-slate-50 px-4 py-1.5 border-t border-slate-200 flex justify-between items-center text-[10px] font-mono text-slate-500 shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-bold">COORDINATES GRID: MUNICIPAL GRID REGION</span>
          <span className="text-slate-300">|</span>
          <span>Lat: {minLat}°N - {maxLat}°N</span>
          <span className="text-slate-300">|</span>
          <span>Lng: {Math.abs(maxLng)}°W - {Math.abs(minLng)}°W</span>
        </div>
        <div className="hidden md:flex gap-3 items-center">
          <span className="flex items-center gap-1 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span> Vectors Active
          </span>
          <span className="text-slate-300">|</span>
          <span>Active Nodes: {properties.length}</span>
        </div>
      </div>
    </div>
  );
}
