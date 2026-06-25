import React, { useState, useEffect } from 'react';
import { Property, InspectionReport, Contractor, UserInfo } from '../types';
import Logo from './Logo';
import { 
  Building2, 
  Calendar, 
  Camera, 
  CheckCircle2, 
  ChevronLeft, 
  ExternalLink, 
  FileCheck, 
  FileText, 
  Info, 
  AlertTriangle,
  Mail, 
  Phone, 
  QrCode, 
  ShieldCheck, 
  MapPin, 
  Wrench,
  Printer,
  Download,
  Share2,
  X,
  Lock,
  Unlock,
  Key,
  ShieldAlert,
  Flame,
  Sparkles,
  FileSpreadsheet
} from 'lucide-react';
import { motion } from 'motion/react';

interface PublicVerificationPortalProps {
  isLoading?: boolean;
  verifyId: string | null;
  contractorId: string | null;
  reports: InspectionReport[];
  properties: Property[];
  contractors: Contractor[];
  bureauAccounts: { id: string; name: string; password: string }[];
  onBackToLogin: () => void;
  onNavigate?: (vId: string | null, cId: string | null) => void;
  currentUser?: UserInfo | null;
  onLogin?: (user: UserInfo) => void;
}

export default function PublicVerificationPortal({
  isLoading = false,
  verifyId,
  contractorId,
  reports,
  properties,
  contractors,
  bureauAccounts,
  onBackToLogin,
  onNavigate,
  currentUser,
  onLogin
}: PublicVerificationPortalProps) {
  
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [stampVerified, setStampVerified] = useState(true);

  // Authentication & Restriction State
  const [bureauPasswordInput, setBureauPasswordInput] = useState('');
  const [selectedBureauId, setSelectedBureauId] = useState('bureau-1');
  
  const [contractorLicenseInput, setContractorLicenseInput] = useState('');
  const [selectedContractorId, setSelectedContractorId] = useState('');
  const [authError, setAuthError] = useState('');
  const [selectedRoleTab, setSelectedRoleTab] = useState<'bureau' | 'contractor'>('bureau');
  const [isGuestBypassed, setIsGuestBypassed] = useState(true);

  const [selectedReportForDocPreview, setSelectedReportForDocPreview] = useState<InspectionReport | null>(null);
  const [docPreviewTab, setDocPreviewTab] = useState<'pdf' | 'cert'>('cert');
  const [activeDocFileIndex, setActiveDocFileIndex] = useState<number>(0);
  const [lightboxPhotoUrl, setLightboxPhotoUrl] = useState<string | null>(null);

  const getReportFiles = (report: InspectionReport | null) => {
    if (!report) return [];
    const names = (report.fileName || '').split(', ').filter(Boolean);
    if (names.length === 0) return [];
    
    let urls: string[] = [];
    try {
      if (report.fileUrl) {
        if (report.fileUrl.startsWith('[')) {
          urls = JSON.parse(report.fileUrl);
        } else {
          urls = report.fileUrl.split('|||');
        }
      }
    } catch(e) {
      console.warn("Error parsing fileUrl", e);
    }
    
    return names.map((name, index) => {
      return {
        name,
        size: report.fileSize || '1.45 MB',
        url: urls[index] || ''
      };
    });
  };

  const downloadDocFile = (file: { name: string; size: string; url?: string }, report?: InspectionReport) => {
    if (file.url) {
      // Real file uploaded by the user during this session
      const a = document.createElement('a');
      a.href = file.url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // Also attempt opening in new windows if safe
      try {
        const newTab = window.open(file.url, '_blank');
        if (newTab) newTab.focus();
      } catch (err) {
        console.warn("Direct tab opening was intercepted; fallback download triggered.");
      }
      return;
    }

    const randomChecksum = "SHA256-STAFFORD-" + Math.random().toString(36).substring(2, 9).toUpperCase();
    const watermarkText = report ? (report.status === 'Passed' ? 'CERTIFIED' : report.status === 'Passed with Deficiencies' ? 'CONDITIONAL' : 'FAILED') : 'CERTIFIED';
    
    // Set status styling dynamics
    let statusClass = 'status-passed';
    let statusColorVal = '#34d399';
    let statusLabel = 'OFFICIAL COMPLIANCE VALIDATION NOTICE';
    let statusMsg = `This document represents a full digital record payload for file <code>${file.name}</code>. Stafford Fire Bureau inspectors have reviewed this file and confirmed code compliance validation.`;
    
    if (report) {
      if (report.status === 'Passed') {
        statusClass = 'status-passed';
        statusColorVal = '#10b981';
        statusLabel = 'COMPLIANCE RESOLUTION: CERTIFIED PASSED';
        statusMsg = `Stafford Fire Bureau has evaluated the certified submittal <code>${report.id}</code>. The on-site system is certified fully operational and compliant under current NFPA standards.`;
      } else if (report.status === 'Passed with Deficiencies') {
        statusClass = 'status-deficiencies';
        statusColorVal = '#f59e0b';
        statusLabel = 'COMPLIANCE RESOLUTION: CONDITIONAL PASS';
        statusMsg = `Stafford Fire Bureau has evaluated submittal <code>${report.id}</code>. System is certified active; however, corrective repair of minor designated deficiencies is contractually mandatory under township timelines.`;
      } else if (report.status.includes('Failed') || report.status === 'Failed (Overdue Reinspect)') {
        statusClass = 'status-failed';
        statusColorVal = '#ef4444';
        statusLabel = 'COMPLIANCE RESOLUTION: DEFICIENCY FAILURE / REJECTED';
        statusMsg = `System test results represent a code violation and/or active system equipment failure. Rapid technical remediation and emergency Bureau reinspection are required immediately under NJ State Fire Safety Code.`;
      } else {
        statusClass = 'status-incomplete';
        statusColorVal = '#64748b';
        statusLabel = 'COMPLIANCE STATUS: CURRENTLY INCOMPLETE';
        statusMsg = `The submittal docket is recorded as incomplete. Full testing procedures are pending validation completion by registered field technicians.`;
      }
    }

    const titleText = report ? `${report.propertyName.toUpperCase()} - COMPLIANCE STATUS` : file.name;

    // Generate fully customized, official-looking watermarked HTML certificate for the mock file
    const content = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>COMPLIANCE CERTIFICATE - ${titleText}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: #0f172a;
      color: #fafafa;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
      box-sizing: border-box;
    }
    .wrapper {
      background-color: #1e293b;
      border: 2px solid #dc2626;
      border-radius: 12px;
      padding: 40px;
      max-width: 650px;
      width: 100%;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      position: relative;
    }
    .watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-30deg);
      font-size: 80px;
      font-weight: 950;
      color: rgba(220, 38, 38, 0.04);
      white-space: nowrap;
      pointer-events: none;
      user-select: none;
    }
    .header {
      border-bottom: 2px dashed #475569;
      padding-bottom: 20px;
      margin-bottom: 25px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .title-area h1 {
      font-size: 16px;
      font-weight: 900;
      letter-spacing: 1px;
      color: #ef4444;
      margin: 0 0 4px 0;
      text-transform: uppercase;
    }
    .title-area p {
      font-size: 10px;
      color: #94a3b8;
      margin: 0;
      font-family: monospace;
    }
    .seal {
      border: 3px double #ef4444;
      color: #ef4444;
      font-size: 10px;
      font-weight: 950;
      padding: 6px 12px;
      border-radius: 4px;
      text-transform: uppercase;
      transform: rotate(5deg);
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      margin-bottom: 25px;
    }
    .col {
      display: flex;
      flex-direction: column;
    }
    .lbl {
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      color: #64748b;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .val {
      font-size: 12px;
      color: #e2e8f0;
      font-weight: 600;
    }
    .val-mono {
      font-family: monospace;
      color: #38bdf8;
    }
    .status-panel {
      border-radius: 6px;
      padding: 16px;
      font-size: 11px;
      line-height: 1.6;
    }
    .status-panel.status-passed {
      background-color: rgba(16, 185, 129, 0.08);
      border: 1px solid #10b981;
      color: #34d399;
    }
    .status-panel.status-deficiencies {
      background-color: rgba(245, 158, 11, 0.08);
      border: 1px solid #f59e0b;
      color: #fbbf24;
    }
    .status-panel.status-failed {
      background-color: rgba(239, 68, 68, 0.08);
      border: 1px solid #ef4444;
      color: #fca5a5;
    }
    .status-panel.status-incomplete {
      background-color: rgba(100, 116, 139, 0.08);
      border: 1px solid #64748b;
      color: #cbd5e1;
    }
    .download-note {
      text-align: center;
      margin-top: 25px;
      font-size: 11px;
      color: #64748b;
    }
    .btn {
      display: inline-block;
      background-color: #dc2626;
      color: white;
      font-weight: 850;
      text-transform: uppercase;
      font-size: 10px;
      padding: 8px 16px;
      border-radius: 4px;
      text-decoration: none;
      margin-top: 15px;
      border: none;
      cursor: pointer;
      letter-spacing: 0.5px;
    }
    .btn:hover {
      background-color: #ef4444;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="watermark">${watermarkText}</div>
    <div class="header">
      <div class="title-area">
        <h1>Township of Stafford</h1>
        <p>FIRE PREVENTIONS BUREAU • SYSTEM COMPLIANCE RESOLUTION</p>
      </div>
      <div class="seal">${report && report.bureauApproved ? 'APPROVED ✔' : 'SUBMITTED ✔'}</div>
    </div>
    
    <div class="grid">
      ${report ? `
      <div class="col" style="grid-column: span 2;">
        <span class="lbl">Registered Commercial Property</span>
        <span class="val" style="font-size: 14px; color: #ffffff; font-weight: 800;">${report.propertyName}</span>
        <span class="val" style="font-size: 11px; color: #94a3b8; font-weight: 400; margin-top: 1px;">${report.propertyAddress}</span>
      </div>
      ` : ''}

      <div class="col">
        <span class="lbl">Document Filename</span>
        <span class="val val-mono">${file.name}</span>
      </div>
      <div class="col">
        <span class="lbl">Archive Record Weight</span>
        <span class="val">${file.size || '1.45 MB'}</span>
      </div>

      ${report ? `
      <div class="col">
        <span class="lbl">System Category Under Compliance</span>
        <span class="val" style="color: #60a5fa; font-weight: 700;">${report.equipmentType}</span>
      </div>
      <div class="col">
        <span class="lbl">Field Evaluation Testing Date</span>
        <span class="val val-mono" style="color: #f472b6;">${report.date}</span>
      </div>
      <div class="col">
        <span class="lbl">Licensed Testing Contractor</span>
        <span class="val" style="color: #f59e0b;">${report.contractorName}</span>
      </div>
      <div class="col">
        <span class="lbl">Certified Technicians Lead</span>
        <span class="val" style="color: #a78bfa;">${report.inspectorName}</span>
      </div>
      ` : ''}

      <div class="col">
        <span class="lbl">Digital Security Checksum</span>
        <span class="val val-mono">${randomChecksum}</span>
      </div>
      <div class="col">
        <span class="lbl">Compliance Registration Timestamp</span>
        <span class="val">${new Date().toISOString().split('T')[0]}</span>
      </div>
    </div>
    
    <div class="status-panel ${statusClass}">
      <strong style="text-transform: uppercase;">${statusLabel}</strong><br>
      ${statusMsg}
    </div>

    ${report ? `
    <div style="margin-top: 25px; border-top: 1px dashed #334155; padding-top: 20px;">
      <span class="lbl" style="display: block; margin-bottom: 5px;">Certified Inspector Log Notes</span>
      <p style="background: rgba(15, 23, 42, 0.3); border: 1px solid #334155; border-radius: 6px; padding: 12px; font-style: italic; font-size: 11px; color: #cbd5e1; margin: 0 0 15px 0; line-height: 1.5;">
        "${report.notes || 'No custom inspector logs recorded for this compliance submittal cycle.'}"
      </p>

      ${report.deficiencies && report.deficiencies.length > 0 ? `
        <span class="lbl" style="display: block; color: #ef4444; margin-bottom: 5px;">Mandatory Repair Corrective Orders (${report.deficiencies.length})</span>
        <ul style="background: rgba(220, 38, 38, 0.04); border: 1px solid rgba(220, 38, 38, 0.2); border-radius: 6px; padding: 12px 12px 12px 25px; font-size: 11px; color: #fecdd3; margin: 0;">
          ${report.deficiencies.map(d => `<li style="margin-bottom: 4px;">${d}</li>`).join('')}
        </ul>
      ` : `
        <span class="lbl" style="display: block; color: #10b981; margin-bottom: 5px;">Active Safety Deficiencies</span>
        <p style="background: rgba(16, 185, 129, 0.04); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 6px; padding: 12px; font-size: 11px; color: #a7f3d0; margin: 0;">
          No active deficiencies are logged or recorded under this submittal reference. System passed physical fire code guidelines.
        </p>
      `}
    </div>
    ` : ''}
    
    <div class="download-note">
      <p>Click below to open local physical print layouts of this watermarked compliance stamp sheet.</p>
      <button class="btn" onclick="window.print()">Print Official Stamp Certificate</button>
    </div>
  </div>
</body>
</html>
    `;

    try {
      const blob = new Blob([content], { type: 'text/html' });
      const dlUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = dlUrl;
      const reportPre = report ? report.propertyName.replace(/\s+/g, "_") + "_" : "";
      const cleanDlName = reportPre + file.name.replace(/\.[^/.]+$/, "") + "_COMPLIANCE_STAMP.html";
      a.download = cleanDlName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      const newWin = window.open();
      if (newWin) {
        newWin.document.write(content);
        newWin.document.close();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Parse target report or contractor before any conditional returns so React hook order stays stable.
  const targetReport = verifyId ? reports.find(r => r.id === verifyId) : null;
  const foundContractor = contractorId ? contractors.find(c => c.id === contractorId) : 
                          targetReport ? contractors.find(c => c.id === targetReport.contractorId) : null;

  const urlParams = typeof window !== 'undefined' ? new URL(window.location.href).searchParams : new URLSearchParams();
  const hasContractorPayload = !!(urlParams.get('name') || urlParams.get('license') || urlParams.get('email') || urlParams.get('phone'));
  const urlPayloadContractor: Contractor | null = contractorId && hasContractorPayload ? {
    id: contractorId,
    name: urlParams.get('name') || 'Verified Contractor',
    licenseNumber: urlParams.get('license') || '',
    email: urlParams.get('email') || '',
    phone: urlParams.get('phone') || '',
    activeReportsCount: 0
  } : null;

  const reportNamedContractor: Contractor | null = targetReport ? {
    id: targetReport.contractorId,
    name: targetReport.contractorName || 'Verified Contractor',
    licenseNumber: '',
    email: '',
    phone: '',
    activeReportsCount: 0
  } : null;

  // Prefer the live registered contractor. If the QR carries company details, use those next.
  // Only use built-in demo fallbacks when no assigned company details were supplied.
  const targetContractor = foundContractor || urlPayloadContractor || reportNamedContractor || (
    contractorId === 'con-2' || (targetReport && targetReport.contractorId === 'con-2') ? {
      id: 'con-2',
      name: 'Metro Fire Protection',
      licenseNumber: 'F-44120-C',
      email: 'nj-inspect@metrofirenj.com',
      phone: '(732) 555-4120',
      activeReportsCount: 0
    } : contractorId === 'con-3' || (targetReport && targetReport.contractorId === 'con-3') ? {
      id: 'con-3',
      name: 'Titan Fire Systems Inc.',
      licenseNumber: 'F-88291-C',
      email: 'filings@titanfiresystems.com',
      phone: '(609) 555-8291',
      activeReportsCount: 0
    } : null
  );

  useEffect(() => {
    if (contractors && contractors.length > 0) {
      const defaultId = contractorId || targetContractor?.id || contractors[0].id;
      if (contractors.some(c => c.id === defaultId)) {
        setSelectedContractorId(defaultId);
      } else {
        setSelectedContractorId(contractors[0].id);
      }
    }
  }, [contractors, contractorId, targetContractor?.id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans select-none items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 shadow-xl space-y-6 relative overflow-hidden">
          {/* Top orange safety badge lines */}
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-500 via-amber-500 to-red-600" />
          
          <div className="flex flex-col items-center">
            <div className="relative w-24 h-24 flex items-center justify-center bg-red-50 text-[#dc2626] rounded-full border border-red-100 mb-4 animate-pulse">
              <QrCode className="w-12 h-12" />
              <div className="absolute inset-0 rounded-full border-2 border-dashed border-[#dc2626]/40 animate-spin" style={{ animationDuration: '6s' }} />
            </div>
            
            <Logo variant="full" size="md" />
            
            <span className="text-[9px] font-mono tracking-widest text-[#dc2626] font-bold block uppercase leading-none mt-4">
              Prevention Bureau compliance Hub
            </span>
            <h3 className="text-base font-black text-slate-800 uppercase tracking-tight mt-1">
              Securing Verified Node...
            </h3>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl space-y-2 text-left font-mono border border-slate-100">
            <div className="flex items-center justify-between text-[9px] text-slate-400">
              <span>SCAN TARGET ENCRYPTED KEY:</span>
              <span className="text-slate-600 font-bold">{verifyId ? 'NFPA-VERIFY' : 'CONTRACTOR-TAG'}</span>
            </div>
            <div className="h-[1px] bg-slate-250" />
            <p className="text-[10px] text-slate-650 leading-normal font-sans">
              Contacting local fire inspection database. This secure channel validates official certifications without exposing landlord private networks.
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 text-slate-400 font-mono text-[9px] tracking-wider uppercase font-bold animate-pulse">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Connecting to live registry...</span>
          </div>
        </div>
      </div>
    );
  }

  const targetProperty = targetReport ? properties.find(p => p.id === targetReport.propertyId) : null;

  const handleBureauAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    const activeAccount = bureauAccounts.find(acc => acc.id === selectedBureauId);
    if (!activeAccount) {
      setAuthError('Please select a Fire Officer account.');
      return;
    }

    if (!bureauPasswordInput) {
      setAuthError('Please enter your account password.');
      return;
    }

    if (bureauPasswordInput !== activeAccount.password) {
      setAuthError('Access Denied: Incorrect password. Check credentials and retry.');
      return;
    }

    if (onLogin) {
      onLogin({
        id: `user-${activeAccount.id}`,
        name: activeAccount.name,
        role: 'bureau',
        email: 'prevention.bureau@firedept-gov.us',
      });
      setAuthError('');
    }
  };

  const handleContractorAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractorLicenseInput.trim()) {
      setAuthError('Licensing credentials / key code is required.');
      return;
    }
    
    // Find contractor matching the selected ID
    const matchedCon = contractors.find(c => c.id === selectedContractorId);

    if (!matchedCon) {
      setAuthError('Please select a valid contractor agency.');
      return;
    }

    if (contractorLicenseInput.toLowerCase().trim() !== matchedCon.licenseNumber.toLowerCase().trim()) {
      setAuthError(`Access Denied: Unverified license key for ${matchedCon.name}. (Hint: try typing "${matchedCon.licenseNumber}")`);
      return;
    }

    if (onLogin) {
      onLogin({
        id: `user-${matchedCon.id}`,
        name: 'Technical Field Agent',
        role: 'contractor',
        contractorId: matchedCon.id,
        email: matchedCon.email,
      });
      setAuthError('');
    }
  };

  const isBureau = currentUser?.role === 'bureau';
  const isCompanyContractor = currentUser?.role === 'contractor' && 
                               targetReport && 
                               currentUser.contractorId === targetReport.contractorId;
  const hasAccess = !verifyId || !targetReport || isBureau || isCompanyContractor || isGuestBypassed;

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusConfig = (status: string) => {
    const isPassed = status?.toLowerCase().includes('passed') && !status?.toLowerCase().includes('deficiencies');
    const isPassedDef = status?.toLowerCase().includes('deficiencies');
    const isFailed = status?.toLowerCase().includes('failed') || status?.toLowerCase().includes('overdue');
    
    if (isPassed) {
      return {
        bg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
        badgeBg: 'bg-emerald-500 text-white',
        text: '🟢 NFPA CERTIFIED - FULLY COMPLIANT',
        seal: 'border-emerald-500 text-emerald-600 bg-emerald-50',
        desc: 'This fire safety installation has been inspected, tagged, and registered with the Bureau of Fire Prevention as actively passing state safety codes.'
      };
    } else if (isPassedDef) {
      return {
        bg: 'bg-amber-50 border-amber-200 text-amber-800',
        badgeBg: 'bg-amber-500 text-slate-900',
        text: '🟡 CONDITIONAL COMPLIANCE - DEFICIENCIES OUTSTANDING',
        seal: 'border-amber-400 text-amber-600 bg-amber-50',
        desc: 'System has been certified with non-critical deficiencies. A 30-day compliance schedule has been logged for remedial repair.'
      };
    } else {
      return {
        bg: 'bg-rose-50 border-rose-200 text-rose-800',
        badgeBg: 'bg-rose-600 text-white',
        text: '🔴 DEFICIENT / NON-COMPLIANT SYSTEM',
        seal: 'border-rose-500 text-rose-600 bg-rose-50',
        desc: 'CRITICAL HAZARD WARNING: This fire safety layout failed state regulations, has active safety violations, or is overdue for compulsory recertification.'
      };
    }
  };

  // View 1: Active report found
  const renderVerificationContent = () => {
    if (!targetReport) {
      return (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center shadow-lg">
          <AlertTriangle className="w-16 h-16 text-[#dc2626] mx-auto mb-4 animate-bounce" />
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight font-sans">
            QR TAG UNSOLVED
          </h2>
          <p className="text-xs text-slate-500 font-mono mt-2 max-w-sm mx-auto leading-relaxed">
            Fire Prevention Bureau was unable to verify this QR string layout. Tag has either expired, been decommissioned, or belongs to a pre-registry configuration.
          </p>
          <button 
            onClick={onBackToLogin}
            className="mt-6 py-2 px-5 bg-slate-900 hover:bg-[#dc2626] text-white text-xs font-bold rounded uppercase tracking-wider transition cursor-pointer"
          >
            ← Return to Home Gateway
          </button>
        </div>
      );
    }

    const sc = getStatusConfig(targetReport.status);

    return (
      <div className="space-y-6">
        
        {/* Navigation / Back Button context */}
        {targetReport.contractorId && (
          <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm select-none">
            <button
              onClick={() => {
                if (onNavigate) {
                  onNavigate(null, targetReport.contractorId);
                } else {
                  window.history.pushState(null, '', `?contractor=${targetReport.contractorId}`);
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-[#0f172a] rounded text-center text-[10px] font-mono font-black uppercase border border-slate-250 transition flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              ← Back to {targetContractor?.name || 'Contractor'} Profile Overview
            </button>
            <span className="text-[9.5px] text-slate-400 font-mono font-bold uppercase">
              Compliance Record Panel
            </span>
          </div>
        )}
        
        {/* Status Callout Banner */}
        <div className={`border-2 rounded-xl p-5 ${sc.bg} relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4`}>
          <div className="space-y-1.5 max-w-2xl">
            <span className={`inline-block px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest ${sc.badgeBg}`}>
              {targetReport.status}
            </span>
            <h3 className="text-lg font-black tracking-tight uppercase leading-snug">
              {sc.text}
            </h3>
            <p className="text-[11.5px] font-sans leading-relaxed text-slate-600">
              {sc.desc}
            </p>
          </div>

          <div className="shrink-0 flex items-center md:flex-col justify-end gap-2 text-right w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 border-slate-200 md:border-l pl-0 md:pl-6 border-slate-300">
            <div className="text-left md:text-right">
              <span className="text-[9px] text-slate-400 font-mono uppercase block font-bold leading-none">
                Bureau Stamp Verify ID
              </span>
              <span className="text-[11px] text-slate-800 font-mono font-bold block mt-1 tracking-tight">
                {targetReport.id.toUpperCase()}-STF
              </span>
            </div>
          </div>
        </div>

        {/* Bento Grid layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Main Info Column (Left 7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Building & System Specifications */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Building2 className="w-5 h-5 text-[#dc2626]" />
                <h3 className="text-xs font-black text-[#0f172a] uppercase tracking-wider font-sans">
                  Target System & Installation Site
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-[9.5px] text-slate-400 font-mono uppercase block font-bold">
                    Property Facility Name
                  </span>
                  <p className="text-sm font-extrabold text-slate-800 mt-0.5 leading-snug uppercase">
                    {targetReport.propertyName}
                  </p>
                </div>
                <div>
                  <span className="text-[9.5px] text-slate-400 font-mono uppercase block font-bold">
                    Compulsory Standard
                  </span>
                  <p className="text-xs font-bold text-slate-700 mt-1 uppercase font-mono">
                    🛡 {targetReport.equipmentType} Rules
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-[9.5px] text-slate-400 font-mono uppercase block font-bold">
                    Physical GPS Tag Location Address
                  </span>
                  <p className="text-xs font-bold text-[#dc2626] mt-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> {targetReport.propertyAddress}
                  </p>
                </div>
              </div>

              {/* Inspector detailed testing logs */}
              <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-150 space-y-2 font-mono">
                <span className="text-[9px] text-slate-450 uppercase block font-bold leading-none select-none">
                  Filing Technician Test Narrative:
                </span>
                <p className="text-[10.5px] italic text-slate-700 leading-relaxed font-semibold">
                  "{targetReport.notes || 'No testing logs submitted.'}"
                </p>
              </div>

              {/* Deficiencies alerts if present */}
              {targetReport.deficiencies && targetReport.deficiencies.length > 0 && (
                <div className="bg-red-50 border border-red-150 rounded-lg p-3.5 space-y-2">
                  <span className="text-[9px] text-rose-800 uppercase block font-bold tracking-wider leading-none">
                    ⚠️ Active Code Deficiencies Detected ({targetReport.deficiencies.length})
                  </span>
                  <div className="space-y-1.5 font-mono text-[10px] text-rose-700 font-semibold leading-relaxed">
                    {targetReport.deficiencies.map((d, i) => (
                      <p key={i}>• {d}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Official Inspection Audit History timeline */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Calendar className="w-5 h-5 text-[#dc2626]" />
                <h3 className="text-xs font-black text-[#0f172a] uppercase tracking-wider font-sans">
                  Filing Records & State Code Timeline
                </h3>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-slate-750 select-none">
                <div className="p-2.5 bg-slate-50 border border-slate-150 rounded font-mono">
                  <span className="text-[8.5px] text-slate-400 font-bold block uppercase leading-none">
                    Inspection Date
                  </span>
                  <span className="text-[11px] font-extrabold text-slate-800 block mt-1.5 font-mono">
                    {targetReport.date}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-150 rounded font-mono">
                  <span className="text-[8.5px] text-slate-400 font-bold block uppercase leading-none">
                    Bureau Accepted
                  </span>
                  <span className={`text-[11px] font-black block mt-1.5 uppercase font-sans ${targetReport.bureauApproved ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {targetReport.bureauApproved ? 'Passed ✔' : 'Pending ⏳'}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-150 rounded font-mono">
                  <span className="text-[8.5px] text-slate-400 font-bold block uppercase leading-none">
                    Recertification Cycle
                  </span>
                  <span className="text-[11.5px] font-extrabold text-slate-800 block mt-1.5">
                    Compulsory Annual
                  </span>
                </div>
                <div className="p-2.5 bg-[#dc2626]/5 border border-[#dc2626]/20 rounded font-mono">
                  <span className="text-[8.5px] text-[#dc2626] font-extrabold block uppercase leading-none">
                    Tag Expiry Check
                  </span>
                  <span className="text-[11px] font-black text-[#dc2626] block mt-1.5 font-sans">
                    {targetProperty?.nextInspectionDate || '2027-05-10'}
                  </span>
                </div>
              </div>

              {targetReport.bureauComments && (
                <div className="p-3.5 bg-indigo-50 border border-indigo-150 rounded-lg text-indigo-900 leading-relaxed text-[10.5px]">
                  <span className="text-[9px] font-bold text-indigo-750 block uppercase tracking-wider mb-1 font-sans">
                    📝 Bureau of Fire Prevention Endorsement:
                  </span>
                  <p className="italic font-serif">"{targetReport.bureauComments}"</p>
                </div>
              )}
            </div>

          </div>

          {/* Verification Photo Clip & Agency Panel (Right 5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Direct Picture Loop for Real-world visual inspection validation */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Camera className="w-5 h-5 text-[#dc2626]" />
                <h3 className="text-xs font-black text-[#0f172a] uppercase tracking-wider font-sans">
                  Digital Image Proof Panel
                </h3>
              </div>

              <p className="text-[10.5px] text-slate-500 font-sans leading-relaxed">
                Fire inspectors require real-time visual proof. Tap the images below to expand high-resolution on-site pictures snapped during field testing.
              </p>

              <div className="grid grid-cols-2 gap-2">
                {targetReport.photos && targetReport.photos.length > 0 ? (
                  targetReport.photos.map((phUrl, i) => (
                    <button
                      key={i}
                      onClick={() => setLightboxUrl(phUrl)}
                      className="group relative rounded-lg border border-slate-200 overflow-hidden bg-slate-50 h-24 w-full cursor-zoom-in transition-all hover:border-[#dc2626] shadow-sm select-none"
                    >
                      <img 
                        src={phUrl} 
                        alt="NFPA installation snap" 
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-[#0f172a]/20 group-hover:bg-[#0f172a]/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-150">
                        <span className="text-[9.5px] font-bold text-white bg-[#0f172a]/70 px-2 py-0.5 rounded shadow">
                          🔎 Inspect View
                        </span>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="col-span-2 py-6 px-4 text-center rounded-lg border border-dashed border-slate-200 bg-slate-50 font-sans">
                    <Camera className="w-5 h-5 text-slate-400 mx-auto mb-1.5" />
                    <span className="text-[10px] text-slate-600 font-black block uppercase tracking-wide">No On-Site Photos Attached</span>
                    <span className="text-[9px] text-slate-450 block mt-0.5">Licensed contractor submitted this certificate file of compliance without additional media attachments.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Certificated Safety Agency Credentials */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <ShieldCheck className="w-5 h-5 text-[#dc2626]" />
                <h3 className="text-xs font-black text-[#0f172a] uppercase tracking-wider font-sans">
                  Filing Licensed Agency
                </h3>
              </div>

              {targetContractor ? (
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-black text-slate-850 leading-tight uppercase font-sans">
                      {targetContractor.name}
                    </h4>
                    <span className="text-[10px] bg-sky-50 text-sky-700 border border-sky-150 px-2 py-0.5 rounded font-mono font-bold mt-1 inline-block uppercase select-none">
                      ✔ NJ Division of Fire Safety Lic: {targetContractor.licenseNumber}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-[11px] font-mono text-slate-600 border-t border-slate-100 pt-3">
                    <p className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <a href={`tel:${targetContractor.phone}`} className="hover:text-[#dc2626] underline font-bold">
                        {targetContractor.phone}
                      </a>
                    </p>
                    <p className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <a href={`mailto:${targetContractor.email}`} className="hover:text-[#dc2626] underline font-bold truncate">
                        {targetContractor.email}
                      </a>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-1 text-slate-500 font-mono text-center py-2 text-xs font-bold uppercase">
                  <p>Technician Contractor Unlisted</p>
                  <p className="text-[9px] text-slate-400">ID: {targetReport.contractorId}</p>
                </div>
              )}
            </div>

          </div>

        </div>

      </div>
    );
  };

  // View 2: Only contractor profile link shared
  const renderContractorPublicDashboard = () => {
    if (!targetContractor) return null;

    const contractorPageReports = reports.filter((r: any) => {
      const idMatch = r.contractorId === targetContractor.id;
      const nameMatch = targetContractor.name && r.contractorName && r.contractorName.toLowerCase().trim() === targetContractor.name.toLowerCase().trim();
      const licenseMatch = targetContractor.licenseNumber && r.contractorLicenseNumber && r.contractorLicenseNumber.toLowerCase().trim() === targetContractor.licenseNumber.toLowerCase().trim();
      return idMatch || nameMatch || licenseMatch;
    });

    return (
      <div className="space-y-6">
        
        {/* Contractor Registry Header */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start gap-4">
          <div className="space-y-2">
            <span className="text-[10px] text-emerald-700 font-mono tracking-widest uppercase font-extrabold px-2.5 py-0.5 bg-emerald-50 border border-emerald-200 rounded-md">
              ✔ Verified Licensed Contractor
            </span>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
              {targetContractor.name}
            </h2>
            <div className="flex gap-4 text-xs font-mono text-slate-500">
              <span className="font-bold">License: <span className="text-slate-800 font-black">{targetContractor.licenseNumber}</span></span>
              <span>•</span>
              <span className="font-bold">Active Sites logged: <span className="text-[#dc2626] font-black">{contractorPageReports.length}</span></span>
            </div>
          </div>

          <div className="flex gap-2 w-full sm:w-auto pt-3 sm:pt-0">
            <a 
              href={`tel:${targetContractor.phone}`}
              className="flex-1 py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-center text-[11px] font-mono font-bold uppercase border border-slate-250 transition min-w-[120px]"
            >
              📞 Call Agency
            </a>
            <a 
              href={`mailto:${targetContractor.email}`}
              className="flex-1 py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded text-center text-[11px] font-mono font-bold uppercase transition min-w-[120px]"
            >
              ✉ Email
            </a>
          </div>
        </div>

        {/* List of active QR Tags installed by this contractor */}
        <div className="space-y-4 animate-fade-in">
          <h3 className="text-xs font-black text-slate-500 font-sans uppercase tracking-widest pl-1">
            Compliant Seals Installed ({contractorPageReports.length})
          </h3>

          {contractorPageReports.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center shadow-sm">
              <ShieldCheck className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Contractor Public Profile Loaded</h3>
              <p className="text-xs text-slate-500 mt-2 max-w-lg mx-auto leading-relaxed">
                This QR code is assigned to {targetContractor.name}. No inspection report records are currently attached to this public contractor profile in the live database.
              </p>
            </div>
          ) : (
          <div className="space-y-4">
            {contractorPageReports.map(rep => {
              const sc = getStatusConfig(rep.status);
              return (
                <div key={rep.id} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm hover:shadow-md transition duration-200 relative text-left">
                  
                  {/* Top Header line of card */}
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-2 border-b border-slate-100 pb-3">
                    <div className="min-w-0">
                      <span className="text-[9.5px] font-mono text-slate-400 font-bold uppercase tracking-wider block">
                        REPORT ID: {rep.id} • FILED DATE: {rep.date}
                      </span>
                      <h3 className="text-sm font-extrabold text-[#0f172a] uppercase leading-tight font-sans tracking-tight mt-0.5">
                        {rep.propertyName}
                      </h3>
                      <span className="text-[10px] text-slate-450 block mt-0.5 font-mono">
                        📍 Address: {rep.propertyAddress}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1 items-end shrink-0 sm:text-right">
                      <span className={`inline-block px-2.5 py-0.5 rounded text-[9px] uppercase font-bold text-center w-fit ${
                        rep.status.includes('Passed') 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : rep.status.includes('Failed') 
                            ? 'bg-red-50 text-rose-700 border border-red-200' 
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {rep.status}
                      </span>
                      <span className={`text-[10px] font-mono font-bold block ${rep.bureauApproved ? 'text-emerald-600':'text-amber-600'}`}>
                        {rep.bureauApproved ? '✔ Bureau Approved' : '⏳ Pending Review'}
                      </span>
                    </div>
                  </div>

                  {/* Middle layout: Submittal Info & Photos */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                    
                    {/* Summary specifications */}
                    <div className="lg:col-span-7 space-y-3.5 text-[11px] font-sans text-slate-600">
                      <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded border border-slate-200 text-[10px] font-mono text-slate-655">
                        <div>
                          <strong className="text-slate-400 block uppercase text-[8px]">System Class:</strong>
                          <span className="text-slate-800 font-extrabold font-sans text-xs">{rep.equipmentType}</span>
                        </div>
                        <div>
                          <strong className="text-slate-400 block uppercase text-[8px]">Operating Tech:</strong>
                          <span className="text-slate-800 font-bold text-xs">{rep.inspectorName}</span>
                        </div>
                      </div>

                      {/* Clickable Report Document file */}
                      <div>
                        <strong className="text-[10px] uppercase font-extrabold text-slate-450 tracking-wider block mb-1.5">Attached Compliance Report Document:</strong>
                        <div className="bg-emerald-50 border border-emerald-200 rounded p-3.5 space-y-3">
                          <div className="flex items-center justify-between min-w-0 gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="bg-emerald-600 p-2 rounded text-white shrink-0">
                                <FileText className="w-4 h-4" />
                              </div>
                              <div className="text-left font-sans leading-tight min-w-0">
                                <span className="text-xs font-bold text-slate-850 block truncate max-w-[180px] sm:max-w-md">{rep.fileName || 'Inspection_Certificate.pdf'}</span>
                                <span className="text-[10px] text-slate-500 font-mono block mt-0.5">File payload • {rep.fileSize || '1.45 MB'}</span>
                              </div>
                            </div>
                            <span className="text-[8.5px] font-mono font-black text-emerald-850 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300 shrink-0 select-none">
                              VERIFIED ✔
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2.5 pt-1.5 border-t border-emerald-150">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedReportForDocPreview(rep);
                                const parsedFiles = getReportFiles(rep);
                                setDocPreviewTab(parsedFiles.some(f => f.url) ? 'pdf' : 'cert');
                                setActiveDocFileIndex(0);
                              }}
                              className="py-1.5 px-2 bg-white hover:bg-slate-100 text-[#0f172a] rounded border border-slate-200 text-[10px] font-bold flex items-center gap-1.5 justify-center transition cursor-pointer select-none shadow-sm"
                            >
                              👁️ View Submittal
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const reportFiles = getReportFiles(rep);
                                reportFiles.forEach(matched => {
                                  downloadDocFile(matched, rep);
                                });
                              }}
                              className="py-1.5 px-2 bg-[#dc2626] hover:bg-red-750 text-white rounded text-[10px] font-bold flex items-center gap-1.5 justify-center transition cursor-pointer select-none shadow-sm animate-pulse"
                            >
                              💾 Download / Open Original
                            </button>
                          </div>
                        </div>
                      </div>

                      <div>
                        <strong className="text-[10px] uppercase font-extrabold text-slate-450 tracking-wider block mb-1">Inspector Log Notes:</strong>
                        <p className="bg-slate-50 rounded-lg p-2.5 text-[10px] italic font-mono leading-relaxed text-slate-550 border border-slate-150">
                          "{rep.notes || 'No notes attached to this compliance submittal log.'}"
                        </p>
                      </div>

                      {/* Deficiencies list */}
                      {rep.deficiencies && rep.deficiencies.length > 0 && (
                        <div className="space-y-1">
                          <strong className="text-[10px] uppercase font-bold text-[#dc2626] block">Safety Deficiencies Identified ({rep.deficiencies.length}):</strong>
                          <div className="bg-red-50 text-rose-800 text-[10.5px] font-mono rounded p-2.5 border border-red-200 space-y-0.5">
                            {rep.deficiencies.map((def, i) => (
                              <p key={i}>⚠️ {def}</p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right: Attached Photos */}
                    <div className="lg:col-span-5 space-y-2">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block flex items-center gap-1 font-sans">
                        <Camera className="w-3.5 h-3.5 text-[#dc2626]" /> Report Photos Proof ({rep.photos?.length || 1})
                      </span>

                      <div className="grid grid-cols-2 gap-2">
                        {rep.photos && rep.photos.length > 0 ? (
                          rep.photos.map((phUrl, idx) => (
                            <div 
                              key={idx}
                              onClick={() => setLightboxUrl(phUrl)}
                              className="relative group rounded-lg border border-slate-200 overflow-hidden bg-slate-100 h-28 w-full cursor-zoom-in transition hover:border-[#dc2626] shadow-inner select-none"
                              title="Click to view full photo proof"
                            >
                              <img 
                                src={phUrl} 
                                alt="Compliance camera proof" 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/35 flex flex-col items-center justify-center transition duration-150">
                                <span className="text-[9.5px] font-bold text-white bg-slate-800/80 border border-slate-700/50 rounded px-2.5 py-1.5 shadow flex items-center gap-1">
                                  📂 OPEN
                                </span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="col-span-2 py-8 px-4 text-center rounded-lg border border-dashed border-slate-200 bg-slate-50 font-sans">
                            <Camera className="w-5 h-5 text-slate-400 mx-auto mb-1.5" />
                            <span className="text-[10px] text-slate-605 font-bold block uppercase tracking-wide">No Photos Attached</span>
                            <span className="text-[9px] text-slate-400 block mt-0.5 leading-normal">Compliance filed without physical camera snaps.</span>
                          </div>
                        )}
                      </div>
                      <p className="text-[9px] text-slate-400 italic font-sans leading-normal pt-1">
                        Click on proof file or fallback document thumbnail to view the compliance submittal sheet.
                      </p>
                    </div>

                  </div>

                </div>
              );
            })}
          </div>
          )}
        </div>

      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans select-none p-1 sm:p-0">
      
      {/* Fire Bureau Header bar */}
      <header className="py-4 px-6 bg-[#0f172a] text-white border-b-2 border-[#dc2626] shrink-0 sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Logo variant="emblem" size="custom" customHeight="40px" customWidth="40px" className="shrink-0 animate-pulse" />
            <div>
              <span className="text-[9.5px] text-slate-400 font-mono tracking-widest uppercase block font-bold leading-none">
                State Fire Bureau Access
              </span>
              <h1 className="text-sm font-black text-white uppercase tracking-[0.05em] font-sans mt-0.5 leading-none">
                Safety Verification Grid
              </h1>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onBackToLogin}
              className="py-1.5 px-3.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-[10.5px] font-bold rounded uppercase tracking-wider transition cursor-pointer"
            >
              Staff Access Portal
            </button>
          </div>
        </div>
      </header>

      {/* Main Container Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto py-6 px-4 sm:px-6 space-y-6">
        
        {/* Navigation/Actions bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm leading-none">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10.5px] font-mono text-slate-500 uppercase font-black">
              Official Bureau Audit Hash: <span className="text-slate-700">SHA-256://PROVE-SECURE-KEY-2026</span>
            </span>
          </div>

          <div className="flex gap-1.5">
            <button
              onClick={handleShare}
              className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-center text-[10.5px] font-mono font-bold uppercase border border-slate-250 transition flex items-center gap-1.5 cursor-pointer"
              title="Copy mobile link URL to clipboard"
            >
              <Share2 className="w-3.5 h-3.5" /> {copiedLink ? 'Copied Link!' : 'Copy Link URL'}
            </button>
            <button
              onClick={handlePrint}
              className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-center text-[10.5px] font-mono font-bold uppercase border border-slate-250 transition flex items-center gap-1.5 cursor-pointer"
              title="Print regulatory sticker or compliance certificate sheet"
            >
              <Printer className="w-3.5 h-3.5" /> Print Certification
            </button>
          </div>
        </div>

        {/* Render content depending on active parameters */}
        {!hasAccess ? (
          <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden mt-4 animate-fade-in text-left">
            {/* Dark technical hazard bar */}
            <div className="bg-[#0f172a] text-white px-5 py-4 border-b border-slate-800 flex items-center gap-3 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-repeating-linear-stripes" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #f59e0b, #f59e0b 8px, #1e293b 8px, #1e293b 16px)', height: '4px' }} />
              <div className="p-2 bg-red-950/40 text-red-500 rounded-lg border border-red-500/20 shrink-0">
                <Lock className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <span className="text-[9px] text-[#dc2626] font-mono tracking-widest uppercase block font-bold leading-none mb-1">State Regulatory Code</span>
                <h3 className="text-xs font-black uppercase tracking-wider font-sans text-slate-100">
                  Restricted System Record Case
                </h3>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex gap-2.5 items-start bg-slate-50 border border-slate-200/60 p-3 rounded-lg text-slate-600 font-sans text-[11px] leading-relaxed">
                <ShieldAlert className="w-4 h-4 text-[#dc2626] shrink-0 mt-0.5" />
                <p>
                  In compliance with Fire Prevention Bureau digital safety tag regulations, system inspection histories and visual proofs are encrypted. Access is restricted exclusively to <strong>Inspection Bureau Officers</strong> and <strong>Licensed Maintenance Contractors</strong> representing this asset.
                </p>
              </div>

              {/* Tabs selector */}
              <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => { setSelectedRoleTab('bureau'); setAuthError(''); }}
                  className={`py-2 text-[10px] font-bold uppercase rounded-md transition duration-150 cursor-pointer ${
                    selectedRoleTab === 'bureau' 
                      ? 'bg-slate-900 text-white shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🚒 Bureau Officer
                </button>
                <button
                  type="button"
                  onClick={() => { setSelectedRoleTab('contractor'); setAuthError(''); }}
                  className={`py-2 text-[10px] font-bold uppercase rounded-md transition duration-150 cursor-pointer ${
                    selectedRoleTab === 'contractor' 
                      ? 'bg-slate-900 text-white shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🛠 Registered Contractor
                </button>
              </div>

              {selectedRoleTab === 'bureau' ? (
                <form onSubmit={handleBureauAuth} className="space-y-3.5">
                  <div>
                    <label htmlFor="select-bureau-id-qr" className="block text-[9.5px] text-slate-500 font-bold uppercase mb-1">Select Bureau Officer Profile</label>
                    <select
                      id="select-bureau-id-qr"
                      value={selectedBureauId}
                      onChange={(e) => {
                        setSelectedBureauId(e.target.value);
                        setAuthError('');
                      }}
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-[#1e293b] focus:outline-none focus:ring-1 focus:ring-slate-900 font-sans font-bold"
                    >
                      {bureauAccounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9.5px] text-slate-500 font-bold uppercase mb-1">Password</label>
                    <div className="relative">
                      <input
                        type="password"
                        placeholder="Enter Password"
                        value={bureauPasswordInput}
                        onChange={(e) => setBureauPasswordInput(e.target.value)}
                        className="w-full pl-3 pr-3 py-2 bg-white border border-slate-300 rounded text-xs select-text font-sans placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 font-bold"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-[#dc2626] hover:bg-black text-white text-xs font-bold uppercase rounded flex items-center justify-center gap-1.5 transition cursor-pointer select-none font-sans"
                  >
                    <Unlock className="w-3.5 h-3.5" /> Validate Officer Identity
                  </button>
                </form>
              ) : (
                <form onSubmit={handleContractorAuth} className="space-y-3.5">
                  <div>
                    <label htmlFor="select-contractor-qr" className="block text-[9.5px] text-slate-500 font-bold uppercase mb-1">Select Licensed Agency / Service Group</label>
                    <select
                      id="select-contractor-qr"
                      value={selectedContractorId}
                      onChange={(e) => {
                        setSelectedContractorId(e.target.value);
                        setAuthError('');
                      }}
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-[#1e293b] focus:outline-none focus:ring-1 focus:ring-slate-900 font-sans font-bold"
                    >
                      {contractors.map((con) => (
                        <option key={con.id} value={con.id}>{con.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9.5px] text-slate-500 font-bold uppercase mb-1">Licensed Safety Key / License Number</label>
                    <input
                      type="text"
                      placeholder="e.g. F-88291-C"
                      value={contractorLicenseInput}
                      onChange={(e) => setContractorLicenseInput(e.target.value)}
                      className="w-full pl-3 pr-3 py-2 bg-white border border-slate-300 rounded text-xs select-text font-mono placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-[#0f172a] hover:bg-black text-white text-xs font-bold uppercase rounded flex items-center justify-center gap-1.5 transition cursor-pointer select-none font-sans"
                  >
                    <Unlock className="w-3.5 h-3.5" /> Verify Licensing Code
                  </button>
                </form>
              )}

              {authError && (
                <div className="p-2.5 bg-red-50 border border-red-150 text-[10px] text-red-700 rounded font-mono leading-relaxed">
                  ⚠️ {authError}
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 text-[10px] text-slate-450 leading-relaxed font-sans text-center bg-slate-50 p-2.5 rounded-lg border border-dashed border-slate-200">
                <span className="font-bold text-slate-600 uppercase block mb-1">🔑 Demo / Testing Credentials Guideline:</span>
                <p className="font-mono text-[9px] text-left leading-normal space-y-0.5">
                  • Bureau Officer: Select profile and input account password defined on home page (Default Password <strong className="text-[#dc2626]">firechief</strong>)<br />
                  • Licensed Contractor: Type <strong className="text-emerald-750 font-black">{contractors.find(c => c.id === selectedContractorId)?.licenseNumber || 'F-88291-C'}</strong>
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsGuestBypassed(true)}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase rounded flex items-center justify-center gap-1.5 transition cursor-pointer select-none font-sans shadow-sm"
                >
                  🔓 Access as Public Guest (Property Owner / Inspector)
                </button>
              </div>

              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={onBackToLogin}
                  className="text-[10px] text-slate-505 font-bold uppercase tracking-wider hover:text-[#dc2626] transition flex items-center gap-1 cursor-pointer"
                >
                  ← Close Lookup
                </button>
              </div>
            </div>
          </div>
        ) : contractorId ? (
          renderContractorPublicDashboard()
        ) : verifyId ? (
          renderVerificationContent()
        ) : (
          renderContractorPublicDashboard()
        )}

        {/* Instructions/Guidelines to Beta Tester */}
        <div className="bg-slate-900 border border-slate-800 text-white rounded-xl p-5 shadow font-sans space-y-3">
          <h4 className="text-xs font-black uppercase text-center sm:text-left text-[#dc2626] font-sans tracking-wider flex items-center gap-1">
            <QrCode className="w-4 h-4" /> 🚀 CO-TESTER / BETA-TESTING MANUAL DIRECTIONS
          </h4>
          <p className="text-[11px] text-slate-300 leading-relaxed font-sans mt-1">
            To demonstrate this application "in the wild" on-site with a landlord, safety co-inspector, or local fire client, follow this seamless loop.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2.5 font-mono text-[10px] leading-relaxed text-slate-400">
            <div className="space-y-1.5 bg-slate-850 p-3 rounded border border-slate-800">
              <span className="text-[#dc2626] font-bold block uppercase text-[8px]">Step 1: Create Real Tag</span>
              <p>
                Log in as a safety contractor (e.g. <strong>Titan Fire Systems</strong>). Under submittals, tap "Upload New Report".
              </p>
            </div>
            <div className="space-y-1.5 bg-slate-850 p-3 rounded border border-slate-800">
              <span className="text-[#dc2626] font-bold block uppercase text-[8px]">Step 2: Take Real Camera Photo</span>
              <p>
                Click <strong>"📸 Snap Actual Picture"</strong> on your smartphone. Take an actual photo of the hardware/valve, file it, and grab the QR link!
              </p>
            </div>
            <div className="space-y-1.5 bg-slate-850 p-3 rounded border border-slate-800">
              <span className="text-[#dc2626] font-bold block uppercase text-[8px]">Step 3: Scan on other screen</span>
              <p>
                Copy the deep link of the report or scan the code! It displays this <strong>Public Inspector Sheet</strong> instantly featuring the real photo.
              </p>
            </div>
          </div>
        </div>

      </main>

      {/* Footer copyright */}
      <footer className="py-5 bg-[#0f172a] text-center border-t border-slate-800/60 text-slate-450 font-mono text-[10px] uppercase select-none leading-relaxed mt-12 shrink-0">
        <p className="font-extrabold text-white">MUNICIPAL BUREAU OF FIRE PREVENTION COMPLIANCE NETWORK</p>
        <p className="text-slate-500 mt-1">Municipal Complex • Official Beta Lookup Service</p>
      </footer>

      {/* Lightbox expansion view */}
      {lightboxUrl && (
        <div 
          onClick={() => setLightboxUrl(null)}
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-4 cursor-zoom-out select-none animate-fade-in"
        >
          <div className="relative max-w-4xl w-full flex flex-col items-center justify-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxUrl(null);
              }}
              className="absolute -top-10 right-0 py-1 px-3 text-white/80 hover:text-white bg-white/10 rounded hover:bg-white/20 transition cursor-pointer text-[10px] uppercase font-mono font-bold flex items-center gap-1.5"
            >
              <X className="w-3.5 h-3.5" /> Close Picture Viewer
            </button>
            
            <div 
              onClick={(e) => e.stopPropagation()} 
              className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex items-center justify-center max-h-[75vh] w-full p-2.5 shadow-2xl"
            >
              <img 
                src={lightboxUrl} 
                alt="Expanded on-site proof" 
                className="max-h-[70vh] max-w-full object-contain rounded"
                referrerPolicy="no-referrer"
              />
            </div>
            
            <span className="text-[10px] text-white/60 font-mono block mt-3 text-center uppercase tracking-wider">
              OFFICIAL ON-SITE SAFETY AUDIT PICTURE • TAP ANYWHERE OUTSIDE TO DISMISS
            </span>
          </div>
        </div>
      )}

      {/* Official Inspection Certificate / PDF Submittal Sheet Modal */}
      {selectedReportForDocPreview && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-[#0f172a] text-white border border-slate-800 rounded-lg max-w-2xl w-full flex flex-col max-h-[95vh] shadow-2xl overflow-hidden animate-fade-in font-sans">
            
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-850 bg-slate-900 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-white leading-none">
                    Certified Compliance Submittal Sheet
                  </h3>
                  <span className="text-[9.5px] font-mono text-slate-400 font-bold block mt-1">
                    REGISTRY REF: {selectedReportForDocPreview.id} • INTEGRITY SECURE
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedReportForDocPreview(null)}
                className="p-1 px-2 text-slate-400 hover:text-white rounded bg-slate-800 border border-slate-705 transition cursor-pointer text-xs font-bold uppercase"
                title="Close Document View"
              >
                ✕ Close
              </button>
            </div>

            {/* Tab selector based on whether fileUrl exists */}
            {selectedReportForDocPreview.fileUrl && (
              <div className="flex bg-slate-950 border-b border-slate-850 px-5 gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setDocPreviewTab('pdf')}
                  className={`py-2 px-3 text-[11px] font-bold uppercase transition border-b-2 cursor-pointer ${
                    docPreviewTab === 'pdf' 
                      ? 'text-rose-500 border-rose-500 font-extrabold' 
                      : 'text-slate-400 hover:text-slate-200 border-transparent'
                  }`}
                >
                  📄 View Original Uploaded PDF/Image
                </button>
                <button
                  type="button"
                  onClick={() => setDocPreviewTab('cert')}
                  className={`py-2 px-3 text-[11px] font-bold uppercase transition border-b-2 cursor-pointer ${
                    docPreviewTab === 'cert' 
                      ? 'text-rose-500 border-rose-500 font-extrabold' 
                      : 'text-slate-400 hover:text-slate-200 border-transparent'
                  }`}
                >
                  📋 Compliance Register Card
                </button>
              </div>
            )}

            {/* If there are multiple files attached, show some pills to switch between them */}
            {docPreviewTab === 'pdf' && getReportFiles(selectedReportForDocPreview).length > 1 && (
              <div className="bg-slate-900 border-b border-slate-800 p-2 px-5 flex flex-wrap gap-2 items-center shrink-0">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">FILES IN SUBMITTAL:</span>
                {getReportFiles(selectedReportForDocPreview).map((f, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveDocFileIndex(i)}
                    className={`text-[9.5px] font-bold py-0.5 px-2.5 rounded transition ${
                      activeDocFileIndex === i 
                        ? 'bg-rose-600 text-white font-extrabold' 
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            )}

            {docPreviewTab === 'pdf' ? (
              <div className="flex-1 overflow-y-auto p-4 bg-slate-100 flex flex-col min-h-[500px]">
                {(() => {
                  const reportFiles = getReportFiles(selectedReportForDocPreview);
                  const activeFile = reportFiles[activeDocFileIndex];
                  
                  if (!activeFile || !activeFile.url || activeFile.url.length < 10) {
                    return (
                      <div className="flex-1 flex flex-col items-center justify-center p-10 text-slate-500 text-center font-sans space-y-4">
                        <FileText className="w-16 h-16 text-slate-300 animate-pulse" />
                        <div>
                          <h4 className="text-sm font-black uppercase text-slate-800 font-sans">No Document File Data Available</h4>
                          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed font-sans">
                            This mock report does not carry an active base64 payload. Tap on <strong>"Compliance Register Card"</strong> tab to view official metadata.
                          </p>
                        </div>
                      </div>
                    );
                  }

                  const isImage = activeFile.name.endsWith('.png') || activeFile.name.endsWith('.jpg') || activeFile.name.endsWith('.jpeg') || activeFile.url.startsWith('data:image/');
                  
                  return (
                    <div className="flex-1 flex flex-col space-y-3 h-full">
                      <div className="flex justify-between items-center text-xs text-slate-500 font-mono">
                        <span className="font-bold uppercase tracking-wider text-slate-600 truncate max-w-[320px]">
                          Attached: {activeFile.name} ({activeFile.size})
                        </span>
                        <a 
                          href={activeFile.url} 
                          download={activeFile.name}
                          className="bg-rose-600 text-white font-bold px-2.5 py-1 rounded hover:bg-rose-700 text-[10.5px] uppercase transition shadow shrink-0"
                        >
                          📥 Download Document
                        </a>
                      </div>
                      
                      <div className="flex-1 bg-white border border-slate-300 rounded shadow-inner overflow-hidden flex items-center justify-center p-1 min-h-[500px]">
                        {isImage ? (
                          <img 
                            src={activeFile.url} 
                            alt={activeFile.name} 
                            className="max-h-[550px] w-auto max-w-full object-contain rounded"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <iframe 
                            src={activeFile.url} 
                            className="w-full h-[550px] border-0" 
                            title={activeFile.name}
                          />
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-50 text-slate-800">
                
                {/* official seal watermark warning sheet header */}
                <div className="border border-slate-200 bg-white rounded-lg p-5 shadow-sm space-y-4 relative overflow-hidden">
                  <div className="absolute -top-10 -right-10 pointer-events-none opacity-5 flex">
                    <Flame className="w-48 h-48 text-rose-500" />
                  </div>

                  <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                    <div className="text-left">
                      <span className="text-[8px] font-mono font-black text-[#dc2626] bg-red-50 border border-red-205 px-1.5 py-0.5 rounded uppercase">
                        OFFICIAL COMPLIANCE FILING
                      </span>
                      <h4 className="text-sm font-black font-sans uppercase tracking-tight text-slate-900 mt-1.5 leading-none">
                        BUREAU OF FIRE PREVENTION REGISTER
                      </h4>
                      <p className="text-[10px] text-slate-400 font-bold leading-normal mt-1">Township of Stafford • New Jersey Division</p>
                    </div>
                    <div className="text-right text-[10px] font-mono text-slate-400 leading-normal">
                      <span className="block font-bold">STATE OF NEW JERSEY</span>
                      <span className="block font-semibold">REF: EST-{selectedReportForDocPreview.id.slice(-6).toUpperCase()}</span>
                    </div>
                  </div>

                  {/* Submittal stats in clean grids */}
                  <div className="grid grid-cols-2 gap-y-3.5 gap-x-4 text-xs text-left">
                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase font-bold font-mono">Audited Asset Address:</span>
                      <span className="text-slate-900 block font-black font-sans text-xs uppercase leading-tight mt-0.5">{selectedReportForDocPreview.propertyName}</span>
                      <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">{selectedReportForDocPreview.propertyAddress}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase font-bold font-mono">Certified Filing Date:</span>
                      <span className="text-slate-800 block font-bold font-mono mt-0.5">{selectedReportForDocPreview.date}</span>
                      <span className="text-[9.5px] text-slate-500 block leading-none mt-0.5">Stafford Fire Prevention Div.</span>
                    </div>
                    <div className="border-t border-slate-100 pt-3">
                      <span className="text-[9px] text-slate-400 block uppercase font-bold font-mono">Licensed Contractor:</span>
                      <span className="text-[#dc2626] block font-sans font-black leading-tight uppercase mt-0.5">{selectedReportForDocPreview.contractorName}</span>
                      <span className="text-slate-400 text-[9px] font-bold font-mono">License Code: {selectedReportForDocPreview.contractorId === 'con-2' ? 'F-44120-C' : selectedReportForDocPreview.contractorId === 'con-3' ? 'F-92811-C' : 'F-88291-C'}</span>
                    </div>
                    <div className="border-t border-slate-100 pt-3">
                      <span className="text-[9px] text-slate-400 block uppercase font-bold font-mono">Registering Field Tech:</span>
                      <span className="text-slate-800 block font-sans font-bold leading-tight mt-0.5">{selectedReportForDocPreview.inspectorName}</span>
                      <span className="text-slate-500 block text-[9.5px] font-semibold">Level II Field System Auditor</span>
                    </div>
                  </div>
                </div>

                {/* Subsystem categorization check row */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm text-center">
                    <span className="text-[9px] text-slate-400 font-mono block uppercase font-bold">Inspected Regulatory Class</span>
                    <span className="text-xs font-black text-slate-800 block font-sans mt-0.5 uppercase tracking-tight">{selectedReportForDocPreview.equipmentType}</span>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm text-center">
                    <span className="text-[9px] text-slate-400 font-mono block uppercase font-bold">compliance status</span>
                    <span className={`text-xs font-extrabold block mt-0.5 uppercase tracking-tight ${
                      selectedReportForDocPreview.status.includes('Passed') ? 'text-emerald-700' : 'text-rose-700'
                    }`}>{selectedReportForDocPreview.status}</span>
                  </div>
                </div>

                {/* Uploaded Certificate Proof Metadata */}
                <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-4 space-y-2">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold font-mono tracking-wider text-left">PRIMARY COMPLIANCE ATTACHMENT FILES</span>
                  
                  <div className="space-y-2.5">
                    {getReportFiles(selectedReportForDocPreview).map((matchedFile, idx) => {
                      return (
                        <div 
                          key={idx}
                          onClick={() => {
                            if (matchedFile.url) {
                              setDocPreviewTab('pdf');
                              setActiveDocFileIndex(idx);
                            } else {
                              downloadDocFile(matchedFile, selectedReportForDocPreview);
                            }
                          }}
                          className="flex items-center justify-between bg-slate-50 hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300 transition p-2.5 rounded cursor-pointer group"
                          title="Click to Download / View this file"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="bg-blue-50 text-blue-600 p-2 rounded group-hover:bg-[#dc2626] group-hover:text-white transition shrink-0">
                              <FileSpreadsheet className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 text-left">
                              <span className="text-xs font-bold text-slate-850 block font-mono truncate max-w-[210px] sm:max-w-xs group-hover:text-slate-905">{matchedFile.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono block">
                                Compliance Archive Proof • <span className="text-[#dc2626] font-extrabold group-hover:underline">📄 Click to View Preview inline</span>
                              </span>
                            </div>
                          </div>
                          <span className="text-[8.5px] font-mono font-black text-emerald-850 bg-emerald-100 px-2 py-0.5 border border-emerald-300 rounded shrink-0 group-hover:bg-emerald-200 transition">
                            PREVIEW 📄
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Deficiencies or Safety Violations list */}
                <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-4 space-y-2 text-left">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold font-mono tracking-wider">REGULATORY DEFICIENCY LIST</span>
                  {selectedReportForDocPreview.deficiencies.length === 0 ? (
                    <div className="p-3 text-center text-xs text-emerald-850 bg-emerald-50 border border-emerald-200 rounded font-mono font-semibold leading-normal">
                      ✔ All compliance aspects satisfied. No deficiencies or regulatory violations logged page 1.
                    </div>
                  ) : (
                    <div className="space-y-1.5 text-left">
                      {selectedReportForDocPreview.deficiencies.map((def, idx) => (
                        <div key={idx} className="p-2.5 text-xs font-mono text-rose-800 border border-rose-200 bg-rose-50 rounded flex items-start gap-1.5 font-bold leading-normal">
                          <span className="select-none">⚠️</span>
                          <span>{def}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Field checklist audit logs */}
                {selectedReportForDocPreview.notes && (
                  <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-4 space-y-2 text-left bg-slate-50">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold font-mono tracking-wider">Inspector Notes & Field Remarks</span>
                    <p className="bg-white border border-slate-200 p-3 rounded text-[11px] leading-relaxed italic text-[#27272a] font-mono">
                      "{selectedReportForDocPreview.notes}"
                    </p>
                  </div>
                )}

                {/* Photos attachment ledger timeline */}
                {selectedReportForDocPreview.photos && selectedReportForDocPreview.photos.length > 0 && (
                  <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-4 space-y-3">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold font-mono tracking-wider text-left">VISUAL INSPECTION LANDING PHOTOS ({selectedReportForDocPreview.photos.length})</span>
                    <div className="grid grid-cols-3 gap-2">
                      {selectedReportForDocPreview.photos.map((ph, idx) => (
                        <div key={idx} className="relative rounded border border-slate-200 overflow-hidden h-16 bg-slate-100 shadow-inner">
                          <img 
                            src={ph} 
                            alt="Physical submittal photo audit" 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bureau status validation card segment */}
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-xs space-y-2 text-left">
                  <span className="font-extrabold text-[#111827] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-650 animate-pulse" /> TOWNSHIP AUDITING INTEGRITY SEAL
                  </span>
                  <p className="text-slate-600 leading-relaxed font-sans mt-1">
                    This submittal card resides permanently on the Township of Stafford compliance registry. Field chiefs, insurance adjusters, or code coordinators may scan physical valve tags on-site to instantly recall this watermarked certificate live from cloud databases.
                  </p>
                  <div className="flex flex-col gap-1.5 pt-1.5 border-t border-indigo-200">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] uppercase font-bold border ${
                        selectedReportForDocPreview.bureauApproved 
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-250' 
                          : 'bg-amber-55 text-amber-800 border-amber-250'
                      }`}>
                        {selectedReportForDocPreview.bureauApproved ? 'Approved Certified ✔' : 'Pending Official Review ⏳'}
                      </span>
                      <span className="text-[10.5px] text-slate-500 font-mono uppercase">Status Validated</span>
                    </div>
                    {selectedReportForDocPreview.bureauComments && (
                      <div className="bg-white border border-indigo-200 p-2 rounded text-[11px] text-slate-700 italic font-mono leading-relaxed mt-0.5">
                        Bureau Coordinator: "{selectedReportForDocPreview.bureauComments}"
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* Modal Actions */}
            <div className="px-5 py-3 border-t border-slate-850 bg-slate-900 flex justify-end gap-3 shrink-0 font-sans">
              <button
                onClick={() => {
                  window.print();
                }}
                className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 rounded text-xs font-bold text-slate-300 tracking-wide cursor-pointer transition uppercase"
              >
                Print Report
              </button>
              <button
                onClick={() => setSelectedReportForDocPreview(null)}
                className="py-1.5 px-4 bg-[#dc2626] hover:bg-red-750 text-xs font-bold text-white rounded transition tracking-wider uppercase cursor-pointer"
              >
                Dismiss Document
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
