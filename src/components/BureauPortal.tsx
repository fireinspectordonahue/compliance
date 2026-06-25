/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Property, InspectionReport, UserInfo, ProjectStatus, Contractor } from '../types';
import SidebarRail from './SidebarRail';
import Logo from './Logo';
import CalendarWidget from './CalendarWidget';
import MapWidget from './MapWidget';
import ComplianceDashboard from './ComplianceDashboard';
import DeficienciesTracker from './DeficienciesTracker';
import QRCameraScanner from './QRCameraScanner';
import { googleSignIn, initAuth, logout as firebaseLogout } from '../lib/firebase';
import { safeStorage } from '../lib/storage';
import { Calendar as CalendarIcon } from 'lucide-react';
import { 
  Building2, 
  ShieldCheck, 
  AlertTriangle, 
  Search, 
  FileText, 
  User, 
  CheckCircle, 
  XCircle, 
  Briefcase, 
  Calendar,
  Flame,
  FileSpreadsheet,
  Grid,
  MapPin,
  RefreshCw,
  ClipboardList,
  SlidersHorizontal,
  ThumbsUp,
  Building,
  FileCheck,
  QrCode,
  Camera,
  Download,
  Printer,
  Smartphone,
  Scan,
  Check,
  BookOpen,
  Sparkles,
  X,
  Plus,
  ExternalLink,
  Trash2,
  Mail,
  Phone,
  Award,
  Send,
  Paperclip,
  RotateCw,
  LogOut
} from 'lucide-react';

const FLAME_ICON_DATA_URI = "data:image/svg+xml;base64," + btoa("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='#dc2626' width='24' height='24'><path d='M17.55 11.2c-.23-.3-.5-.57-.76-.85-.65-.7-1.4-1.34-1.9-2.14-1.12-1.8-1.12-4.16.02-6-.33.02-.65.08-.97.16-2 .55-3.46 2.37-3.72 4.43-.16 1.15.1 2.3.62 3.25-.57-.1-1.1-.37-1.55-.77-.73-.66-1.13-1.63-1.18-2.61-.17.3-.3.6-.38.93-.66 2.53.48 5.23 2.73 6.5 1 .56 2.22.72 3.3.4-.64.25-1.34.3-2 .13-.67-.17-1.25-.56-1.66-1.12-.13-.17-.18-.4-.06-.57.12-.18.35-.23.53-.1.44.3 1 .43 1.54.4 1.36-.1 2.44-1.28 2.5-2.64.04-.92-.37-1.78-.97-2.4-.13-.13-.15-.35-.04-.5.1-.12.3-.15.44-.04 1.14.92 1.83 2.34 1.8 3.84a4.4 4.4 0 0 1-1.33 3.1c-.26.24-.54.45-.84.62.15.02.3.03.46.03 2.5 0 4.6-1.9 4.88-4.4.03-.3-.03-.6-.1-.9z'/></svg>");

const getPublicDomainUrl = (qrMode: 'dev' | 'public' = 'public', customOverride?: string) => {
  if (customOverride && customOverride.trim().length > 0) {
    let trimmed = customOverride.trim();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      trimmed = 'https://' + trimmed;
    }
    if (trimmed.endsWith('/')) {
      trimmed = trimmed.slice(0, -1);
    }
    return trimmed;
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';

  // 1. Prioritize parsing client-side window hostname if we are running in Google Cloud Run (.run.app)
  if (hostname && hostname.includes('.run.app')) {
    let region = 'us-east1';
    const runMatch = hostname.match(/\.([a-z0-9-]+)\.run\.app/);
    if (runMatch && runMatch[1]) {
      region = runMatch[1];
    }

    let projectId = '';
    let hash = '';
    const cleanHost = hostname.replace('-3000', '').split('.')[0];

    if (cleanHost.includes('ais-dev-')) {
      const rest = cleanHost.substring(cleanHost.indexOf('ais-dev-') + 8);
      const parts = rest.split('-');
      if (parts.length >= 2) {
        hash = parts[0];
        projectId = parts[1];
      }
    } else if (cleanHost.includes('ais-pre-')) {
      const rest = cleanHost.substring(cleanHost.indexOf('ais-pre-') + 8);
      const parts = rest.split('-');
      if (parts.length >= 2) {
        hash = parts[0];
        projectId = parts[1];
      }
    } else {
      const parts = cleanHost.split('-');
      if (parts.length >= 2) {
        projectId = parts[0];
        hash = parts[1];
      }
    }

    if (hash && projectId) {
      if (qrMode === 'public') {
        return `https://ais-pre-${hash}-${projectId}.${region}.run.app`;
      } else {
        return `https://ais-dev-${hash}-${projectId}.${region}.run.app`;
      }
    }
  }

  // 2. Fallback: check localStorage cached config if not on .run.app
  if (qrMode === 'public') {
    const cachedPublic = typeof window !== 'undefined' ? safeStorage.getItem('fire_inspect_public_url') : null;
    if (cachedPublic && cachedPublic.trim().length > 0 && !cachedPublic.includes('localhost') && !cachedPublic.includes('127.0.0.1')) {
      return cachedPublic;
    }
  } else {
    const cachedDev = typeof window !== 'undefined' ? safeStorage.getItem('fire_inspect_dev_url') : null;
    if (cachedDev && cachedDev.trim().length > 0 && !cachedDev.includes('localhost') && !cachedDev.includes('127.0.0.1')) {
      return cachedDev;
    }
  }

  // 3. Absolute fallbacks
  if (origin) {
    if (qrMode === 'public' && origin.includes('ais-dev-')) {
      return origin.replace('ais-dev-', 'ais-pre-');
    }
    if (qrMode === 'dev' && origin.includes('ais-pre-')) {
      return origin.replace('ais-pre-', 'ais-dev-');
    }
    return origin;
  }

  return "https://fire-inspect.local";
};


const buildContractorPublicUrl = (baseUrl: string, contractor: Partial<Contractor> & { id?: string } | null | undefined) => {
  const safeBase = (baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://fire-inspect.local')).replace(/\/$/, '');
  const id = encodeURIComponent(contractor?.id || 'unknown-contractor');
  const params = new URLSearchParams();
  if (contractor?.name) params.set('name', contractor.name);
  if (contractor?.licenseNumber) params.set('license', contractor.licenseNumber);
  if (contractor?.email) params.set('email', contractor.email);
  if (contractor?.phone) params.set('phone', contractor.phone);
  const query = params.toString();
  return `${safeBase}/contractor/${id}${query ? `?${query}` : ''}`;
};

const downloadVectorSVG = (reportId: string) => {
  const svgElement = document.getElementById("vector-qr-svg-" + reportId);
  if (!svgElement) {
    alert('Vector element not fully mounted. Please try again.');
    return;
  }
  const svgString = new XMLSerializer().serializeToString(svgElement);
  
  // 1. Standard Anchor Download Attempt (will succeed if not blocked by sandboxed iframe)
  try {
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    const downloadLink = document.createElement('a');
    downloadLink.href = svgUrl;
    downloadLink.download = "Official_Fire_Tag_" + reportId + ".svg";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  } catch (e) {
    console.error("Direct browser download was prevented:", e);
  }

  // 2. Open a direct New Tab popup containing the SVG and helper tools.
  // This completely bypasses the custom secure iframe sandbox, because of being a separate top-level page!
  try {
    const newWin = window.open();
    if (newWin) {
      const htmlContent = 
        '<!DOCTYPE html>' +
        '<html>' +
        '  <head>' +
        '    <title>Compliance Tag SVG Export - #' + reportId + '</title>' +
        '    <style>' +
        '      body {' +
        '        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;' +
        '        background-color: #0f172a;' +
        '        color: #f8fafc;' +
        '        display: flex;' +
        '        flex-direction: column;' +
        '        align-items: center;' +
        '        justify-content: center;' +
        '        min-height: 100vh;' +
        '        margin: 0;' +
        '        padding: 20px;' +
        '        box-sizing: border-box;' +
        '      }' +
        '      .card {' +
        '        background-color: #1e293b;' +
        '        border: 1px solid #334155;' +
        '        border-radius: 12px;' +
        '        padding: 28px;' +
        '        text-align: center;' +
        '        max-width: 480px;' +
        '        width: 100%;' +
        '        box-shadow: 0 15px 30px -5px rgba(0, 0, 0, 0.4);' +
        '      }' +
        '      h1 {' +
        '        font-size: 20px;' +
        '        font-weight: 800;' +
        '        margin-top: 0;' +
        '        margin-bottom: 8px;' +
        '        color: #10b981;' +
        '        text-transform: uppercase;' +
        '        letter-spacing: 0.05em;' +
        '      }' +
        '      p {' +
        '        font-size: 13.5px;' +
        '        color: #94a3b8;' +
        '        line-height: 1.5;' +
        '        margin-bottom: 24px;' +
        '      }' +
        '      .preview-box {' +
        '        background-color: #ffffff;' +
        '        padding: 20px;' +
        '        border-radius: 8px;' +
        '        display: inline-flex;' +
        '        align-items: center;' +
        '        justify-content: center;' +
        '        margin-bottom: 24px;' +
        '        box-shadow: inset 0 2px 4px rgba(0,0,0,0.06);' +
        '      }' +
        '      .preview-box svg {' +
        '        display: block;' +
        '        width: 300px;' +
        '        height: auto;' +
        '        max-height: 405px;' +
        '      }' +
        '      .actions {' +
        '        display: flex;' +
        '        gap: 12px;' +
        '        justify-content: center;' +
        '        flex-wrap: wrap;' +
        '      }' +
        '      .btn {' +
        '        padding: 10px 18px;' +
        '        border-radius: 6px;' +
        '        font-size: 13px;' +
        '        font-weight: 700;' +
        '        cursor: pointer;' +
        '        transition: all 0.15s ease;' +
        '        border: none;' +
        '        text-transform: uppercase;' +
        '        letter-spacing: 0.025em;' +
        '      }' +
        '      .btn-primary {' +
        '        background-color: #10b981;' +
        '        color: #ffffff;' +
        '      }' +
        '      .btn-primary:hover {' +
        '        background-color: #059669;' +
        '      }' +
        '      .btn-secondary {' +
        '        background-color: #334155;' +
        '        color: #f8fafc;' +
        '      }' +
        '      .btn-secondary:hover {' +
        '        background-color: #475569;' +
        '      }' +
        '    </style>' +
        '  </head>' +
        '  <body>' +
        '    <div class="card">' +
        '      <h1>Tag SVG Ready</h1>' +
        '      <p>Because your main portal is running inside a secure, sandboxed browser iframe, direct downloads can be blocked. Use the buttons below or right-click to download/save:</p>' +
        '      ' +
        '      <div class="preview-box">' +
        '        ' + svgString +
        '      </div>' +
        '      ' +
        '      <div class="actions">' +
        '        <button class="btn btn-primary" onclick="triggerDownload()">Save SVG File</button>' +
        '        <button class="btn btn-secondary" onclick="copySource()">Copy XML Code</button>' +
        '        <button class="btn btn-secondary" onclick="window.close()">Close</button>' +
        '      </div>' +
        '    </div>' +
        '    <script>' +
        '      function triggerDownload() {' +
        '        try {' +
        '          var sStr = ' + JSON.stringify(svgString) + ';' +
        '          var blob = new Blob([sStr], { type: "image/svg+xml;charset=utf-8" });' +
        '          var url = URL.createObjectURL(blob);' +
        '          var a = document.createElement("a");' +
        '          a.href = url;' +
        '          a.download = "Official_Fire_Tag_' + reportId + '.svg";' +
        '          document.body.appendChild(a);' +
        '          a.click();' +
        '          document.body.removeChild(a);' +
        '        } catch (err) {' +
        '          alert("Secure workspace limit: please right-click the QR and save image as SVG.");' +
        '        }' +
        '      }' +
        '      function copySource() {' +
        '        try {' +
        '          var sStr = ' + JSON.stringify(svgString) + ';' +
        '          navigator.clipboard.writeText(sStr).then(function() {' +
        '            alert("SVG XML Source Code copied to clipboard!");' +
        '          }).catch(function() {' +
        '            alert("Failed to copy automatically. Please select the SVG and copy.");' +
        '          });' +
        '        } catch(e) {' +
        '          alert("Copying failed. Please use modern browser clipboard permissions.");' +
        '        }' +
        '      }' +
        '    </' + 'script>' +
        '  </body>' +
        '</html>';
      
      newWin.document.write(htmlContent);
      newWin.document.close();
    } else {
      alert("Popup window was blocked by your browser settings. Please click 'Allow Popups' for this site or open the app in a new window!");
    }
  } catch (err) {
    console.error("Popup blocker or sandbox exception:", err);
    alert("This action was blocked by browser sandbox restrictions. Please open the app in a new tab directly (not inside the AI Studio frame) to download!");
  }
};

interface BureauPortalProps {
  user: UserInfo;
  properties: Property[];
  reports: InspectionReport[];
  contractors: Contractor[];
  inboundEmails?: any[];
  onApproveReport: (reportId: string, comments: string) => void;
  onRejectReport: (reportId: string, comments: string) => void;
  onAddProperty: (property: Omit<Property, 'id' | 'inspectionsCount'>) => void;
  onDeleteContractor?: (contractorId: string) => void;
  onDeleteReport?: (reportId: string) => void;
  onClearAllReports?: () => void;
  onLogout: () => void;
  onResetDatabase: () => void;
  onManualRefresh?: () => Promise<boolean>;
  onUpdateReports?: (updatedReports: InspectionReport[]) => void;
}

export default function BureauPortal({
  user,
  properties,
  reports,
  contractors,
  inboundEmails = [],
  onApproveReport,
  onRejectReport,
  onAddProperty,
  onDeleteContractor,
  onDeleteReport,
  onClearAllReports,
  onLogout,
  onResetDatabase,
  onManualRefresh,
  onUpdateReports
}: BureauPortalProps) {
  const [activeTab, setActiveTab ] = useState<string>('contractors');
  const [lightboxPhotoUrl, setLightboxPhotoUrl] = useState<string | null>(null);
  const [selectedReportForDocPreview, setSelectedReportForDocPreview] = useState<InspectionReport | null>(null);
  const [docPreviewTab, setDocPreviewTab ] = useState<'cert' | 'pdf'>('pdf');
  const [activeDocFileIndex, setActiveDocFileIndex ] = useState<number>(0);

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

  const handleOpenDocPreview = (report: InspectionReport) => {
    setSelectedReportForDocPreview(report);
    const files = getReportFiles(report);
    const hasRealFile = files.some(f => f.url && f.url.length > 5);
    setDocPreviewTab(hasRealFile ? 'pdf' : 'cert');
    setActiveDocFileIndex(0);
  };

  const [qrMode, setQrMode] = useState<'dev' | 'public'>('public');
  const [customDomain, setCustomDomain] = useState(() => safeStorage.getItem('fire_inspect_custom_domain') || '');
  
  // Real-time synchronization state feedback
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [justSynced, setJustSynced] = useState(false);

  // Helper to trigger safe download/viewing of a document in Bureau view
  const downloadDocFile = (file: { name: string; size: string; url?: string }, report?: InspectionReport) => {
    if (file.url) {
      const a = document.createElement('a');
      a.href = file.url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
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
      font-weight: 900;
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

  const handleRefreshClick = async () => {
    if (onManualRefresh) {
      setIsRefreshing(true);
      const ok = await onManualRefresh();
      setIsRefreshing(false);
      if (ok) {
        setJustSynced(true);
        setTimeout(() => setJustSynced(false), 2000);
      }
    }
  };
  
  // New Property Registration states
  const [isAddPropertyModalOpen, setIsAddPropertyModalOpen] = useState(false);
  const [newPropName, setNewPropName] = useState('');
  const [newPropAddress, setNewPropAddress] = useState('');
  const [newPropCity, setNewPropCity] = useState('Manahawkin');
  const [newPropZip, setNewPropZip] = useState('08050');
  const [newPropTemplate, setNewPropTemplate] = useState('NFPA 25 Sprinkler System');
  const [newPropStatus, setNewPropStatus] = useState<ProjectStatus>('Inspection');

  const [searchQuery, setSearchQuery] = useState('');
  const [contractorFilter, setContractorFilter] = useState('all');
  const [equipmentFilter, setEquipmentFilter] = useState('all');
  const [approvalFilter, setApprovalFilter] = useState('all'); // 'all', 'approved', 'pending'

  // Interactive calendar search & range filtering state parameters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);

  // Interactive map node focus and synchronized states
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [hoveredPropertyId, setHoveredPropertyId] = useState<string | null>(null);
  const [deletingContractorId, setDeletingContractorId] = useState<string | null>(null);
  const [isConfirmingClearAllReports, setIsConfirmingClearAllReports] = useState(false);
  const [isConfirmingDeleteReportId, setIsConfirmingDeleteReportId] = useState<string | null>(null);

  // Gmail Live Integration states
  const [gmailUser, setGmailUser] = useState<any>(null);
  const [gmailToken, setGmailToken] = useState<string | null>(null);
  const [gmailScanning, setGmailScanning] = useState(false);
  const [gmailScanStatus, setGmailScanStatus] = useState('');

  React.useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGmailUser(user);
        setGmailToken(token);
      },
      () => {
        setGmailUser(null);
        setGmailToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleGmailScan = async () => {
    if (!gmailToken) {
      alert('Please connect your Gmail account first.');
      return;
    }
    try {
      setGmailScanning(true);
      setGmailScanStatus('Initiating secure scanning of your live Gmail inbox...');
      
      const res = await fetch('/api/scan-gmail', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ accessToken: gmailToken })
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        setGmailScanStatus(`Scan Completed Successfully! Verified ${data.scannedCount} compliance emails; parsed and ingested ${data.ingestedCount} new reports into the safety records database.`);
      } else {
        setGmailScanStatus(`Gmail Integration Error: ${data.error || 'Unknown error occurred while scanning.'}`);
      }
    } catch (err: any) {
      console.error(err);
      setGmailScanStatus('Connection failure. Please verify server internet status.');
    } finally {
      setGmailScanning(false);
    }
  };

  const handleGmailConnect = async () => {
    try {
      setGmailScanStatus('Connecting safely via secure Firebase Google OAuth...');
      const result = await googleSignIn();
      if (result) {
        setGmailUser(result.user);
        setGmailToken(result.accessToken);
        setGmailScanStatus(`Success! Connected as ${result.user.email}. Ready for real-time compliance ingestion scans.`);
      }
    } catch (err: any) {
      console.error(err);
      setGmailScanStatus(`Authorization Refused: ${err.message || 'Verification terminated by user'}`);
    }
  };

  const handleGmailDisconnect = async () => {
    try {
      await firebaseLogout();
      setGmailUser(null);
      setGmailToken(null);
      setGmailScanStatus('Gmail service successfully disconnected.');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Email Ingestion Simulator states for Admin
  const [emailFrom, setEmailFrom] = useState('compliance@northfireprotection.com');
  const [emailTo, setEmailTo] = useState('lic-f-44120-c@ingest.municipalfire.org');
  const [emailPropertyId, setEmailPropertyId] = useState('');
  const [emailEquipment, setEmailEquipment] = useState('Fire Sprinkler');
  const [emailStatus, setEmailStatus] = useState('Passed');
  const [emailInspector, setEmailInspector] = useState('Sarah Thompson');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [emailSuccessMsg, setEmailSuccessMsg] = useState('');

  // Primary priming for properties list setup
  React.useEffect(() => {
    if (properties.length > 0 && !emailPropertyId) {
      setEmailPropertyId(properties[0].id);
    }
  }, [properties, emailPropertyId]);

  // Keep email preview draft perfectly in sync with selected selector metrics
  React.useEffect(() => {
    const prop = properties.find(p => p.id === emailPropertyId) || properties[0];
    if (!prop) return;
    
    const subjectLine = `${emailEquipment} Compliance Audit - ${prop.name} [${prop.id}]`;
    setEmailSubject(subjectLine);
    
    let templateBody = `INSPECTION AUDIT OF COMPLIANCE
======================================
Property: ${prop.name}
ID Code: [${prop.id}]
Address of Record: ${prop.address}, ${prop.city}
Contractor of Record: North Fire Protection
Inspector Name: ${emailInspector}

SYSTEM COMPLIANCE TEST:
Tested System Class: ${emailEquipment}
Date of Field Fieldwork: ${new Date().toISOString().split('T')[0]}
Declared Testing Status: ${emailStatus}

`;

    if (emailStatus === 'Passed with Deficiencies') {
      templateBody += `DEFICIENCIES REPORTED:
- Pressure gauge on main supply riser exhibits wear; requires replacement.
- Low water alarm tamper switch is loose.

Notes:
Minor adjustments needed. Main sprinkler bypass is fully operational. System cleared for secondary inspection within 30 days.`;
    } else if (emailStatus === 'Failed (Overdue Reinspect)') {
      templateBody += `DEFICIENCIES REPORTED (CRITICAL FAIL):
- MAIN CONTROL VALVE AND STEM ARE SEIZED SHUT; WATER CANNOT FLOW.
- BACKUP CLARIFIER PIPELINE EXPOSED TO UNPROTECTED DEBRIS.

Notes:
CRITICAL LIFE SAFETY VIOLATION. THE SYSTEMS ARE COMPROMISED. DO NOT CERTIFY. RE-INSPECT IMMEDIATELY ON PARTS SWAP.`;
    } else if (emailStatus === 'Incomplete') {
      templateBody += `DEFICIENCIES REPORTED:
- Access to riser room locked; building supervisor unavailable.

Notes:
Incomplete inspection due to key lack. Please reschedule for code clearing.`;
    } else {
      templateBody += `DEFICIENCIES REPORTED:
None. All components clean and operational.

Notes:
Riser tested under standard hydrostatic pressure. Backflow certified compliant with local directives. Highly responsive valves.`;
    }
    
    setEmailBody(templateBody);
  }, [emailPropertyId, emailEquipment, emailStatus, emailInspector, properties]);

  const handleSelectProperty = (prop: Property) => {
    setSelectedProperty(prop);
    const el = document.getElementById(`property-card-${prop.id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const handleRecenterMap = () => {
    setSelectedProperty(null);
  };

  const handleAddPropertySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPropName.trim() || !newPropAddress.trim()) {
      alert("Please provide a name and street address.");
      return;
    }

    // Generate random coordinates inside the Manahawkin bounding box
    // Lat bounds: 39.680 to 39.720, Lng bounds: -74.310 to -74.200 (center: ~39.70 lat, -74.26 lng)
    const randomLat = 39.695 + (Math.random() * 2 - 1) * 0.012;
    const randomLng = -74.262 + (Math.random() * 2 - 1) * 0.025;

    onAddProperty({
      name: newPropName.trim(),
      address: newPropAddress.trim(),
      city: newPropCity.trim(),
      zip: newPropZip.trim(),
      lat: randomLat,
      lng: randomLng,
      template: newPropTemplate,
      lastInspectionDate: new Date().toISOString().split('T')[0],
      nextInspectionDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: newPropStatus,
    });

    // Reset states
    setNewPropName('');
    setNewPropAddress('');
    setNewPropCity('Manahawkin');
    setNewPropZip('08050');
    setNewPropTemplate('NFPA 25 Sprinkler System');
    setNewPropStatus('Inspection');
    
    setIsAddPropertyModalOpen(false);
  };

  // Unique QR Code scanning simulation states
  const [showLiveWebcamScanner, setShowLiveWebcamScanner] = useState(false);
  const [scanningContractor, setScanningContractor] = useState<Contractor | null>(null);
  const [isScanningActive, setIsScanningActive] = useState(false);
  const [scanStatusMsg, setScanStatusMsg] = useState('');
  const [scannedContractorResult, setScannedContractorResult] = useState<Contractor | null>(null);

  const handleLiveQRScanSuccess = (decodedText: string) => {
    setShowLiveWebcamScanner(false);
    try {
      let verifyId = '';
      let contractorId = '';

      const verifyQueryMatch = decodedText.match(/[?&]verify=([^&?#]+)/);
      const contractorQueryMatch = decodedText.match(/[?&]contractor=([^&?#]+)/);
      const verifyPathMatch = decodedText.match(/\/verify\/([^/?#&]+)/);
      const contractorPathMatch = decodedText.match(/\/contractor\/([^/?#&]+)/);

      if (verifyQueryMatch && verifyQueryMatch[1]) {
        verifyId = decodeURIComponent(verifyQueryMatch[1]);
      } else if (verifyPathMatch && verifyPathMatch[1]) {
        verifyId = decodeURIComponent(verifyPathMatch[1]);
      } else if (contractorQueryMatch && contractorQueryMatch[1]) {
        contractorId = decodeURIComponent(contractorQueryMatch[1]);
      } else if (contractorPathMatch && contractorPathMatch[1]) {
        contractorId = decodeURIComponent(contractorPathMatch[1]);
      } else {
        if (decodedText.startsWith('rep-') || decodedText.startsWith('report-')) {
          verifyId = decodedText;
        } else if (decodedText.startsWith('con-') || decodedText.startsWith('contractor-')) {
          contractorId = decodedText;
        }
      }

      if (verifyId) {
        const foundRep = reports.find(r => r.id === verifyId);
        if (foundRep) {
          setScannedResult(foundRep);
        } else {
          alert(`Scanned dynamic QR compliance badge ID: "${verifyId}" but it does not exist under your current local storage or Cloud databases.`);
        }
      } else if (contractorId) {
        const foundCon = contractors.find(c => c.id === contractorId);
        if (foundCon) {
          setScannedContractorResult(foundCon);
        } else {
          alert(`Scanned active contractor badge ID: "${contractorId}" but it is not matched against live municipal contractor keys.`);
        }
      } else {
        alert(`Decoded compliance content: "${decodedText}".`);
      }
    } catch (e) {
      console.error('Error parsing live QR code data stream:', e);
      alert(`Scanned tag target: "${decodedText}"`);
    }
  };

  const triggerScanSimulator = (con: Contractor) => {
    setScanningContractor(con);
    setIsScanningActive(true);
    setScanStatusMsg('ACCESSING CRITICAL SECURITY API VIEWPORT...');
    
    setTimeout(() => {
      setScanStatusMsg('ALIGNING OPTICAL LASER WITH LICENSED ID BADGE...');
    }, 500);

    setTimeout(() => {
      setScanStatusMsg('DECODING SECURE CREDENTIAL HASH: ' + con.licenseNumber + '...');
    }, 1100);

    setTimeout(() => {
      setScanStatusMsg('✔ DECODED: ' + con.name.toUpperCase() + ' (REPORTS SYNCED)');
    }, 1800);

    setTimeout(() => {
      // Reset scanning states
      setIsScanningActive(false);
      setScanningContractor(null);
      setScannedContractorResult(con);
    }, 2400);
  };

  // Selected report in detail sidebar
  const [selectedReportId, setSelectedReportId] = useState<string | null>(reports[0]?.id || null);
  const [bureauCommentsInput, setBureauCommentsInput] = useState('');

  // QR Tag Generator States
  const [selectedReportIdForQR, setSelectedReportIdForQR] = useState<string>(reports[0]?.id || '');
  const [isPrintingSticker, setIsPrintingSticker] = useState(false);
  const [stickerColor, setStickerColor] = useState<'green' | 'red' | 'yellow'>('green');
  const [showPrintToast, setShowPrintToast] = useState(false);
  const [qrFgColor, setQrFgColor] = useState('#0f172a');
  const [qrBgColor, setQrBgColor] = useState('#ffffff');
  const [qrShowLogo, setQrShowLogo] = useState(true);
  const [qrShapeRound, setQrShapeRound] = useState(false);
  const [qrStyleType, setQrStyleType] = useState<'industrial' | 'classic' | 'modern'>('industrial');
  
  // QR Scanner Simulation States
  const [selectedStickerToScan, setSelectedStickerToScan] = useState<string>('');
  const [scannerActive, setScannerActive] = useState(false);
  const [scannedResult, setScannedResult] = useState<InspectionReport | null>(null);
  const [scanningStatus, setScanningStatus] = useState<string>('');

  // Selected Report item
  const selectedReport = reports.find(r => r.id === selectedReportId) || reports[0];

  // Calculations for KPI metric cards
  const totalSubmittals = reports.length;
  const pendingApprovalsCount = reports.filter(r => !r.bureauApproved).length;
  const totalPropertiesCount = properties.length;
  const criticalDeficienciesCount = properties.filter(
    p => p.status === 'Overdue' || p.status === 'Overdue Reinspect'
  ).length;

  // Filtered reports list
  const filteredReports = reports.filter((rep) => {
    const matchesUserQuery = rep.propertyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            rep.inspectorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            rep.propertyAddress.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesContractor = contractorFilter === 'all' || rep.contractorId === contractorFilter;
    const matchesEquipment = equipmentFilter === 'all' || rep.equipmentType === equipmentFilter;
    
    let matchesApproval = true;
    if (approvalFilter === 'approved') matchesApproval = rep.bureauApproved;
    if (approvalFilter === 'pending') matchesApproval = !rep.bureauApproved;

    // Date range / selected calendar date filters
    let matchesCalendarDate = true;
    if (selectedCalendarDate) {
      matchesCalendarDate = rep.date === selectedCalendarDate;
    }
    let matchesDateRange = true;
    if (startDate) {
      matchesDateRange = matchesDateRange && rep.date >= startDate;
    }
    if (endDate) {
      matchesDateRange = matchesDateRange && rep.date <= endDate;
    }

    return matchesUserQuery && matchesContractor && matchesEquipment && matchesApproval && matchesCalendarDate && matchesDateRange;
  });

  const handleSelectReport = (id: string) => {
    setSelectedReportId(id);
    const target = reports.find(r => r.id === id);
    if (target) {
      setBureauCommentsInput(target.bureauComments || '');
    }
  };

  const handleApproveSubmittal = () => {
    if (!selectedReport) return;
    onApproveReport(selectedReport.id, bureauCommentsInput);
    setBureauCommentsInput('');
  };

  const handleRejectSubmittal = () => {
    if (!selectedReport) return;
    onRejectReport(selectedReport.id, bureauCommentsInput);
    setBureauCommentsInput('');
  };

  const statusColors: Record<InspectionReport['status'], { text: string; bg: string }> = {
    'Passed': { text: 'text-emerald-400', bg: 'bg-emerald-950/45' },
    'Passed with Deficiencies': { text: 'text-amber-400', bg: 'bg-amber-950/45' },
    'Failed (Overdue Reinspect)': { text: 'text-rose-400', bg: 'bg-rose-955/45' },
    'Incomplete': { text: 'text-sky-400', bg: 'bg-sky-950/45' },
  };

  return (
    <div className="h-screen bg-[#f1f5f9] flex overflow-hidden text-[#1e293b] select-none">
      
      {/* Slim vertical left sidebar */}
      <SidebarRail
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onRefreshClick={onResetDatabase}
        onRecenterMap={handleRecenterMap}
        onLogoutClick={onLogout}
        role="bureau"
      />

      {/* Main split-view dashboard workspace */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Top Bureau control strip */}
        <header className="px-6 py-3 bg-white border-b border-[#cbd5e1] flex flex-wrap gap-4 justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <Logo variant="horizontal" size="custom" customHeight="32px" className="shrink-0" />
            <div className="h-6 w-[1px] bg-slate-200 hidden xs:block" />
            <div className="hidden xs:block">
              <span className="text-[9px] text-[#dc2626] font-mono tracking-widest uppercase block font-bold leading-none">Prevention Authority</span>
              <h1 className="text-xs font-black tracking-tight text-[#0f172a] uppercase mt-0.5 font-sans">
                Inspector Workbench
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <span className="text-xs text-[#0f172a] block font-bold">{user.name}</span>
              <span className="text-[10px] text-slate-400 font-mono block font-bold uppercase">Prevention Lead Admin</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-[#cbd5e1] flex items-center justify-center text-slate-800 text-xs font-mono font-bold select-none">
              FD
            </div>
            <button 
              onClick={handleRefreshClick}
              disabled={isRefreshing}
              className={`py-1.5 px-3 rounded transition flex items-center gap-1.5 border font-extrabold text-[11px] uppercase tracking-wider cursor-pointer select-none ${
                justSynced 
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700 font-extrabold'
                  : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-750'
              }`}
              title="Manually Sync Live Database"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Syncing...' : justSynced ? 'Database Synced!' : 'Sync & Refresh'}
            </button>
            <button 
              onClick={() => setShowLiveWebcamScanner(true)}
              className="py-1.5 px-3 bg-slate-900 hover:bg-black text-white font-extrabold text-[11px] rounded transition flex items-center gap-1.5 border border-slate-900 cursor-pointer uppercase tracking-wider shadow-sm"
              title="Launch webcam camera or photograph search"
            >
              <Camera className="w-3.5 h-3.5 text-emerald-400 animate-pulse" /> Decal Scanner
            </button>
            <button 
              onClick={onLogout}
              className="py-1.5 px-3 bg-red-50 hover:bg-red-100 text-[#dc2626] font-extrabold text-[11px] rounded transition flex items-center gap-1.5 border border-[#dc2626]/20 cursor-pointer uppercase tracking-wider"
              title="Return to Main Page"
            >
              <LogOut className="w-3.5 h-3.5" /> Return to Main Page
            </button>
          </div>
        </header>

        {/* Dynamic sub tab workspace views */}
        {activeTab === 'overview' || activeTab === 'reports' || activeTab === 'calendar' ? (
          /* Primary Submittals Audit Overview Tab */
          <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden text-[#1e293b]">
            
            {/* List and Statistics Area (Left / Middle) */}
            <div className="flex-1 flex flex-col bg-slate-50 overflow-y-auto">
              
              {activeTab === 'calendar' ? (
                /* Interactive Inspections Calendar Workspace Pane */
                <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden bg-white">
                  
                  {/* Calendar controller column */}
                  <div className="w-full lg:w-[380px] border-r border-slate-200 bg-slate-50 flex flex-col p-5 shrink-0 overflow-y-auto">
                    <div className="pb-4 mb-4 border-b border-slate-200 select-none">
                      <h4 className="text-sm font-extrabold text-[#0f172a] uppercase tracking-tight flex items-center gap-2">
                        <CalendarIcon className="w-5 h-5 text-[#dc2626]" /> Scheduled Audits Calendar
                      </h4>
                      <p className="text-[10.5px] text-slate-500 font-mono mt-1">
                        Select a date with highlighted submittals or configure a date range below to query NFPA records.
                      </p>
                    </div>

                    <CalendarWidget
                      startDate={startDate}
                      setStartDate={setStartDate}
                      endDate={endDate}
                      setEndDate={setEndDate}
                      properties={properties}
                      onSelectDate={(date) => {
                        setSelectedCalendarDate(date);
                      }}
                      selectedDate={selectedCalendarDate}
                    />

                    {selectedCalendarDate && (
                      <div className="mt-4 p-3.5 bg-red-50/70 border border-red-200 text-rose-800 rounded font-mono text-[10.5px] relative">
                        <span className="font-extrabold uppercase block text-[8px] text-slate-450 mb-0.5">Active Focus Date:</span>
                        📅 Focus date: <strong className="font-extrabold text-rose-900">{selectedCalendarDate}</strong>
                        <button 
                          onClick={() => setSelectedCalendarDate(null)}
                          className="absolute top-2.5 right-2 text-rose-600 hover:text-rose-800 font-black text-[10px] cursor-pointer"
                        >
                          Clear Date
                        </button>
                      </div>
                    )}

                    {(startDate || endDate) && (
                      <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded font-mono text-[10.5px] text-slate-650 flex justify-between items-center">
                        <div>
                          <span className="text-[8px] uppercase block text-slate-400 font-extrabold">Active Range Filter:</span>
                          <span className="font-bold">{startDate || 'Any'}</span> → <span className="font-bold">{endDate || 'Any'}</span>
                        </div>
                        <button
                          onClick={() => {
                            setStartDate('');
                            setEndDate('');
                          }}
                          className="text-[10px] text-red-650 hover:text-red-800 font-bold underline cursor-pointer"
                        >
                          Reset
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Filtered reports in side column */}
                  <div className="flex-1 flex flex-col bg-white overflow-hidden min-h-0">
                    <div className="p-4 bg-slate-100 border-b border-slate-200 shrink-0 select-none flex justify-between items-center">
                      <div>
                        <span className="text-[9px] font-mono text-slate-400 font-bold uppercase tracking-wider block">Inspections Compliance list</span>
                        <h4 className="text-xs font-extrabold text-[#0f172a] uppercase tracking-tight mt-0.5">
                          Matching audit reports: ({filteredReports.length})
                        </h4>
                      </div>
                      
                      {(selectedCalendarDate || startDate || endDate) && (
                        <button
                          onClick={() => {
                            setSelectedCalendarDate(null);
                            setStartDate('');
                            setEndDate('');
                          }}
                          className="py-1 px-2.5 bg-slate-200 hover:bg-slate-300 text-[10px] font-black uppercase text-slate-705 rounded border border-slate-300 cursor-pointer transition"
                        >
                          Reset Dates
                        </button>
                      )}
                    </div>

                    <div className="flex-grow overflow-y-auto p-4 space-y-3 bg-slate-50/40">
                      {filteredReports.length === 0 ? (
                        <div className="p-12 text-center bg-white border border-slate-200 rounded-lg">
                          <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                          <h4 className="text-xs font-bold text-slate-700 uppercase font-mono">No reports found for date selection</h4>
                          <p className="text-[11px] text-slate-400 font-sans mt-1">Try selecting a date with a compliance indicator dot or widen your range filter.</p>
                        </div>
                      ) : (
                        filteredReports.map((rep) => {
                          const isRepSelected = selectedReportId === rep.id;
                          return (
                            <div
                              key={rep.id}
                              onClick={() => handleSelectReport(rep.id)}
                              className={`p-3.5 border rounded-lg shadow-xs transition-all duration-200 cursor-pointer relative ${
                                isRepSelected 
                                  ? 'border-[#dc2626] ring-1 ring-[#dc2626] bg-red-50/15'
                                  : 'border-slate-200 bg-white hover:border-slate-350 hover:shadow-xs'
                              }`}
                            >
                              <div className="flex justify-between items-start gap-2">
                                <div className="min-w-0 pr-2">
                                  <h5 className="text-[12px] font-black text-slate-900 uppercase tracking-tight font-sans truncate">
                                    {rep.propertyName}
                                  </h5>
                                  <p className="text-[10px] text-slate-450 font-mono mt-0.5 pointer-events-none truncate">
                                    📅 {rep.date} • {rep.equipmentType}
                                  </p>
                                </div>
                                <span className={`px-2 py-0.5 rounded text-[8.5px] font-mono font-bold uppercase tracking-wider shrink-0 ${
                                  rep.bureauApproved 
                                    ? 'bg-emerald-100 text-emerald-800' 
                                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                                }`}>
                                  {rep.bureauApproved ? 'Certified Approved' : 'Requires Review'}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                </div>
              ) : (
                /* Original KPIs & Search Filtered submittals list */
                <>
                  {/* Bureau KPIs Cards Strip */}
                  <div className="p-5 grid grid-cols-2 lg:grid-cols-4 gap-4 bg-white border-b border-slate-200 shrink-0">
                    {/* Pending action approvals (Amber) */}
                    <div className="bg-white border-2 border-amber-500 rounded p-3.5 flex justify-between items-start shadow-sm">
                      <div>
                        <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block font-bold">Pending Review</span>
                        <span className="text-2xl font-black font-mono tracking-tight text-amber-650 mt-1 block">
                          {pendingApprovalsCount}
                        </span>
                      </div>
                      <div className="p-2 bg-slate-100 rounded text-[#e11d48]">
                        <RefreshCw className="w-4 h-4 animate-spin-slow" />
                      </div>
                    </div>

                    {/* Critical reported safety deficiencies (Red) */}
                    <div className="bg-white border-2 border-[#dc2626] rounded p-3.5 flex justify-between items-start shadow-sm">
                      <div>
                        <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block font-bold">Unresolved Deficiencies</span>
                        <span className="text-2xl font-black font-mono tracking-tight text-[#dc2626] mt-1 block">
                          {criticalDeficienciesCount}
                        </span>
                      </div>
                      <div className="p-2 bg-slate-100 rounded text-[#dc2626]">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                    </div>

                    {/* Total registered properties monitored (Blue) */}
                    <div className="bg-white border border-[#cbd5e1] rounded p-3.5 flex justify-between items-start shadow-sm">
                      <div>
                        <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block font-bold">Buildings Monitored</span>
                        <span className="text-2xl font-black font-mono tracking-tight text-blue-700 mt-1 block">
                          {totalPropertiesCount}
                        </span>
                      </div>
                      <div className="p-2 bg-slate-100 rounded text-blue-600">
                        <Building2 className="w-4 h-4" />
                      </div>
                    </div>

                    {/* Over total certification count */}
                    <div className="bg-white border border-[#cbd5e1] rounded p-3.5 flex justify-between items-start shadow-sm">
                      <div>
                        <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block font-bold">Total Submittals</span>
                        <span className="text-2xl font-black font-mono tracking-tight text-slate-800 mt-1 block">
                          {totalSubmittals}
                        </span>
                      </div>
                      <div className="p-2 bg-slate-100 rounded text-slate-500">
                        <FileText className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  {/* Submittals list Filtering controls block */}
                  <div className="p-4 bg-slate-100 border-b border-slate-200 flex flex-wrap gap-3 items-center shrink-0">
                    
                    {/* Text search query */}
                    <div className="relative flex-1 min-w-[200px]">
                      <input
                        id="bureau-search-input"
                        type="text"
                        placeholder="Search submittals by building or inspector..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white border border-[#cbd5e1] rounded pl-8 pr-3 py-1.5 text-xs text-[#1e293b] placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#dc2626] focus:border-[#dc2626] font-sans font-bold"
                      />
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    </div>

                    <div className="flex flex-wrap gap-2.5 items-center">
                      
                      {/* Filter by Agency */}
                      <div className="flex items-center gap-1 bg-white border border-[#cbd5e1] px-2.5 py-1 rounded text-xs text-[#1e293b] font-bold">
                        <SlidersHorizontal className="w-3 h-3 text-slate-500" />
                        <select
                          id="bureau-contractor-select"
                          value={contractorFilter}
                          onChange={(e) => setContractorFilter(e.target.value)}
                          className="bg-transparent text-[11px] outline-none border-none py-0.5 font-bold cursor-pointer"
                        >
                          <option value="all" className="text-[#101827]">All Licensed Contractors</option>
                          {contractors.map(c => (
                            <option key={c.id} value={c.id} className="text-[#101827]">{c.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Filter by System Equipment Type */}
                      <select
                        id="bureau-equipment-select"
                        value={equipmentFilter}
                        onChange={(e) => setEquipmentFilter(e.target.value)}
                        className="bg-white border border-[#cbd5e1] rounded px-2.5 py-1.5 text-[11px] outline-none text-[#1e293b] font-bold cursor-pointer focus:ring-1 focus:ring-[#dc2626] focus:border-[#dc2626]"
                      >
                        <option value="all">All Systems</option>
                        <option value="Fire Sprinkler">Sprinkler (NFPA 25/13)</option>
                        <option value="Fire Alarm">Fire Alarm (NFPA 72)</option>
                        <option value="Kitchen Suppression">Kitchen Hood (NFPA 96)</option>
                        <option value="Extinguishers">Extinguishers (NFPA 10)</option>
                        <option value="Fire Hydrants">Hydrants (NFPA 291)</option>
                        <option value="Backflow Assembly">Backflow Assembly</option>
                      </select>

                      {/* Action approval state filter */}
                      <select
                        id="bureau-approval-select"
                        value={approvalFilter}
                        onChange={(e) => setApprovalFilter(e.target.value)}
                        className="bg-white border border-[#cbd5e1] rounded px-2.5 py-1.5 text-[11px] outline-none text-[#1e293b] font-bold cursor-pointer focus:ring-1 focus:ring-[#dc2626] focus:border-[#dc2626]"
                      >
                        <option value="all">All Actions</option>
                        <option value="pending">Review Needed</option>
                        <option value="approved">Approved Logs</option>
                      </select>

                    </div>
                  </div>

                  {/* Submittals Listing List */}
                  <div className="flex-1 divide-y divide-slate-200 p-0 bg-slate-50">
                    <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-white select-none">
                      <span className="text-[10px] uppercase font-mono tracking-widest text-[#556980] font-extrabold">
                        matching compliance logs: {filteredReports.length} records found
                      </span>
                      {reports.length > 0 && onClearAllReports && (
                        <div>
                          {isConfirmingClearAllReports ? (
                            <div className="flex items-center gap-1.5 bg-rose-50 border border-red-200 px-2 py-1 rounded-lg text-[10px] font-sans">
                              <span className="text-red-650 font-extrabold whitespace-nowrap">Purge all logs?</span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    onClearAllReports();
                                    setSelectedReportId(null);
                                    setIsConfirmingClearAllReports(false);
                                  }}
                                  className="px-2 py-0.5 bg-red-650 hover:bg-red-700 text-white rounded text-[9px] font-bold uppercase transition duration-150 cursor-pointer"
                                >
                                  Yes, Clear
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setIsConfirmingClearAllReports(false)}
                                  className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[9px] font-bold uppercase transition duration-150 cursor-pointer"
                                >
                                  No
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setIsConfirmingClearAllReports(true)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded bg-rose-50 hover:bg-rose-100 text-red-600 hover:text-red-700 font-extrabold text-[10px] uppercase border border-rose-200/50 transition cursor-pointer"
                              title="Purge all system submittal records"
                            >
                              <Trash2 className="w-3 h-3 text-red-600" />
                              <span>Clear All Reports</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {filteredReports.length === 0 ? (
                      <div className="p-12 text-center text-xs text-slate-500 font-mono font-bold select-none uppercase">
                        No matching submittal records meet the selected filters.
                      </div>
                    ) : (
                      filteredReports.map((rep) => {
                        const isSelected = selectedReportId === rep.id;
                        const cColors = statusColors[rep.status] || { text: 'text-slate-700', bg: 'bg-slate-100' };

                        return (
                          <div
                            key={rep.id}
                            id={`bureau-report-item-${rep.id}`}
                            onClick={() => handleSelectReport(rep.id)}
                            className={`p-4 transition duration-155 cursor-pointer flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 ${
                              isSelected 
                                ? 'bg-slate-200 text-[#0f172a]' 
                                : 'bg-white hover:bg-slate-50'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider">
                                  Submittal ID: {rep.id}
                                </span>
                                <span className="text-slate-300 select-none">•</span>
                                <span className="text-[10px] text-[#556980] font-mono font-bold">
                                  Published {new Date(rep.date).toLocaleDateString()}
                                </span>
                              </div>

                              <h3 className="text-sm font-extrabold tracking-tight text-[#0f172a] uppercase mt-1 truncate font-sans">
                                {rep.propertyName}
                              </h3>

                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#556980] mt-1 font-mono">
                                <span className="flex items-center gap-1 font-semibold">
                                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                  {rep.contractorName}
                                </span>
                                <span className="text-slate-300">|</span>
                                <span className="flex items-center gap-1 font-semibold">
                                  <User className="w-3.5 h-3.5 text-slate-400" />
                                  Inspector: {rep.inspectorName}
                                </span>
                              </div>
                            </div>

                            {/* Status elements (Status and Approval badge) */}
                            <div className="flex sm:flex-col items-end gap-2 shrink-0 select-none w-full sm:w-auto justify-between sm:justify-start">
                              <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${cColors.bg} ${cColors.text}`}>
                                {rep.status}
                              </span>

                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${
                                rep.bureauApproved
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  : 'bg-amber-100 text-amber-850 border-amber-300 animate-pulse'
                              }`}>
                                {rep.bureauApproved ? 'Approved ✔' : 'Awaiting Review ⏳'}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              )}

            </div>

            {/* Split Bureau Audit workbench (Right side panel - 450px wide) */}
            <div className="w-full md:w-[480px] bg-white border-t md:border-t-0 md:border-l border-slate-200 flex flex-col shrink-0 h-full overflow-hidden">
              
              {selectedReport ? (
                /* Report content and audit panel */
                <div className="flex-1 flex flex-col h-full min-h-0">
                  
                  {/* Audit Panel Header */}
                  <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center shrink-0 select-none">
                    <span className="text-xs font-black font-sans text-[#dc2626] uppercase tracking-widest flex items-center gap-1">
                      <FileCheck className="w-4 h-4" /> COMPLIANCE REVIEW CONSOLE
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 font-bold">
                      SYSREF: PROPACT-{selectedReport.id}
                    </span>
                  </div>

                  {/* Complete Document Area (styled as an official County PDF printable submittal) */}
                  <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-white">
                    
                    {/* Official Document Seal Header */}
                    <div className="border border-slate-200 bg-slate-50 rounded p-4.5 space-y-3.5 relative">
                      <div className="absolute top-4 right-4 pointer-events-none opacity-5">
                        <Flame className="w-16 h-16 text-rose-500" />
                      </div>
                      
                      <div className="text-center pb-3.5 border-b border-slate-200">
                        <h4 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Inspection Compliance Report</h4>
                      </div>

                      <div className="grid grid-cols-2 gap-y-3 text-[11px] font-mono text-slate-600">
                        <div>
                          <span className="text-slate-400 block uppercase text-[9px] font-bold">Audited Property:</span>
                          <span className="text-slate-800 block font-bold truncate text-[11px] font-sans">{selectedReport.propertyName}</span>
                          <span className="text-slate-500 block text-[9px] leading-none mt-0.5">{selectedReport.propertyAddress}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block uppercase text-[9px] font-bold">Inspection Date:</span>
                          <span className="text-slate-800 block font-bold">{selectedReport.date}</span>
                        </div>
                        <div className="mt-1">
                          <span className="text-slate-400 block uppercase text-[9px] font-bold">Licensed Contractor:</span>
                          <span className="text-[#dc2626] block font-sans font-bold">{selectedReport.contractorName}</span>
                          <span className="text-slate-400 text-[9px] font-bold">ID: {selectedReport.contractorId}</span>
                        </div>
                        <div className="mt-1">
                          <span className="text-slate-400 block uppercase text-[9px] font-bold">Field Inspector:</span>
                          <span className="text-slate-800 block font-sans font-bold">{selectedReport.inspectorName}</span>
                        </div>
                      </div>
                    </div>

                    {/* Equipment system type and status segment */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 border border-slate-200 rounded p-3">
                        <span className="text-[9px] text-slate-400 font-mono block uppercase font-bold">Inspected System:</span>
                        <span className="text-xs font-black text-slate-705 block font-sans mt-0.5">{selectedReport.equipmentType}</span>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded p-3">
                        <span className="text-[9px] text-slate-400 font-mono block uppercase font-bold">Contractor Assessment:</span>
                        <span className={`text-xs font-black block mt-0.5 ${
                          statusColors[selectedReport.status]?.text || 'text-slate-700'
                        }`}>{selectedReport.status}</span>
                      </div>
                    </div>

                    {/* View Certificate Sheet Action */}
                    <button
                      type="button"
                      onClick={() => {
                        handleOpenDocPreview(selectedReport);
                      }}
                      className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs uppercase transition tracking-wider flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      👁️ View Certified Compliance Sheet
                    </button>
                    
                    {/* Attachment Certificate Details */}
                    <div className="bg-slate-50 border border-slate-200 rounded p-3 text-left space-y-2">
                      <span className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider block">
                        Included Compliance Attachments ({(selectedReport.fileName || '').split(', ').length}):
                      </span>
                      
                      <div className="space-y-2">
                        {getReportFiles(selectedReport).map((matchedFile, idx) => (
                          <div 
                            key={idx}
                            onClick={() => {
                              downloadDocFile(matchedFile, selectedReport);
                            }}
                            className="bg-white hover:bg-emerald-50/40 border border-slate-200 hover:border-emerald-300 rounded p-2.5 flex items-center justify-between transition cursor-pointer select-none group"
                            title="Click to view and download this compliance document payload"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="bg-blue-50 text-blue-600 p-1.5 rounded group-hover:bg-[#dc2626] group-hover:text-white transition shrink-0">
                                <FileSpreadsheet className="w-4 h-4" />
                              </div>
                              <div className="min-w-0 font-sans leading-none">
                                <span className="text-xs font-bold text-slate-700 block truncate max-w-[210px] sm:max-w-md group-hover:text-slate-900">
                                  {matchedFile.name}
                                </span>
                                <span className="text-[9px] text-[#dc2626] block font-mono font-bold mt-1 group-hover:underline">📄 Click to View / Open Stream</span>
                              </div>
                            </div>
                            <span className="text-[8px] font-mono font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-250 shrink-0">
                              VERIFIED ✔
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Reported Deficiencies / Code Violations block */}
                    <div>
                      <span className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider block mb-1.5">
                        Reported Deficiencies ({selectedReport.deficiencies.length})
                      </span>
                      {selectedReport.deficiencies.length === 0 ? (
                        <div className="p-3 text-center text-xs text-emerald-800 bg-emerald-50 border border-emerald-250 rounded font-mono font-bold">
                          ✔ No regulatory deficiencies registered in submittal.
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {selectedReport.deficiencies.map((def, idx) => (
                            <div key={idx} className="p-2.5 text-xs font-mono text-red-800 border border-red-200 bg-red-50 rounded flex items-start gap-1.5 font-bold">
                              <span className="select-none">⚠️</span>
                              <span>{def}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Submitted Validation Photos */}
                    <div>
                      <span className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider block mb-1.5">
                        Submitted On-Site Photos Proof ({selectedReport.photos?.length || 0})
                      </span>
                      <div className="grid grid-cols-1 gap-2">
                        {selectedReport.photos && selectedReport.photos.length > 0 ? (
                          <div className="grid grid-cols-3 gap-2">
                            {selectedReport.photos.map((url, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => setLightboxPhotoUrl(url)}
                                className="relative group rounded border border-slate-200 overflow-hidden bg-slate-100 h-14 w-full cursor-zoom-in hover:border-[#dc2626] transition select-none"
                                title="Zoom In Validation Graphic"
                              >
                                <img 
                                  src={url} 
                                  alt="Inspection snap" 
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                                  <span className="text-[9px] text-white font-bold bg-black/55 px-1 py-0.5 rounded uppercase">
                                    View
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="py-3 px-2 text-center rounded border border-dashed border-slate-200 bg-slate-50 text-[9px] text-slate-450 leading-normal font-sans">
                            No validation photos attached to this file submittal.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Inspector general notes */}
                    <div>
                      <span className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider block mb-1.5">
                        Inspector Notes / Flow Readings
                      </span>
                      <p className="p-3.5 border border-slate-200 bg-slate-50 text-xs text-slate-600 leading-relaxed rounded font-sans whitespace-pre-wrap font-bold">
                        {selectedReport.notes || 'No specific inspector notes submitted for this assessment.'}
                      </p>
                    </div>

                    {/* Official comments from the Bureau */}
                    {selectedReport.bureauComments && (
                      <div className="p-3.5 border border-amber-300 bg-amber-50 rounded space-y-1">
                        <span className="text-[9px] text-amber-800 font-mono uppercase font-bold tracking-wider block">Bureau Inspector Comments:</span>
                        <p className="text-xs text-amber-900 italic font-bold font-sans">
                          "{selectedReport.bureauComments}"
                        </p>
                      </div>
                    )}

                  </div>

                  {/* Administrative Audit Action Workbench */}
                  <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3 shrink-0">
                    <div>
                      <label htmlFor="bureau-comments-input" className="block text-[10px] text-slate-500 mb-1.5 uppercase font-mono tracking-wider font-bold">
                        Officer Comments / Compliance Directives
                      </label>
                      <input
                        id="bureau-comments-input"
                        type="text"
                        value={bureauCommentsInput}
                        onChange={(e) => setBureauCommentsInput(e.target.value)}
                        placeholder="Add formal directives, warning periods, or comments..."
                        className="w-full bg-white border border-[#cbd5e1] rounded px-2.5 py-1.5 text-xs text-[#1e293b] focus:outline-none focus:ring-1 focus:ring-[#dc2626] focus:border-[#dc2626] font-bold"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3.5 pt-1">
                      <button
                        id="btn-bureau-reject"
                        onClick={handleRejectSubmittal}
                        className="py-2 px-3 bg-[#0f172a] hover:bg-slate-800 text-xs font-bold text-white rounded text-center cursor-pointer transition flex items-center justify-center gap-1.5 uppercase tracking-wider"
                        title="Flag deficiencies / Reject report"
                      >
                        <XCircle className="w-4 h-4 text-[#dc2626]" /> Reject submittal
                      </button>

                      <button
                        id="btn-bureau-approve"
                        onClick={handleApproveSubmittal}
                        className="py-2 px-3 bg-[#dc2626] hover:bg-red-750 text-xs font-bold text-white rounded text-center cursor-pointer transition flex items-center justify-center gap-1.5 uppercase tracking-wider shadow"
                        title="Approve Report and certify compliance"
                      >
                        <ThumbsUp className="w-4 h-4" /> Approve Report
                      </button>
                    </div>

                    {onDeleteReport && (
                      <div className="pt-1.5 border-t border-slate-200/50">
                        {isConfirmingDeleteReportId === selectedReport.id ? (
                          <div className="bg-rose-50 border border-red-200 rounded-xl p-3 text-center space-y-2">
                            <p className="text-[11px] font-sans text-red-700 font-extrabold leading-tight">
                              Permanently delete PROPACT-{selectedReport.id}?
                            </p>
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteReport(selectedReport.id);
                                  setSelectedReportId(null);
                                  setIsConfirmingDeleteReportId(null);
                                }}
                                className="px-3 py-1.5 bg-red-650 hover:bg-red-705 text-white rounded text-[10px] font-bold uppercase transition duration-150 cursor-pointer shadow-sm"
                              >
                                Yes, Delete
                              </button>
                              <button
                                type="button"
                                onClick={() => setIsConfirmingDeleteReportId(null)}
                                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[10px] font-bold uppercase transition duration-150 cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setIsConfirmingDeleteReportId(selectedReport.id)}
                            className="w-full py-2 px-3 hover:bg-rose-50 text-red-600 hover:text-red-700 bg-rose-50/20 border border-rose-100 hover:border-rose-200 rounded transition text-xs font-bold uppercase tracking-wider cursor-pointer flex items-center justify-center gap-1.5"
                            title="Purge this specific report file"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete Individual Report
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white text-slate-400 font-mono select-none">
                  <ClipboardList className="w-8 h-8 text-slate-400 mb-2 animate-bounce" />
                  <p className="text-xs font-bold uppercase tracking-wider">Select submittal record card.</p>
                </div>
              )}

            </div>

          </div>
        ) : activeTab === 'properties' ? (
          /* Monitored Properties & Jurisdiction Master Map Grid */
          <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden bg-slate-50 text-[#1e293b] h-full">
            
            {/* Left/Main Column: Real-time municipal monitor grid */}
            <div className="flex-1 p-6 flex flex-col h-full overflow-hidden">
              <div className="pb-3 flex justify-between items-center select-none shrink-0 border-b border-slate-200">
                <div>
                  <h2 className="text-base font-extrabold text-[#0f172a] uppercase tracking-tight flex items-center gap-2">
                    <Building className="w-5 h-5 text-[#dc2626]" /> Active Monitoring Map Grid
                  </h2>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                    Municipal jurisdiction safety monitoring grid. Hover over pins or click to view details.
                  </p>
                </div>
                {selectedProperty && (
                  <button
                    onClick={handleRecenterMap}
                    className="py-1 px-2 bg-slate-200 hover:bg-slate-300 text-[10px] font-bold uppercase rounded border border-slate-300 cursor-pointer"
                  >
                    Reset Map Focus
                  </button>
                )}
              </div>

              <div className="flex-1 relative min-h-[300px] border border-slate-200 rounded-lg overflow-hidden shrink-0 shadow-inner mt-4">
                <MapWidget
                  properties={properties}
                  selectedProperty={selectedProperty}
                  onSelectProperty={handleSelectProperty}
                  hoveredPropertyId={hoveredPropertyId}
                  setHoveredPropertyId={setHoveredPropertyId}
                />
              </div>
            </div>

            {/* Right Column: Listing profiles directory */}
            <div className="w-full md:w-[390px] border-l border-slate-200 bg-white flex flex-col h-full overflow-hidden shrink-0">
              <div className="p-4 border-b border-slate-100 shrink-0 select-none flex justify-between items-center bg-slate-50/50">
                <div>
                  <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block">
                    Bureau Jurisdiction Schedule
                  </span>
                  <h3 className="text-sm font-extrabold text-[#0f172a] uppercase tracking-tight mt-0.5">
                    Monitored Building Nodes ({properties.length})
                  </h3>
                </div>
                <button
                  id="btn-register-property-node-bureau"
                  onClick={() => setIsAddPropertyModalOpen(true)}
                  className="py-1 px-2.5 bg-[#dc2626] hover:bg-red-750 text-white text-[10px] font-bold uppercase rounded flex items-center gap-1 cursor-pointer transition select-none tracking-wider shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Building
                </button>
              </div>

              <div className="flex-grow overflow-y-auto p-4 space-y-3 bg-slate-50/50">
                {properties.map((prop) => {
                  const isSelected = selectedProperty?.id === prop.id;
                  return (
                    <div 
                      key={prop.id} 
                      id={`property-card-${prop.id}`}
                      onClick={() => handleSelectProperty(prop)}
                      onMouseEnter={() => setHoveredPropertyId(prop.id)}
                      onMouseLeave={() => setHoveredPropertyId(null)}
                      className={`border rounded-lg p-4 space-y-3.5 shadow-sm transition duration-200 cursor-pointer relative ${
                        isSelected 
                          ? 'border-[#dc2626] ring-1 ring-[#dc2626] bg-red-50/20' 
                          : 'border-slate-200 bg-white hover:border-slate-350'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <h4 className="text-xs font-black text-[#0f172a] uppercase tracking-tight font-sans leading-snug truncate">
                            {prop.name}
                          </h4>
                          <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                            📍 {prop.address}, {prop.city}
                          </p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[8.5px] font-mono font-bold uppercase tracking-wide shrink-0 ${
                          prop.status === 'Complete' 
                            ? 'bg-emerald-100 text-emerald-850 border border-emerald-200' 
                            : prop.status.includes('Overdue') 
                              ? 'bg-red-100 text-red-805 border border-red-200 animate-pulse' 
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                          {prop.status}
                        </span>
                      </div>

                      <div className="bg-slate-50 rounded p-2.5 grid grid-cols-2 gap-2 text-[10px] font-mono border border-slate-200/85">
                        <div>
                          <span className="text-slate-400 block font-bold text-[8px]">NFPA Standard:</span>
                          <span className="text-slate-805 font-extrabold block truncate text-[9.5px]">{prop.template}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-bold text-[8px]">Logged Audits:</span>
                          <span className="text-slate-800 font-black block text-xs">{prop.inspectionsCount} items</span>
                        </div>
                        <div className="mt-0.5">
                          <span className="text-slate-400 block font-bold text-[8px]">Last date:</span>
                          <span className="text-slate-600 block">{prop.lastInspectionDate}</span>
                        </div>
                        <div className="mt-0.5">
                          <span className="text-slate-400 block font-bold text-[8px]">Next Due:</span>
                          <span className={`font-black block ${prop.status.includes('Overdue') ? 'text-[#dc2626]':'text-slate-600'}`}>
                            {prop.nextInspectionDate}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : activeTab === 'contractors' ? (
          /* Audited Contractors list tab */
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
            <div className="flex justify-between items-center pb-4 border-b border-slate-200 select-none">
              <h2 className="text-base font-extrabold text-[#0f172a] flex items-center gap-2 uppercase tracking-tight font-sans">
                <Briefcase className="w-5 h-5 text-[#dc2626]" /> Registered Fire Equipment Contractors
              </h2>
              <span className="text-xs font-mono text-slate-500 font-bold font-sans">Total Registered: {contractors.length} Agencies</span>
            </div>

            {/* Target Environment Selector */}
            <div className="bg-slate-900 text-white rounded-lg p-4 border border-slate-800 space-y-3 text-left shadow-md">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <p className="text-xs font-black uppercase tracking-wider text-slate-200">📡 QR Code Destination Host</p>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono leading-normal max-w-xl">
                    {qrMode === 'dev' ? (
                      <>
                        <strong>🔒 Active Development Sandbox:</strong> Pointing to your live workspace. <span className="text-sky-400 font-bold">To test on his camera, please log your mobile browser into Google using MyLinkPortalPage@gmail.com</span> to pass sandbox security.
                      </>
                    ) : (
                      <>
                        <strong>🌍 Public Shared Slot (No Login Needed):</strong> Fully anonymous open access. <span className="text-amber-400 font-bold">NOTE: Works ONLY after clicking the "Share" button on the top-right tool-bar</span> in your work area to activate this build publicly!
                      </>
                    )}
                  </p>
                </div>
                <div className="flex border border-slate-700 rounded overflow-hidden text-[10px] font-bold font-sans shrink-0 bg-slate-800">
                  <button
                    type="button"
                    onClick={() => setQrMode('dev')}
                    className={`px-3 py-1.5 transition cursor-pointer uppercase ${qrMode === 'dev' ? 'bg-[#dc2626] text-white':'text-slate-400 hover:text-slate-200'}`}
                  >
                    🔒 Dev Mode
                  </button>
                  <button
                    type="button"
                    onClick={() => setQrMode('public')}
                    className={`px-3 py-1.5 transition cursor-pointer uppercase ${qrMode === 'public' ? 'bg-[#dc2626] text-white':'text-slate-400 hover:text-slate-200'}`}
                  >
                    🌍 Public URL
                  </button>
                </div>
              </div>

              {/* Calculated base URL indicator */}
              <div className="p-2.5 bg-slate-800 rounded border border-slate-700 space-y-1">
                <span className="text-[9px] font-mono text-slate-400 block font-bold uppercase select-none">
                  Calculated QR Content Domain Prefix:
                </span>
                <div className="flex gap-1.5 items-center justify-between">
                  <code className="text-xs text-slate-300 font-mono font-bold break-all select-all">
                    {getPublicDomainUrl(qrMode, customDomain)}
                  </code>
                </div>
              </div>

              {/* Manual Override Form Row */}
              <div className="space-y-1 grid grid-cols-1 md:grid-cols-12 gap-x-4 items-center">
                <div className="md:col-span-4">
                  <label htmlFor="custom-domain-field-bureau" className="block text-[9.5px] text-slate-400 font-bold uppercase tracking-wider font-mono">
                    ✏️ Manual Override (Optional):
                  </label>
                  <span className="text-[8px] text-slate-500 font-mono block leading-tight">
                    Type or paste browser URL to force QR targets.
                  </span>
                </div>
                <div className="md:col-span-8 flex gap-2">
                  <input
                    id="custom-domain-field-bureau"
                    type="text"
                    value={customDomain}
                    placeholder="Ex: ais-pre-u4annct5zamfzvzi4ibqku-573905913907.us-east1.run.app"
                    onChange={(e) => {
                      setCustomDomain(e.target.value);
                      safeStorage.setItem('fire_inspect_custom_domain', e.target.value);
                    }}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#dc2626] text-slate-200 font-mono"
                  />
                  {customDomain && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomDomain('');
                        safeStorage.setItem('fire_inspect_custom_domain', '');
                      }}
                      className="bg-slate-700 hover:bg-slate-655 text-white px-3 py-1 rounded text-xs font-bold uppercase cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {contractors.length === 0 ? (
                <div className="col-span-full bg-white border border-dashed border-slate-300 rounded-lg p-10 text-center select-none">
                  <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-extrabold text-slate-650 uppercase font-sans">No Registered Contractor Agencies</p>
                  <p className="text-xs text-slate-400 mt-1">Provider agencies will be cataloged here once registered during site verification portals.</p>
                </div>
              ) : (
                contractors.map((con) => (
                <div key={con.id} className="group bg-white border border-slate-200 hover:border-[#dc2626]/40 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between relative overflow-hidden">
                  {/* Glowing decorative indicator at the top margin */}
                  <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#dc2626]/20 via-[#dc2626] to-[#dc2626]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-start gap-3">
                      {/* Logo / Initials circular badge */}
                      <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-[#dc2626] font-black text-sm shadow-sm shrink-0 uppercase">
                        {con.name ? con.name.slice(0, 2).toUpperCase() : 'CO'}
                      </div>
                      
                      <div className="flex items-center gap-1.5 select-none shrink-0">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold font-sans tracking-wide bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-sm uppercase">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          Licensed
                        </span>
                        
                        {onDeleteContractor && (
                          <div className="flex items-center font-mono text-[10px]">
                            {deletingContractorId === con.id ? (
                              <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded animate-pulse shadow-sm">
                                <span className="text-red-600 font-extrabold text-[9px] whitespace-nowrap">Delete?</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    onDeleteContractor(con.id);
                                    setDeletingContractorId(null);
                                  }}
                                  className="px-1.5 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-[8px] font-black uppercase tracking-wider duration-150 transition-colors cursor-pointer"
                                  title="Confirm removal"
                                >
                                  Yes
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletingContractorId(null)}
                                  className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[8px] font-bold uppercase tracking-wider duration-150 transition-colors cursor-pointer"
                                  title="Cancel removal"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setDeletingContractorId(con.id)}
                                className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-red-600 hover:scale-105 rounded-lg transition-all duration-150 cursor-pointer"
                                title="Remove contractor agency"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <a 
                        href={buildContractorPublicUrl(getPublicDomainUrl(qrMode, customDomain), con)}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="group/link inline-block max-w-full"
                        title="Click to view contractor registry page"
                      >
                        <h3 className="text-sm font-black text-[#0f172a] group-hover/link:text-[#dc2626] group-hover/link:underline transition-all tracking-tight uppercase font-sans flex items-center gap-1.5 cursor-pointer leading-tight">
                          <span className="truncate block">{con.name}</span>
                          <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover/link:text-[#dc2626] transition-colors shrink-0" />
                        </h3>
                      </a>
                      
                      <div className="flex items-center gap-1.5 text-[10px] font-mono">
                        <span className="text-slate-400 font-bold uppercase">ST LICENSE:</span>
                        <span className="text-slate-700 font-black tracking-wider bg-slate-100/80 px-1.5 py-0.5 rounded border border-slate-200/50">{con.licenseNumber}</span>
                      </div>
                    </div>

                    <div className="pt-3.5 border-t border-slate-100/90 space-y-2">
                      <div className="flex items-center gap-2.5 text-xs">
                        <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200/50 flex items-center justify-center text-slate-400 group-hover:text-[#dc2626] group-hover:bg-rose-50/50 group-hover:border-[#dc2626]/20 transition-all duration-300">
                          <Mail className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[8px] text-slate-400 font-bold block uppercase tracking-wider font-sans leading-none">Registered Email</span>
                          <span className="text-slate-700 font-bold text-[11px] truncate block mt-0.5 select-all">{con.email}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2.5 text-xs">
                        <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200/50 flex items-center justify-center text-slate-400 group-hover:text-[#dc2626] group-hover:bg-rose-50/50 group-hover:border-[#dc2626]/20 transition-all duration-300">
                          <Phone className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[8px] text-slate-400 font-bold block uppercase tracking-wider font-sans leading-none">Direct Dispatch</span>
                          <span className="text-slate-700 font-bold text-[11px] block mt-0.5 select-all">{con.phone}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Scannable Unique QR Code Module */}
                  <div className="mt-5 pt-4 border-t border-slate-100 bg-gradient-to-b from-slate-50 to-slate-100/50 rounded-xl border border-slate-200/60 p-4 flex flex-col items-center justify-center space-y-3 shadow-inner">
                    <span className="text-[9.5px] font-mono tracking-wider text-slate-500 font-extrabold uppercase flex items-center gap-1.5 select-none">
                      <QrCode className="w-3.5 h-3.5 text-[#dc2626]/80" /> AGENCY VERIFIER BADGE
                    </span>
                    
                    <div className="relative p-2.5 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow transition-all duration-300 select-none flex flex-col items-center gap-2 group/qr">
                      {/* Reticle brackets for high-tech scanning machine look */}
                      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#dc2626]/40 group-hover/qr:border-[#dc2626] rounded-tl-md transition-colors duration-200"></div>
                      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#dc2626]/40 group-hover/qr:border-[#dc2626] rounded-tr-md transition-colors duration-200"></div>
                      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#dc2626]/40 group-hover/qr:border-[#dc2626] rounded-bl-md transition-colors duration-200"></div>
                      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#dc2626]/40 group-hover/qr:border-[#dc2626] rounded-br-md transition-colors duration-200"></div>
                      
                      <QRCodeSVG 
                        value={buildContractorPublicUrl(getPublicDomainUrl(qrMode, customDomain) || "https://fire-inspect.local", con)}
                        size={110}
                        fgColor="#0f172a"
                        className="rounded opacity-95 group-hover/qr:opacity-100 transition-all duration-200 group-hover/qr:scale-[1.02]"
                      />
                      
                      <a 
                        href={buildContractorPublicUrl(getPublicDomainUrl(qrMode, customDomain), con)}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#dc2626]/5 hover:bg-[#dc2626]/10 text-[#dc2626] font-bold transition-all duration-200 text-[9.5px] font-sans border border-[#dc2626]/10 shadow-sm shrink-0"
                      >
                        <span>Open profile registry</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    <button 
                      onClick={() => triggerScanSimulator(con)}
                      className="w-full py-2.5 px-3.5 bg-[#0f172a] hover:bg-[#dc2626] text-white text-[10.5px] font-black uppercase tracking-wider rounded-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:shadow-md select-none border border-transparent hover:scale-[1.01]"
                    >
                      <Camera className="w-4 h-4" /> Scan QR & Populate
                    </button>
                  </div>
                </div>
              )))}
            </div>
          </div>
        ) : activeTab === 'qr' ? (
          /* Reuses the EXACT magnificent QR Tagting Hub for Bureau officers as well */
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-100 text-[#1e293b] flex flex-col h-full min-h-0">
            
            {/* Header row describing function */}
            <div className="pb-4 border-b border-slate-200">
              <h2 className="text-base font-extrabold text-[#0f172a] uppercase tracking-tight flex items-center gap-2 font-sans">
                <QrCode className="w-5 h-5 text-[#dc2626]" /> QR System Tagging & On-Site Verification Hub
              </h2>
              <p className="text-xs text-slate-500 font-sans mt-0.5">
                Generate scannable heavy-duty QR safety tags for physical fire alarm boxes, sprinklers, and backflow preventers, and simulate scanning them on-site.
              </p>
            </div>

            {/* Real Hardware Phone Scan Notice */}
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg shadow-sm font-sans animate-fade-in shrink-0">
              <div className="flex items-start gap-3">
                <div className="p-1.5 bg-amber-100 rounded-full shrink-0 text-amber-700 mt-0.5">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div className="space-y-1.5 text-xs text-slate-700">
                  <h4 className="font-extrabold text-slate-900 uppercase tracking-tight">
                    🔒 Secure Sandbox Access Control Notice
                  </h4>
                  <p className="leading-relaxed">
                    Because this application is running within a secure, sandboxed Google developer preview slot, Google's server-level security restricts anonymous traffic. If you scan this QR code with your physical phone's camera, you'll receive a Google <strong>"No access / permission denied"</strong> screen because your mobile's browser is not currently authenticated with your developer workstation account (<strong>{user?.email || 'MyLinkPortalPage@gmail.com'}</strong>).
                  </p>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-1 font-semibold text-slate-900 pt-1">
                    <span>💡 How to Test Successfully:</span>
                    <span className="text-[#dc2626]">• Recommend: Use the interactive "Smartphone QR Scanner Demo" simulator panel on the right</span>
                    <span className="text-[#dc2626]">• Active Device: Sign in to your phone browser's Google Account using {user?.email || 'MyLinkPortalPage@gmail.com'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-start">
              
              {/* Left Box: Label Designer Tag (Grid Column 7) */}
              <div className="lg:col-span-12 xl:col-span-7 space-y-4">
                <div className="bg-white border border-slate-200 rounded p-4 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                    <Printer className="w-4 h-4 text-[#dc2626]" />
                    <h3 className="text-xs font-mono font-black uppercase text-slate-800 tracking-wider">
                      NFPA Compliance Label Printer
                    </h3>
                  </div>

                  <div>
                    <label htmlFor="qr-report-selector" className="block text-[10px] text-slate-500 mb-1 font-bold uppercase tracking-wider">
                      Select Target Inspection Submittal Record
                    </label>
                    <select
                      id="qr-report-selector"
                      value={selectedReportIdForQR}
                      onChange={(e) => {
                        const repId = e.target.value;
                        setSelectedReportIdForQR(repId);
                        const rep = reports.find(r => r.id === repId);
                        if (rep) {
                          setStickerColor(rep.status.includes('Passed') ? 'green' : rep.status.includes('Failed') ? 'red' : 'yellow');
                        }
                      }}
                      className="w-full bg-white border border-[#cbd5e1] rounded px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#dc2626] focus:border-[#dc2626] font-sans font-bold text-[#1e293b]"
                    >
                      {reports.map((rep) => (
                        <option key={rep.id} value={rep.id}>
                          {rep.id} - {rep.propertyName} ({rep.equipmentType} - {rep.date})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Sticker Custom Color picker */}
                  <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono tracking-wide">
                    <button 
                      onClick={() => setStickerColor('green')}
                      className={`py-1.5 rounded cursor-pointer border transition font-bold ${stickerColor === 'green' ? 'bg-emerald-600 text-white border-transparent shadow':'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
                    >
                      🟢 Compliance Pass (Green)
                    </button>
                    <button 
                      onClick={() => setStickerColor('yellow')}
                      className={`py-1.5 rounded cursor-pointer border transition font-bold ${stickerColor === 'yellow' ? 'bg-amber-500 text-white border-transparent shadow':'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
                    >
                      🟡 Deficiencies Hold (Yellow)
                    </button>
                    <button 
                      onClick={() => setStickerColor('red')}
                      className={`py-1.5 rounded cursor-pointer border transition font-bold ${stickerColor === 'red' ? 'bg-[#dc2626] text-white border-transparent shadow':'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
                    >
                      🔴 Violation Critical (Red)
                    </button>
                  </div>

                  {/* Vector QR Customization Controls */}
                  <div className="bg-slate-50 border border-slate-200 rounded p-3.5 space-y-3 pb-3.5 text-xs text-left">
                    <span className="text-[10px] uppercase font-mono font-black text-slate-700 block tracking-wider">🛠️ Vector QR Design Engine</span>
                    <div className="grid grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-[9px] text-slate-500 font-bold uppercase mb-1">Foreground Color</label>
                        <div className="flex gap-1.5 items-center">
                          <input 
                            type="color" 
                            value={qrFgColor} 
                            onChange={(e) => setQrFgColor(e.target.value)} 
                            className="w-8 h-6 p-0 border border-slate-300 rounded cursor-pointer shrink-0"
                          />
                          <span className="font-mono text-[9px] text-slate-650 font-bold">{qrFgColor}</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[9px] text-slate-505 font-bold uppercase mb-1">Background Color</label>
                        <div className="flex gap-1.5 items-center">
                          <input 
                            type="color" 
                            value={qrBgColor} 
                            onChange={(e) => setQrBgColor(e.target.value)} 
                            className="w-8 h-6 p-0 border border-slate-300 rounded cursor-pointer shrink-0"
                          />
                          <span className="font-mono text-[9px] text-slate-655 font-bold">{qrBgColor}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-200 text-[10px]">
                      <label className="font-bold text-slate-655 flex items-center gap-1.5 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={qrShowLogo} 
                          onChange={(e) => setQrShowLogo(e.target.checked)} 
                          className="rounded text-[#dc2626] focus:ring-[#dc2626] cursor-pointer" 
                        />
                        Center Fire Flame Logo
                      </label>

                      <label className="font-bold text-slate-655 flex items-center gap-1.5 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={qrShapeRound} 
                          onChange={(e) => setQrShapeRound(e.target.checked)} 
                          className="rounded text-[#dc2626] focus:ring-[#dc2626] cursor-pointer" 
                        />
                        Rounded Eye Corners
                      </label>
                    </div>

                    <div className="pt-2 border-t border-slate-200">
                      <span className="block text-[9px] text-slate-505 font-bold uppercase mb-1.5">Tag Sticker Layout Frame</span>
                      <div className="grid grid-cols-3 gap-1 text-center font-mono text-[9px]">
                        {(['industrial', 'classic', 'modern'] as const).map((style) => (
                          <button
                            type="button"
                            key={style}
                            onClick={() => setQrStyleType(style)}
                            className={`py-1 rounded font-bold uppercase border transition cursor-pointer ${qrStyleType === style ? 'bg-slate-800 text-white border-transparent shadow' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                          >
                            {style}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* QR Destination Target Bar with custom override option */}
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2.5 text-left shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono font-bold text-slate-700 uppercase select-none flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-[#dc2626]" /> QR Link Host Config:
                      </span>
                      <div className="flex border border-slate-300 rounded overflow-hidden text-[8px] font-bold font-sans bg-white shrink-0">
                        <button
                          type="button"
                          onClick={() => setQrMode('dev')}
                          className={`px-2 py-0.5 transition cursor-pointer uppercase ${qrMode === 'dev' ? 'bg-[#dc2626] text-white':'text-slate-600 hover:text-slate-900 bg-white'}`}
                        >
                          🔒 Dev (Sandbox)
                        </button>
                        <button
                          type="button"
                          onClick={() => setQrMode('public')}
                          className={`px-2 py-0.5 transition cursor-pointer uppercase ${qrMode === 'public' ? 'bg-[#dc2626] text-white':'text-slate-650 hover:text-slate-900 bg-white'}`}
                        >
                          🌍 Public (Shared)
                        </button>
                      </div>
                    </div>

                    {/* Calculated result display */}
                    <div className="p-2 bg-white rounded border border-slate-200 space-y-1">
                      <span className="text-[9px] font-mono text-slate-400 block font-bold uppercase select-none">
                        Calculated QR Content Prefix:
                      </span>
                      <div className="flex gap-1.5 items-center justify-between">
                        <code className="text-[10px] text-slate-705 font-mono font-bold break-all whitespace-pre-wrap leading-tight select-all">
                          {getPublicDomainUrl(qrMode, customDomain)}
                        </code>
                      </div>
                    </div>

                    {/* Manual Override Field */}
                    <div className="space-y-1">
                      <label htmlFor="custom-domain-field-bureau-label" className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                        ✏️ Manual Domain Override Prefix (Optional):
                      </label>
                      <div className="flex gap-1.5">
                        <input
                          id="custom-domain-field-bureau-label"
                          type="text"
                          value={customDomain}
                          placeholder="Ex: ais-pre-u4annct5zamfzvzi4ibqku-573905913907.us-east1.run.app"
                          onChange={(e) => {
                            setCustomDomain(e.target.value);
                            safeStorage.setItem('fire_inspect_custom_domain', e.target.value);
                          }}
                          className="flex-1 bg-white border border-[#cbd5e1] rounded px-2 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-[#dc2626] font-mono text-slate-800 shadow-inner"
                        />
                        {customDomain && (
                          <button
                            type="button"
                            onClick={() => {
                              setCustomDomain('');
                              safeStorage.setItem('fire_inspect_custom_domain', '');
                            }}
                            className="bg-slate-200 hover:bg-slate-300 text-slate-750 px-2 rounded text-[10px] uppercase font-bold cursor-pointer"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      <p className="text-[8px] text-slate-400 font-mono leading-normal">
                        Scan URL not loading? You can paste the EXACT web-address currently in your browser window here to force all physical QR outputs to link directly to your screen! (Exclude queries like <code>?tab=xx</code>).
                      </p>
                    </div>

                    <p className="text-[8px] text-slate-505 font-mono leading-normal mt-1 border-t border-slate-200/60 pt-1">
                      {qrMode === 'dev' ? (
                        <span>
                          <strong>Dev Sandbox:</strong> Direct real-time updates. <span className="text-[#dc2626] font-bold">Phones must log into Google as MyLinkPortalPage@gmail.com</span> to load this secure link.
                        </span>
                      ) : (
                        <span>
                          <strong>Public Deployment:</strong> Open Worldwide. Only loads <span className="text-amber-655 font-black">AFTER clicking 'Share' or 'Deploy' at the top-right of AI Studio</span> to finalize.
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Actual Visual Sticker Tag Mockup */}
                  {(() => {
                    const targetRep = reports.find(r => r.id === selectedReportIdForQR) || reports[0];
                    if (!targetRep) return null;

                    const colorStripeTheme = {
                      green: 'bg-emerald-600 border-emerald-700 text-white',
                      yellow: 'bg-amber-500 border-amber-600 text-white',
                      red: 'bg-[#dc2626] border-red-700 text-white',
                    };

                    const colorStripeLabel = {
                      green: 'SYSTEM APPROVED & CERTIFIED PASSED',
                      yellow: 'CONDITIONAL COMPLIANCE • REPAIR WINDOW',
                      red: 'CRITICAL SAFETY VIOLATION • ORDER MANDATE',
                    };

                    const appDomainUrl = getPublicDomainUrl(qrMode, customDomain);
                    const secureVerificationUrl = `${appDomainUrl}/?verify=${targetRep.id}`;

                    const stickerFrameClass = 
                      qrStyleType === 'industrial' ? 'border-4 border-amber-400 bg-amber-50 rounded shadow-md overflow-hidden relative select-none max-w-md mx-auto text-left' :
                      qrStyleType === 'modern' ? 'border border-slate-250 rounded-2xl shadow-xl bg-white overflow-hidden relative select-none max-w-md mx-auto text-left' :
                      'border-4 border-double border-[#dc2626] rounded shadow bg-slate-50 overflow-hidden relative select-none max-w-md mx-auto text-left';

                    return (
                      <div className={stickerFrameClass}>
                        {/* Weatherproof adhesive sticker texture styling */}
                        <div className="absolute top-2 right-2 pointer-events-none opacity-[0.06] select-none text-slate-800 font-mono text-[9px] uppercase font-bold text-right leading-tight">
                          vinyl weather-tag 100% weatherseal<br />patent pending l-7729-fd
                        </div>

                        {qrStyleType === 'industrial' && (
                          <div className="h-2.5 w-full bg-repeating-linear-stripes" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #f59e0b, #f59e0b 8px, #1e293b 8px, #1e293b 16px)' }} />
                        )}

                        {/* Top Stripe Label */}
                        <div className={`p-2.5 text-center font-bold tracking-tight text-[11px] font-sans ${colorStripeTheme[stickerColor]} border-b`}>
                          {colorStripeLabel[stickerColor]}
                        </div>

                        {/* Tag Body */}
                        <div className="p-4 space-y-3.5">
                          
                          {/* Seal Header */}
                          <div className="text-center pb-2.5 border-b border-slate-300">
                            <span className="text-[9.5px] font-mono font-bold uppercase tracking-widest text-[#dc2626] block font-extrabold">
                              Bureau of Fire Prevention
                            </span>
                            <h4 className="text-xs font-black uppercase text-slate-800 tracking-tight mt-0.5 font-sans">
                              OFFICIAL SYSTEM COMPLIANCE TAG
                            </h4>
                          </div>

                          {/* Middle layout: QR on the left, details on the right */}
                          <div className="flex flex-col sm:flex-row gap-4 items-center">
                            {/* QR block containing vector SVG */}
                            <div className="p-2 bg-white border border-slate-200 rounded shadow-sm shrink-0 flex flex-col items-center">
                              <QRCodeSVG 
                                id={`vector-qr-svg-${targetRep.id}`}
                                value={secureVerificationUrl || "https://fire-inspect.local"}
                                size={124}
                                level="H"
                                fgColor={qrFgColor}
                                bgColor={qrBgColor}
                                includeMargin={true}
                                className={qrShapeRound ? 'rounded-lg' : ''}
                                imageSettings={qrShowLogo ? {
                                  src: FLAME_ICON_DATA_URI,
                                  height: 24,
                                  width: 24,
                                  excavate: true,
                                } : undefined}
                              />
                              <div className="text-[7.5px] text-center font-mono font-bold text-slate-400 mt-1 uppercase select-none leading-none">
                                scan to verify log
                              </div>
                              <a 
                                href={secureVerificationUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-[9px] text-[#dc2626] font-bold hover:underline mt-1.5 flex items-center gap-0.5 font-sans"
                              >
                                🔗 Open compliance tag <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            </div>

                            {/* Data columns */}
                            <div className="flex-1 space-y-2.5 text-[10px] font-mono text-slate-650 w-full text-slate-650">
                              <div>
                                <span className="text-slate-400 block font-bold text-[8.5px] uppercase">Physical Asset / Location:</span>
                                <span className="text-slate-900 block font-sans font-extrabold uppercase leading-tight">{targetRep.propertyName}</span>
                                <span className="text-slate-505 block leading-tight text-[8px] mt-0.5 truncate">{targetRep.propertyAddress}</span>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-[9px]">
                                <div>
                                  <span className="text-slate-400 block font-bold text-[8px] uppercase">Inspect System:</span>
                                  <span className="text-slate-850 font-bold font-sans">{targetRep.equipmentType}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block font-bold text-[8px] uppercase">Inspection Log Ref:</span>
                                  <span className="text-slate-850 font-bold">{targetRep.id}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block font-bold text-[8px] uppercase">Audit Date:</span>
                                  <span className="text-slate-850 font-bold">{targetRep.date}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block font-bold text-[8px] uppercase">Due Exp Date:</span>
                                  <span className="text-slate-850 font-bold">
                                    {new Date(new Date(targetRep.date).getTime() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                                  </span>
                                </div>
                              </div>

                              <div className="border-t border-dashed border-slate-305 pt-2 text-[8.5px] truncate text-slate-550">
                                <span className="text-slate-400 font-bold block text-[7.5px] uppercase">Licensed Contractor:</span>
                                <span className="text-slate-705 font-sans font-bold block">{targetRep.contractorName}</span>
                                <span className="text-slate-400 text-[8px] font-bold">CREATOR LIC: {targetRep.contractorId === 'con-2' ? 'F-44120-C':'F-88291-C'}</span>
                              </div>
                            </div>
                          </div>

                          {/* Bottom Warning Disclaimer */}
                          <div className="bg-slate-100 rounded p-2 text-center text-[8px] text-slate-500 border border-slate-250 leading-relaxed font-semibold">
                            NOTICE: Place this physical compliance sticker on the control riser. By order of the Bureau, this QR reference represents real-time certification. Tampering is punishable by NJ State Code.
                          </div>

                        </div>
                      </div>
                    );
                  })()}

                  {/* Simulated print button & high-resolution vector download */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                    <button
                      onClick={() => {
                        setIsPrintingSticker(true);
                        setTimeout(() => {
                          setIsPrintingSticker(false);
                          setShowPrintToast(true);
                          setTimeout(() => setShowPrintToast(false), 3500);
                        }, 1200);
                      }}
                      disabled={isPrintingSticker}
                      className="sm:col-span-12 py-2 bg-[#0f172a] hover:bg-black disabled:bg-slate-500 text-white text-xs font-bold uppercase rounded flex items-center justify-center gap-1.5 transition select-none cursor-pointer tracking-wider font-sans"
                    >
                      <Printer className={`w-4 h-4 ${isPrintingSticker ? 'animate-bounce':''}`} />
                      {isPrintingSticker ? 'Connecting to Tag Label Printer...':'Print Tag Sticker (3" x 3")'}
                    </button>

                    <button
                      onClick={() => {
                        const targetRep = reports.find(r => r.id === selectedReportIdForQR) || reports[0];
                        if (targetRep) {
                          downloadVectorSVG(targetRep.id);
                        }
                      }}
                      className="sm:col-span-6 py-2 px-4 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold uppercase rounded flex items-center justify-center gap-1.5 transition select-none cursor-pointer tracking-wider font-sans shadow"
                      title="Download high-resolution styleable inspection tag vector as .SVG"
                    >
                      <Download className="w-4 h-4" />
                      Download SVG Tag
                    </button>

                    <button
                      onClick={() => {
                        const targetRep = reports.find(r => r.id === selectedReportIdForQR) || reports[0];
                        if (targetRep) {
                          setSelectedStickerToScan(targetRep.id);
                          setScannerActive(true);
                          setScanningStatus("SCANNING WEATHERPROOF ADHESIVE STICKER...");
                          setTimeout(() => {
                            setScannedResult(targetRep);
                            setScannerActive(false);
                          }, 1205);
                        }
                      }}
                      className="sm:col-span-6 py-2 px-4 bg-[#dc2626] hover:bg-red-750 text-white text-xs font-bold uppercase rounded flex items-center justify-center gap-1.5 transition select-none cursor-pointer tracking-wider font-sans shadow-md"
                      title="Simulate scanning this QR compliance tag with a smartphone camera"
                    >
                      <Smartphone className="w-4 h-4 text-emerald-300" />
                      Simulate Scan Sticker
                    </button>
                  </div>

                  {/* Print SUCCESS feedback */}
                  {showPrintToast && (
                    <div className="p-3 text-center text-xs font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 rounded flex items-center justify-center gap-2 animate-fade-in uppercase">
                      <Check className="w-4 h-4 text-emerald-600" />
                      Certified Adhesive Compliance Label sent to tape recorder. Printed successfully!
                    </div>
                  )}
                </div>
              </div>

              {/* Right Box: Bureau Tag Verification & Audit Guide (Grid Column 5) */}
              <div className="lg:col-span-12 xl:col-span-5 space-y-4">
                <div className="bg-white border border-slate-200 rounded p-5 shadow-sm space-y-4 text-left font-sans">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                    <BookOpen className="w-4 h-4 text-[#dc2626]" />
                    <h3 className="text-xs font-mono font-black uppercase tracking-wider text-slate-800">
                      Bureau Tag Verification & Audit Guide
                    </h3>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
                    Physical on-site QR compliance decals permit field officials and emergency personnel to audit structural fire systems directly. Follow these fire bureau field guidelines to manage physical on-site enforcement tags:
                  </p>

                  <div className="space-y-4 pt-1">
                    <div className="flex gap-3 items-start">
                      <span className="flex h-5 w-5 rounded-full bg-red-100 text-[#dc2626] font-bold text-xs items-center justify-center shrink-0 mt-0.5 select-none font-sans">
                        1
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 font-sans">Visual Field Inspection</h4>
                        <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5 font-sans">
                          Inspect compliance tags affixed to risers and main feeds. The color stripe instantly communicates status (Green = Passed, Red = Warning).
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3 items-start">
                      <span className="flex h-5 w-5 rounded-full bg-red-100 text-[#dc2626] font-bold text-xs items-center justify-center shrink-0 mt-0.5 select-none font-sans">
                        2
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 font-sans font-sans">Secure Mobile Scanning</h4>
                        <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5 font-sans">
                          Scan the dynamic QR code with any standard smartphone camera. No proprietary scanner or application is required in the field.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3 items-start">
                      <span className="flex h-5 w-5 rounded-full bg-red-100 text-[#dc2626] font-bold text-xs items-center justify-center shrink-0 mt-0.5 select-none font-sans">
                        3
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 font-sans font-sans">Live Registry Validation</h4>
                        <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5 font-sans">
                          Check the official municipal domain resolver. The scan page loads live watermarked certificates directly from the primary database.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3 items-start">
                      <span className="flex h-5 w-5 rounded-full bg-red-100 text-[#dc2626] font-bold text-xs items-center justify-center shrink-0 mt-0.5 select-none font-sans">
                        4
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 font-sans">System Auditing Integrity</h4>
                        <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5 font-sans">
                          Any discrepancies between physical labels and live cloud states trigger automated alarm logs to prevent tag tampering or legacy fraud.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-red-50/65 p-3.5 rounded border border-red-200 text-[11px] leading-relaxed text-slate-700 mt-2 font-sans space-y-1">
                    <span className="font-extrabold text-red-900 flex items-center gap-1 font-sans">
                      <Sparkles className="w-3.5 h-3.5 text-red-700 font-sans" /> Official Fire Code Audit Standard
                    </span>
                    <p className="font-sans">
                      Inspectors can instantly open the live portal by clicking the <strong className="text-[#dc2626]">"🔗 Open compliance tag"</strong> layout reference on the left to verify the cloud database sheet dynamically.
                    </p>
                  </div>
                </div>
              </div>

            </div>

          </div>
        ) : activeTab === 'email' ? (
          <div className="flex-grow overflow-y-auto p-6 space-y-6 bg-slate-100 text-[#1e293b] flex flex-col h-full min-h-0">
            
            {/* Header row describing function */}
            <div className="pb-4 border-b border-slate-200 shrink-0">
              <h2 className="text-base font-extrabold text-[#0f172a] uppercase tracking-tight flex items-center gap-2 font-sans">
                <Mail className="w-5 h-5 text-[#dc2626]" /> Fire Bureau Direct Ingress Email Ingestion Compliance Gateway
              </h2>
              <p className="text-xs text-slate-500 font-sans mt-0.5">
                Audit system-wide automated email webhooks. Watch or test how contractor PDF compliance audits are parsed into interactive database structures instantly.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0 flex-1 overflow-visible">
              
              {/* Left side: Compliance Instructions & Email Composer Simulator */}
              <div className="lg:col-span-12 xl:col-span-7 space-y-6 overflow-y-auto pr-1">
                
                {/* Premium Live Gmail Scanner OAuth Integration Card */}
                <div className="bg-white border rounded-lg p-5 shadow-sm space-y-4 border-[#3b82f6]">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                      ✨ Live Gmail Sync & Automatic Ingestion
                    </h3>
                    <span className={`text-[10px] uppercase font-bold font-mono px-2 py-0.5 rounded ${gmailUser ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                      {gmailUser ? 'Gmail Linked' : 'Offline / Simulated'}
                    </span>
                  </div>
                  
                  <p className="text-xs text-slate-600 leading-relaxed font-sans">
                    Connect your real Gmail inbox to scan and parse incoming NFPA test certificates. Our system isolates compliance keywords in subject headers to create official inspection cards securely in real-time.
                  </p>

                  {gmailUser ? (
                    <div className="space-y-4 font-sans text-xs">
                      <div className="p-3 bg-emerald-50 border border-emerald-150 rounded flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-slate-700 font-sans">
                        <div>
                          <span className="font-bold text-emerald-800 select-none uppercase tracking-wider text-[10px] font-mono block">Linked Google Account:</span>
                          <span className="font-mono font-bold">{gmailUser.email}</span>
                        </div>
                        <button 
                          onClick={handleGmailDisconnect}
                          className="py-1 px-2 text-slate-600 hover:text-red-600 font-bold hover:underline transition uppercase tracking-wider text-[10px] font-mono"
                        >
                          Disconnect Address
                        </button>
                      </div>

                      <div className="flex gap-3">
                        <button 
                          onClick={handleGmailScan}
                          disabled={gmailScanning}
                          className="flex-grow py-2.5 px-4 bg-[#3b82f6] hover:bg-blue-600 text-white rounded text-xs leading-none font-extrabold uppercase tracking-widest cursor-pointer select-none transition flex items-center justify-center gap-2"
                        >
                          {gmailScanning ? (
                            <>
                              <RotateCw className="w-3.5 h-3.5 animate-spin" /> Scanning Live Inbox...
                            </>
                          ) : (
                            <>
                              <RotateCw className="w-3.5 h-3.5" /> Scan Gmail for Compliance Files
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-2">
                      <button 
                        onClick={handleGmailConnect}
                        className="gsi-material-button w-full sm:w-auto"
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="gsi-material-button-state"></div>
                        <div className="gsi-material-button-content-wrapper">
                          <div className="gsi-material-button-icon">
                            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                              <path fill="none" d="M0 0h48v48H0z"></path>
                            </svg>
                          </div>
                            <span className="gsi-material-button-contents" style={{ fontWeight: 700, fontSize: '12px' }}>Sign in with Google to Connect Gmail</span>
                        </div>
                      </button>
                    </div>
                  )}

                  {gmailScanStatus && (
                    <div className="p-3 bg-blue-50/50 border border-blue-200 rounded text-slate-700 text-[11px] font-mono leading-relaxed">
                      ⚙️ <span className="font-bold">System Logs:</span> {gmailScanStatus}
                    </div>
                  )}
                </div>

                {/* Compliance Info Banner Card */}
                <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                    📡 Direct Webhook Integration Address (Live API)
                  </h3>
                  
                  <p className="text-xs text-slate-600 leading-relaxed font-sans">
                    Any standard email service provider (e.g. SendGrid Inbound Parse, Postmark, Mailgun) can be configured to post email payloads straight to this municipal server webhook in real-time.
                  </p>

                  <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 font-mono">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">LIVE INGESTION ENDPOINT URL</span>
                      <span className="text-xs font-bold text-[#dc2626] break-all select-all">
                        {typeof window !== 'undefined' ? `${window.location.origin}/api/inbound-email` : 'https://[your-dev-domain]/api/inbound-email'}
                      </span>
                    </div>
                    <button 
                      onClick={() => {
                        const url = typeof window !== 'undefined' ? `${window.location.origin}/api/inbound-email` : '';
                        navigator.clipboard.writeText(url);
                        alert('Inbound Email API Webhook endpoint copied!');
                      }}
                      className="py-1 px-2.5 bg-slate-200 hover:bg-slate-350 border border-slate-300 text-[10px] uppercase font-black tracking-wider rounded select-none cursor-pointer transition font-sans shrink-0 font-sans"
                    >
                      Copy End Point
                    </button>
                  </div>
                </div>

                {/* Email Composer Simulator Frame */}
                <div className="bg-white border border-slate-300 rounded-lg shadow-md overflow-hidden flex flex-col font-sans text-[#1e293b]">
                  {/* Header bar styled like an email client header */}
                  <div className="bg-slate-800 px-4 py-3 border-b border-slate-700 flex items-center justify-between text-white shrink-0">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 bg-red-500 rounded-full"></div>
                      <div className="w-2.5 h-2.5 bg-yellow-500 rounded-full"></div>
                      <div className="w-2.5 h-2.5 bg-green-500 rounded-full"></div>
                      <span className="text-[10px] text-slate-300 font-mono font-bold uppercase tracking-wider ml-2">Bureau Compliance Testbench v1.0</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono uppercase tracking-widest hidden sm:inline">MUNICIPAL SMTP SIM</span>
                  </div>

                  {/* Email Client Compose fields */}
                  <div className="p-4 bg-white border-b border-slate-200 space-y-3.5 text-xs text-[#1e293b]">
                    {/* From */}
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                      <span className="w-16 font-extrabold text-slate-500 uppercase tracking-wider text-[10px]">From:</span>
                      <input 
                        type="text"
                        value={emailFrom}
                        onChange={(e) => setEmailFrom(e.target.value)}
                        className="flex-grow font-mono bg-transparent border-none outline-none focus:ring-0 py-0 text-slate-800 font-bold"
                        placeholder="contractor-tech@yourdomain.com"
                      />
                    </div>

                    {/* To */}
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-2 bg-slate-50 px-1 py-0.5 rounded">
                      <span className="w-16 font-extrabold text-slate-500 uppercase tracking-wider text-[10px]">To:</span>
                      <span className="flex-grow font-mono text-[#dc2626] font-bold">{emailTo}</span>
                      <span className="text-[8px] bg-slate-200 px-1 text-slate-500 font-bold rounded uppercase font-sans">SYSTEM DIRECTED</span>
                    </div>

                    {/* Form fields that automatically generate Email subject/body */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-red-50/50 p-3 rounded-lg border border-red-500/10 text-slate-800">
                      {/* Target Property */}
                      <div className="sm:col-span-2">
                        <label className="text-[9px] font-black uppercase text-slate-500 block mb-0.5 tracking-wider font-sans">Target Property Venue</label>
                        <select
                          value={emailPropertyId}
                          onChange={(e) => setEmailPropertyId(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-bold text-slate-805"
                        >
                          {properties.map(p => (
                            <option key={p.id} value={p.id} className="text-slate-800">{p.name} [{p.id}]</option>
                          ))}
                        </select>
                      </div>

                      {/* Equipment Type */}
                      <div>
                        <label className="text-[9px] font-black uppercase text-slate-500 block mb-0.5 tracking-wider font-sans">System Type</label>
                        <select
                          value={emailEquipment}
                          onChange={(e) => setEmailEquipment(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-bold text-slate-805"
                        >
                          <option value="Fire Sprinkler">Fire Sprinkler</option>
                          <option value="Fire Alarm">Fire Alarm</option>
                          <option value="Kitchen Suppression">Kitchen Suppression</option>
                          <option value="Extinguishers">Extinguishers</option>
                          <option value="Fire Hydrants">Fire Hydrants</option>
                          <option value="Backflow Assembly">Backflow Assembly</option>
                        </select>
                      </div>

                      {/* System Status */}
                      <div>
                        <label className="text-[9px] font-black uppercase text-[#dc2626] block mb-0.5 tracking-wider font-sans">Audit Result</label>
                        <select
                          value={emailStatus}
                          onChange={(e) => setEmailStatus(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-bold text-slate-805"
                        >
                          <option value="Passed">🟢 Passed (Compliant)</option>
                          <option value="Passed with Deficiencies">🟡 Passed w/ Deficiencies</option>
                          <option value="Failed (Overdue Reinspect)">🔴 Critical Fail (Failed)</option>
                          <option value="Incomplete">Incomplete Test</option>
                        </select>
                      </div>

                      {/* Inspector Name */}
                      <div className="sm:col-span-2">
                        <label className="text-[9px] font-black uppercase text-slate-500 block mb-0.5 tracking-wider font-sans">Inspector Tag Signature</label>
                        <input 
                          type="text"
                          value={emailInspector}
                          onChange={(e) => setEmailInspector(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs font-bold font-sans text-slate-805"
                          placeholder="Sarah Thompson"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-[9px] font-black uppercase text-slate-500 block mb-0.5 tracking-wider font-sans">Filename Attachment (Mocked PDF)</label>
                        <div className="flex items-center gap-1.5 p-1 bg-white border border-slate-300 rounded text-slate-600 font-mono text-[10px]">
                          <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-semibold text-slate-800 shrink truncate">NFPA_AUDIT_REPORT_COMPLIANCE.pdf</span>
                          <span className="text-slate-400 ml-auto text-[9px] shrink-0">(1.4 MB)</span>
                        </div>
                      </div>
                    </div>

                    {/* Subject Line (Readonly simulation output) */}
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                      <span className="w-16 font-extrabold text-slate-500 uppercase tracking-wider text-[10px]">Subject:</span>
                      <input 
                        type="text"
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                        className="flex-grow font-mono bg-transparent border-none outline-none focus:ring-0 py-0 text-slate-800 font-extrabold animate-fade-in"
                        placeholder="Inspection Audit"
                      />
                    </div>
                  </div>

                  {/* Email Body field */}
                  <div className="p-4 bg-slate-50 flex-grow min-h-[220px] flex flex-col font-mono text-slate-800">
                    <span className="text-[8px] text-slate-400 block uppercase font-bold tracking-wider mb-1">EMAIL MESSAGE BODY TEXT</span>
                    <textarea 
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      rows={12}
                      className="w-full flex-grow bg-white border border-slate-200 rounded p-3 text-xs text-slate-850 focus:outline-none focus:ring-1 focus:ring-[#dc2626] resize-y leading-relaxed font-mono"
                    />
                  </div>

                  {/* Submit Email Button / Success messages */}
                  <div className="p-4 border-t border-slate-200 bg-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
                    <div className="text-[10px] text-slate-500 font-semibold font-mono leading-tight">
                      💡 Dispatch simulates real compliance parsing to test automatic database compilation.
                    </div>
                    
                    <button
                      onClick={async () => {
                        if (!emailFrom || !emailSubject || !emailBody) {
                          alert('Required fields must be filled out before simulation');
                          return;
                        }
                        
                        try {
                          setEmailSending(true);
                          setEmailSuccessMsg('');
                          
                          const response = await fetch('/api/inbound-email', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              from: emailFrom,
                              subject: emailSubject,
                              body: emailBody,
                              attachmentName: 'NFPA_AUDIT_REPORT_COMPLIANCE.pdf',
                              attachmentSize: '1.4 MB'
                            })
                          });

                          const result = await response.json();
                          
                          if (response.ok && result.success) {
                            setEmailSuccessMsg(`🎉 Email processed successfully! Matched ${result.emailLog.matchedProperty} and compiled a raw report under reference ID: ${result.emailLog.reportCreatedId}`);
                          } else {
                            alert(`Parser Ingestion Error: ${result.error || 'Server rejected format'}`);
                          }
                        } catch (e) {
                          console.error('Email send err:', e);
                          alert('Direct connection to container endpoint failed.');
                        } finally {
                          setEmailSending(false);
                        }
                      }}
                      disabled={emailSending}
                      className="py-2.5 px-6 bg-[#dc2626] hover:bg-red-750 disabled:bg-slate-400 text-white rounded text-xs font-extrabold uppercase tracking-widest cursor-pointer select-none transition flex items-center justify-center gap-2 shadow-sm shrink-0 font-sans"
                    >
                      {emailSending ? (
                        <>
                          <RotateCw className="w-3.5 h-3.5 animate-spin" /> Ingesting Email...
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" /> Dispatch test Mail
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {emailSuccessMsg && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-sans font-semibold flex items-center gap-2 animate-fade-in">
                    <div className="p-1 bg-emerald-100 rounded-full text-emerald-700 shrink-0">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                    <span>{emailSuccessMsg}</span>
                  </div>
                )}
              </div>

              {/* Right side: Active Processing Logs */}
              <div className="lg:col-span-12 xl:col-span-5 flex flex-col h-full min-h-0">
                <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4 flex flex-col h-full min-h-0">
                  <div className="pb-3 border-b border-slate-250 mb-3 flex items-center justify-between shrink-0">
                    <div>
                      <h3 className="text-xs font-black uppercase text-[#0f172a] tracking-wider flex items-center gap-1.5 font-sans">
                        📟 Real-Time Email Webhook Parse Logs
                      </h3>
                      <p className="text-[10px] text-slate-400 font-mono uppercase mt-0.5">Live database ingress logger</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleRefreshClick}
                        disabled={isRefreshing}
                        className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-sans font-black uppercase tracking-wider transition select-none cursor-pointer border ${
                          justSynced
                            ? 'bg-emerald-50 border-emerald-250 text-emerald-700'
                            : 'bg-indigo-50 border-indigo-250 hover:bg-indigo-100 text-indigo-750'
                        }`}
                        title="Sync Inbound Webhook Logs"
                      >
                        <RotateCw className={`w-2.5 h-2.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                        {isRefreshing ? 'Syncing...' : justSynced ? 'Synced!' : 'Sync logs'}
                      </button>
                      <span className="text-[9px] bg-[#dc2626] text-white px-1.5 py-0.5 rounded font-bold font-mono animate-pulse shrink-0">LIVE STATE</span>
                    </div>
                  </div>

                  {/* Log listing */}
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-[300px]">
                    {inboundEmails && inboundEmails.length > 0 ? (
                      inboundEmails.map((log: any) => {
                        return (
                          <div key={log.id} className="p-3 bg-slate-50 rounded border border-slate-200 font-mono text-[10px] space-y-2 hover:bg-slate-100 transition animate-fade-in text-[#1e293b]">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400 font-bold">{new Date(log.receivedAt).toLocaleString()}</span>
                              <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-extrabold text-[8px] uppercase tracking-wider">{log.status}</span>
                            </div>

                            <div className="font-bold text-[#0f172a] uppercase text-[11px] font-sans truncate">
                              {log.subject}
                            </div>

                            <div className="space-y-1.5 border-t border-dashed border-slate-200 pt-1.5 text-slate-600">
                              <div className="flex items-center justify-between">
                                <span>Source sender:</span>
                                <span className="text-slate-900 font-extrabold truncate max-w-[170px]">{log.from}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span>Matched Venue:</span>
                                <span className="text-slate-950 font-extrabold truncate max-w-[170px]">{log.matchedProperty}</span>
                              </div>
                              <div className="flex items-center justify-between font-sans">
                                <span>Compiled Report ID:</span>
                                <div className="flex items-center gap-1">
                                  <span className="text-[#dc2626] font-bold">{log.reportCreatedId}</span>
                                  <button
                                    onClick={() => {
                                      setActiveTab('reports');
                                      setTimeout(() => {
                                        const rEl = document.getElementById(`report-row-${log.reportCreatedId}`);
                                        if (rEl) {
                                          rEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                          rEl.classList.add('bg-amber-100');
                                          setTimeout(() => rEl.classList.remove('bg-amber-100'), 3000);
                                        }
                                      }, 300);
                                    }}
                                    className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-350 text-slate-705 font-extrabold rounded text-[8px] cursor-pointer border border-slate-150"
                                  >
                                    View Report
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-slate-400 bg-slate-50 rounded border border-dashed border-slate-200 min-h-[320px]">
                        <div className="p-3 bg-slate-100 rounded-full text-slate-350">
                          <Mail className="w-8 h-8" />
                        </div>
                        <h4 className="font-bold font-sans uppercase text-xs text-slate-700">No Webhook Inbound Entries Logs Found</h4>
                        <p className="text-[10px] max-w-[200px] leading-relaxed font-sans">
                          Send a test compliance email or configure the live webhook endpoint to generate entries logs.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>

          </div>
        ) : activeTab === 'dashboard' ? (
          <ComplianceDashboard
            properties={properties}
            reports={reports}
            contractors={contractors}
          />
        ) : activeTab === 'deficiencies' ? (
          <DeficienciesTracker
            reports={reports}
            properties={properties}
            user={{ ...user, role: 'bureau' }}
            onUpdateReports={onUpdateReports || (() => {})}
          />
        ) : null}

      </div>

      {/* Real-time Unique QR Scanner Viewport Simulation Overlay */}
      {isScanningActive && scanningContractor && (
        <div className="fixed inset-0 bg-[#0f172a]/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes scanEffect {
              0% { top: 0%; }
              50% { top: 100%; }
              100% { top: 0%; }
            }
          `}} />
          <div className="bg-white border-2 border-[#dc2626] rounded max-w-sm w-full overflow-hidden shadow-2xl relative">
            <div className="p-4 bg-[#dc2626] text-white flex items-center gap-2 font-sans font-extrabold uppercase text-xs tracking-wider">
              <Camera className="w-4 h-4 animate-pulse text-white" />
              <span>COMMISSION DECIPHER: SCANNING VIEWPORT</span>
            </div>
            <div className="p-6 flex flex-col items-center justify-center space-y-5 text-center bg-slate-50">
              
              {/* Viewfinder with scanning laser */}
              <div className="relative w-44 h-44 border-4 border-[#dc2626] flex items-center justify-center bg-[#070b10] rounded overflow-hidden">
                {/* Laser Line */}
                <div 
                  className="absolute left-0 w-full h-1 bg-emerald-400 shadow shadow-emerald-500 z-10" 
                  style={{ animation: 'scanEffect 2s infinite linear' }}
                />
                
                <QRCodeSVG 
                  value={buildContractorPublicUrl(getPublicDomainUrl(qrMode, customDomain) || "https://fire-inspect.local", scanningContractor)}
                  size={100}
                  fgColor="#ffffff"
                  bgColor="#070b10"
                  className="relative z-2"
                />
              </div>

              <div className="space-y-2 w-full">
                <span className="text-[9px] font-mono tracking-widest text-[#dc2626] font-extrabold block uppercase">SYSTEM OPTICAL CHANNEL active</span>
                <p className="text-xs text-slate-800 font-extrabold font-mono h-8 flex items-center justify-center px-1 border border-slate-200 bg-white rounded">
                  {scanStatusMsg}
                </p>
                <div className="text-[10px] text-slate-500 font-mono tracking-wider font-bold">
                  Target: {scanningContractor.id} ({scanningContractor.licenseNumber})
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Photo Expansion Lightbox Modal */}
      {lightboxPhotoUrl && (
        <div 
          onClick={() => setLightboxPhotoUrl(null)}
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-[60] flex flex-col items-center justify-center p-4 cursor-zoom-out select-none animate-fade-in"
        >
          <div className="relative max-w-4xl w-full flex flex-col items-center justify-center">
            {/* Close button overlay */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxPhotoUrl(null);
              }}
              className="absolute -top-10 right-0 py-1.5 px-3 text-white/80 hover:text-white bg-white/10 rounded hover:bg-white/20 transition cursor-pointer text-xs uppercase font-extrabold flex items-center gap-1.5"
              title="Close Image View"
            >
              <X className="w-4 h-4" /> Close Viewer
            </button>
            
            <div 
              onClick={(e) => e.stopPropagation()} 
              className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex items-center justify-center max-h-[75vh] w-full p-2 shadow-2xl"
            >
              <img 
                src={lightboxPhotoUrl} 
                alt="Expanded physical NFPA report document" 
                className="max-h-[70vh] max-w-full object-contain rounded"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="text-center text-white/60 font-mono text-[11px] mt-4 uppercase tracking-wider">
              Verification Proof Image • Click anywhere outside to dismiss
            </div>
          </div>
        </div>
      )}

      {/* On-the-Spot Building Node Registration Modal */}
      {isAddPropertyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm select-none">
          <div className="w-full max-w-lg bg-white border border-[#cbd5e1] rounded shadow-2xl overflow-hidden text-[#1e293b] flex flex-col animate-fade-in">
            
            {/* Modal Header */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-[#1e293b]">
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5 text-[#dc2626]" />
                <div>
                  <h3 className="text-sm font-extrabold tracking-tight text-[#0f172a] uppercase font-sans">
                    Register New Building Node
                  </h3>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                    Authorized Bureau administrative addition to the property safety registry.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddPropertyModalOpen(false)}
                className="text-slate-400 hover:text-rose-600 p-1.5 text-sm bg-slate-100 rounded cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleAddPropertySubmit} className="p-5 space-y-4 font-sans bg-white text-[#1e293b]">
              {/* Node Name */}
              <div>
                <label className="block text-[10px] text-slate-500 mb-1 font-bold uppercase tracking-wider">
                  Facility / Building Node Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. OCEAN COUNTY SEAPORT MALL"
                  value={newPropName}
                  onChange={(e) => setNewPropName(e.target.value)}
                  className="w-full bg-white border border-[#cbd5e1] rounded px-2.5 py-1.5 text-xs text-[#1e293b] focus:outline-none focus:ring-1 focus:ring-[#dc2626] focus:border-[#dc2626] font-sans font-bold"
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-[10px] text-slate-500 mb-1 font-bold uppercase tracking-wider">
                  Street Address
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 520 Main Street Blvd"
                  value={newPropAddress}
                  onChange={(e) => setNewPropAddress(e.target.value)}
                  className="w-full bg-white border border-[#cbd5e1] rounded px-2.5 py-1.5 text-xs text-[#1e293b] focus:outline-none focus:ring-1 focus:ring-[#dc2626] focus:border-[#dc2626] font-sans font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 font-sans">
                {/* City */}
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1 font-bold uppercase tracking-wider">
                    City / Municipality
                  </label>
                  <input
                    type="text"
                    required
                    value={newPropCity}
                    onChange={(e) => setNewPropCity(e.target.value)}
                    className="w-full bg-white border border-[#cbd5e1] rounded px-2.5 py-1.5 text-xs text-[#1e293b] focus:outline-none focus:ring-1 focus:ring-[#dc2626] focus:border-[#dc2626] font-sans font-bold"
                  />
                </div>

                {/* Zip */}
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1 font-bold uppercase tracking-wider">
                    Zip Code
                  </label>
                  <input
                    type="text"
                    required
                    value={newPropZip}
                    onChange={(e) => setNewPropZip(e.target.value)}
                    className="w-full bg-white border border-[#cbd5e1] rounded px-2.5 py-1.5 text-xs text-[#1e293b] focus:outline-none focus:ring-1 focus:ring-[#dc2626] focus:border-[#dc2626] font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 font-sans">
                {/* Standard Compulsory Template Selector */}
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1 font-bold uppercase tracking-wider">
                    Required NFPA standard
                  </label>
                  <select
                    value={newPropTemplate}
                    onChange={(e) => setNewPropTemplate(e.target.value)}
                    className="w-full bg-white border border-[#cbd5e1] text-[#1e293b] rounded px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#dc2626] focus:border-[#dc2626] font-bold"
                  >
                    <option value="NFPA 25 Sprinkler System">NFPA 25 Sprinkler System</option>
                    <option value="NFPA 72 Fire Alarm Testing">NFPA 72 Fire Alarm Testing</option>
                    <option value="NFPA 10 Portable Extinguishers">NFPA 10 Portable Extinguishers</option>
                    <option value="NFPA 96 Hood Suppression">NFPA 96 Hood Suppression</option>
                    <option value="NFPA 14 Standpipe Main Duct">NFPA 14 Standpipe Main Duct</option>
                    <option value="Backflow Assembly Certification">Backflow Assembly Certification</option>
                  </select>
                </div>

                {/* Initial Status */}
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1 font-bold uppercase tracking-wider">
                    Initial Safety Status
                  </label>
                  <select
                    value={newPropStatus}
                    onChange={(e) => setNewPropStatus(e.target.value as any)}
                    className="w-full bg-white border border-[#cbd5e1] text-[#1e293b] rounded px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#dc2626] focus:border-[#dc2626] font-bold"
                  >
                    <option value="Inspection">🔴 Needs Inspection</option>
                    <option value="Complete">🟢 Fully Certified Compliant</option>
                    <option value="Reinspect">🟣 Requires Re-inspection</option>
                  </select>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-[10px] text-slate-500 font-mono">
                ℹ️ Map Coordinates (Latitude/Longitude) will be generated automatically to display on the municipal track grid.
              </div>

              {/* Form Actions */}
              <div className="pt-3 border-t border-slate-200 flex justify-end gap-3 font-sans">
                <button
                  type="button"
                  onClick={() => setIsAddPropertyModalOpen(false)}
                  className="py-1.5 px-3 bg-slate-200 hover:bg-slate-300 rounded text-xs font-bold text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-1.5 px-4 bg-[#dc2626] hover:bg-red-750 text-xs font-bold text-white rounded shadow-sm flex items-center gap-1 cursor-pointer uppercase tracking-wider"
                >
                  <Building className="w-4 h-4" /> Register Node
                </button>
              </div>

            </form>
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
                      ? 'text-rose-500 border-rose-500' 
                      : 'text-slate-450 hover:text-slate-200 border-transparent'
                  }`}
                >
                  📄 View Original Uploaded PDF/Image
                </button>
                <button
                  type="button"
                  onClick={() => setDocPreviewTab('cert')}
                  className={`py-2 px-3 text-[11px] font-bold uppercase transition border-b-2 cursor-pointer ${
                    docPreviewTab === 'cert' 
                      ? 'text-rose-500 border-rose-500' 
                      : 'text-slate-450 hover:text-slate-200 border-transparent'
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
                          <h4 className="text-sm font-black uppercase text-slate-800">No Document File Data Available</h4>
                          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
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
              /* Modal Scrollable Content Sheet */
              <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-50 text-slate-800 text-left">
                
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
                    <div className="text-right text-[10px] font-mono text-slate-400 leading-normal col">
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
                    <div className="border-t border-slate-100 pt-3 text-left">
                      <span className="text-[9px] text-slate-400 block uppercase font-bold font-mono">Licensed Contractor:</span>
                      <span className="text-[#dc2626] block font-sans font-black leading-tight uppercase mt-0.5">{selectedReportForDocPreview.contractorName}</span>
                      <span className="text-slate-400 text-[9px] font-bold font-mono">License Code: {selectedReportForDocPreview.contractorId === 'con-2' ? 'F-44120-C' : selectedReportForDocPreview.contractorId === 'con-3' ? 'F-92811-C' : 'F-88291-C'}</span>
                    </div>
                    <div className="border-t border-slate-100 pt-3 text-left">
                      <span className="text-[9px] text-slate-400 block uppercase font-bold font-mono">Registering Field Tech:</span>
                      <span className="text-slate-800 block font-sans font-bold leading-tight mt-0.5">{selectedReportForDocPreview.inspectorName}</span>
                      <span className="text-slate-500 block text-[9.5px] font-semibold">Level II Field System Auditor</span>
                    </div>
                  </div>
                </div>

                {/* Subsystem categorization check row */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm text-center col">
                    <span className="text-[9px] text-slate-400 font-mono block uppercase font-bold">Inspected Regulatory Class</span>
                    <span className="text-xs font-black text-slate-800 block font-sans mt-0.5 uppercase tracking-tight">{selectedReportForDocPreview.equipmentType}</span>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm text-center col">
                    <span className="text-[9px] text-slate-400 font-mono block uppercase font-bold">compliance status</span>
                    <span className={`text-xs font-extrabold block mt-0.5 uppercase tracking-tight ${
                      selectedReportForDocPreview.status.includes('Passed') ? 'text-emerald-700' : 'text-rose-700'
                    }`}>{selectedReportForDocPreview.status}</span>
                  </div>
                </div>

                {/* Uploaded Certificate Proof Metadata */}
                <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-4 space-y-2 text-left col">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold font-mono tracking-wider text-left">PRIMARY COMPLIANCE ATTACHMENT FILES</span>
                  
                  <div className="space-y-2.5">
                    {getReportFiles(selectedReportForDocPreview).map((matchedFile, idx) => {
                      return (
                        <div 
                          key={idx}
                          onClick={() => downloadDocFile(matchedFile, selectedReportForDocPreview)}
                          className="flex items-center justify-between bg-slate-50 hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300 transition p-2.5 rounded cursor-pointer group"
                          title="Click to Download / View this file"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="bg-blue-50 text-blue-600 p-2 rounded group-hover:bg-[#dc2626] group-hover:text-white transition shrink-0">
                              <FileSpreadsheet className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 text-left">
                              <span className="text-xs font-bold text-slate-800 block font-mono truncate max-w-[210px] sm:max-w-xs group-hover:text-slate-905">{matchedFile.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono block text-left">
                                Compliance Archive Proof • <span className="text-[#dc2626] font-extrabold group-hover:underline">📄 Click to View / Open</span>
                              </span>
                            </div>
                          </div>
                          <span className="text-[8.5px] font-mono font-black text-emerald-850 bg-emerald-100 px-2 py-0.5 border border-emerald-300 rounded shrink-0 group-hover:bg-emerald-200 transition">
                            OPEN 📄
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Deficiencies or Safety Violations list */}
                <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-4 space-y-2 text-left col">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold font-mono tracking-wider">REGULATORY DEFICIENCY LIST</span>
                  {selectedReportForDocPreview.deficiencies.length === 0 ? (
                    <div className="p-3 text-center text-xs text-emerald-850 bg-emerald-50 border border-emerald-200 rounded font-mono font-semibold leading-normal w-full">
                      ✔ All compliance aspects satisfied. No deficiencies or regulatory violations logged page 1.
                    </div>
                  ) : (
                    <div className="space-y-1.5 text-left w-full">
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
                  <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-4 space-y-2 text-left bg-slate-50 col">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold font-mono tracking-wider">Inspector Notes & Field Remarks</span>
                    <p className="bg-white border border-slate-200 p-3 rounded text-[11px] leading-relaxed italic text-slate-655 font-mono">
                      "{selectedReportForDocPreview.notes}"
                    </p>
                  </div>
                )}

                {/* Photos attachment ledger timeline */}
                {selectedReportForDocPreview.photos && selectedReportForDocPreview.photos.length > 0 && (
                  <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-4 space-y-3 col">
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
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-xs space-y-2 text-left col">
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
                      <span className="text-[10.5px] text-slate-500 font-mono uppercase font-bold">Status Validated</span>
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

      {/* Real-time Smartphone QR Scanner Viewport Simulation Overlay */}
      {scannerActive && (
        <div className="fixed inset-0 bg-[#0f172a]/95 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none">
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes scanLineEffectBureau {
              0% { top: 0%; }
              50% { top: 100%; }
              100% { top: 0%; }
            }
          `}} />
          <div className="bg-white border-2 border-[#dc2626] rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl relative">
            <div className="p-4 bg-[#dc2626] text-white flex items-center gap-2 font-sans font-extrabold uppercase text-xs tracking-wider">
              <Camera className="w-4 h-4 animate-pulse text-white" />
              <span>FIELD OPTICAL CHANNEL: SAFETY TAG SCANNER</span>
            </div>
            
            <div className="p-6 flex flex-col items-center justify-center space-y-5 text-center bg-slate-50">
              
              {/* Device Viewfinder */}
              <div className="relative w-48 h-48 border-4 border-[#dc2626] flex items-center justify-center bg-[#070b10] rounded-2xl overflow-hidden shadow-inner">
                {/* Simulated Red Laser Line */}
                <div 
                  className="absolute left-0 w-full h-1 bg-red-500 shadow shadow-red-500 z-10" 
                  style={{ animation: 'scanLineEffectBureau 2s infinite linear' }}
                />
                
                <QRCodeSVG 
                  value={`${getPublicDomainUrl(qrMode, customDomain) || "https://fire-inspect.local"}/?verify=${selectedStickerToScan}`}
                  size={110}
                  fgColor="#ffffff"
                  bgColor="#070b10"
                  className="relative z-2"
                />
              </div>

              <div className="space-y-2 w-full">
                <span className="text-[10px] font-mono tracking-widest text-[#dc2626] font-extrabold block uppercase leading-none">Scanning dynamic QR safety tag</span>
                <p className="text-xs text-slate-800 font-extrabold font-mono h-10 flex items-center justify-center px-1.5 border border-slate-200 bg-white rounded shadow-sm">
                  {scanningStatus || 'INGESTING SYSTEM CERTIFICATE...'}
                </p>
                <div className="text-[10px] text-slate-500 font-mono tracking-wider font-bold">
                  Target Record Reference: {selectedStickerToScan}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Certified QR Compliance Stamp Modal */}
      {scannedResult && (
        <div className="fixed inset-0 bg-[#0f172a]/75 backdrop-blur-xs z-[60] flex items-center justify-center p-4 select-none">
          <div className="bg-white border-2 border-emerald-500 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl relative text-left">
            
            {/* Header Stamp bar */}
            <div className="p-4 bg-emerald-600 text-white flex justify-between items-center select-none">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-white" />
                <div>
                  <h3 className="text-xs font-black uppercase text-white font-sans leading-none">
                    REGULATORY STATUS VERIFIED
                  </h3>
                  <span className="text-[9px] text-emerald-100 font-mono block mt-1 uppercase leading-none">
                    OFFICIAL STATE CODE REGISTRY CERTIFIED
                  </span>
                </div>
              </div>
              <button
                onClick={() => setScannedResult(null)}
                className="text-white/80 hover:text-white p-1 hover:bg-emerald-700 rounded transition cursor-pointer"
                title="Close Alert"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              
              {/* Compliance Stamp Block */}
              <div className="border-2 border-emerald-500 border-dashed rounded-lg p-3.5 bg-emerald-50/50 flex items-center gap-3 relative overflow-hidden">
                <div className="absolute -right-6 -bottom-6 w-24 h-24 text-emerald-100 pointer-events-none rotate-12">
                  <ShieldCheck className="w-full h-full" />
                </div>
                <div className="p-2 bg-emerald-100 rounded-full text-emerald-700 shrink-0">
                  <CheckCircle className="w-6 h-6 shrink-0" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-slate-900 uppercase font-sans">Decoded Verification Stamp</h4>
                  <p className="text-[10.5px] text-emerald-700 font-mono mt-0.5 font-bold">
                    ID: {scannedResult.id.toUpperCase()} • STATUS: Passed
                  </p>
                  <p className="text-[10.5px] text-slate-550 leading-relaxed mt-1 font-sans">
                    Compliance status generated from certified municipal cloud database. Validated for immediate operations.
                  </p>
                </div>
              </div>

              {/* Data Rows for Scanned Item */}
              <div className="space-y-2 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200 font-mono">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-400 uppercase text-[9.5px] shrink-0">Facility Name:</span>
                  <span className="text-slate-800 font-black truncate max-w-[200px] font-sans">{scannedResult.propertyName}</span>
                </div>
                <div className="h-[1px] bg-slate-200" />
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-400 uppercase text-[9.5px] shrink-0">Asset Location:</span>
                  <span className="text-slate-800 font-bold truncate max-w-[200px]">{scannedResult.propertyAddress}</span>
                </div>
                <div className="h-[1px] bg-slate-200" />
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-400 uppercase text-[9.5px] shrink-0">Filing Contractor:</span>
                  <span className="text-slate-800 font-bold truncate max-w-[200px] font-sans">{scannedResult.contractorName}</span>
                </div>
                <div className="h-[1px] bg-slate-200" />
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-400 uppercase text-[9.5px] shrink-0">Submittal System:</span>
                  <span className="text-slate-850 font-black text-slate-900 font-sans">{scannedResult.equipmentType}</span>
                </div>
                <div className="h-[1px] bg-slate-200" />
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-400 uppercase text-[9.5px] shrink-0">Official Status:</span>
                  <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase font-sans tracking-wide">
                    {scannedResult.status}
                  </span>
                </div>
                <div className="h-[1px] bg-slate-200" />
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-400 uppercase text-[9.5px] shrink-0">Certify Date:</span>
                  <span className="text-slate-805 font-bold">{scannedResult.date}</span>
                </div>
              </div>

              {/* Action and Redirect Deep Links */}
              <div className="flex flex-col sm:flex-row gap-2 pt-1 font-sans">
                <a 
                  href={`${getPublicDomainUrl(qrMode, customDomain) || "https://fire-inspect.local"}/?verify=${scannedResult.id}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase rounded text-center tracking-wide shadow-sm flex items-center justify-center gap-1.5 cursor-pointer leading-none"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open Public Verification Page
                </a>
                <button
                  onClick={() => {
                    setScannedResult(null);
                    setSelectedReportId(scannedResult.id);
                    setActiveTab('reports');
                    setTimeout(() => {
                      const rEl = document.getElementById(`report-row-${scannedResult.id}`);
                      if (rEl) {
                        rEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        rEl.classList.add('bg-amber-100');
                        setTimeout(() => rEl.classList.remove('bg-amber-100'), 3000);
                      }
                    }, 350);
                  }}
                  className="py-2 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-705 text-xs font-bold uppercase rounded border border-slate-250 transition cursor-pointer"
                >
                  Inspect in Backoffice
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Interactive Certified Contractor ID Verification Stamp Modal */}
      {scannedContractorResult && (
        <div className="fixed inset-0 bg-[#0f172a]/75 backdrop-blur-xs z-[60] flex items-center justify-center p-4 select-none">
          <div className="bg-white border-2 border-[#dc2626] rounded-2xl max-w-md w-full overflow-hidden shadow-2xl relative text-left animate-fade-in">
            
            {/* Header Stamp bar */}
            <div className="p-4 bg-[#dc2626] text-white flex justify-between items-center select-none">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-white" />
                <div>
                  <h3 className="text-xs font-black uppercase text-white font-sans leading-none">
                    LICENSED AGENCY STANDING VERIFIED
                  </h3>
                  <span className="text-[9px] text-rose-100 font-mono block mt-1 uppercase leading-none">
                    ST REGISTERED CONTRACTOR SECURITY CLEARANCE
                  </span>
                </div>
              </div>
              <button
                onClick={() => setScannedContractorResult(null)}
                className="text-white/80 hover:text-white p-1 hover:bg-rose-700 rounded transition cursor-pointer"
                title="Close Alert"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              
              {/* Profile Card Stamp */}
              <div className="border-2 border-[#dc2626] border-dashed rounded-lg p-3 bg-red-50 flex items-center gap-3 relative overflow-hidden">
                <div className="absolute -right-5 -bottom-5 w-24 h-24 text-red-101 pointer-events-none rotate-12 bg-none opacity-10">
                  <QrCode className="w-full h-full text-red-650" />
                </div>
                <div className="p-2.5 bg-red-150 rounded-full text-[#dc2626] border border-red-250 shrink-0">
                  <ShieldCheck className="w-6 h-6 shrink-0" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase font-sans">Active Contractor Verified</h4>
                  <p className="text-[11px] text-[#dc2626] font-mono mt-0.5 font-bold">
                    LICENSE: {scannedContractorResult.licenseNumber} • STATUS: Active Standing
                  </p>
                  <p className="text-[10px] text-slate-505 mt-1 leading-normal font-sans">
                    Secure on-site lookup validated against live fire databases. Registered with the Bureau of Fire Prevention.
                  </p>
                </div>
              </div>

              {/* Contractor Details list */}
              <div className="space-y-2 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200 font-mono">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-400 uppercase text-[9.5px] shrink-0">Agency Name:</span>
                  <span className="text-slate-800 font-black truncate max-w-[200px] font-sans">{scannedContractorResult.name}</span>
                </div>
                <div className="h-[1px] bg-slate-200" />
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-400 uppercase text-[9.5px] shrink-0">License Identification:</span>
                  <span className="text-slate-800 font-bold">{scannedContractorResult.licenseNumber}</span>
                </div>
                <div className="h-[1px] bg-slate-200" />
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-400 uppercase text-[9.5px] shrink-0">Contact Number:</span>
                  <span className="text-slate-800 font-bold">{scannedContractorResult.phone}</span>
                </div>
                <div className="h-[1px] bg-slate-200" />
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-400 uppercase text-[9.5px] shrink-0">Registered Email:</span>
                  <span className="text-slate-800 font-bold font-sans">{scannedContractorResult.email}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 font-sans pt-1">
                <a
                  href={buildContractorPublicUrl(getPublicDomainUrl(qrMode, customDomain) || "https://fire-inspect.local", scannedContractorResult)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2 bg-[#dc2626] hover:bg-black text-white text-xs font-black uppercase rounded flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm text-center leading-none"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open Public Profile Registry Page
                </a>
                <button
                  onClick={() => {
                    setContractorFilter(scannedContractorResult.id);
                    setScannedContractorResult(null);
                    setActiveTab('reports');
                  }}
                  className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-705 text-xs font-bold uppercase rounded border border-slate-250 transition cursor-pointer"
                >
                  Filter Reports by them
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {showLiveWebcamScanner && (
        <QRCameraScanner 
          onClose={() => setShowLiveWebcamScanner(false)} 
          onScanSuccess={handleLiveQRScanSuccess} 
        />
      )}

    </div>
  );
}
