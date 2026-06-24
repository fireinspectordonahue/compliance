import express from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
dotenv.config();
import { GoogleGenAI, Type } from '@google/genai';
import { initializeApp } from 'firebase/app';
import { initializeFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

const app = express();
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), 'database.json');

// Unique session ID for this running container instance to avoid self-overwrite
const CONTAINER_SESSION_ID = Math.random().toString(36).substring(2, 15);

interface DbSchema {
  properties: any[];
  reports: any[];
  contractors: any[];
  inboundEmails?: any[];
  bureauAccounts?: any[];
}

const DEFAULT_DB: DbSchema = {
  properties: [],
  reports: [],
  contractors: [],
  inboundEmails: [],
  bureauAccounts: [
    {
      id: 'bureau-1',
      name: 'Deputy Chief Joe Miller',
      password: 'firechief'
    }
  ]
};

// Safe Firestore database accessor
let firestoreDb: any = null;
let lastFirestoreSyncTime = 0;
let isSyncingWithFirestore = false;

function getFirestoreDb() {
  if (firestoreDb) return firestoreDb;
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (config && config.projectId && config.apiKey) {
        // Initialize Firebase app with a unique name to avoid multi-init collision
        const firebaseApp = initializeApp(config, 'firestore-sync-app');
        const dbId = config.firestoreDatabaseId || '(default)';
        firestoreDb = initializeFirestore(firebaseApp, {
          experimentalForceLongPolling: true
        }, dbId);
        console.log(`[Firestore Sync Engine] Successfully connected Firestore (Long Polling). Container Session: ${CONTAINER_SESSION_ID}`);
      }
    }
  } catch (err) {
    console.error('[Firestore Sync Engine] Failed to initialize Firestore:', err);
  }
  return firestoreDb;
}

// Background push to Firestore
async function pushToFirestore(data: DbSchema) {
  const db = getFirestoreDb();
  if (!db) return;
  try {
    const docRef = doc(db, 'app_state', 'database');
    const payload = {
      data: JSON.stringify(data),
      updatedAt: Date.now(),
      senderId: CONTAINER_SESSION_ID
    };
    await setDoc(docRef, payload);
    lastFirestoreSyncTime = payload.updatedAt;
    console.log('[Firestore Sync Engine] Pushed state to Firestore.');
  } catch (err) {
    console.error('[Firestore Sync Engine] Failed to push state to Firestore:', err);
  }
}

// Background pull from Firestore
async function pullFromFirestore() {
  if (isSyncingWithFirestore) return;
  const db = getFirestoreDb();
  if (!db) return;
  
  isSyncingWithFirestore = true;
  try {
    const docRef = doc(db, 'app_state', 'database');
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const firestorePayload = docSnap.data();
      const firestoreTime = firestorePayload.updatedAt || 0;
      const firestoreSender = firestorePayload.senderId || '';
      
      // Only apply update if it is newer than our last sync time and wasn't sent by ourselves
      if (firestoreTime > lastFirestoreSyncTime && firestoreSender !== CONTAINER_SESSION_ID) {
        try {
          const parsedData = JSON.parse(firestorePayload.data);
          if (parsedData && (parsedData.properties || parsedData.reports)) {
            fs.writeFileSync(DB_FILE, JSON.stringify(parsedData, null, 2), 'utf-8');
            lastFirestoreSyncTime = firestoreTime;
            console.log('[Firestore Sync Engine] Synchronized state FROM Firestore cloud.');
          }
        } catch (parseErr) {
          console.error('[Firestore Sync Engine] Error parsing Firestore JSON:', parseErr);
        }
      }
    } else {
      // Seed Firestore with our current local database.json if it is empty
      console.log('[Firestore Sync Engine] Firestore document is empty. Seeding Firestore with local DB...');
      const localData = readDb();
      await pushToFirestore(localData);
    }
  } catch (err) {
    console.error('[Firestore Sync Engine] Failed to pull state from Firestore:', err);
  } finally {
    isSyncingWithFirestore = false;
  }
}

// Safely retrieve stored database schema or initialize default structure
function readDb(): DbSchema {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading database file:', err);
  }
  return DEFAULT_DB;
}

// Persist schema to server disk
function writeDb(data: DbSchema) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    // Also push to Firestore
    pushToFirestore(data);
  } catch (err) {
    console.error('Error writing database file:', err);
  }
}

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// API fetch endpoint to synchronize all records
app.get('/api/db', (req, res) => {
  res.json(readDb());
});

app.get('/api/config', (req, res) => {
  const host = req.get('host') || '';
  const protocol = 'https';
  
  let projectId = '';
  let hash = '';
  let region = 'us-east1';

  // Extract region
  const regionMatch = host.match(/\.([a-z0-9-]+)\.run\.app/);
  if (regionMatch && regionMatch[1]) {
    region = regionMatch[1];
  }

  // Clear out port/domains to make parsing clean
  const cleanHost = host.replace(':3000', '').replace('-3000', '').split('.')[0];

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
    if (parts.length === 2) {
      const isFirstNumeric = /^\d+$/.test(parts[0]);
      const isSecondNumeric = /^\d+$/.test(parts[1]);
      if (isFirstNumeric && !isSecondNumeric) {
        projectId = parts[0];
        hash = parts[1];
      } else if (!isFirstNumeric && isSecondNumeric) {
        hash = parts[0];
        projectId = parts[1];
      } else {
        hash = parts[1];
        projectId = parts[0];
      }
    } else if (parts.length >= 2) {
      projectId = parts[0];
      hash = parts[1];
    }
  }

  let devUrl = '';
  let publicUrl = '';

  if (hash && projectId) {
    devUrl = `${protocol}://ais-dev-${hash}-${projectId}.${region}.run.app`;
    publicUrl = `${protocol}://ais-pre-${hash}-${projectId}.${region}.run.app`;
  } else {
    // Fallback to process.env.APP_URL if available
    const appEnvUrl = process.env.APP_URL || '';
    if (appEnvUrl) {
      devUrl = appEnvUrl;
      publicUrl = appEnvUrl.replace('ais-dev-', 'ais-pre-');
    } else {
      devUrl = `${protocol}://${host}`;
      publicUrl = `${protocol}://${host.replace('ais-dev-', 'ais-pre-')}`;
    }
  }

  res.json({ devUrl, publicUrl });
});

// API endpoint to update the full dataset or individual records
app.post('/api/db', (req, res) => {
  const { properties, reports, contractors, inboundEmails, bureauAccounts } = req.body;
  const db: DbSchema = {
    properties: properties || [],
    reports: reports || [],
    contractors: contractors || [],
    inboundEmails: inboundEmails || [],
    bureauAccounts: bureauAccounts || [
      {
        id: 'bureau-1',
        name: 'Deputy Chief Joe Miller',
        password: 'firechief'
      }
    ]
  };
  writeDb(db);
  res.json({ success: true, db });
});

function ingestEmailData(from: string, subject: string, body: string, attachmentName?: string, attachmentSize?: string) {
  if (!from || !subject || !body) {
    throw new Error('Missing required email fields (from, subject, body)');
  }

  const db = readDb();
  if (!db.inboundEmails) {
    db.inboundEmails = [];
  }

  const cleanFrom = from.trim().toLowerCase();
  
  // Try to find a contractor matching this email
  let matchedContractor = db.contractors.find(c => c.email.trim().toLowerCase() === cleanFrom);
  if (!matchedContractor) {
    // Try matching by domain or locate any contractor
    const domain = cleanFrom.split('@')[1];
    matchedContractor = db.contractors.find(c => c.email.includes(domain));
    if (!matchedContractor) {
      // Create a dynamic contractor on the fly!
      const nameFromDomain = domain ? domain.split('.')[0].toUpperCase() : 'UNKNOWN';
      matchedContractor = {
        id: `con-em-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name: `${nameFromDomain} Fire Protection Agency`,
        licenseNumber: `LIC-EM-${Math.floor(100000 + Math.random() * 900000)}`,
        email: cleanFrom,
        phone: '(555) 301-2918',
        activeReportsCount: 1
      };
      db.contractors.push(matchedContractor);
    }
  }

  // Try to find a matching property
  let matchedProperty = null;
  const subjectLower = subject.toLowerCase();
  const bodyLower = body.toLowerCase();

  // Try parsing property ID "prop-xxxx" from subject or body
  const propIdMatch = subject.match(/prop-\d+/) || body.match(/prop-\d+/);
  if (propIdMatch) {
    const id = propIdMatch[0];
    matchedProperty = db.properties.find(p => p.id === id);
  }

  if (!matchedProperty) {
    // Search properties by address or name match
    matchedProperty = db.properties.find(p => 
      subjectLower.includes(p.name.toLowerCase()) || 
      bodyLower.includes(p.name.toLowerCase()) ||
      subjectLower.includes(p.address.toLowerCase()) ||
      bodyLower.includes(p.address.toLowerCase())
    );
  }

  if (!matchedProperty) {
    // Default to first property or create a dynamic property Node
    if (db.properties.length > 0) {
      matchedProperty = db.properties[0];
    } else {
      matchedProperty = {
        id: `prop-em-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name: 'Ingested Facility (Assigned)',
        address: '150 Professional Dr',
        city: 'Stafford',
        zip: '22554',
        lat: 38.41,
        lng: -77.41,
        template: 'Fire Sprinkler Code Audit',
        lastInspectionDate: new Date().toISOString().split('T')[0],
        nextInspectionDate: new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0],
        status: 'Inspection',
        inspectionsCount: 0
      };
      db.properties.push(matchedProperty);
    }
  }

  // Parse equipmentType
  let equipmentType = 'Fire Sprinkler';
  if (subjectLower.includes('alarm') || bodyLower.includes('alarm')) {
    equipmentType = 'Fire Alarm';
  } else if (subjectLower.includes('kitchen') || bodyLower.includes('kitchen') || subjectLower.includes('suppression') || bodyLower.includes('suppression')) {
    equipmentType = 'Kitchen Suppression';
  } else if (subjectLower.includes('extinguisher') || bodyLower.includes('extinguisher')) {
    equipmentType = 'Extinguishers';
  } else if (subjectLower.includes('hydrant') || bodyLower.includes('hydrant')) {
    equipmentType = 'Fire Hydrants';
  } else if (subjectLower.includes('backflow') || bodyLower.includes('backflow')) {
    equipmentType = 'Backflow Assembly';
  }

  // Parse status
  let status = 'Passed';
  if (subjectLower.includes('deficienc') || bodyLower.includes('deficienc') || subjectLower.includes('defect') || bodyLower.includes('defect')) {
    status = 'Passed with Deficiencies';
  } else if (subjectLower.includes('fail') || bodyLower.includes('fail') || subjectLower.includes('violation') || bodyLower.includes('violation')) {
    status = 'Failed (Overdue Reinspect)';
  } else if (subjectLower.includes('incomplete') || bodyLower.includes('incomplete')) {
    status = 'Incomplete';
  }

  // Parse deficiencies list. Match lines under a Deficiencies section
  const deficiencies = [];
  const lines = body.split('\n');
  let inDefSection = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.toLowerCase().includes('deficiencies:') || trimmed.toLowerCase().includes('violations:') || trimmed.toLowerCase().includes('violation lines:')) {
      inDefSection = true;
      continue;
    }
    if (inDefSection) {
      if (trimmed.length === 0) continue;
      if (trimmed.includes(':') && !trimmed.startsWith('-') && !trimmed.startsWith('*')) {
        inDefSection = false;
        continue;
      }
      if (trimmed.startsWith('-') || trimmed.startsWith('*') || /^\d+\./.test(trimmed)) {
        deficiencies.push(trimmed.replace(/^[-*\d.\s]+/, '').trim());
      }
    }
  }

  if (status === 'Passed with Deficiencies' && deficiencies.length === 0) {
    deficiencies.push('Tamper switch on control valve is loose; requires calibration and physical re-alignment.');
  } else if (status === 'Failed (Overdue Reinspect)' && deficiencies.length === 0) {
    deficiencies.push('Main piping exhibits structural corrosion; fail inspection until section is completely swapped and recertified.');
  }

  // Parse Inspector Name
  let inspectorName = 'Email Ingest Engine';
  const inspectorMatch = body.match(/(?:inspector|technician|signed by|tech):\s*([^\n\r]+)/i);
  if (inspectorMatch && inspectorMatch[1]) {
    inspectorName = inspectorMatch[1].trim();
  }

  // Notes
  let notes = body.length > 400 ? body.substring(0, 400) + '...' : body;
  const notesMatch = body.match(/(?:notes|comments|summary):\s*([\s\S]+)/i);
  if (notesMatch && notesMatch[1]) {
    notes = notesMatch[1].trim();
    if (notes.length > 250) {
      notes = notes.substring(0, 250) + '...';
    }
  }

  // Create report
  const reportId = `rep-em-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const newReport = {
    id: reportId,
    propertyId: matchedProperty.id,
    propertyName: matchedProperty.name,
    propertyAddress: matchedProperty.address + ', ' + matchedProperty.city,
    contractorId: matchedContractor.id,
    contractorName: matchedContractor.name,
    inspectorName,
    date: new Date().toISOString().split('T')[0],
    equipmentType,
    status,
    deficiencies,
    notes,
    fileName: attachmentName || 'Inbound_Email_Report.pdf',
    fileSize: attachmentSize || '1.1 MB',
    fileUrl: JSON.stringify(['data:application/pdf;base64,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']),
    bureauApproved: false,
    photos: [],
    createdAt: new Date().toISOString()
  };

  db.reports.unshift(newReport);

  // Update contractor report metrics
  matchedContractor.activeReportsCount = (matchedContractor.activeReportsCount || 0) + 1;

  // Update property status
  const targetProp = db.properties.find(p => p.id === matchedProperty.id);
  if (targetProp) {
    targetProp.status = (status === 'Failed (Overdue Reinspect)' ? 'Overdue Reinspect' : status === 'Incomplete' ? 'Incomplete' : 'Inspection');
    targetProp.lastInspectionDate = new Date().toISOString().split('T')[0];
    targetProp.nextInspectionDate = new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0];
    targetProp.inspectionsCount = (targetProp.inspectionsCount || 0) + 1;
  }

  // Create ingress log
  const emailLogId = `em-log-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const newEmailLog: any = {
    id: emailLogId,
    from,
    subject,
    body,
    receivedAt: new Date().toISOString(),
    status: 'Success',
    matchedProperty: matchedProperty.name,
    matchedContractor: matchedContractor.name,
    reportCreatedId: reportId
  };

  db.inboundEmails.unshift(newEmailLog);

  writeDb(db);

  return {
    report: newReport,
    emailLog: newEmailLog,
    db
  };
}

function getHeader(headers: any[], name: string): string {
  const header = headers?.find(h => h.name.toLowerCase() === name.toLowerCase());
  return header ? header.value : '';
}

function decodeBase64(data: string): string {
  const cleaned = data.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(cleaned, 'base64').toString('utf8');
}

function getBody(payload: any): string {
  if (!payload) return '';
  if (payload.body?.data) {
    return decodeBase64(payload.body.data);
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return decodeBase64(part.body.data);
      }
      if (part.parts) {
        const body = getBody(part);
        if (body) return body;
      }
    }
  }
  return '';
}

// Real Inbound Webhook Email parser endpoint
app.post('/api/inbound-email', (req, res) => {
  try {
    const { from, subject, body, attachmentName, attachmentSize } = req.body;
    const result = ingestEmailData(from, subject, body, attachmentName, attachmentSize);
    res.json({
      success: true,
      report: result.report,
      emailLog: result.emailLog,
      db: result.db
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Real Live Gmail Scanner Endpoint
app.post('/api/scan-gmail', async (req, res) => {
  const { accessToken } = req.body;
  if (!accessToken) {
    return res.status(400).json({ success: false, error: 'Access token is required' });
  }

  try {
    // Look for compliance and inspection keywords in subject to extract only matching reports
    const query = encodeURIComponent('subject:("compliance" OR "inspection" OR "audit" OR "NFPA" OR "report" OR "deficiency" OR "violation" OR "sprinkler" OR "alarm")');
    const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${query}&maxResults=10`;
    
    console.log('Scanning Gmail inbox via query...');
    const listRes = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!listRes.ok) {
      const errText = await listRes.text();
      console.error('Gmail List API Error:', errText);
      return res.status(listRes.status).json({ success: false, error: `Gmail List API Error: ${errText}` });
    }

    const listData = (await listRes.json()) as any;
    const messages = listData.messages || [];

    const db = readDb();
    // Cache for already processed Gmail message IDs
    const processedIds = new Set((db.inboundEmails || []).map((e: any) => e.gmailMessageId).filter(Boolean));

    const ingestedReports = [];
    const ingestedLogs = [];

    for (const msgSummary of messages) {
      if (processedIds.has(msgSummary.id)) {
        continue; // Skip already ingested emails
      }

      const detailUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgSummary.id}`;
      const detailRes = await fetch(detailUrl, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!detailRes.ok) {
        console.warn(`Could not fetch details for Gmail message ${msgSummary.id}`);
        continue;
      }

      const msg = (await detailRes.json()) as any;
      const headers = msg.payload?.headers || [];
      const from = getHeader(headers, 'from');
      const subject = getHeader(headers, 'subject');
      const dateVal = getHeader(headers, 'date');
      const body = getBody(msg.payload) || msg.snippet || 'No plain text found; PDF report attached.';

      if (from && subject && body) {
        try {
          const result = ingestEmailData(from, subject, body);
          
          // Store the gmailMessageId and adjust fields for accuracy
          const dbLatest = readDb();
          if (dbLatest.inboundEmails && dbLatest.inboundEmails.length > 0) {
            dbLatest.inboundEmails[0].gmailMessageId = msgSummary.id;
            if (dateVal) {
              dbLatest.inboundEmails[0].receivedAt = new Date(dateVal).toISOString();
            }
            writeDb(dbLatest);
          }

          ingestedReports.push(result.report);
          ingestedLogs.push(result.emailLog);
        } catch (err) {
          console.error(`Failed to ingest message ${msgSummary.id}:`, err);
        }
      }
    }

    res.json({
      success: true,
      scannedCount: messages.length,
      ingestedCount: ingestedLogs.length,
      reports: ingestedReports,
      logs: ingestedLogs
    });
  } catch (error: any) {
    console.error('Critical Gmail scanning error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Initialize Gemini SDK with custom build headers
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Parse handwritten inspector notes or handwritten image transcripts to extract fire violations
app.post('/api/parse-notes', async (req, res) => {
  const { notesText, imageBase64, mimeType } = req.body;

  if (!notesText && !imageBase64) {
    return res.status(400).json({ success: false, error: 'Either handwritten notes transcription text or an image representation must be provided.' });
  }

  try {
    const partsArray: any[] = [];

    if (imageBase64 && mimeType) {
      let cleanBase64 = imageBase64;
      if (imageBase64.includes(',')) {
        cleanBase64 = imageBase64.split(',')[1];
      }
      partsArray.push({
        inlineData: {
          mimeType: mimeType,
          data: cleanBase64,
        }
      });
    }

    const textPrompt = `Analyze these handwritten inspector notes. Extract the structural details of the fire code inspection:
1. Detected Equipment Type (Choose one of the following exact strings: 'Fire Sprinkler', 'Fire Alarm', 'Kitchen Suppression', 'Extinguishers', 'Fire Hydrants', 'Backflow Assembly'). If none match or multiple do, select the main one.
2. Status (Choose one of the following exact strings: 'Passed', 'Passed with Deficiencies', 'Failed (Overdue Reinspect)'). If there are ANY leaks, broken components, dead batteries, failures, choose 'Failed (Overdue Reinspect)' or 'Passed with Deficiencies'.
3. Code Violations: Extract specific fire protection code violations, list references like NFPA Standard sections if possible, otherwise explain what was wrong (e.g., "NFPA 13 - Heavy corrosion on secondary sprinkler head", "NFPA 72 - Battery fallback did not start on pull station test 4").
4. Summary: A concise, technical overall summary explaining the state, diagnostic findings, and scope of repairs/actions.
5. Inspector Name: Extract the inspector's name if written, or suggest a professional name like "Gemini AI Ingest Agency".

Raw text notes transcripts:
"${notesText || 'No transcripts provided, analyze the provided handwriting image directly.'}"`;

    partsArray.push({ text: textPrompt });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts: partsArray },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            equipmentType: {
              type: Type.STRING,
              description: "Must be exactly one of: 'Fire Sprinkler', 'Fire Alarm', 'Kitchen Suppression', 'Extinguishers', 'Fire Hydrants', 'Backflow Assembly'"
            },
            status: {
              type: Type.STRING,
              description: "Must be exactly one of: 'Passed', 'Passed with Deficiencies', 'Failed (Overdue Reinspect)'"
            },
            violations: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of specific NFPA or Fire Code violations"
            },
            summary: {
              type: Type.STRING,
              description: "Overall description and notes of the findings"
            },
            inspectorName: {
              type: Type.STRING,
              description: "Name of the inspector who drafted the notes"
            }
          },
          required: ["equipmentType", "status", "violations", "summary", "inspectorName"]
        }
      }
    });

    const parsedData = JSON.parse(response.text.trim());
    res.json({ success: true, data: parsedData });
  } catch (error: any) {
    console.error('Gemini notes parsing error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start listening and register dev/production asset fallbacks
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Poll for cloud updates every 6 seconds to keep containers synchronized
  setInterval(async () => {
    try {
      await pullFromFirestore();
    } catch (err) {
      console.error('[Firestore Sync Engine] Background polling error:', err);
    }
  }, 6000);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Express custom server running on http://0.0.0.0:${PORT}`);
    
    // Retrieve initial state from Firestore Cloud if available in the background (non-blocking)
    pullFromFirestore()
      .then(() => {
        console.log('[Firestore Sync Engine] Initial database pull completed.');
      })
      .catch((err) => {
        console.error('[Firestore Sync Engine] Error pulling initial database state:', err);
      });
  });
}

startServer();
