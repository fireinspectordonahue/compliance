/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { InspectionReport, Property, UserInfo } from '../types';
import { 
  AlertOctagon, 
  CheckCircle, 
  Clock, 
  Send, 
  ClipboardList, 
  Wrench, 
  User, 
  Calendar,
  AlertCircle,
  FileWarning
} from 'lucide-react';

interface DeficienciesTrackerProps {
  reports: InspectionReport[];
  properties: Property[];
  user: UserInfo;
  onUpdateReports: (updatedReports: InspectionReport[]) => void;
}

interface FlattenedDeficiency {
  reportId: string;
  reportDate: string;
  propertyId: string;
  propertyName: string;
  equipmentType: string;
  deficiencyText: string;
  deficiencyIndex: number;
  status: 'Outstanding' | 'Submitted' | 'Resolved';
  remedyDescription?: string;
  remedyBy?: string;
  remedyAt?: string;
  remarks?: string;
}

export default function DeficienciesTracker({
  reports = [],
  properties = [],
  user,
  onUpdateReports
}: DeficienciesTrackerProps) {
  
  const [filterStatus, setFilterStatus] = useState<'all' | 'Outstanding' | 'Submitted' | 'Resolved'>('all');
  const [modalDeficiency, setModalDeficiency] = useState<FlattenedDeficiency | null>(null);
  
  // Form input states
  const [remedyDescInput, setRemedyDescInput] = useState('');
  const [remedyByInput, setRemedyByInput] = useState(user.name);

  // Parse and flatten individual deficiencies out of reports
  const deficienciesList = useMemo(() => {
    const list: FlattenedDeficiency[] = [];

    reports.forEach((report: any) => {
      // Check if this report has listed deficiencies
      if (report.deficiencies && report.deficiencies.length > 0) {
        // Find property name if missing
        const prop = properties.find(p => p.id === report.propertyId);
        const propName = prop ? prop.name : report.propertyName || 'Unknown Facility';

        // Retrieve statuses/remediations safely
        const itemRemediations = report.deficienciesRemediations || {};

        report.deficiencies.forEach((defText: string, index: number) => {
          const itemRemedy = itemRemediations[index] || {};
          
          list.push({
            reportId: report.id,
            reportDate: report.date || report.createdAt?.split('T')[0] || 'Unknown Date',
            propertyId: report.propertyId,
            propertyName: propName,
            equipmentType: report.equipmentType,
            deficiencyText: defText,
            deficiencyIndex: index,
            status: itemRemedy.status || 'Outstanding',
            remedyDescription: itemRemedy.description,
            remedyBy: itemRemedy.by,
            remedyAt: itemRemedy.at,
            remarks: itemRemedy.remarks
          });
        });
      }
    });

    return list;
  }, [reports, properties]);

  // Apply filters
  const filteredList = useMemo(() => {
    if (filterStatus === 'all') return deficienciesList;
    return deficienciesList.filter(d => d.status === filterStatus);
  }, [deficienciesList, filterStatus]);

  // Open the remediation dialog modal (for contractors)
  const handleOpenRemediateModal = (def: FlattenedDeficiency) => {
    setModalDeficiency(def);
    setRemedyDescInput('');
    setRemedyByInput(user.name);
  };

  // Submit remediation data (contractors)
  const handlePerformRemediation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalDeficiency) return;
    if (!remedyDescInput.trim()) {
      alert('Please explain the corrective repairs taken.');
      return;
    }

    // Map through reports to insert remediation info in the target report
    const updated = reports.map((rep: any) => {
      if (rep.id === modalDeficiency.reportId) {
        const remediations = { ...(rep.deficienciesRemediations || {}) };
        remediations[modalDeficiency.deficiencyIndex] = {
          status: 'Submitted' as const,
          description: remedyDescInput.trim(),
          by: remedyByInput.trim() || 'Certified Field Technician',
          at: new Date().toISOString().split('T')[0]
        };
        return {
          ...rep,
          deficienciesRemediations: remediations
        };
      }
      return rep;
    });

    onUpdateReports(updated);
    setModalDeficiency(null);
  };

  // Approve a remediation (Bureau Admins)
  const handleApproveRemediation = (def: FlattenedDeficiency, remarksText: string = 'Approved Resolution') => {
    const updated = reports.map((rep: any) => {
      if (rep.id === def.reportId) {
        const remediations = { ...(rep.deficienciesRemediations || {}) };
        const current = remediations[def.deficiencyIndex] || {};
        remediations[def.deficiencyIndex] = {
          ...current,
          status: 'Resolved' as const,
          remarks: remarksText
        };
        return {
          ...rep,
          deficienciesRemediations: remediations
        };
      }
      return rep;
    });

    onUpdateReports(updated);
  };

  // Reject a remediation (Bureau Admins)
  const handleRejectRemediation = (def: FlattenedDeficiency) => {
    const comments = prompt('Specify reasons for rejecting this corrective action report:');
    if (comments === null) return; // user cancelled

    const updated = reports.map((rep: any) => {
      if (rep.id === def.reportId) {
        const remediations = { ...(rep.deficienciesRemediations || {}) };
        remediations[def.deficiencyIndex] = {
          status: 'Outstanding' as const,
          remarks: comments || 'Remediation note insufficient. Verification declined.'
        };
        return {
          ...rep,
          deficienciesRemediations: remediations
        };
      }
      return rep;
    });

    onUpdateReports(updated);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-6 space-y-6">
      
      {/* Title & Stats Summary Cards */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1 px-2 rounded-full text-[9px] font-mono font-black uppercase text-red-600 bg-red-50 border border-red-200 animate-pulse">
              NFPA Violation Watch
            </span>
            <span className="p-1 px-2 rounded-full text-[9px] font-mono font-black uppercase text-[#dc2626] bg-slate-100 border border-slate-200">
              Regulatory Core
            </span>
          </div>
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2 font-sans">
            <AlertOctagon className="w-5.5 h-5.5 text-red-600" /> Deficiencies Compliance Registry
          </h2>
          <p className="text-xs text-slate-500 max-w-xl">
            This module isolates individual equipment defects reported during testing submittals. Keep our building occupants safe by tracking resolutions directly in the cloud.
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-1.5 shrink-0 bg-slate-100 p-1.5 rounded-lg border border-slate-200 text-xs">
          <button 
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 font-bold uppercase tracking-wider rounded transition cursor-pointer text-[10px] ${filterStatus === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            All ({deficienciesList.length})
          </button>
          <button 
            onClick={() => setFilterStatus('Outstanding')}
            className={`px-3 py-1.5 font-bold uppercase tracking-wider rounded transition cursor-pointer text-[10px] ${filterStatus === 'Outstanding' ? 'bg-red-50 text-red-700 shadow-sm border border-red-200' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Outstanding ({deficienciesList.filter(d => d.status === 'Outstanding').length})
          </button>
          <button 
            onClick={() => setFilterStatus('Submitted')}
            className={`px-3 py-1.5 font-bold uppercase tracking-wider rounded transition cursor-pointer text-[10px] ${filterStatus === 'Submitted' ? 'bg-amber-50 text-amber-700 shadow-sm border border-amber-200' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Pending ({deficienciesList.filter(d => d.status === 'Submitted').length})
          </button>
          <button 
            onClick={() => setFilterStatus('Resolved')}
            className={`px-3 py-1.5 font-bold uppercase tracking-wider rounded transition cursor-pointer text-[10px] ${filterStatus === 'Resolved' ? 'bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-250' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Resolved ({deficienciesList.filter(d => d.status === 'Resolved').length})
          </button>
        </div>
      </div>

      {/* Registry Ledger Card Column */}
      <div className="space-y-4">
        {filteredList.length === 0 ? (
          <div className="bg-white border rounded-lg p-12 text-center text-slate-500 shadow-sm flex flex-col items-center justify-center space-y-3">
            <ClipboardList className="w-10 h-10 text-slate-300" />
            <h4 className="font-extrabold text-[#0f172a] uppercase text-xs">No Safety Violations Detected</h4>
            <p className="text-xs text-slate-400 max-w-sm">
              All properties are in perfect compliance matching the filter parameters! When inspection submittals flag equipment deficiencies, they automatically register here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredList.map((item, index) => {
              return (
                <div key={`${item.reportId}-${item.deficiencyIndex}`} className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 flex flex-col justify-between hover:shadow transition duration-200">
                  <div className="space-y-3">
                    {/* Header: Badge status and Date */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <span className="text-[10px] font-mono text-slate-400 font-extrabold block">
                        NFPA REPORT: #{item.reportId.slice(-6).toUpperCase()}
                      </span>
                      
                      {item.status === 'Outstanding' ? (
                        <span className="bg-red-50 border border-red-200 text-red-600 text-[9px] px-2 py-0.5 rounded font-black font-mono tracking-widest uppercase animate-pulse">
                          🚨 Outstanding
                        </span>
                      ) : item.status === 'Submitted' ? (
                        <span className="bg-amber-50 border border-amber-200 text-amber-600 text-[9px] px-2 py-0.5 rounded font-black font-mono tracking-widest uppercase">
                          ⏳ Submitted / Verify
                        </span>
                      ) : (
                        <span className="bg-emerald-50 border border-emerald-200 text-emerald-600 text-[9px] px-2 py-0.5 rounded font-black font-mono tracking-widest uppercase">
                          ✅ Approved Resolved
                        </span>
                      )}
                    </div>

                    {/* Venue description */}
                    <div className="space-y-1">
                      <span className="text-[9px] text-[#dc2626] font-mono tracking-widest uppercase block font-bold leading-none">Target Inspected Facility</span>
                      <h4 className="text-xs font-black text-[#0f172a] uppercase font-sans tracking-tight">
                        {item.propertyName}
                      </h4>
                      <p className="text-[10px] text-slate-500 font-mono truncate">{item.equipmentType} Equipment System</p>
                    </div>

                    {/* Deficiency Specific Problem Statement */}
                    <div className="p-3 bg-red-50/50 border border-red-100/80 rounded rounded-l-3 border-l-4 border-l-red-505 font-mono text-[10.5px] text-slate-700 leading-normal">
                      <span className="font-extrabold uppercase text-[8px] text-red-600 block mb-1">Diagnosed safety fail:</span>
                      {item.deficiencyText}
                    </div>

                    {/* Remarks if any */}
                    {item.remarks && (
                      <div className="p-2.5 bg-amber-50/30 border border-amber-200/50 rounded font-sans text-[10px] text-amber-800">
                        <span className="font-bold select-none">Review Comments: </span>
                        {item.remarks}
                      </div>
                    )}

                    {/* Submitted Remediation details display */}
                    {item.status !== 'Outstanding' && (
                      <div className="p-3 bg-indigo-50/30 border border-indigo-100/60 rounded space-y-1.5 font-mono text-[10px] text-[#2e2f3e]">
                        <span className="font-extrabold uppercase text-[8px] text-indigo-600 block">Correction Actions Log:</span>
                        <p className="italic text-slate-650 font-sans">"{item.remedyDescription}"</p>
                        <div className="flex justify-between text-[9px] text-slate-400 border-t border-dashed border-slate-100 pt-1.5 font-bold">
                          <span>By: {item.remedyBy}</span>
                          <span>At: {item.remedyAt}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions Area */}
                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                    <span className="text-[9px] text-slate-400 font-mono flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" /> Discovered: {item.reportDate}
                    </span>

                    <div className="flex gap-2">
                      {/* Contractor Action */}
                      {user.role === 'contractor' && item.status === 'Outstanding' && (
                        <button
                          onClick={() => handleOpenRemediateModal(item)}
                          className="py-1 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-extrabold tracking-widest text-[9px] uppercase cursor-pointer select-none transition flex items-center gap-1.5"
                        >
                          <Wrench className="w-3 h-3" /> Log Remediation
                        </button>
                      )}

                      {/* Contractor Pending action */}
                      {user.role === 'contractor' && item.status === 'Submitted' && (
                        <span className="text-[9px] text-amber-600 font-mono italic">
                          Awaiting official verification...
                        </span>
                      )}

                      {/* Bureau Actions */}
                      {user.role === 'bureau' && item.status === 'Submitted' && (
                        <>
                          <button
                            onClick={() => handleRejectRemediation(item)}
                            className="py-1 px-2.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-650 rounded font-extrabold tracking-widest text-[9px] uppercase cursor-pointer select-none transition"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleApproveRemediation(item)}
                            className="py-1 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-extrabold tracking-widest text-[9px] uppercase cursor-pointer select-none transition flex items-center gap-1"
                          >
                            Verify & Close
                          </button>
                        </>
                      )}

                      {/* Already Resolved */}
                      {item.status === 'Resolved' && (
                        <span className="text-[9px] text-emerald-600 font-mono font-bold flex items-center gap-1 select-none">
                          <CheckCircle className="w-3.5 h-3.5" /> Closed Record
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modular Form Modal for Logging Remediation (Contractor portal) */}
      {modalDeficiency && (
        <div className="fixed inset-0 bg-[#0f172a]/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-300 max-w-md w-full overflow-hidden shadow-2xl animate-fade-in text-[#1e293b] font-sans">
            
            <div className="p-4 bg-indigo-600 text-white flex items-center justify-between font-extrabold uppercase text-xs tracking-wider">
              <span className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-white" /> Report Corrective Action
              </span>
              <button 
                onClick={() => setModalDeficiency(null)}
                className="text-white hover:text-slate-200 cursor-pointer font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePerformRemediation} className="p-5 space-y-4">
              <div className="space-y-1">
                <span className="text-[9px] text-slate-400 font-mono uppercase tracking-widest font-extrabold block">Selected facility deficiency:</span>
                <p className="text-xs font-black text-slate-800 uppercase leading-snug">
                  {modalDeficiency.propertyName}
                </p>
                <div className="p-3 bg-red-50 rounded border border-red-150 font-mono text-[10px] text-red-800 leading-normal">
                  {modalDeficiency.deficiencyText}
                </div>
              </div>

              {/* Correction details textarea */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider block">Description of Repair / Correction Actions</label>
                <textarea
                  rows={4}
                  required
                  value={remedyDescInput}
                  onChange={(e) => setRemedyDescInput(e.target.value)}
                  placeholder="e.g. Purged lines, lubricated main drain valve, replaced physical dial gauge, completed standard test successfully with no leaks."
                  className="w-full text-xs p-2.5 border border-slate-300 rounded font-mono placeholder-slate-400 focus:outline-[#4f46e5] text-slate-900 bg-white"
                />
              </div>

              {/* Certified actor name */}
              <div className="space-y-1.5 font-sans">
                <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider block">Authorized Performing Technician</label>
                <div className="relative flex items-center">
                  <User className="w-4 h-4 text-slate-400 absolute left-3" />
                  <input
                    type="text"
                    required
                    value={remedyByInput}
                    onChange={(e) => setRemedyByInput(e.target.value)}
                    className="w-full text-xs font-mono pl-9 pr-3 py-2 border border-slate-300 rounded focus:outline-[#4f46e5] text-slate-900 bg-slate-50"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setModalDeficiency(null)}
                  className="py-2 px-3 hover:bg-slate-100 rounded text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer transition select-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-extrabold uppercase tracking-widest cursor-pointer select-none transition flex items-center gap-1.5 shadow"
                >
                  <Send className="w-3.5 h-3.5" /> Submit Resolution
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
