/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Sparkles } from 'lucide-react';
import { Property } from '../types';

interface CalendarWidgetProps {
  startDate: string;
  setStartDate: (date: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;
  properties: Property[];
  onSelectDate: (date: string) => void;
  selectedDate: string | null;
}

export default function CalendarWidget({
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  properties,
  onSelectDate,
  selectedDate,
}: CalendarWidgetProps) {
  // Present matching calendar views for May 2026 (Current local time in system metadata is May 25, 2026)
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(4); // 0-indexed, so 4 is May
  const [isGridExpanded, setIsGridExpanded] = useState(false);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Helper to determine days in active Month context
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Helper to get first day of the week for spacing offsets
  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayOfWeek = getFirstDayOfMonth(currentYear, currentMonth);

  // Generates complete calendar display grid (including paddings from adjacent months)
  const daysArray = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    daysArray.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    daysArray.push(d);
  }

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handleClearFilters = () => {
    setStartDate('');
    setEndDate('');
    onSelectDate('');
  };

  // Helper to check if a calendar date has associated target inspections or events
  const getInspectionOnDate = (day: number) => {
    const formattedMonth = String(currentMonth + 1).padStart(2, '0');
    const formattedDay = String(day).padStart(2, '0');
    const dateStr = `${currentYear}-${formattedMonth}-${formattedDay}`;

    // Return any matching property scheduled/last inspected on this date
    return properties.find(
      p => p.lastInspectionDate === dateStr || p.nextInspectionDate === dateStr
    );
  };

  return (
    <div className="bg-white border-b border-[#cbd5e1] p-3 select-none shrink-0 text-[#1e293b]">
      {/* Date Range Inputs */}
      <div>
        <div className="flex justify-between items-center mb-1.5">
          <label className="text-xs text-[#475569] font-bold tracking-wide uppercase flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-[#dc2626]" /> Date Range
          </label>
          <div className="flex gap-2 items-center">
            <button
              id="btn-calendar-toggle-grid"
              onClick={() => setIsGridExpanded(!isGridExpanded)}
              className="text-[10px] text-[#dc2626] hover:underline font-extrabold uppercase cursor-pointer"
            >
              {isGridExpanded ? 'Hide Calendar' : 'Show Calendar'}
            </button>
            {(startDate || endDate || selectedDate) && (
              <span className="text-slate-350 text-[10px] select-none">•</span>
            )}
            {(startDate || endDate || selectedDate) && (
              <button
                id="btn-calendar-clear"
                onClick={handleClearFilters}
                className="text-[10px] text-slate-505 hover:text-[#dc2626] font-bold cursor-pointer font-sans"
              >
                Reset
              </button>
            )}
          </div>
        </div>
        
        <div className="flex gap-2 items-center">
          <input
            id="input-start-date"
            type="date"
            placeholder="Select Date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="flex-1 min-w-0 bg-white border border-[#cbd5e1] rounded px-2.5 py-1 text-xs text-[#1e293b] focus:outline-none focus:border-[#dc2626] font-mono"
          />
          <span className="text-slate-400 font-mono text-xs">→</span>
          <input
            id="input-end-date"
            type="date"
            placeholder="Select Date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="flex-1 min-w-0 bg-white border border-[#cbd5e1] rounded px-2.5 py-1 text-xs text-[#1e293b] focus:outline-none focus:border-[#dc2626] font-mono"
          />
        </div>
      </div>

      {/* Mini Month Grid view matching the design precisely (e.g. May 2026) */}
      {isGridExpanded && (
        <div className="border border-[#cbd5e1] rounded p-2.5 bg-slate-50 mt-2">
          
          {/* Month Navigation */}
          <div className="flex justify-between items-center mb-2">
            <button
              id="btn-calendar-prev"
              onClick={handlePrevMonth}
              className="p-0.5 hover:bg-slate-200 rounded text-slate-500 hover:text-[#0f172a] transition duration-150 cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-extrabold tracking-wider font-sans text-[#0f172a] uppercase">
              {monthNames[currentMonth]} {currentYear}
            </span>
            <button
              id="btn-calendar-next"
              onClick={handleNextMonth}
              className="p-0.5 hover:bg-slate-200 rounded text-slate-500 hover:text-[#0f172a] transition duration-150 cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Week Days Header */}
          <div className="grid grid-cols-7 gap-y-1 text-center text-[9px] font-bold text-[#64748b] mb-1 font-sans uppercase">
            <div>Su</div>
            <div>Mo</div>
            <div>Tu</div>
            <div>We</div>
            <div>Th</div>
            <div>Fr</div>
            <div>Sa</div>
          </div>

          {/* Days Box */}
          <div className="grid grid-cols-7 gap-y-1 text-center font-mono text-xs">
            {daysArray.map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} className="h-5" />;
              }

              const formattedMonth = String(currentMonth + 1).padStart(2, '0');
              const formattedDay = String(day).padStart(2, '0');
              const dateStr = `${currentYear}-${formattedMonth}-${formattedDay}`;

              const hasInspec = getInspectionOnDate(day);
              const isSelected = selectedDate === dateStr;
              const isToday = day === 25 && currentMonth === 4 && currentYear === 2026; // system local time May 25 2026

              return (
                <button
                  key={`day-${day}`}
                  id={`btn-calendar-day-${day}`}
                  onClick={() => onSelectDate(dateStr)}
                  className={`h-5 w-full flex flex-col items-center justify-center text-[11px] rounded transition duration-150 relative cursor-pointer ${
                    isSelected 
                      ? 'bg-[#dc2626] text-white font-bold shadow' 
                      : isToday
                        ? 'bg-slate-200 text-[#0f172a] outline outline-1 outline-[#dc2626]'
                        : 'text-[#334155] hover:bg-slate-200 hover:text-[#0f172a]'
                  }`}
                >
                  <span>{day}</span>
                  
                  {/* Visual Dot alert for Inspections list mapping to the date */}
                  {hasInspec && !isSelected && (
                    <span 
                      className={`w-1 h-1 rounded-full absolute bottom-0.5 ${
                        hasInspec.status === 'Overdue' || hasInspec.status === 'Overdue Reinspect'
                          ? 'bg-[#dc2626]' 
                          : hasInspec.status === 'Complete'
                            ? 'bg-emerald-600'
                            : 'bg-amber-500'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
