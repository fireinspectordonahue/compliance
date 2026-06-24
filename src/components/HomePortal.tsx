/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { UserInfo, Contractor } from '../types';
import { ShieldCheck, Flame, ShieldAlert, Key, Plus, Camera } from 'lucide-react';
import Logo from './Logo';
import QRCameraScanner from './QRCameraScanner';

interface HomePortalProps {
  onLogin: (user: UserInfo) => void;
  contractors: Contractor[];
  onAddContractor: (conData: Omit<Contractor, 'id' | 'activeReportsCount'>) => Contractor;
  bureauAccounts: { id: string; name: string; password: string }[];
  onUpdateBureauAccounts: (newAccounts: { id: string; name: string; password: string }[]) => void;
  onNavigateToPublicVerification?: (vId: string | null, cId: string | null) => void;
}

export default function HomePortal({ 
  onLogin, 
  contractors, 
  onAddContractor,
  bureauAccounts,
  onUpdateBureauAccounts,
  onNavigateToPublicVerification
}: HomePortalProps) {
  // Toggle states
  const [isRegistering, setIsRegistering] = useState(contractors.length === 0);
  const [showQRScanner, setShowQRScanner] = useState(false);

  const handleQRScanSuccess = (decodedText: string) => {
    setShowQRScanner(false);
    console.log("Scanned QR raw code content received:", decodedText);
    try {
      // Use premium robust regex parsing to extract parameters whether in search query or hash router configurations
      let vId: string | null = null;
      let cId: string | null = null;

      // Extract ?verify= or &verify=
      const verifyMatch = decodedText.match(/[?&]verify=([^&?#]+)/);
      if (verifyMatch && verifyMatch[1]) {
        vId = decodeURIComponent(verifyMatch[1]);
      }

      // Extract ?contractor= or &contractor=
      const contractorMatch = decodedText.match(/[?&]contractor=([^&?#]+)/);
      if (contractorMatch && contractorMatch[1]) {
        cId = decodeURIComponent(contractorMatch[1]);
      }

      // Also support direct public routes like /verify/rep-1 and /contractor/con-1
      if (!vId) {
        const verifyPathMatch = decodedText.match(/\/verify\/([^/?#&]+)/);
        if (verifyPathMatch && verifyPathMatch[1]) {
          vId = decodeURIComponent(verifyPathMatch[1]);
        }
      }
      if (!cId) {
        const contractorPathMatch = decodedText.match(/\/contractor\/([^/?#&]+)/);
        if (contractorPathMatch && contractorPathMatch[1]) {
          cId = decodeURIComponent(contractorPathMatch[1]);
        }
      }

      // Fallback for raw IDs
      if (!vId && !cId) {
        if (decodedText.startsWith('rep-') || decodedText.startsWith('report-')) {
          vId = decodedText;
        } else if (decodedText.startsWith('con-') || decodedText.startsWith('contractor-')) {
          cId = decodedText;
        }
      }

      if (vId) {
        console.log("Parsed Verification ID:", vId);
        if (onNavigateToPublicVerification) {
          onNavigateToPublicVerification(vId, null);
        } else {
          window.history.pushState(null, '', `?verify=${vId}`);
          window.dispatchEvent(new PopStateEvent('popstate'));
        }
      } else if (cId) {
        console.log("Parsed Contractor ID:", cId);
        if (onNavigateToPublicVerification) {
          onNavigateToPublicVerification(null, cId);
        } else {
          window.history.pushState(null, '', `/contractor/${cId}`);
          window.dispatchEvent(new PopStateEvent('popstate'));
        }
      } else {
        // If not containing our app tokens, only set href if it explicitly looks like an external secure URL 
        // using window.open to prevent unexpected resetting/reloading loops inside the iframe.
        if (decodedText.startsWith('http://') || decodedText.startsWith('https://')) {
          console.log("Redirecting to external scanned URL:", decodedText);
          window.open(decodedText, '_blank', 'noopener,noreferrer');
        } else {
          alert(`Scanned Decoded Target: "${decodedText}"`);
        }
      }
    } catch (e) {
      console.error('Failed to parse decoded QR target:', e);
      alert(`Scanned Decoded Target: "${decodedText}"`);
    }
  };

  // Selector state
  const [selectedContractorId, setSelectedContractorId] = useState('');
  const [contractorInspector, setContractorInspector] = useState('');
  const [contractorLicense, setContractorLicense] = useState('');
  const [typedContractorLicense, setTypedContractorLicense] = useState('');

  // Register agency inputs
  const [newConName, setNewConName] = useState('');
  const [newConLicense, setNewConLicense] = useState('');
  const [newConEmail, setNewConEmail] = useState('');
  const [newConPhone, setNewConPhone] = useState('');

  // Bureau state
  const [selectedBureauId, setSelectedBureauId] = useState('bureau-1');
  const [isRegisteringBureau, setIsRegisteringBureau] = useState(false);

  // Bureau inputs
  const [bureauName, setBureauName] = useState('');
  const [bureauPassword, setBureauPassword] = useState('');
  const [bureauConfirmPassword, setBureauConfirmPassword] = useState('');

  // Validation feedback
  const [contractorError, setContractorError] = useState('');
  const [bureauError, setBureauError] = useState('');

  // Sync registering flag if contractors count updates
  const effectiveIsRegistering = isRegistering || contractors.length === 0;

  useEffect(() => {
    if (contractors.length > 0) {
      const alreadyValid = contractors.find(c => c.id === selectedContractorId);
      if (!alreadyValid) {
        const first = contractors[0];
        setSelectedContractorId(first.id);
        setContractorLicense(first.licenseNumber);
      }
    } else {
      setIsRegistering(true);
    }
  }, [contractors, selectedContractorId]);

  const handleContractorSelect = (id: string) => {
    setSelectedContractorId(id);
    const found = contractors.find(c => c.id === id);
    if (found) {
      setContractorLicense(found.licenseNumber);
    }
    setTypedContractorLicense('');
    setContractorError('');
  };

  const handleContractorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setContractorError('');

    if (effectiveIsRegistering) {
      if (!newConName.trim() || !newConLicense.trim()) {
        setContractorError('Please fill out the contractor agency name and license number.');
        return;
      }
      if (!contractorInspector.trim()) {
        setContractorError('Active Field Inspector name is required.');
        return;
      }
      const newCon = onAddContractor({
        name: newConName.trim(),
        licenseNumber: newConLicense.trim(),
        email: newConEmail.trim() || 'contact@agency-testing.com',
        phone: newConPhone.trim() || '(609) 555-0100',
      });
      onLogin({
        id: `user-${newCon.id}`,
        name: contractorInspector.trim(),
        role: 'contractor',
        contractorId: newCon.id,
        email: newCon.email,
      });
    } else {
      const selectedCon = contractors.find(c => c.id === selectedContractorId);
      if (!selectedCon) {
        setContractorError('Please select a registered agency.');
        return;
      }
      if (!contractorInspector.trim()) {
        setContractorError('Active Field Inspector name is required.');
        return;
      }
      if (!typedContractorLicense.trim()) {
        setContractorError('Active License credential / key code is required to enter.');
        return;
      }
      if (typedContractorLicense.trim().toLowerCase() !== selectedCon.licenseNumber.trim().toLowerCase()) {
        setContractorError(`Access Denied: Unverified license key. Check agency credentials and retry. (Hint: Try typing "${selectedCon.licenseNumber}")`);
        return;
      }

      onLogin({
        id: `user-${selectedContractorId}`,
        name: contractorInspector.trim(),
        role: 'contractor',
        contractorId: selectedContractorId,
        email: selectedCon.email,
      });
    }
  };

  const handleBureauSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setBureauError('');

    if (isRegisteringBureau) {
      if (!bureauName.trim()) {
        setBureauError('Prevention Officer Name is required.');
        return;
      }
      if (bureauAccounts.some(acc => acc.name.toLowerCase() === bureauName.trim().toLowerCase())) {
        setBureauError(`An officer account with the name "${bureauName.trim()}" is already registered.`);
        return;
      }
      if (!bureauPassword) {
        setBureauError('Please choose a secure password.');
        return;
      }
      if (bureauPassword !== bureauConfirmPassword) {
        setBureauError('Passwords do not match.');
        return;
      }

      const newAccount = {
        id: `bureau-${Date.now()}`,
        name: bureauName.trim(),
        password: bureauPassword,
      };

      const updated = [...bureauAccounts, newAccount];
      onUpdateBureauAccounts(updated);
      setSelectedBureauId(newAccount.id);
      setIsRegisteringBureau(false);
      
      // Clear fields
      setBureauPassword('');
      setBureauConfirmPassword('');
      setBureauName('');

      onLogin({
        id: `user-${newAccount.id}`,
        name: newAccount.name,
        role: 'bureau',
        email: 'prevention.bureau@firedept-gov.us',
      });
    } else {
      const activeAccount = bureauAccounts.find(acc => acc.id === selectedBureauId);
      if (!activeAccount) {
        setBureauError('Please select or register an officer account.');
        return;
      }

      if (!bureauPassword) {
        setBureauError('Enter your account password to authenticate.');
        return;
      }

      if (bureauPassword !== activeAccount.password) {
        setBureauError('Access Denied: Incorrect password. Check credentials and retry.');
        return;
      }

      onLogin({
        id: `user-${activeAccount.id}`,
        name: activeAccount.name,
        role: 'bureau',
        email: 'prevention.bureau@firedept-gov.us',
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#1e293b] flex flex-col justify-between select-none antialiased relative overflow-hidden font-sans">
      
      {/* Visual background accents */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-red-600/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-blue-600/5 blur-[150px] pointer-events-none" />

      {/* Top Header Row representing actual county jurisdiction */}
      <header className="z-10 px-6 py-3.5 bg-[#0f172a] text-white border-b-3 border-[#dc2626] flex justify-between items-center shadow-md">
        <div className="flex items-center gap-4">
          <Logo variant="horizontal" size="custom" customHeight="32px" className="shrink-0" />
          <div className="h-6 w-[1px] bg-slate-700 hidden xs:block" />
          <div className="hidden xs:block">
            <span className="text-[9px] text-red-400 font-mono tracking-widest uppercase block font-bold leading-none">Official Fire Protection</span>
            <span className="text-[10px] text-slate-300 font-sans tracking-wide uppercase font-extrabold block mt-0.5">Prevention Bureau</span>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-xs font-mono text-slate-300">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#dc2626] inline-block animate-ping" />
            <span className="w-2 h-2 rounded-full bg-[#dc2626] inline-block absolute" /> Status: Live Grid
          </span>
          <span className="text-slate-600">|</span>
          <span>System Version 4.1.2</span>
        </div>
      </header>

      {/* Main Interactive Sign In Area */}
      <main className="z-10 flex-1 flex flex-col items-center justify-center py-10 px-4 md:px-8 max-w-5xl mx-auto w-full">
        
        {/* App Logo & Header Section */}
        <div className="flex flex-col items-center mb-10 text-center">
          <Logo variant="full" size="custom" customHeight="120px" className="mb-4" />
          <h2 className="text-2xl md:text-3xl font-black text-[#0f172a] tracking-tight uppercase font-sans">
            Fire Protection Sign-In Hub
          </h2>
          <p className="text-xs text-slate-500 mt-2.5 max-w-md leading-relaxed">
            Register compliance audits, submit NFPA system certificates, or access localized map schedules from your workspace.
          </p>

          {/* High-fidelity security status capsule strip */}
          <div className="flex flex-wrap justify-center gap-3 mt-6 animate-fade-in">
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-mono font-bold px-3 py-1.5 rounded-lg shadow-sm">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>NJ REGISTRY COMPLIANT</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 text-slate-200 text-[10px] font-mono font-bold px-3 py-1.5 rounded-lg shadow-sm">
              <Flame className="w-3.5 h-3.5 text-red-500 animate-pulse shrink-0" />
              <span>FIREGRID LIVE JURISDICTION: MANAHAWKIN</span>
            </div>
            <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 text-indigo-800 text-[10px] font-mono font-bold px-3 py-1.5 rounded-lg shadow-sm">
              <ShieldAlert className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span>STANDARDS: NFPA-25 AND NFPA-72</span>
            </div>
          </div>
        </div>

        {/* Live Optical QR Scanner Verification Bar */}
        <div className="w-full max-w-xl bg-slate-900 border-l-4 border-[#dc2626] rounded-xl p-4 shadow-lg flex flex-col sm:flex-row justify-between items-center mb-8 gap-4 animate-fade-in text-white relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-red-600/10 to-transparent pointer-events-none" />
          <div className="space-y-1 text-center sm:text-left z-10">
            <h4 className="text-xs font-black uppercase text-red-500 tracking-wider flex items-center gap-1.5 justify-center sm:justify-start">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping inline-block" />
              <Camera className="w-4 h-4 text-red-500 inline-block" /> LIVE DECAL OPTICAL DECODER
            </h4>
            <p className="text-[11px] text-slate-300 font-sans max-w-sm leading-relaxed">
              Verify real fire safety decals. Point your web camera at any QR code, or upload a decal photograph to instantly load reports.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowQRScanner(true)}
            className="w-full sm:w-auto px-5 py-3 bg-[#dc2626] hover:bg-black text-white text-[11px] font-black uppercase tracking-wider rounded-lg transition duration-200 shadow hover:scale-[1.02] cursor-pointer flex items-center justify-center gap-2 shrink-0 z-10 border border-red-500"
          >
            <Camera className="w-4 h-4 text-emerald-400 animate-pulse" />
            Launch Scanner
          </button>
        </div>

        {/* Dual Side-by-Side Boxes for Login */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full items-stretch animate-fade-in">
          
          {/* Box 1: Contractor Log In */}
          <div className="relative group flex flex-col justify-between h-full">
            {/* Ambient Blue Glow */}
            <div className="absolute -inset-1.5 rounded-2xl bg-[#3b82f6] opacity-30 blur-xl transition duration-500 group-hover:opacity-55 group-hover:blur-2xl group-hover:duration-200" />
            
            <div className="relative bg-white border border-slate-200 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden flex flex-col justify-between h-full">
            {/* Box Header */}
            <div className="bg-slate-900 text-white px-6 py-5 border-b border-slate-800 flex justify-between items-center">
              <div>
                <span className="text-[10px] text-[#3b82f6] font-mono tracking-widest uppercase block font-bold leading-none mb-1">Section 104.1</span>
                <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-1.5 font-sans">
                  <Flame className="w-4 h-4 text-[#3b82f6]" /> Contractor Portal
                </h3>
              </div>
              <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-2 py-1 rounded border border-slate-700">FACILITY-USER</span>
            </div>

            {/* Box Body */}
            <form onSubmit={handleContractorSubmit} className="p-6 md:p-8 flex-1 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center gap-2">
                  <p className="text-xs text-slate-500 leading-relaxed font-sans max-w-[210px]">
                    Access tools for authorized fire safety agencies with active NJ credentials.
                  </p>
                  {contractors.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsRegistering(!isRegistering)}
                      className="text-[10px] text-[#2563eb] hover:underline font-mono font-bold uppercase tracking-wider whitespace-nowrap"
                    >
                      {effectiveIsRegistering ? "← Back to Sign-In" : "+ Onboard Provider"}
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  {effectiveIsRegistering ? (
                    /* AGENCY REGISTRATION STREAM */
                    <div className="space-y-3 bg-red-50/10 p-4 rounded border border-slate-200">
                      <span className="text-[10px] text-red-600 font-bold uppercase tracking-wider block font-mono">
                        Onboard New Fire Protection Agency
                      </span>
                      
                      <div>
                        <label className="block text-[9px] text-slate-500 mb-1 font-bold uppercase tracking-wider">
                          Licensed Agency Name
                        </label>
                        <input
                          type="text"
                          required
                          value={newConName}
                          onChange={(e) => setNewConName(e.target.value)}
                          placeholder="e.g. Titan Fire Systems Inc."
                          className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-[#1e293b] focus:outline-none focus:border-[#2563eb] font-sans font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] text-slate-500 mb-1 font-bold uppercase tracking-wider">
                          Official License Number
                        </label>
                        <input
                          type="text"
                          required
                          value={newConLicense}
                          onChange={(e) => setNewConLicense(e.target.value)}
                          placeholder="e.g. F-88291-C"
                          className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-[#1e293b] focus:outline-none focus:border-[#2563eb] font-mono font-bold"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[9px] text-slate-500 mb-1 font-bold uppercase tracking-wider">
                            Email
                          </label>
                          <input
                            type="email"
                            value={newConEmail}
                            onChange={(e) => setNewConEmail(e.target.value)}
                            placeholder="agency@example.com"
                            className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-[#1e293b] focus:outline-none focus:border-[#2563eb]"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] text-slate-500 mb-1 font-bold uppercase tracking-wider">
                            Phone
                          </label>
                          <input
                            type="text"
                            value={newConPhone}
                            onChange={(e) => setNewConPhone(e.target.value)}
                            placeholder="(609) 555-0100"
                            className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-[#1e293b] focus:outline-none focus:border-[#2563eb]"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* STANDARD SELECT AGENCY STREAM */
                    <div>
                      <label htmlFor="select-contractor-id" className="block text-[10px] text-slate-600 mb-1.5 font-bold uppercase tracking-wider font-mono">
                        Select Licensed Protection Agency
                      </label>
                      <select
                        id="select-contractor-id"
                        value={selectedContractorId}
                        onChange={(e) => handleContractorSelect(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs text-[#1e293b] focus:outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] font-sans font-bold"
                      >
                        {contractors.map((con) => (
                          <option key={con.id} value={con.id}>
                            {con.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Inspector Name and License Number */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="input-inspector-name" className="block text-[10px] text-slate-600 mb-1.5 font-bold uppercase tracking-wider font-mono">
                        Active Field Inspector
                      </label>
                      <input
                        id="input-inspector-name"
                        type="text"
                        required
                        value={contractorInspector}
                        onChange={(e) => setContractorInspector(e.target.value)}
                        placeholder="e.g. Michael Corvin"
                        className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs text-[#1e293b] focus:outline-none focus:border-[#2563eb] font-mono font-semibold"
                      />
                    </div>
                    <div>
                      <label htmlFor="input-license-no" className="block text-[10px] text-slate-600 mb-1.5 font-bold uppercase tracking-wider font-mono">
                        Agency License Key / Passcode
                      </label>
                      <input
                        id="input-license-no"
                        type="text"
                        required
                        value={effectiveIsRegistering ? newConLicense : typedContractorLicense}
                        onChange={(e) => {
                          if (effectiveIsRegistering) {
                            setNewConLicense(e.target.value);
                          } else {
                            setTypedContractorLicense(e.target.value);
                          }
                          setContractorError('');
                        }}
                        placeholder="Enter Active License Code"
                        className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs text-[#1e293b] focus:outline-none focus:border-[#2563eb] font-mono font-bold"
                      />
                    </div>
                  </div>

                  {/* Error display */}
                  {contractorError && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-xs leading-normal font-sans font-medium">
                      ⚠️ {contractorError}
                    </div>
                  )}

                  {/* Dynamic demo credentials guide */}
                  {!effectiveIsRegistering && (
                    <div className="bg-slate-50 border border-slate-200 p-2.5 rounded text-[10px] text-slate-600 font-sans leading-relaxed space-y-1">
                      <span className="font-extrabold text-slate-800 uppercase block tracking-wider">💡 Registered Agencies Compliance Keys:</span>
                      <p>To enter contractor workspace, enter your inspector name above and copy-paste the exact license number corresponding to your chosen agency below:</p>
                      {contractors.length > 0 ? (
                        <div className="bg-white p-2 rounded border border-slate-100 font-mono text-[9px] mt-1 space-y-0.5 text-slate-700">
                          {contractors.map((c) => (
                            <div key={c.id}>• <strong>{c.name}</strong>: Enter code <strong className="text-blue-700 font-extrabold select-all">{c.licenseNumber}</strong></div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-red-500 font-bold block">No agencies onboarded. Please click "+ Onboard Provider" above.</span>
                      )}
                    </div>
                  )}

                </div>
              </div>

              <div className="pt-4">
                <button
                  id="btn-login-contractor"
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-3 px-4 rounded-lg shadow-sm hover:shadow transition-all duration-200 text-xs flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
                >
                  <Key className="w-4 h-4 text-[#3b82f6]" /> {effectiveIsRegistering ? "Register Agency & Log In" : "Enter Contractor Space"}
                </button>
              </div>
            </form>
          </div>
          </div>

          {/* Box 2: Bureau Log In */}
          <div className="relative group flex flex-col justify-between h-full">
            {/* Ambient Red Glow */}
            <div className="absolute -inset-1.5 rounded-2xl bg-[#dc2626] opacity-30 blur-xl transition duration-500 group-hover:opacity-55 group-hover:blur-2xl group-hover:duration-200" />
            
            <div className="relative bg-white border border-slate-200 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden flex flex-col justify-between h-full">
            {/* Box Header */}
            <div className="bg-[#dc2626] text-white px-6 py-5 border-b border-[#b91c1c] flex justify-between items-center">
              <div>
                <span className="text-[10px] text-red-200 font-mono tracking-widest uppercase block font-bold leading-none mb-1">Section 104.2</span>
                <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-1.5 font-sans">
                  <ShieldCheck className="w-4 h-4 text-white animate-pulse" /> Bureau Authority Portal
                </h3>
              </div>
              <span className="text-[10px] font-mono bg-red-950 text-red-200 px-2 py-1 rounded">BUREAU-OFFICIAL</span>
            </div>

            {/* Box Body */}
            <form onSubmit={handleBureauSubmit} className="p-6 md:p-8 flex-1 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center gap-2">
                  <p className="text-xs text-slate-500 leading-relaxed font-sans max-w-[210px]">
                    Exclusive access for Fire Bureau officers, chiefs, and administrative personnel to review, schedule, and approve NFPA logs.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegisteringBureau(!isRegisteringBureau);
                      setBureauError('');
                    }}
                    className="text-[10px] text-[#dc2626] hover:underline font-mono font-bold uppercase tracking-wider whitespace-nowrap"
                  >
                    {isRegisteringBureau ? "← Back to Sign-In" : "+ Register Officer"}
                  </button>
                </div>

                <div className="space-y-4">
                  {isRegisteringBureau ? (
                    /* BUREAU REGISTRATION STREAM */
                    <div className="space-y-3 bg-red-50/10 p-4 rounded border border-slate-200">
                      <span className="text-[10px] text-red-600 font-bold uppercase tracking-wider block font-mono">
                        Onboard Fire Officer profile
                      </span>
                      
                      <div>
                        <label className="block text-[9px] text-slate-500 mb-1 font-bold uppercase tracking-wider">
                          Officer Name
                        </label>
                        <input
                          type="text"
                          required
                          value={bureauName}
                          onChange={(e) => { setBureauName(e.target.value); setBureauError(''); }}
                          placeholder="e.g. Deputy Chief Joe Miller"
                          className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-[#1e293b] focus:outline-none focus:border-[#dc2626] font-sans font-semibold"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[9px] text-slate-500 mb-1 font-bold uppercase tracking-wider">
                            Password
                          </label>
                          <input
                            type="password"
                            required
                            value={bureauPassword}
                            onChange={(e) => { setBureauPassword(e.target.value); setBureauError(''); }}
                            placeholder="Password"
                            className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-[#1e293b] focus:outline-none focus:border-[#dc2626] font-sans"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] text-slate-500 mb-1 font-bold uppercase tracking-wider">
                            Confirm
                          </label>
                          <input
                            type="password"
                            required
                            value={bureauConfirmPassword}
                            onChange={(e) => { setBureauConfirmPassword(e.target.value); setBureauError(''); }}
                            placeholder="Re-type"
                            className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-[#1e293b] focus:outline-none focus:border-[#dc2626] font-sans"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* STANDARD LOG IN STREAM */
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="select-bureau-id" className="block text-[10px] text-slate-600 mb-1.5 font-bold uppercase tracking-wider font-mono">
                          Select Bureau Officer Profile
                        </label>
                        <select
                          id="select-bureau-id"
                          value={selectedBureauId}
                          onChange={(e) => {
                            setSelectedBureauId(e.target.value);
                            setBureauError('');
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs text-[#1e293b] focus:outline-none focus:border-[#dc2626] focus:ring-1 focus:ring-[#dc2626] font-sans font-bold"
                        >
                          {bureauAccounts.map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              {acc.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label htmlFor="input-bureau-password" className="block text-[10px] text-slate-600 mb-1.5 font-bold uppercase tracking-wider font-mono">
                          Password
                        </label>
                        <input
                          id="input-bureau-password"
                          type="password"
                          required
                          value={bureauPassword}
                          onChange={(e) => { setBureauPassword(e.target.value); setBureauError(''); }}
                          placeholder="Enter Account Password"
                          className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs text-[#1e293b] focus:outline-none focus:border-[#dc2626] font-sans font-bold"
                        />
                      </div>
                    </div>
                  )}

                  {/* Error display */}
                  {bureauError && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-xs leading-normal font-sans font-medium">
                      ⚠️ {bureauError}
                    </div>
                  )}

                  {/* Bureau demo instruction tip */}
                  {!isRegisteringBureau && (
                    <div className="bg-slate-50 border border-slate-200 p-2.5 rounded text-[10px] text-slate-600 font-sans leading-relaxed space-y-1">
                      <span className="font-extrabold text-[#dc2626] uppercase block tracking-wider">🚒 Bureau Officer Password Guide:</span>
                      <p>To access, select your profile above and type the custom account password:</p>
                      <div className="bg-white p-2 rounded border border-slate-100 font-mono text-[9px] mt-1 space-y-1 text-slate-700">
                        {bureauAccounts.map((acc) => (
                          <div key={acc.id} className="border-b border-slate-50 pb-1 last:border-0 last:pb-0">
                            • <strong>{acc.name}</strong>: Password <strong className="text-red-700 font-bold select-all">{acc.password}</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              </div>

              <div className="pt-4 animate-fade-in">
                <button
                  id="btn-login-bureau"
                  type="submit"
                  className="w-full bg-[#dc2626] hover:bg-red-700 text-white font-extrabold py-3 px-4 rounded-lg shadow-sm hover:shadow transition-all duration-200 text-xs flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
                >
                  <ShieldCheck className="w-4 h-4 text-white" /> {isRegisteringBureau ? "Register Account & Authenticate" : "Authenticate Bureau Admin"}
                </button>
              </div>
            </form>
          </div>
          </div>

        </div>



      </main>

      {showQRScanner && (
        <QRCameraScanner 
          onClose={() => setShowQRScanner(false)} 
          onScanSuccess={handleQRScanSuccess} 
        />
      )}

      {/* Footer copyright */}
      <footer className="z-10 bg-[#0f172a] text-slate-300 border-t border-slate-800 py-4 px-6 text-center text-[11px] font-mono flex flex-col sm:flex-row justify-between gap-2 items-center">
        <span>© 2026 Bureau of Fire Prevention. All Rights Reserved.</span>
        <span className="flex items-center gap-1.5 text-slate-400">
          <ShieldAlert className="w-3.5 h-3.5 text-red-500 animate-pulse" /> System restricted strictly to licensed contractors & safety administrators.
        </span>
      </footer>
    </div>
  );
}
