import React, { useState, useEffect, useRef } from 'react';
import { Property, InspectionReport, UserInfo, ProjectStatus, Contractor } from './types';
import { INITIAL_PROPERTIES, INITIAL_REPORTS, CONTRACTORS } from './mockData';
import HomePortal from './components/HomePortal';
import ContractorPortal from './components/ContractorPortal';
import BureauPortal from './components/BureauPortal';
import PublicVerificationPortal from './components/PublicVerificationPortal';
import { safeStorage } from './lib/storage';

const safeSetLocalStorage = (key: string, value: string) => {
  try {
    safeStorage.setItem(key, value);
  } catch (err) {
    console.warn(`LocalStorage quota exceeded for key "${key}". Storing on server remains persistent and unaffected. Continuing...`, err);
  }
};

export default function App() {
  const [activeUser, setActiveUser] = useState<UserInfo | null>(null);
  
  // Real Local Database States
  const [properties, setProperties] = useState<Property[]>([]);
  const lastMutationTimeRef = useRef<number>(0);
  const [reports, setReports] = useState<InspectionReport[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [inboundEmails, setInboundEmails] = useState<any[]>([]);
  const [bureauAccounts, setBureauAccounts] = useState<{ id: string; name: string; password: string }[]>([]);

  // Check if we are viewing in public unauthenticated mode
  const [showPublicRoute, setShowPublicRoute] = useState(false);
  const [verifyId, setVerifyId] = useState<string | null>(null);
  const [contractorParamId, setContractorParamId] = useState<string | null>(null);
  const [dbLoading, setDbLoading] = useState(true);

  // Sync state if URL changes
  useEffect(() => {
    const handleUrlChange = () => {
      const currentUrl = new URL(window.location.href);
      const currentParams = currentUrl.searchParams;

      // Support both legacy query links and clean public links:
      //   /?verify=REPORT-ID
      //   /?contractor=CONTRACTOR-ID
      //   /verify/REPORT-ID
      //   /contractor/CONTRACTOR-ID
      const pathParts = currentUrl.pathname.split('/').filter(Boolean);
      const pathVerifyId = pathParts[0] === 'verify' ? decodeURIComponent(pathParts[1] || '') : '';
      const pathContractorId = pathParts[0] === 'contractor' ? decodeURIComponent(pathParts[1] || '') : '';

      const vId = currentParams.get('verify') || pathVerifyId;
      const cId = currentParams.get('contractor') || pathContractorId;

      // A public QR/profile link should never require the user to choose a portal or sign in.
      if (vId) {
        setVerifyId(vId);
        setContractorParamId(null);
        setShowPublicRoute(true);
        return;
      }
      if (cId) {
        setContractorParamId(cId);
        setVerifyId(null);
        setShowPublicRoute(true);
        return;
      }
    };
    
    // Run initially
    handleUrlChange();

    window.addEventListener('popstate', handleUrlChange);
    // Periodically poll for URL updates since iframe URL hashes may shift without standard trigger
    const timer = setInterval(handleUrlChange, 600);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      clearInterval(timer);
    };
  }, []);

  const handleNavigateToPublicVerification = (vId: string | null, cId: string | null) => {
    setVerifyId(vId);
    setContractorParamId(cId);
    setShowPublicRoute(!!(vId || cId));
    
    // In iframe sandbox environments, calling pushState triggers parent frame address sync, 
    // leading to sudden page reloads and state resets. We keep in-memory state as the single source of truth.
    console.log("Navigating to public verification in-memory. Verify ID:", vId, "Contractor ID:", cId);
  };

  const handleBackToLogin = () => {
    setVerifyId(null);
    setContractorParamId(null);
    setShowPublicRoute(false);
    try {
      window.history.pushState(null, '', window.location.pathname);
    } catch (e) {
      console.warn(e);
    }
    // Clear query parameters gracefully by forcing a clean routing reload
    window.location.href = window.location.origin + window.location.pathname;
  };

  // Function to serialize state back to the backend JSON store
  const syncWithServer = async (
    newProps: Property[],
    newReps: InspectionReport[],
    newCons: Contractor[],
    newEmails: any[] = inboundEmails,
    newBureaus: any[] = bureauAccounts
  ) => {
    lastMutationTimeRef.current = Date.now();
    try {
      await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          properties: newProps,
          reports: newReps,
          contractors: newCons,
          inboundEmails: newEmails,
          bureauAccounts: newBureaus
        }),
      });
    } catch (e) {
      console.error('Error syncing database to server:', e);
    }
  };

  // Load datasets initially, prioritizing backend database records with local storage fallbacks
  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        // Fetch public/dev app URL configurations
        try {
          const configRes = await fetch('/api/config');
          if (configRes.ok) {
            const configData = await configRes.json();
            if (configData.devUrl) {
              safeSetLocalStorage('fire_inspect_dev_url', configData.devUrl);
            }
            if (configData.publicUrl) {
              safeSetLocalStorage('fire_inspect_public_url', configData.publicUrl);
            }
          }
        } catch (e) {
          console.error('Failed to load server configuration:', e);
        }

        let fetchedProps: Property[] = [];
        let fetchedReps: InspectionReport[] = [];
        let fetchedCons: Contractor[] = [];
        let fetchedEmails: any[] = [];
        let fetchedBureau: any[] = [];

        try {
          const res = await fetch('/api/db');
          if (res.ok) {
            const dbData = await res.json();
            fetchedProps = dbData.properties || [];
            fetchedReps = dbData.reports || [];
            fetchedCons = dbData.contractors || [];
            fetchedEmails = dbData.inboundEmails || [];
            fetchedBureau = dbData.bureauAccounts || [];
          }
        } catch (err) {
          console.error('Failed to contact backend database server:', err);
        }

        setInboundEmails(fetchedEmails);

        let needsSync = false;

        // 1. Synchronize Properties
        const cachedProperties = safeStorage.getItem('fire_inspect_properties');
        let finalProps = fetchedProps;
        if (fetchedProps.length === 0 && cachedProperties) {
          try {
            const parsed = JSON.parse(cachedProperties);
            if (parsed && parsed.length > 0) {
              finalProps = parsed;
              needsSync = true;
            }
          } catch {
            finalProps = [];
          }
        }
        finalProps = finalProps.filter(
          (p) => p && p.id && !['prop-1', 'prop-2', 'prop-3', 'prop-4', 'prop-5', 'prop-6', 'prop-7'].includes(p.id)
        );

        // 2. Synchronize Reports
        const cachedReports = safeStorage.getItem('fire_inspect_reports');
        let finalReps = fetchedReps;
        if (fetchedReps.length === 0 && cachedReports) {
          try {
            const parsed = JSON.parse(cachedReports);
            if (parsed && parsed.length > 0) {
              finalReps = parsed;
              needsSync = true;
            }
          } catch {
            finalReps = [];
          }
        }

        // Sanitize reports and guarantee every report has a valid, non-empty ID field
        let reportsUpdated = false;
        finalReps = finalReps.map((r, index) => {
          if (!r.id) {
            reportsUpdated = true;
            const generatedId = r.inspectorName === 'Michael Corvin' 
              ? 'rep-michael-corvin-1' 
              : `rep-gen-${Date.now()}-${index}-${Math.floor(Math.random() * 1000)}`;
            return {
              ...r,
              id: generatedId,
              createdAt: r.createdAt || new Date().toISOString()
            };
          }
          return r;
        });
        if (reportsUpdated) {
          needsSync = true;
        }

        finalReps = finalReps.filter(
          (r) => r && r.id && !['rep-1', 'rep-2', 'rep-3', 'rep-4', 'rep-5'].includes(r.id)
        );

        // Rescue any missing properties that are referenced in reports but are missing from the properties database
        let propertiesUpdated = false;
        const existingPropIds = new Set(finalProps.map(p => p.id));
        
        finalReps.forEach(rep => {
          if (rep.propertyId && !existingPropIds.has(rep.propertyId)) {
            let propStatus: ProjectStatus = 'Inspection';
            if (rep.bureauApproved || rep.status === 'Passed') {
              propStatus = 'Complete';
            } else if (rep.status === 'Incomplete') {
              propStatus = 'Incomplete';
            } else if (rep.status === 'Failed (Overdue Reinspect)') {
              propStatus = 'Overdue Reinspect';
            } else if (rep.status === 'Passed with Deficiencies') {
              propStatus = 'Reinspect';
            }

            // Reconstruct property node from report attributes
            const rescuedProperty: Property = {
              id: rep.propertyId,
              name: rep.propertyName || 'Mr. J\'s Deli 2',
              address: rep.propertyAddress ? rep.propertyAddress.split(',')[0] : '512 Rt 72 W',
              city: rep.propertyAddress ? (rep.propertyAddress.split(',')[1] || '').trim() : 'Manahawkin',
              zip: rep.propertyAddress ? (rep.propertyAddress.split('NJ')[1] || '').trim() : '08050',
              lat: 39.695,
              lng: -74.262,
              template: rep.equipmentType === 'Fire Sprinkler' ? 'NFPA-13D' : 'NFPA-72',
              lastInspectionDate: rep.date || new Date().toISOString().split('T')[0],
              nextInspectionDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              status: propStatus,
              inspectionsCount: 1
            };
            finalProps.push(rescuedProperty);
            existingPropIds.add(rep.propertyId);
            propertiesUpdated = true;
          }
        });
        if (propertiesUpdated) {
          needsSync = true;
        }

        setProperties(finalProps);
        safeSetLocalStorage('fire_inspect_properties', JSON.stringify(finalProps));

        setReports(finalReps);
        safeSetLocalStorage('fire_inspect_reports', JSON.stringify(finalReps));

        // 3. Synchronize Contractors
        const cachedContractors = safeStorage.getItem('fire_inspect_contractors');
        let finalCons = fetchedCons;
        if (fetchedCons.length === 0 && cachedContractors) {
          try {
            const parsed = JSON.parse(cachedContractors);
            if (parsed && parsed.length > 0) {
              finalCons = parsed;
              needsSync = true;
            }
          } catch {
            finalCons = [];
          }
        }
        // Seed/guarantee default contractors (including con-2 and con-3) so contractor registry pages work flawlessly
        const hasCon2 = finalCons.some(c => c.id === 'con-2');
        const hasCon3 = finalCons.some(c => c.id === 'con-3');
        if (!hasCon2) {
          finalCons.push({
            id: 'con-2',
            name: 'Metro Fire Protection',
            licenseNumber: 'F-44120-C',
            email: 'nj-inspect@metrofirenj.com',
            phone: '(732) 555-4120',
            activeReportsCount: 0
          });
          needsSync = true;
        }
        if (!hasCon3) {
          finalCons.push({
            id: 'con-3',
            name: 'Titan Fire Systems Inc.',
            licenseNumber: 'F-88291-C',
            email: 'filings@titanfiresystems.com',
            phone: '(609) 555-8291',
            activeReportsCount: 0
          });
          needsSync = true;
        }
        setContractors(finalCons);
        safeSetLocalStorage('fire_inspect_contractors', JSON.stringify(finalCons));

        // 4. Synchronize Bureau Accounts
        const cachedBureau = safeStorage.getItem('fire_inspect_bureau_accounts');
        let finalBureau = fetchedBureau;
        if (fetchedBureau.length === 0 && cachedBureau) {
          try {
            const parsed = JSON.parse(cachedBureau);
            if (parsed && parsed.length > 0) {
              finalBureau = parsed;
              needsSync = true;
            }
          } catch {
            finalBureau = [];
          }
        }
        if (finalBureau.length === 0) {
          finalBureau = [
            {
              id: 'bureau-1',
              name: 'Deputy Chief Joe Miller',
              password: 'firechief'
            }
          ];
          needsSync = true;
        }
        setBureauAccounts(finalBureau);
        safeSetLocalStorage('fire_inspect_bureau_accounts', JSON.stringify(finalBureau));

        // Re-align and prime server JSON store helper
        if (needsSync) {
          await syncWithServer(finalProps, finalReps, finalCons, fetchedEmails, finalBureau);
        }
      } catch (err) {
        console.error('[App Init] Error in database initialization:', err);
      } finally {
        setDbLoading(false);
      }
    };

    initializeDatabase();

    // Force active login verification every session - no automatic sign-in of cached credentials
    safeStorage.removeItem('fire_inspect_active_user');
  }, []);

  // Periodic polling to let inbound emails instantly sync on screen
  const handleManualRefresh = async () => {
    // Skip if we recently did a local modification to prevent race condition showing stale server database data
    if (Date.now() - lastMutationTimeRef.current < 8000) {
      return false;
    }
    try {
      const res = await fetch('/api/db');
      if (res.ok) {
        const dbData = await res.json();
        if (dbData.properties) {
          setProperties(dbData.properties);
          safeSetLocalStorage('fire_inspect_properties', JSON.stringify(dbData.properties));
        }
        if (dbData.reports) {
          setReports(dbData.reports);
          safeSetLocalStorage('fire_inspect_reports', JSON.stringify(dbData.reports));
        }
        if (dbData.contractors) {
          setContractors(dbData.contractors);
          safeSetLocalStorage('fire_inspect_contractors', JSON.stringify(dbData.contractors));
        }
        if (dbData.inboundEmails) setInboundEmails(dbData.inboundEmails);
        if (dbData.bureauAccounts) {
          setBureauAccounts(dbData.bureauAccounts);
          safeSetLocalStorage('fire_inspect_bureau_accounts', JSON.stringify(dbData.bureauAccounts));
        }
        return true;
      }
    } catch (err) {
      console.warn('Manual database sync error:', err);
    }
    return false;
  };

  useEffect(() => {
    const pollDb = async () => {
      await handleManualRefresh();
    };

    const interval = setInterval(pollDb, 4000);
    return () => clearInterval(interval);
  }, []);

  // Sync state changes to local storage and server when databases mutate
  const updatePropertiesDB = (newProps: Property[]) => {
    setProperties(newProps);
    safeSetLocalStorage('fire_inspect_properties', JSON.stringify(newProps));
    syncWithServer(newProps, reports, contractors, inboundEmails, bureauAccounts);
  };

  const updateReportsDB = (newReps: InspectionReport[]) => {
    setReports(newReps);
    safeSetLocalStorage('fire_inspect_reports', JSON.stringify(newReps));
    syncWithServer(properties, newReps, contractors, inboundEmails, bureauAccounts);
  };

  const updateContractorsDB = (newCons: Contractor[]) => {
    setContractors(newCons);
    safeSetLocalStorage('fire_inspect_contractors', JSON.stringify(newCons));
    syncWithServer(properties, reports, newCons, inboundEmails, bureauAccounts);
  };

  const updateBureauAccountsDB = (newBureaus: any[]) => {
    setBureauAccounts(newBureaus);
    safeSetLocalStorage('fire_inspect_bureau_accounts', JSON.stringify(newBureaus));
    syncWithServer(properties, reports, contractors, inboundEmails, newBureaus);
  };

  const handleLogin = (user: UserInfo) => {
    setActiveUser(user);
    safeSetLocalStorage('fire_inspect_active_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setActiveUser(null);
    safeStorage.removeItem('fire_inspect_active_user');
  };

  const handleAddContractor = (conData: Omit<Contractor, 'id' | 'activeReportsCount'>) => {
    // Check if an existing contractor has the same name or license to prevent duplicate registration rows
    const existing = contractors.find(
      (c) => c.name.toLowerCase().trim() === conData.name.toLowerCase().trim() || 
             c.licenseNumber.toLowerCase().trim() === conData.licenseNumber.toLowerCase().trim()
    );
    if (existing) {
      return existing;
    }

    const newCon: Contractor = {
      ...conData,
      id: `con-${Date.now()}`,
      activeReportsCount: 0,
    };
    const updated = [...contractors, newCon];
    updateContractorsDB(updated);
    return newCon;
  };

  const handleDeleteContractor = (contractorId: string) => {
    const updated = contractors.filter(c => c.id !== contractorId);
    updateContractorsDB(updated);
  };

  const handleClearAllReports = () => {
    updateReportsDB([]);
  };

  const handleDeleteReport = (reportId: string) => {
    const updated = reports.filter(r => r.id !== reportId);
    updateReportsDB(updated);
  };

  // Add a new inspection report (atomic update)
  const handleAddReport = (
    reportData: Omit<InspectionReport, 'id' | 'createdAt'>,
    propertyIdToUpdate?: string,
    nextStatus?: ProjectStatus,
    countInc?: boolean
  ) => {
    const newReport: InspectionReport = {
      ...reportData,
      id: `rep-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    const updatedReps = [newReport, ...reports];
    let updatedProps = [...properties];
    const cachedPropsStr = safeStorage.getItem('fire_inspect_properties');
    if (cachedPropsStr) {
      try {
        const parsed = JSON.parse(cachedPropsStr);
        if (Array.isArray(parsed) && parsed.length >= properties.length) {
          updatedProps = parsed;
        }
      } catch (err) {
        console.error("Failed to parse cached properties in handleAddReport:", err);
      }
    }

    if (propertyIdToUpdate && nextStatus) {
      updatedProps = updatedProps.map((prop) => {
        if (prop.id === propertyIdToUpdate) {
          return {
            ...prop,
            status: nextStatus,
            lastInspectionDate: new Date().toISOString().split('T')[0],
            nextInspectionDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            inspectionsCount: countInc ? prop.inspectionsCount + 1 : prop.inspectionsCount,
          };
        }
        return prop;
      });
    }

    setReports(updatedReps);
    safeSetLocalStorage('fire_inspect_reports', JSON.stringify(updatedReps));

    if (propertyIdToUpdate && nextStatus) {
      setProperties(updatedProps);
      safeSetLocalStorage('fire_inspect_properties', JSON.stringify(updatedProps));
    }

    syncWithServer(updatedProps, updatedReps, contractors, inboundEmails, bureauAccounts);
  };

  // Update target property status and metrics
  const handleUpdatePropertyStatus = (propertyId: string, status: ProjectStatus, countInc?: boolean) => {
    const updatedProps = properties.map((prop) => {
      if (prop.id === propertyId) {
        return {
          ...prop,
          status,
          lastInspectionDate: new Date().toISOString().split('T')[0],
          // Push next inspection date exactly 1 year out
          nextInspectionDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          inspectionsCount: countInc ? prop.inspectionsCount + 1 : prop.inspectionsCount,
        };
      }
      return prop;
    });
    updatePropertiesDB(updatedProps);
  };

  // Bureau Admin: Approve an submitted inspection report (atomic update)
  const handleApproveReport = (reportId: string, comments: string) => {
    const targetReport = reports.find(r => r.id === reportId);
    if (!targetReport) return;

    // Mutate the report's approval status
    const updatedReps = reports.map((rep) => {
      if (rep.id === reportId) {
        return {
          ...rep,
          bureauApproved: true,
          bureauComments: comments || 'Compliance approved with no revisions requested.',
        };
      }
      return rep;
    });

    // Automatically update the matching property's official status to Complete
    const updatedProps = properties.map((prop) => {
      if (prop.id === targetReport.propertyId) {
        return {
          ...prop,
          status: 'Complete' as ProjectStatus,
        };
      }
      return prop;
    });

    setReports(updatedReps);
    safeSetLocalStorage('fire_inspect_reports', JSON.stringify(updatedReps));

    setProperties(updatedProps);
    safeSetLocalStorage('fire_inspect_properties', JSON.stringify(updatedProps));

    syncWithServer(updatedProps, updatedReps, contractors, inboundEmails, bureauAccounts);
  };

  // Bureau Admin: Reject or flag violations on an inspection report (atomic update)
  const handleRejectReport = (reportId: string, comments: string) => {
    const targetReport = reports.find(r => r.id === reportId);
    if (!targetReport) return;

    // Mutate reports DB
    const updatedReps = reports.map((rep) => {
      if (rep.id === reportId) {
        return {
          ...rep,
          bureauApproved: false,
          bureauComments: comments || 'Submittal flagged with structural deficiencies. Correction required.',
        };
      }
      return rep;
    });

    // Recolor matched property system status to Reinspect or Overdue based on severity
    const updatedProps = properties.map((prop) => {
      if (prop.id === targetReport.propertyId) {
        return {
          ...prop,
          status: 'Overdue Reinspect' as ProjectStatus,
        };
      }
      return prop;
    });

    setReports(updatedReps);
    safeSetLocalStorage('fire_inspect_reports', JSON.stringify(updatedReps));

    setProperties(updatedProps);
    safeSetLocalStorage('fire_inspect_properties', JSON.stringify(updatedProps));

    syncWithServer(updatedProps, updatedReps, contractors, inboundEmails, bureauAccounts);
  };

  // Erase persistent cache to restore standard mock demo values
  const handleResetDatabase = () => {
    safeStorage.removeItem('fire_inspect_properties');
    safeStorage.removeItem('fire_inspect_reports');
    safeStorage.removeItem('fire_inspect_contractors');
    setProperties(INITIAL_PROPERTIES);
    setReports(INITIAL_REPORTS);
    setContractors([]);
    safeSetLocalStorage('fire_inspect_properties', JSON.stringify(INITIAL_PROPERTIES));
    safeSetLocalStorage('fire_inspect_reports', JSON.stringify(INITIAL_REPORTS));
    safeSetLocalStorage('fire_inspect_contractors', JSON.stringify([]));
    syncWithServer(INITIAL_PROPERTIES, INITIAL_REPORTS, []);
  };

  // Add a new property node dynamically for field testing
  const handleAddProperty = (propertyData: Omit<Property, 'id' | 'inspectionsCount'>) => {
    const newProperty: Property = {
      ...propertyData,
      id: `prop-${Date.now()}`,
      inspectionsCount: 0,
    };
    const updated = [newProperty, ...properties];
    updatePropertiesDB(updated);
    return newProperty;
  };

  if (showPublicRoute) {
    return (
      <PublicVerificationPortal
        isLoading={dbLoading}
        verifyId={verifyId}
        contractorId={contractorParamId}
        reports={reports}
        properties={properties}
        contractors={contractors}
        bureauAccounts={bureauAccounts}
        onBackToLogin={handleBackToLogin}
        onNavigate={handleNavigateToPublicVerification}
        currentUser={activeUser}
        onLogin={handleLogin}
      />
    );
  }

  if (!activeUser) {
    return (
      <HomePortal 
        onLogin={handleLogin} 
        contractors={contractors} 
        onAddContractor={handleAddContractor} 
        bureauAccounts={bureauAccounts}
        onUpdateBureauAccounts={updateBureauAccountsDB}
        onNavigateToPublicVerification={handleNavigateToPublicVerification}
      />
    );
  }

  if (activeUser.role === 'contractor') {
    return (
      <ContractorPortal
        user={activeUser}
        properties={properties}
        reports={reports}
        contractors={contractors}
        inboundEmails={inboundEmails}
        onAddReport={handleAddReport}
        onUpdatePropertyStatus={handleUpdatePropertyStatus}
        onAddProperty={handleAddProperty}
        onDeleteReport={handleDeleteReport}
        onClearAllReports={handleClearAllReports}
        onLogout={handleLogout}
        onResetDatabase={handleResetDatabase}
        onManualRefresh={handleManualRefresh}
        onUpdateReports={updateReportsDB}
      />
    );
  }

  // Active user is Bureau Administrator
  return (
    <BureauPortal
      user={activeUser}
      properties={properties}
      reports={reports}
      contractors={contractors}
      inboundEmails={inboundEmails}
      onApproveReport={handleApproveReport}
      onRejectReport={handleRejectReport}
      onAddProperty={handleAddProperty}
      onDeleteContractor={handleDeleteContractor}
      onDeleteReport={handleDeleteReport}
      onClearAllReports={handleClearAllReports}
      onLogout={handleLogout}
      onResetDatabase={handleResetDatabase}
      onManualRefresh={handleManualRefresh}
      onUpdateReports={updateReportsDB}
    />
  );
}
