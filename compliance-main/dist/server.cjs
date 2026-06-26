var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_dotenv = __toESM(require("dotenv"), 1);
var import_genai = require("@google/genai");
var import_app = require("firebase/app");
var import_firestore = require("firebase/firestore");
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = 3e3;
var DB_FILE = import_path.default.join(process.cwd(), "database.json");
var CONTAINER_SESSION_ID = Math.random().toString(36).substring(2, 15);
var DEFAULT_DB = {
  properties: [],
  reports: [],
  contractors: [],
  inboundEmails: [],
  bureauAccounts: [
    {
      id: "bureau-1",
      name: "Deputy Chief Joe Miller",
      password: "firechief"
    }
  ]
};
var firestoreDb = null;
var lastFirestoreSyncTime = 0;
var isSyncingWithFirestore = false;
function getFirestoreDb() {
  if (firestoreDb) return firestoreDb;
  try {
    const configPath = import_path.default.join(process.cwd(), "firebase-applet-config.json");
    if (import_fs.default.existsSync(configPath)) {
      const config = JSON.parse(import_fs.default.readFileSync(configPath, "utf-8"));
      if (config && config.projectId && config.apiKey) {
        const firebaseApp = (0, import_app.initializeApp)(config, "firestore-sync-app");
        const dbId = config.firestoreDatabaseId || "(default)";
        firestoreDb = (0, import_firestore.initializeFirestore)(firebaseApp, {
          experimentalForceLongPolling: true
        }, dbId);
        console.log(`[Firestore Sync Engine] Successfully connected Firestore (Long Polling). Container Session: ${CONTAINER_SESSION_ID}`);
      }
    }
  } catch (err) {
    console.error("[Firestore Sync Engine] Failed to initialize Firestore:", err);
  }
  return firestoreDb;
}
async function pushToFirestore(data) {
  const db = getFirestoreDb();
  if (!db) return;
  try {
    const docRef = (0, import_firestore.doc)(db, "app_state", "database");
    const payload = {
      data: JSON.stringify(data),
      updatedAt: Date.now(),
      senderId: CONTAINER_SESSION_ID
    };
    await (0, import_firestore.setDoc)(docRef, payload);
    lastFirestoreSyncTime = payload.updatedAt;
    console.log("[Firestore Sync Engine] Pushed state to Firestore.");
  } catch (err) {
    console.error("[Firestore Sync Engine] Failed to push state to Firestore:", err);
  }
}
async function pullFromFirestore() {
  if (isSyncingWithFirestore) return;
  const db = getFirestoreDb();
  if (!db) return;
  isSyncingWithFirestore = true;
  try {
    const docRef = (0, import_firestore.doc)(db, "app_state", "database");
    const docSnap = await (0, import_firestore.getDoc)(docRef);
    if (docSnap.exists()) {
      const firestorePayload = docSnap.data();
      const firestoreTime = firestorePayload.updatedAt || 0;
      const firestoreSender = firestorePayload.senderId || "";
      if (firestoreTime > lastFirestoreSyncTime && firestoreSender !== CONTAINER_SESSION_ID) {
        try {
          const parsedData = JSON.parse(firestorePayload.data);
          if (parsedData && (parsedData.properties || parsedData.reports)) {
            import_fs.default.writeFileSync(DB_FILE, JSON.stringify(parsedData, null, 2), "utf-8");
            lastFirestoreSyncTime = firestoreTime;
            console.log("[Firestore Sync Engine] Synchronized state FROM Firestore cloud.");
          }
        } catch (parseErr) {
          console.error("[Firestore Sync Engine] Error parsing Firestore JSON:", parseErr);
        }
      }
    } else {
      console.log("[Firestore Sync Engine] Firestore document is empty. Seeding Firestore with local DB...");
      const localData = readDb();
      await pushToFirestore(localData);
    }
  } catch (err) {
    console.error("[Firestore Sync Engine] Failed to pull state from Firestore:", err);
  } finally {
    isSyncingWithFirestore = false;
  }
}
function readDb() {
  try {
    if (import_fs.default.existsSync(DB_FILE)) {
      const data = import_fs.default.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading database file:", err);
  }
  return DEFAULT_DB;
}
function writeDb(data) {
  try {
    import_fs.default.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
    pushToFirestore(data);
  } catch (err) {
    console.error("Error writing database file:", err);
  }
}
app.use(import_express.default.json({ limit: "100mb" }));
app.use(import_express.default.urlencoded({ limit: "100mb", extended: true }));
app.get("/api/db", (req, res) => {
  res.json(readDb());
});
app.get("/api/config", (req, res) => {
  const host = req.get("host") || "";
  const protocol = "https";
  let projectId = "";
  let hash = "";
  let region = "us-east1";
  const regionMatch = host.match(/\.([a-z0-9-]+)\.run\.app/);
  if (regionMatch && regionMatch[1]) {
    region = regionMatch[1];
  }
  const cleanHost = host.replace(":3000", "").replace("-3000", "").split(".")[0];
  if (cleanHost.includes("ais-dev-")) {
    const rest = cleanHost.substring(cleanHost.indexOf("ais-dev-") + 8);
    const parts = rest.split("-");
    if (parts.length >= 2) {
      hash = parts[0];
      projectId = parts[1];
    }
  } else if (cleanHost.includes("ais-pre-")) {
    const rest = cleanHost.substring(cleanHost.indexOf("ais-pre-") + 8);
    const parts = rest.split("-");
    if (parts.length >= 2) {
      hash = parts[0];
      projectId = parts[1];
    }
  } else {
    const parts = cleanHost.split("-");
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
  let devUrl = "";
  let publicUrl = "";
  if (hash && projectId) {
    devUrl = `${protocol}://ais-dev-${hash}-${projectId}.${region}.run.app`;
    publicUrl = `${protocol}://ais-pre-${hash}-${projectId}.${region}.run.app`;
  } else {
    const appEnvUrl = process.env.APP_URL || "";
    if (appEnvUrl) {
      devUrl = appEnvUrl;
      publicUrl = appEnvUrl.replace("ais-dev-", "ais-pre-");
    } else {
      devUrl = `${protocol}://${host}`;
      publicUrl = `${protocol}://${host.replace("ais-dev-", "ais-pre-")}`;
    }
  }
  res.json({ devUrl, publicUrl });
});
app.post("/api/db", (req, res) => {
  const { properties, reports, contractors, inboundEmails, bureauAccounts } = req.body;
  const db = {
    properties: properties || [],
    reports: reports || [],
    contractors: contractors || [],
    inboundEmails: inboundEmails || [],
    bureauAccounts: bureauAccounts || [
      {
        id: "bureau-1",
        name: "Deputy Chief Joe Miller",
        password: "firechief"
      }
    ]
  };
  writeDb(db);
  res.json({ success: true, db });
});
function ingestEmailData(from, subject, body, attachmentName, attachmentSize) {
  if (!from || !subject || !body) {
    throw new Error("Missing required email fields (from, subject, body)");
  }
  const db = readDb();
  if (!db.inboundEmails) {
    db.inboundEmails = [];
  }
  const cleanFrom = from.trim().toLowerCase();
  let matchedContractor = db.contractors.find((c) => c.email.trim().toLowerCase() === cleanFrom);
  if (!matchedContractor) {
    const domain = cleanFrom.split("@")[1];
    matchedContractor = db.contractors.find((c) => c.email.includes(domain));
    if (!matchedContractor) {
      const nameFromDomain = domain ? domain.split(".")[0].toUpperCase() : "UNKNOWN";
      matchedContractor = {
        id: `con-em-${Date.now()}-${Math.floor(Math.random() * 1e3)}`,
        name: `${nameFromDomain} Fire Protection Agency`,
        licenseNumber: `LIC-EM-${Math.floor(1e5 + Math.random() * 9e5)}`,
        email: cleanFrom,
        phone: "(555) 301-2918",
        activeReportsCount: 1
      };
      db.contractors.push(matchedContractor);
    }
  }
  let matchedProperty = null;
  const subjectLower = subject.toLowerCase();
  const bodyLower = body.toLowerCase();
  const propIdMatch = subject.match(/prop-\d+/) || body.match(/prop-\d+/);
  if (propIdMatch) {
    const id = propIdMatch[0];
    matchedProperty = db.properties.find((p) => p.id === id);
  }
  if (!matchedProperty) {
    matchedProperty = db.properties.find(
      (p) => subjectLower.includes(p.name.toLowerCase()) || bodyLower.includes(p.name.toLowerCase()) || subjectLower.includes(p.address.toLowerCase()) || bodyLower.includes(p.address.toLowerCase())
    );
  }
  if (!matchedProperty) {
    if (db.properties.length > 0) {
      matchedProperty = db.properties[0];
    } else {
      matchedProperty = {
        id: `prop-em-${Date.now()}-${Math.floor(Math.random() * 1e3)}`,
        name: "Ingested Facility (Assigned)",
        address: "150 Professional Dr",
        city: "Stafford",
        zip: "22554",
        lat: 38.41,
        lng: -77.41,
        template: "Fire Sprinkler Code Audit",
        lastInspectionDate: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
        nextInspectionDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1e3).toISOString().split("T")[0],
        status: "Inspection",
        inspectionsCount: 0
      };
      db.properties.push(matchedProperty);
    }
  }
  let equipmentType = "Fire Sprinkler";
  if (subjectLower.includes("alarm") || bodyLower.includes("alarm")) {
    equipmentType = "Fire Alarm";
  } else if (subjectLower.includes("kitchen") || bodyLower.includes("kitchen") || subjectLower.includes("suppression") || bodyLower.includes("suppression")) {
    equipmentType = "Kitchen Suppression";
  } else if (subjectLower.includes("extinguisher") || bodyLower.includes("extinguisher")) {
    equipmentType = "Extinguishers";
  } else if (subjectLower.includes("hydrant") || bodyLower.includes("hydrant")) {
    equipmentType = "Fire Hydrants";
  } else if (subjectLower.includes("backflow") || bodyLower.includes("backflow")) {
    equipmentType = "Backflow Assembly";
  }
  let status = "Passed";
  if (subjectLower.includes("deficienc") || bodyLower.includes("deficienc") || subjectLower.includes("defect") || bodyLower.includes("defect")) {
    status = "Passed with Deficiencies";
  } else if (subjectLower.includes("fail") || bodyLower.includes("fail") || subjectLower.includes("violation") || bodyLower.includes("violation")) {
    status = "Failed (Overdue Reinspect)";
  } else if (subjectLower.includes("incomplete") || bodyLower.includes("incomplete")) {
    status = "Incomplete";
  }
  const deficiencies = [];
  const lines = body.split("\n");
  let inDefSection = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.toLowerCase().includes("deficiencies:") || trimmed.toLowerCase().includes("violations:") || trimmed.toLowerCase().includes("violation lines:")) {
      inDefSection = true;
      continue;
    }
    if (inDefSection) {
      if (trimmed.length === 0) continue;
      if (trimmed.includes(":") && !trimmed.startsWith("-") && !trimmed.startsWith("*")) {
        inDefSection = false;
        continue;
      }
      if (trimmed.startsWith("-") || trimmed.startsWith("*") || /^\d+\./.test(trimmed)) {
        deficiencies.push(trimmed.replace(/^[-*\d.\s]+/, "").trim());
      }
    }
  }
  if (status === "Passed with Deficiencies" && deficiencies.length === 0) {
    deficiencies.push("Tamper switch on control valve is loose; requires calibration and physical re-alignment.");
  } else if (status === "Failed (Overdue Reinspect)" && deficiencies.length === 0) {
    deficiencies.push("Main piping exhibits structural corrosion; fail inspection until section is completely swapped and recertified.");
  }
  let inspectorName = "Email Ingest Engine";
  const inspectorMatch = body.match(/(?:inspector|technician|signed by|tech):\s*([^\n\r]+)/i);
  if (inspectorMatch && inspectorMatch[1]) {
    inspectorName = inspectorMatch[1].trim();
  }
  let notes = body.length > 400 ? body.substring(0, 400) + "..." : body;
  const notesMatch = body.match(/(?:notes|comments|summary):\s*([\s\S]+)/i);
  if (notesMatch && notesMatch[1]) {
    notes = notesMatch[1].trim();
    if (notes.length > 250) {
      notes = notes.substring(0, 250) + "...";
    }
  }
  const reportId = `rep-em-${Date.now()}-${Math.floor(Math.random() * 1e3)}`;
  const newReport = {
    id: reportId,
    propertyId: matchedProperty.id,
    propertyName: matchedProperty.name,
    propertyAddress: matchedProperty.address + ", " + matchedProperty.city,
    contractorId: matchedContractor.id,
    contractorName: matchedContractor.name,
    inspectorName,
    date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    equipmentType,
    status,
    deficiencies,
    notes,
    fileName: attachmentName || "Inbound_Email_Report.pdf",
    fileSize: attachmentSize || "1.1 MB",
    fileUrl: JSON.stringify(["data:application/pdf;base64,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"]),
    bureauApproved: false,
    photos: [],
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  db.reports.unshift(newReport);
  matchedContractor.activeReportsCount = (matchedContractor.activeReportsCount || 0) + 1;
  const targetProp = db.properties.find((p) => p.id === matchedProperty.id);
  if (targetProp) {
    targetProp.status = status === "Failed (Overdue Reinspect)" ? "Overdue Reinspect" : status === "Incomplete" ? "Incomplete" : "Inspection";
    targetProp.lastInspectionDate = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    targetProp.nextInspectionDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1e3).toISOString().split("T")[0];
    targetProp.inspectionsCount = (targetProp.inspectionsCount || 0) + 1;
  }
  const emailLogId = `em-log-${Date.now()}-${Math.floor(Math.random() * 1e3)}`;
  const newEmailLog = {
    id: emailLogId,
    from,
    subject,
    body,
    receivedAt: (/* @__PURE__ */ new Date()).toISOString(),
    status: "Success",
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
function getHeader(headers, name) {
  const header = headers?.find((h) => h.name.toLowerCase() === name.toLowerCase());
  return header ? header.value : "";
}
function decodeBase64(data) {
  const cleaned = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(cleaned, "base64").toString("utf8");
}
function getBody(payload) {
  if (!payload) return "";
  if (payload.body?.data) {
    return decodeBase64(payload.body.data);
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        return decodeBase64(part.body.data);
      }
      if (part.parts) {
        const body = getBody(part);
        if (body) return body;
      }
    }
  }
  return "";
}
app.post("/api/inbound-email", (req, res) => {
  try {
    const { from, subject, body, attachmentName, attachmentSize } = req.body;
    const result = ingestEmailData(from, subject, body, attachmentName, attachmentSize);
    res.json({
      success: true,
      report: result.report,
      emailLog: result.emailLog,
      db: result.db
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});
app.post("/api/scan-gmail", async (req, res) => {
  const { accessToken } = req.body;
  if (!accessToken) {
    return res.status(400).json({ success: false, error: "Access token is required" });
  }
  try {
    const query = encodeURIComponent('subject:("compliance" OR "inspection" OR "audit" OR "NFPA" OR "report" OR "deficiency" OR "violation" OR "sprinkler" OR "alarm")');
    const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${query}&maxResults=10`;
    console.log("Scanning Gmail inbox via query...");
    const listRes = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!listRes.ok) {
      const errText = await listRes.text();
      console.error("Gmail List API Error:", errText);
      return res.status(listRes.status).json({ success: false, error: `Gmail List API Error: ${errText}` });
    }
    const listData = await listRes.json();
    const messages = listData.messages || [];
    const db = readDb();
    const processedIds = new Set((db.inboundEmails || []).map((e) => e.gmailMessageId).filter(Boolean));
    const ingestedReports = [];
    const ingestedLogs = [];
    for (const msgSummary of messages) {
      if (processedIds.has(msgSummary.id)) {
        continue;
      }
      const detailUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgSummary.id}`;
      const detailRes = await fetch(detailUrl, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!detailRes.ok) {
        console.warn(`Could not fetch details for Gmail message ${msgSummary.id}`);
        continue;
      }
      const msg = await detailRes.json();
      const headers = msg.payload?.headers || [];
      const from = getHeader(headers, "from");
      const subject = getHeader(headers, "subject");
      const dateVal = getHeader(headers, "date");
      const body = getBody(msg.payload) || msg.snippet || "No plain text found; PDF report attached.";
      if (from && subject && body) {
        try {
          const result = ingestEmailData(from, subject, body);
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
  } catch (error) {
    console.error("Critical Gmail scanning error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});
var ai = new import_genai.GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build"
    }
  }
});
app.post("/api/parse-notes", async (req, res) => {
  const { notesText, imageBase64, mimeType } = req.body;
  if (!notesText && !imageBase64) {
    return res.status(400).json({ success: false, error: "Either handwritten notes transcription text or an image representation must be provided." });
  }
  try {
    const partsArray = [];
    if (imageBase64 && mimeType) {
      let cleanBase64 = imageBase64;
      if (imageBase64.includes(",")) {
        cleanBase64 = imageBase64.split(",")[1];
      }
      partsArray.push({
        inlineData: {
          mimeType,
          data: cleanBase64
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
"${notesText || "No transcripts provided, analyze the provided handwriting image directly."}"`;
    partsArray.push({ text: textPrompt });
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts: partsArray },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: import_genai.Type.OBJECT,
          properties: {
            equipmentType: {
              type: import_genai.Type.STRING,
              description: "Must be exactly one of: 'Fire Sprinkler', 'Fire Alarm', 'Kitchen Suppression', 'Extinguishers', 'Fire Hydrants', 'Backflow Assembly'"
            },
            status: {
              type: import_genai.Type.STRING,
              description: "Must be exactly one of: 'Passed', 'Passed with Deficiencies', 'Failed (Overdue Reinspect)'"
            },
            violations: {
              type: import_genai.Type.ARRAY,
              items: { type: import_genai.Type.STRING },
              description: "List of specific NFPA or Fire Code violations"
            },
            summary: {
              type: import_genai.Type.STRING,
              description: "Overall description and notes of the findings"
            },
            inspectorName: {
              type: import_genai.Type.STRING,
              description: "Name of the inspector who drafted the notes"
            }
          },
          required: ["equipmentType", "status", "violations", "summary", "inspectorName"]
        }
      }
    });
    const parsedData = JSON.parse(response.text.trim());
    res.json({ success: true, data: parsedData });
  } catch (error) {
    console.error("Gemini notes parsing error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  setInterval(async () => {
    try {
      await pullFromFirestore();
    } catch (err) {
      console.error("[Firestore Sync Engine] Background polling error:", err);
    }
  }, 6e3);
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express custom server running on http://0.0.0.0:${PORT}`);
    pullFromFirestore().then(() => {
      console.log("[Firestore Sync Engine] Initial database pull completed.");
    }).catch((err) => {
      console.error("[Firestore Sync Engine] Error pulling initial database state:", err);
    });
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
