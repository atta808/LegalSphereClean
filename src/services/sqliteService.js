import * as SQLite from "expo-sqlite";
import { normalizeDateInput, toISO } from "../utils/date";
export const db = SQLite.openDatabaseSync("legal_app.db");
// =============================
// 🔧 DB VERSIONING / MIGRATION
// =============================
const CURRENT_DB_VERSION = 33; // Incremented for new indexes and schema changes

const getDBVersion = () => {
  try {
    const result = db.getFirstSync("SELECT version FROM app_meta LIMIT 1");
    return result?.version || 0;
  } catch {
    return 0;
  }
};

const setDBVersion = (version) => {
  db.runSync("DELETE FROM app_meta");
  db.runSync("INSERT INTO app_meta (version) VALUES (?)", [version]);
};

// =============================
// ✅ INIT DATABASE
// =============================
export const initDB = () => {
  // Create meta table first
  db.execSync(`
  CREATE TABLE IF NOT EXISTS app_meta (
    version INTEGER
  );
`);
  try {
    db.execSync("ALTER TABLE clients ADD COLUMN isArchived INTEGER DEFAULT 0;");
  } catch (_e) {
    // ignore if column already exists
  }
  try {
    db.execSync(`
       CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      remoteId TEXT,
      name TEXT,
      mobile TEXT,
      email TEXT,
      address TEXT,
      createdAt INTEGER,
      isArchived INTEGER DEFAULT 0,
      isDeleted INTEGER DEFAULT 0,
      syncStatus TEXT DEFAULT 'pending',
      updatedAt INTEGER
    );
    `);
    // =============================
    // 👤 PROFILE TABLE
    // =============================
    db.execSync(`
CREATE TABLE IF NOT EXISTS profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  name TEXT,
  jurisdiction TEXT,
  phone TEXT,
  image TEXT,
  links TEXT,
  country TEXT DEFAULT 'PK',
defaultClientCountry TEXT DEFAULT 'PK',
currency TEXT DEFAULT 'PKR',
locale TEXT DEFAULT 'en-PK',
activeCMS TEXT DEFAULT '["punjab"]',
favoriteTools TEXT DEFAULT '[]',
customCMS TEXT DEFAULT '[]',
researchSources TEXT DEFAULT '[]',
syncStatus TEXT DEFAULT 'pending',
  updatedAt INTEGER
);
`);
    db.execSync(`
CREATE TABLE IF NOT EXISTS cases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  remoteId TEXT,

  title TEXT,
  court TEXT,
  caseNo TEXT,
  opponent TEXT,

  clientId INTEGER,
  clientName TEXT,
  clientMobile TEXT,
  clientEmail TEXT,

  status TEXT DEFAULT 'active',
  priority TEXT DEFAULT 'normal',

  nextHearingDate TEXT,
  nextHearingISO TEXT,

  stage TEXT,
  judge TEXT,

  representingSide TEXT,

  opposingCounsel TEXT,

  institutionDate TEXT,

 sourceSystem TEXT,

  location TEXT,
  feeDecided REAL DEFAULT 0,
  feePaid REAL DEFAULT 0,
  feeBalance REAL DEFAULT 0,

  description TEXT,

  cmsType TEXT,
  districtId TEXT,

  tehsilId TEXT,
  tehsilName TEXT,

  caseYear TEXT,
  courtType TEXT,
  caseCategory TEXT,

  caseType TEXT,
  cmsCaseId TEXT,
  cmsRawData TEXT,
  courtGroup TEXT,
  litigationDomain TEXT,
  firNo TEXT,
  firDate TEXT,
  aiChatLink TEXT,
  workflowType TEXT,
  normalizedCategory TEXT,
  procedureFamily TEXT,
  cmsLastVerified INTEGER,
  cmsAutoSync INTEGER DEFAULT 1,

  createdAt INTEGER,

  isDeleted INTEGER DEFAULT 0,

  syncStatus TEXT DEFAULT 'pending',

  updatedAt INTEGER
);
`);

    db.execSync(`
     CREATE TABLE IF NOT EXISTS hearings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      remoteId TEXT,
      caseId INTEGER,
      hearingDate TEXT,
      stage TEXT,
      court TEXT,
      judge TEXT,
      description TEXT,
      notes TEXT,
      createdAt INTEGER,
       isDeleted INTEGER DEFAULT 0,   -- 🔥 HERE
      syncStatus TEXT DEFAULT 'pending',
      updatedAt INTEGER
    );
    `);
    db.execSync(`
  CREATE INDEX IF NOT EXISTS idx_hearings_remoteId 
ON hearings(remoteId);
`);
    db.execSync(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        caseId INTEGER,
        hearingId INTEGER,
        title TEXT,
        body TEXT,
        type TEXT,
        scheduledFor TEXT,
        notificationIdentifier TEXT,
        status TEXT DEFAULT 'pending',
        isRead INTEGER DEFAULT 0,
        createdAt INTEGER,
        updatedAt INTEGER
      );

  CREATE TABLE IF NOT EXISTS timeline (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    remoteId TEXT,

    caseId TEXT,  -- 🔥 ALWAYS STRING

   hearingDate TEXT,
stage TEXT,
court TEXT,
judge TEXT,
description TEXT,
proceedings TEXT,
remarks TEXT,

    createdAt INTEGER,
    isDeleted INTEGER DEFAULT 0,
    syncStatus TEXT DEFAULT 'pending',
    updatedAt INTEGER
  );
`);
    db.execSync(`
     CREATE TABLE IF NOT EXISTS case_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  remoteId TEXT,
  caseId INTEGER,
  text TEXT,
  image TEXT,
  createdAt INTEGER,
  isDeleted INTEGER DEFAULT 0,
  syncStatus TEXT DEFAULT 'pending',
  updatedAt INTEGER
);
    `);

    db.execSync(`
    CREATE TABLE IF NOT EXISTS master_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  remoteId TEXT,
  type TEXT,
  groupName TEXT,
  value TEXT,
  isDeleted INTEGER DEFAULT 0,
  syncStatus TEXT DEFAULT 'pending',
  updatedAt INTEGER
);
    `);

    db.execSync(`
      CREATE TABLE IF NOT EXISTS processFees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  remoteId TEXT,
  caseId INTEGER,
  caseName TEXT,
  court TEXT,
  amount REAL,
  purpose TEXT,
  date TEXT,
  note TEXT,
  paid INTEGER DEFAULT 0,
  paidTo TEXT,
  paidDate TEXT,

  syncStatus TEXT DEFAULT 'pending',
  updatedAt INTEGER
);
    `);

    db.execSync(`
      CREATE TABLE IF NOT EXISTS citations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  remoteId TEXT,
  caseId TEXT,
  citation TEXT,
  description TEXT,
  date TEXT,
  isDeleted INTEGER DEFAULT 0,
  syncStatus TEXT DEFAULT 'pending',
  updatedAt INTEGER
);
    `);
    db.execSync(`
CREATE TABLE IF NOT EXISTS document_vault (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  remoteId TEXT,

  caseId INTEGER,
  caseTitle TEXT,

  name TEXT,
  description TEXT,

  category TEXT,

  uri TEXT,
  originalUri TEXT,

  mimeType TEXT,
  fileExt TEXT,
  fileCategory TEXT,

  fileSize REAL,

  uploadDate TEXT,

  aiSummary TEXT,
  aiTags TEXT,

  createdAt INTEGER,

  isDeleted INTEGER DEFAULT 0,

  syncStatus TEXT DEFAULT 'pending',

  updatedAt INTEGER
);
`);
    db.execSync(`
 CREATE TABLE IF NOT EXISTS quick_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  remoteId TEXT,
  title TEXT,
  url TEXT,
  category TEXT DEFAULT 'personal',
  isFavorite INTEGER DEFAULT 0,
  isPinned INTEGER DEFAULT 0,
  isDeleted INTEGER DEFAULT 0,
  syncStatus TEXT DEFAULT 'pending',
  updatedAt INTEGER
);
`);
    // 2. Performance Indexes (Issue #3)
    db.execSync(`
    CREATE INDEX IF NOT EXISTS idx_cases_clientId ON cases(clientId);
    CREATE INDEX IF NOT EXISTS idx_cases_nextDate ON cases(nextHearingISO);
    CREATE INDEX IF NOT EXISTS idx_hearings_caseId ON hearings(caseId);
    CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
  `);
    db.execSync(`
  CREATE INDEX IF NOT EXISTS idx_cases_sync ON cases(syncStatus);
  CREATE INDEX IF NOT EXISTS idx_clients_sync ON clients(syncStatus);
  CREATE INDEX IF NOT EXISTS idx_hearings_sync ON hearings(syncStatus);
  CREATE INDEX IF NOT EXISTS idx_notes_sync ON case_notes(syncStatus);
  CREATE INDEX IF NOT EXISTS idx_links_sync ON quick_links(syncStatus);
  CREATE INDEX IF NOT EXISTS idx_notifications_caseId ON notifications(caseId);
  CREATE INDEX IF NOT EXISTS idx_notifications_isRead ON notifications(isRead);
  CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
`);
    // =============================
    // 🔥 MIGRATION (ADD MISSING COLUMNS)
    // =============================
    // =============================
    // 🔥 PROFILE MIGRATION (CRITICAL)
    // =============================

    try {
      db.execSync("ALTER TABLE profile ADD COLUMN country TEXT DEFAULT 'PK'");
    } catch {}

    try {
      db.execSync("ALTER TABLE profile ADD COLUMN currency TEXT DEFAULT 'PKR'");
    } catch {}

    try {
      db.execSync("ALTER TABLE profile ADD COLUMN locale TEXT DEFAULT 'en-PK'");
    } catch {}
    try {
      db.execSync(
        "ALTER TABLE cases ADD COLUMN syncStatus TEXT DEFAULT 'pending'",
      );
    } catch {}

    try {
      db.execSync("ALTER TABLE cases ADD COLUMN updatedAt INTEGER");
    } catch {}

    try {
      db.execSync(
        "ALTER TABLE clients ADD COLUMN syncStatus TEXT DEFAULT 'pending'",
      );
    } catch {}

    try {
      db.execSync("ALTER TABLE clients ADD COLUMN updatedAt INTEGER");
    } catch {}

    try {
      db.execSync(
        "ALTER TABLE hearings ADD COLUMN syncStatus TEXT DEFAULT 'pending'",
      );
    } catch {}

    try {
      db.execSync("ALTER TABLE hearings ADD COLUMN updatedAt INTEGER");
    } catch {}

    try {
      db.execSync(
        "ALTER TABLE processFees ADD COLUMN syncStatus TEXT DEFAULT 'pending'",
      );
    } catch {}

    try {
      db.execSync("ALTER TABLE processFees ADD COLUMN updatedAt INTEGER");
    } catch {}

    // 🔥 QuickLinks Migration (Phase 3+ Ready)

    try {
      db.execSync(
        "ALTER TABLE quick_links ADD COLUMN syncStatus TEXT DEFAULT 'pending'",
      );
    } catch {}

    try {
      db.execSync("ALTER TABLE quick_links ADD COLUMN updatedAt INTEGER");
    } catch {}

    try {
      db.execSync(`
    UPDATE quick_links 
    SET updatedAt = strftime('%s','now') 
    WHERE updatedAt IS NULL
  `);
    } catch {}
    // 🔥 QuickLinks Advanced Columns
    try {
      db.execSync(
        "ALTER TABLE quick_links ADD COLUMN category TEXT DEFAULT 'personal'",
      );
    } catch {}

    try {
      db.execSync(
        "ALTER TABLE quick_links ADD COLUMN isFavorite INTEGER DEFAULT 0",
      );
    } catch {}

    try {
      db.execSync(
        "ALTER TABLE quick_links ADD COLUMN isPinned INTEGER DEFAULT 0",
      );
    } catch {}
    try {
      db.execSync(
        "ALTER TABLE case_notes ADD COLUMN syncStatus TEXT DEFAULT 'pending'",
      );
    } catch {}

    try {
      db.execSync("ALTER TABLE case_notes ADD COLUMN updatedAt INTEGER");
    } catch {}
    try {
      db.execSync("ALTER TABLE cases ADD COLUMN opponent TEXT");
    } catch {}
    try {
      db.execSync("ALTER TABLE cases ADD COLUMN feeDecided REAL DEFAULT 0");
    } catch {}
    try {
      db.execSync("ALTER TABLE cases ADD COLUMN isDeleted INTEGER DEFAULT 0");
    } catch {}
    try {
      db.execSync(
        "ALTER TABLE case_notes ADD COLUMN isDeleted INTEGER DEFAULT 0",
      );
    } catch {}
    try {
      db.execSync(
        "ALTER TABLE hearings ADD COLUMN isDeleted INTEGER DEFAULT 0",
      );
    } catch {}
    try {
      db.execSync("ALTER TABLE master_items ADD COLUMN remoteId TEXT");
    } catch {}

    try {
      db.execSync(
        "ALTER TABLE master_items ADD COLUMN isDeleted INTEGER DEFAULT 0",
      );
    } catch {}

    try {
      db.execSync(
        "ALTER TABLE master_items ADD COLUMN syncStatus TEXT DEFAULT 'pending'",
      );
    } catch {}

    try {
      db.execSync("ALTER TABLE master_items ADD COLUMN updatedAt INTEGER");
    } catch {}
    try {
      db.execSync("ALTER TABLE master_items ADD COLUMN groupName TEXT");
    } catch {}
    try {
      db.execSync("ALTER TABLE citations ADD COLUMN remoteId TEXT");
    } catch {}

    try {
      db.execSync(
        "ALTER TABLE citations ADD COLUMN isDeleted INTEGER DEFAULT 0",
      );
    } catch {}

    try {
      db.execSync(
        "ALTER TABLE citations ADD COLUMN syncStatus TEXT DEFAULT 'pending'",
      );
    } catch {}

    try {
      db.execSync("ALTER TABLE citations ADD COLUMN updatedAt INTEGER");
    } catch {}
    try {
      db.execSync("ALTER TABLE quick_links ADD COLUMN remoteId TEXT");
    } catch {}

    try {
      db.execSync(
        "ALTER TABLE quick_links ADD COLUMN isDeleted INTEGER DEFAULT 0",
      );
    } catch {}
    try {
      db.execSync(
        "ALTER TABLE processFees ADD COLUMN isDeleted INTEGER DEFAULT 0",
      );
    } catch {}
    try {
      db.execSync("ALTER TABLE case_notes ADD COLUMN remoteId TEXT");
    } catch {}
    try {
      db.execSync("ALTER TABLE processFees ADD COLUMN remoteId TEXT");
    } catch {}
    try {
      db.execSync("ALTER TABLE cases ADD COLUMN remoteId TEXT");
    } catch {}
    try {
      db.execSync("ALTER TABLE clients ADD COLUMN remoteId TEXT");
    } catch {}
    try {
      db.execSync("ALTER TABLE hearings ADD COLUMN remoteId TEXT");
    } catch {}
    try {
      db.execSync("ALTER TABLE case_notes ADD COLUMN remoteId TEXT");
    } catch {}
    try {
      db.execSync("ALTER TABLE processFees ADD COLUMN remoteId TEXT");
    } catch {}
    try {
      db.execSync("ALTER TABLE citations ADD COLUMN remoteId TEXT");
    } catch {}
    try {
      db.execSync("ALTER TABLE quick_links ADD COLUMN remoteId TEXT");
    } catch {}
    try {
      db.execSync("ALTER TABLE master_items ADD COLUMN remoteId TEXT");
    } catch {}
    try {
      db.execSync("ALTER TABLE cases ADD COLUMN description TEXT");
    } catch {}
    try {
      db.execSync("ALTER TABLE cases ADD COLUMN cmsType TEXT");
    } catch {}

    try {
      db.execSync("ALTER TABLE cases ADD COLUMN districtId TEXT");
    } catch {}

    try {
      db.execSync("ALTER TABLE cases ADD COLUMN caseYear TEXT");
    } catch {}

    try {
      db.execSync("ALTER TABLE cases ADD COLUMN courtType TEXT");
    } catch {}

    try {
      db.execSync("ALTER TABLE cases ADD COLUMN caseCategory TEXT");
    } catch {}

    try {
      db.execSync("ALTER TABLE cases ADD COLUMN cmsLastVerified INTEGER");
    } catch {}

    try {
      db.execSync("ALTER TABLE cases ADD COLUMN cmsAutoSync INTEGER DEFAULT 1");
    } catch {}
    try {
      db.execSync("ALTER TABLE cases ADD COLUMN tehsilId TEXT");
    } catch {}

    try {
      db.execSync("ALTER TABLE cases ADD COLUMN tehsilName TEXT");
    } catch {}

    try {
      db.execSync("ALTER TABLE cases ADD COLUMN caseType TEXT");
    } catch {}

    try {
      db.execSync("ALTER TABLE cases ADD COLUMN cmsCaseId TEXT");
    } catch {}

    try {
      db.execSync("ALTER TABLE cases ADD COLUMN cmsRawData TEXT");
    } catch {}
    try {
      db.execSync("ALTER TABLE cases ADD COLUMN courtGroup TEXT");
    } catch {}

    try {
      db.execSync("ALTER TABLE cases ADD COLUMN litigationDomain TEXT");
    } catch {}
    try {
      db.execSync("ALTER TABLE cases ADD COLUMN aiChatLink TEXT");
    } catch {}
    try {
      db.execSync("ALTER TABLE cases ADD COLUMN firNo TEXT");
    } catch {}

    try {
      db.execSync("ALTER TABLE cases ADD COLUMN firDate TEXT");
    } catch {}
    try {
      db.execSync("ALTER TABLE cases ADD COLUMN workflowType TEXT");
    } catch {}

    try {
      db.execSync("ALTER TABLE cases ADD COLUMN normalizedCategory TEXT");
    } catch {}

    try {
      db.execSync("ALTER TABLE cases ADD COLUMN procedureFamily TEXT");
    } catch {}
    // =============================
    // 🚀 RUN MIGRATIONS
    // =============================

    let currentVersion = getDBVersion();

    if (currentVersion < CURRENT_DB_VERSION) {
      // 🔥 PROFILE MIGRATION
      try {
        db.execSync(`
    CREATE TABLE IF NOT EXISTS profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      name TEXT,
      jurisdiction TEXT,
      phone TEXT,
      image TEXT,
      links TEXT,
      syncStatus TEXT DEFAULT 'pending',
      updatedAt INTEGER
    );
  `);
      } catch {}
      try {
        db.execSync(
          "ALTER TABLE case_notes ADD COLUMN syncStatus TEXT DEFAULT 'pending'",
        );
      } catch {}

      try {
        db.execSync("ALTER TABLE case_notes ADD COLUMN updatedAt INTEGER");
      } catch {}

      try {
        db.execSync(
          "ALTER TABLE citations ADD COLUMN syncStatus TEXT DEFAULT 'pending'",
        );
      } catch {}

      try {
        db.execSync("ALTER TABLE citations ADD COLUMN updatedAt INTEGER");
      } catch {}
      try {
        db.execSync("ALTER TABLE cases ADD COLUMN opponent TEXT");
      } catch {}
      try {
        db.execSync("ALTER TABLE cases ADD COLUMN feeDecided REAL DEFAULT 0");
      } catch {}
      try {
        db.execSync("ALTER TABLE cases ADD COLUMN judge TEXT");
      } catch {}

      try {
        db.execSync("ALTER TABLE cases ADD COLUMN representingSide TEXT");
      } catch {}

      try {
        db.execSync("ALTER TABLE cases ADD COLUMN opposingCounsel TEXT");
      } catch {}

      try {
        db.execSync("ALTER TABLE cases ADD COLUMN institutionDate TEXT");
      } catch {}

      try {
        db.execSync("ALTER TABLE cases ADD COLUMN sourceSystem TEXT");
      } catch {}

      try {
        db.execSync("ALTER TABLE cases ADD COLUMN location TEXT");
      } catch {}
      try {
        db.execSync(
          "ALTER TABLE profile ADD COLUMN defaultClientCountry TEXT DEFAULT 'PK'",
        );
      } catch {}
      try {
        db.execSync(
          "ALTER TABLE profile ADD COLUMN activeCMS TEXT DEFAULT '[\"punjab\"]'",
        );
      } catch {}
      try {
        db.execSync(
          "ALTER TABLE profile ADD COLUMN favoriteTools TEXT DEFAULT '[]'",
        );
      } catch {}
      try {
        db.execSync(
          "ALTER TABLE profile ADD COLUMN customCMS TEXT DEFAULT '[]'",
        );
      } catch {}
      try {
        db.execSync("ALTER TABLE hearings ADD COLUMN judge TEXT");
      } catch {}
      try {
        db.execSync("ALTER TABLE timeline ADD COLUMN judge TEXT");
      } catch {}
      try {
        db.execSync(
          "ALTER TABLE profile ADD COLUMN researchSources TEXT DEFAULT '[]'",
        );
      } catch {}
      // 3. Structural Migrations (Issue #1 Fix)
      try {
        // Ensuring cases uses INTEGER for createdAt
        const tableInfo = db.getAllSync("PRAGMA table_info(cases)");
        const createdAtCol = tableInfo.find((c) => c.name === "createdAt");
        if (createdAtCol && createdAtCol.type === "TEXT") {
          // In a production app, you'd rename and migrate data,
          // but for development, we ensure new columns are correct.
          console.log(
            "⚠️ Warning: cases.createdAt is TEXT. Consider migration.",
          );
        }
      } catch (_e) {}
      setDBVersion(CURRENT_DB_VERSION);
    }

    console.log("✅ DATABASE READY");
  } catch (e) {
    console.log("❌ DB ERROR:", e);
  }
};

// =============================
// 👤 CLIENTS
// =============================
export const insertClient = (client) => {
  try {
    const now = Date.now();
    const result = db.runSync(
      `INSERT INTO clients (name, mobile, email, createdAt, updatedAt, syncStatus) 
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [client.name, client.mobile, client.email, now, now],
    );
    return result?.lastInsertRowId;
  } catch (e) {
    console.log("❌ insertClient error:", e);
    return null;
  }
};

export const getAllClients = () =>
  db.getAllSync(
    "SELECT * FROM clients WHERE isArchived=0 AND isDeleted=0 ORDER BY id DESC LIMIT 100",
  );


// =============================
// 🗂 CLIENT ARCHIVE SYSTEM
// =============================

export const archiveClient = (id) =>
  db.runSync("UPDATE clients SET isArchived=1 WHERE id=?", [id]);

export const restoreClient = (id) =>
  db.runSync("UPDATE clients SET isArchived=0 WHERE id=?", [id]);

export const deleteClientPermanently = (id) =>
  db.runSync("DELETE FROM clients WHERE id=?", [id]);

export const getArchivedClients = () =>
  db.getAllSync("SELECT * FROM clients WHERE isArchived=1 ORDER BY id DESC");

export const getCasesByClientId = (clientId) => {
  try {
    return db.getAllSync(
      "SELECT * FROM cases WHERE clientId=? AND isDeleted=0 ORDER BY id DESC",
      [clientId],
    );
  } catch (e) {
    console.log("❌ getCasesByClientId error:", e);
    return [];
  }
};

// =============================
// 📁 CASES (Issue #1 Fixed)
// =============================
export const insertCase = (data) => {
  try {
    const now = Date.now();

    db.runSync(
      `INSERT INTO cases 
(
title,
court,
caseNo,
opponent,

clientId,
clientName,
clientMobile,
clientEmail,

status,
priority,

nextHearingDate,
nextHearingISO,

stage,

judge,
representingSide,
opposingCounsel,
institutionDate,
sourceSystem,
location,

feeDecided,
feePaid,
feeBalance,

description,

cmsType,
districtId,

tehsilId,
tehsilName,

caseYear,
courtType,
caseCategory,

caseType,
cmsCaseId,
cmsRawData,
courtGroup,
litigationDomain,
firNo,
firDate,
aiChatLink,
workflowType,
normalizedCategory,
procedureFamily,
cmsLastVerified,
cmsAutoSync,

createdAt,
updatedAt,
syncStatus
)

VALUES (

?, ?, ?, ?,

?, ?, ?, ?,

?, ?,

?, ?,

?,

?, ?, ?, ?, ?, ?,

?, ?, ?,

?,

?, ?,

?, ?,

?, ?, ?,

?, ?, ?,

?, ?, ?, ?, ?, ?, ?, ?,

?, ?,

?, ?, 'pending'

)`,

      [
        data.title,
        data.court,
        data.caseNo,
        data.opponent,
        data.clientId,
        data.clientName,
        data.clientMobile,
        data.clientEmail,
        data.status || "active",
        data.priority || "normal",
        data.nextHearingDate,
        data.nextHearingISO,

        data.stage,

        data.judge || "",
        data.representingSide || "",
        data.opposingCounsel || "",
        data.institutionDate || "",
        data.sourceSystem || "",
        data.location || "",

        data.feeDecided || 0,
        data.feePaid || 0,
        data.feeBalance || 0,
        data.description || "",
        // CMS
        data.cmsType || null,
        data.districtId || null,

        // KP
        data.tehsilId || null,
        data.tehsilName || null,

        // CMS Common
        data.caseYear || null,
        data.courtType || null,
        data.caseCategory || null,

        // Advanced CMS
        data.caseType || "civil",
        data.cmsCaseId || null,
        data.cmsRawData || null,
        data.courtGroup || null,
        data.litigationDomain || null,
        data.firNo || null,
        data.firDate || null,
        data.aiChatLink || null,
        data.workflowType || null,
        data.normalizedCategory || null,
        data.procedureFamily || null,
        // Verification
        Date.now(),

        1,

        // Timestamps
        now,

        now,
      ],
    );
  } catch (e) {
    console.log("❌ insertCase error:", e);
  }
};
export const getCaseById = (id) => {
  try {
    return db.getFirstSync("SELECT * FROM cases WHERE id = ?", [id]);
  } catch (e) {
    console.log("❌ getCaseById error:", e);
    return null;
  }
};
export const getAllCases = (limit = 100) =>
  db.getAllSync(
    "SELECT * FROM cases WHERE isDeleted=0 ORDER BY id DESC LIMIT ?",
    [limit],
  );
export const getDashboardStats = () => {
  try {
    const activeCases =
      db.getFirstSync(`
        SELECT COUNT(*) as count
        FROM cases
        WHERE status='active'
        AND isDeleted=0
      `)?.count || 0;

    const pipelineCases =
      db.getFirstSync(`
        SELECT COUNT(*) as count
        FROM cases
        WHERE status='pipeline'
        AND isDeleted=0
      `)?.count || 0;

    const urgentCases =
      db.getFirstSync(`
        SELECT COUNT(*) as count
        FROM cases
        WHERE priority='urgent'
        AND isDeleted=0
      `)?.count || 0;

    const outstandingFees =
      db.getFirstSync(`
        SELECT SUM(feeBalance) as total
        FROM cases
        WHERE isDeleted=0
      `)?.total || 0;

    const totalCases =
      db.getFirstSync(`
        SELECT COUNT(*) as count
        FROM cases
        WHERE isDeleted=0
      `)?.count || 0;

    return {
      activeCases,
      pipelineCases,
      urgentCases,
      outstandingFees,
      totalCases,
    };
  } catch (e) {
    console.log("Dashboard stats error:", e);

    return {
      activeCases: 0,
      pipelineCases: 0,
      urgentCases: 0,
      outstandingFees: 0,
      totalCases: 0,
    };
  }
};
export const getLitigationStats = () => {
  try {
    const civil =
      db.getFirstSync(`
          SELECT COUNT(*) as count
          FROM cases
          WHERE litigationDomain='civil'
          AND isDeleted=0
        `)?.count || 0;

    const criminal =
      db.getFirstSync(`
          SELECT COUNT(*) as count
          FROM cases
          WHERE litigationDomain='criminal'
          AND isDeleted=0
        `)?.count || 0;

    const family =
      db.getFirstSync(`
          SELECT COUNT(*) as count
          FROM cases
          WHERE litigationDomain='family'
          AND isDeleted=0
        `)?.count || 0;

    return {
      civil,
      criminal,
      family,
    };
  } catch (e) {
    console.log("Litigation stats error:", e);

    return {
      civil: 0,
      criminal: 0,
      family: 0,
    };
  }
};
export const getWorkflowStats = () => {
  try {
    return db.getAllSync(`
        SELECT
          workflowType,
          COUNT(*) as total
        FROM cases
        WHERE workflowType IS NOT NULL
        AND workflowType != ''
        AND isDeleted=0
        GROUP BY workflowType
        ORDER BY total DESC
        LIMIT 5
      `);
  } catch (e) {
    console.log("Workflow stats error:", e);

    return [];
  }
};
export const deleteCase = (id) => {
  const now = Date.now();

  db.runSync(
    "UPDATE cases SET isDeleted=1, syncStatus='pending', updatedAt=? WHERE id=?",
    [now, id],
  );
};

export const updateCaseStatus = (id, status) => {
  const now = Date.now();

  db.runSync(
    "UPDATE cases SET status=?, syncStatus='pending', updatedAt=? WHERE id=?",
    [status, now, id],
  );
};

export const updateCasePayment = (caseId, amount, paid, balance) => {
  const newPaid = Number(paid) + amount;
  const newBalance = Number(balance) - amount;
  const now = Date.now();

  db.runSync(
    "UPDATE cases SET feePaid=?, feeBalance=?, syncStatus='pending', updatedAt=? WHERE id=?",
    [newPaid, newBalance, now, caseId],
  );
};
export const updateAiChatLink = (caseId, aiChatLink) => {
  try {
    db.runSync(
      `
      UPDATE cases
      SET aiChatLink=?,
      updatedAt=?,
      syncStatus='pending'
      WHERE id=?
      `,
      [aiChatLink, Date.now(), caseId],
    );
  } catch (e) {
    console.log("❌ updateAiChatLink error:", e);
  }
};
export const updateCaseNumber = (caseId, caseNo) => {
  try {
    db.runSync(
      `
      UPDATE cases
      SET
        caseNo=?,
        updatedAt=?,
        syncStatus='pending'
      WHERE id=?
      `,
      [caseNo || "", Date.now(), caseId],
    );

    return true;
  } catch (e) {
    console.log("❌ updateCaseNumber error:", e);
    return false;
  }
};
// =============================
// 🧾 HEARINGS
// =============================
export const addCaseHearing = (data) => {
  try {
    const now = Date.now();

    // 🔥 CHECK IF SAME remoteId EXISTS
    if (data.remoteId) {
      const existing = db.getFirstSync(
        "SELECT id FROM hearings WHERE remoteId=?",
        [data.remoteId],
      );

      if (existing) {
        // ✅ UPDATE instead of INSERT
        db.runSync(
          `UPDATE hearings SET
            caseId=?,
            hearingDate=?,
            stage=?,
            court=?,
            judge=?,
            description=?,
            notes=?,
            syncStatus='pending',
            updatedAt=?
           WHERE remoteId=?`,
          [
            data.caseId,
            toISO(data.hearingDate),
            data.stage,
            data.court,
            data.judge || "",
            data.description,
            data.notes,
            now,
            data.remoteId,
          ],
        );

        return;
      }
    }

    // ✅ NORMAL INSERT
    db.runSync(
      `INSERT OR IGNORE INTO hearings
(remoteId, caseId, hearingDate, stage, court, judge, description, notes, syncStatus, updatedAt)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [
        data.remoteId || null,
        data.caseId,
        toISO(data.hearingDate),
        data.stage,
        data.court,
        data.judge || "",
        data.description,
        data.notes,
        now,
      ],
    );
  } catch (e) {
    console.log("❌ addCaseHearing error:", e);
  }
};
export const addTimelineEntry = (data) => {
  try {
    const now = Date.now();

    if (data.remoteId) {
      const existing = db.getFirstSync(
        "SELECT id FROM timeline WHERE remoteId=?",
        [data.remoteId],
      );

      if (existing) {
        db.runSync(
          `UPDATE timeline SET
  caseId=?,
  hearingDate=?,
  stage=?,
  court=?,
  judge=?,
  description=?,
  proceedings=?,
  remarks=?,
            syncStatus='pending',
            updatedAt=?
           WHERE remoteId=?`,
          [
            String(data.caseId),
            data.hearingDate,
            data.stage,
            data.court,
            data.judge || "",
            data.description,
            data.proceedings,
            data.remarks || "",
            now,
            data.remoteId,
          ],
        );

        return;
      }
    }

    db.runSync(
      `INSERT INTO timeline
      (remoteId, caseId, hearingDate, stage, court, judge, description, proceedings, remarks, createdAt, syncStatus, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [
        data.remoteId || null,
        String(data.caseId),
        data.hearingDate,
        data.stage,
        data.court,
        data.judge || "",
        data.description,
        data.proceedings,
        data.remarks || "",
        now,
        now,
      ],
    );
  } catch (e) {
    console.log("❌ addTimelineEntry error:", e);
  }
};
export const getTimelineByCaseId = (caseId) => {
  try {
    return db.getAllSync(
      `SELECT * FROM timeline 
       WHERE caseId=? AND isDeleted=0 
       ORDER BY hearingDate DESC`,
      [String(caseId)], // 🔥 ALWAYS STRING
    );
  } catch (e) {
    console.log("❌ getTimelineByCaseId error:", e);
    return [];
  }
};
export const getCaseHearings = (caseId) =>
  db.getAllSync("SELECT * FROM hearings WHERE caseId=? AND isDeleted=0", [
    caseId,
  ]);

export const deleteHearing = (id) => {
  const now = Date.now();

  db.runSync(
    "UPDATE hearings SET isDeleted=1, syncStatus='pending', updatedAt=? WHERE id=?",
    [now, id],
  );
};

export const updateCaseNextDate = (
  caseId,
  displayDate,
  isoDate,
  stage,
  court,
  judge,
  description,
  status,
  cmsData = null,
) => {
  db.runSync(
    `UPDATE cases SET 
      nextHearingDate=?, 
      nextHearingISO=?, 
      stage=?, 
      court=?, 
      judge=?,
      description=?, 
      status=?, 

      courtGroup=COALESCE(?, courtGroup),
      litigationDomain=COALESCE(?, litigationDomain),
      workflowType=COALESCE(?, workflowType),
      normalizedCategory=COALESCE(?, normalizedCategory),
      procedureFamily=COALESCE(?, procedureFamily),

      cmsRawData=COALESCE(?, cmsRawData),

      cmsLastVerified=?,
      updatedAt=?,
      syncStatus='pending'

     WHERE id=?`,

    [
      displayDate,

      isoDate,

      stage,

      court,

      judge,

      description,

      status,

      cmsData?.courtGroup || null,

      cmsData?.litigationDomain || null,

      cmsData?.workflowType || null,

      cmsData?.normalizedCategory || null,

      cmsData?.procedureFamily || null,

      cmsData ? JSON.stringify(cmsData) : null,

      Date.now(),

      Date.now(),

      caseId,
    ],
  );
};
export const recalculateNextHearing = (caseId) => {
  try {
    const latest = db.getFirstSync(
      `SELECT hearingDate, stage, court, judge, description
       FROM hearings
       WHERE caseId=?
         AND isDeleted=0
         AND hearingDate IS NOT NULL
         AND TRIM(hearingDate) != ''
         AND datetime(hearingDate) IS NOT NULL
       ORDER BY datetime(hearingDate) DESC
       LIMIT 1`,
      [caseId],
    );

    if (!latest) {
      return;
    }

    const latestISO = toISO(latest.hearingDate);
    if (!latestISO) {
      return;
    }

    db.runSync(
      `UPDATE cases
       SET nextHearingDate=?,
           nextHearingISO=?,
           stage=COALESCE(NULLIF(TRIM(?), ''), stage),
           court=COALESCE(NULLIF(TRIM(?), ''), court),
           judge=COALESCE(NULLIF(TRIM(?), ''), judge),
           description=COALESCE(NULLIF(TRIM(?), ''), description),
           syncStatus='pending',
           updatedAt=?
       WHERE id=?`,
      [
        normalizeDateInput(latest.hearingDate),
        latestISO,
        latest.stage,
        latest.court,
        latest.judge,
        latest.description,
        Date.now(),
        caseId,
      ],
    );
  } catch (e) {
    console.log("recalculateNextHearing error:", e);
  }
};
// =============================
// 📝 NOTES
// =============================
export const addCaseNote = (data) => {
  const now = Date.now();

  db.runSync(
    `INSERT INTO case_notes 
     (caseId, text, image, createdAt, syncStatus, updatedAt)
     VALUES (?, ?, ?, ?, 'pending', ?)`,
    [data.caseId, data.text, data.image, now, now],
  );
};

export const getCaseNotes = (caseId) =>
  db.getAllSync(
    "SELECT * FROM case_notes WHERE caseId=? AND isDeleted=0 ORDER BY id DESC",
    [caseId],
  );

export const updateCaseNote = (id, data) => {
  db.runSync("UPDATE case_notes SET text=?, image=? WHERE id=?", [
    data.text,
    data.image,
    id,
  ]);
};

export const deleteCaseNote = (id) => {
  const now = Date.now();

  db.runSync(
    "UPDATE case_notes SET isDeleted=1, syncStatus='pending', updatedAt=? WHERE id=?",
    [now, id],
  );
};

// =============================
// ⚙️ MASTER LIST (SYNC READY)
// =============================

export const getMasterItems = (type) =>
  db.getAllSync(
    "SELECT * FROM master_items WHERE type=? AND isDeleted=0 ORDER BY value ASC",
    [type],
  );

// -----------------------------
// ➕ CREATE
// -----------------------------
export const createMasterItem = (data) => {
  const exists = db.getFirstSync(
    `SELECT * FROM master_items 
     WHERE type=? 
     AND LOWER(value)=LOWER(?) 
     AND isDeleted=0`,
    [data.type, data.value],
  );

  if (exists) return;

  const now = Date.now();

  db.runSync(
    `INSERT INTO master_items 
    (
      type,
      groupName,
      value,
      syncStatus,
      updatedAt
    ) 
    VALUES (?, ?, ?, 'pending', ?)`,
    [data.type, data.groupName || null, data.value, now],
  );
};
// -----------------------------
// 🤖 AUTO CREATE IF NOT EXISTS
// -----------------------------
export const ensureMasterItemExists = (type, value, groupName = null) => {
  try {
    if (!value?.trim()) return;

    const existing = db.getFirstSync(
      `SELECT * FROM master_items
       WHERE type=?
       AND LOWER(value)=LOWER(?)
       AND isDeleted=0`,
      [type, value.trim()],
    );

    if (existing) return;

    createMasterItem({
      type,
      value: value.trim(),
      groupName,
    });

    console.log(`✅ Auto Master Added: ${type} -> ${value}`);
  } catch (e) {
    console.log("❌ ensureMasterItemExists:", e);
  }
};
// -----------------------------
// ✏️ UPDATE
// -----------------------------
export const updateMasterItem = (id, value, groupName = null) => {
  const now = Date.now();

  db.runSync(
    `UPDATE master_items 
     SET 
       value=?,
       groupName=?,
       syncStatus='pending',
       updatedAt=? 
     WHERE id=?`,
    [value, groupName, now, id],
  );
};

// -----------------------------
// 🗑 SOFT DELETE (IMPORTANT)
// -----------------------------
export const deleteMasterItem = (id) => {
  const now = Date.now();

  db.runSync(
    `UPDATE master_items 
     SET isDeleted=1, syncStatus='pending', updatedAt=? 
     WHERE id=?`,
    [now, id],
  );
};

// =============================
// 💰 PROCESS FEES
// =============================
export const getAllProcessFees = () =>
  db.getAllSync("SELECT * FROM processFees WHERE isDeleted=0 ORDER BY id DESC");

export const insertProcessFee = (data) => {
  const now = Date.now();

  db.runSync(
    `INSERT INTO processFees 
     (caseName, court, amount, purpose, date, note, paid, syncStatus, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
    [
      data.caseName,
      data.court,
      data.amount,
      data.purpose || "",
      toISO(data.date),
      data.note || "",
      data.paid || 0,
      now,
    ],
  );
};

export const updateProcessFee = (id, data) => {
  const now = Date.now();

  db.runSync(
    `UPDATE processFees SET
     caseName=?, court=?, amount=?, purpose=?, date=?, note=?,
     syncStatus='pending', updatedAt=?
     WHERE id=?`,
    [
      data.caseName,
      data.court,
      data.amount,
      data.purpose,
      data.date,
      data.note,
      now,
      id,
    ],
  );
};

export const deleteProcessFee = (id) => {
  const now = Date.now();

  db.runSync(
    "UPDATE processFees SET isDeleted=1, syncStatus='pending', updatedAt=? WHERE id=?",
    [now, id],
  );
};

export const markProcessFeePaid = (id, paidTo) => {
  if (!paidTo) return;

  const now = Date.now();

  db.runSync(
    `UPDATE processFees 
     SET paid=1, paidTo=?, paidDate=?, syncStatus='pending', updatedAt=?
     WHERE id=?`,
    [paidTo, toISO(new Date()), now, id],
  );
};

// =============================
// 📚 CITATIONS
// =============================
export const insertCitation = (data) => {
  const now = Date.now();

  db.runSync(
    `INSERT INTO citations 
     (caseId, citation, description, date, syncStatus, updatedAt)
     VALUES (?, ?, ?, ?, 'pending', ?)`,
    [data.caseId, data.citation, data.description, data.date, now],
  );
};

export const getCitationsByCaseId = (caseId) =>
  db.getAllSync(
    "SELECT * FROM citations WHERE caseId=? AND isDeleted=0 ORDER BY id DESC",
    [caseId],
  );

export const deleteCitation = (id) => {
  const now = Date.now();

  db.runSync(
    "UPDATE citations SET isDeleted=1, syncStatus='pending', updatedAt=? WHERE id=?",
    [now, id],
  );
};

// =============================
// 🔗 QUICK LINKS (SYNC READY)
// =============================

export const getAllQuickLinks = () => {
  return db.getAllSync(`
    SELECT * FROM quick_links 
    WHERE isDeleted=0
    ORDER BY isPinned DESC, isFavorite DESC, updatedAt DESC
  `);
};

// -----------------------------
// ➕ INSERT
// -----------------------------
export const insertQuickLink = (data) => {
  const now = Date.now();

  db.runSync(
    `INSERT INTO quick_links 
     (title, url, category, isFavorite, isPinned, syncStatus, updatedAt)
     VALUES (?, ?, ?, 0, 0, 'pending', ?)`,
    [data.title, data.url, data.category || "personal", now],
  );
};

// -----------------------------
// 🗑 SOFT DELETE (IMPORTANT)
// -----------------------------
export const deleteQuickLink = (id) => {
  const now = Date.now();

  db.runSync(
    `UPDATE quick_links 
     SET isDeleted=1, syncStatus='pending', updatedAt=? 
     WHERE id=?`,
    [now, id],
  );
};
export const toggleFavorite = (id, value) => {
  db.runSync(
    "UPDATE quick_links SET isFavorite=?, syncStatus='pending', updatedAt=? WHERE id=?",
    [value ? 1 : 0, Date.now(), id],
  );
};

export const togglePinned = (id, value) => {
  db.runSync(
    "UPDATE quick_links SET isPinned=?, syncStatus='pending', updatedAt=? WHERE id=?",
    [value ? 1 : 0, Date.now(), id],
  );
};
// =============================
// 👤 PROFILE FUNCTIONS
// =============================

export const getProfile = () => {
  try {
    const res = db.getFirstSync("SELECT * FROM profile WHERE id = 1");

    if (res) {
      return {
        ...res,

        links: res.links ? JSON.parse(res.links) : {},

        activeCMS: res.activeCMS ? JSON.parse(res.activeCMS) : ["punjab"],

        favoriteTools: res.favoriteTools ? JSON.parse(res.favoriteTools) : [],

        customCMS: res.customCMS ? JSON.parse(res.customCMS) : [],

        researchSources: res.researchSources
          ? JSON.parse(res.researchSources)
          : [],
      };
    }

    return null;
  } catch (e) {
    console.log("❌ getProfile error:", e);
    return null;
  }
};

export const saveProfile = (data) => {
  try {
    const now = Date.now();

    db.runSync(
      `INSERT OR REPLACE INTO profile 
(
  id,
  name,
  jurisdiction,
  phone,
  image,
  links,
  country,
  defaultClientCountry,
  currency,
  locale,
  activeCMS,
  favoriteTools,
  customCMS,
  researchSources,
  syncStatus,
  updatedAt
)

VALUES (
  1,
  ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?
)`,

      [
        data.name || "",

        data.jurisdiction || "",

        data.phone || "",

        data.image || "",

        JSON.stringify(data.links || {}),

        data.country || "PK",

        data.defaultClientCountry || data.country || "PK",

        data.currency || "PKR",

        data.locale || "en-PK",

        JSON.stringify(data.activeCMS || ["punjab"]),

        JSON.stringify(data.favoriteTools || []),

        JSON.stringify(data.customCMS || []),

        JSON.stringify(data.researchSources || []),

        now,
      ],
    );

    return true;
  } catch (e) {
    console.log("❌ saveProfile error:", e);
    return false;
  }
};
export const insertDocument = (data) => {
  try {
    const now = Date.now();

    db.runSync(
      `INSERT INTO document_vault (
        caseId,
        caseTitle,

        name,
        description,

        category,

        uri,
        originalUri,

        mimeType,
        fileExt,
        fileCategory,

        fileSize,

        uploadDate,

        aiSummary,
        aiTags,

        createdAt,
        updatedAt,
        syncStatus
      )

      VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending'
      )`,

      [
        data.caseId || null,
        data.caseTitle || null,

        data.name || "",
        data.description || "",

        data.category || "uncategorized",

        data.uri || "",
        data.originalUri || "",

        data.mimeType || "",
        data.fileExt || "",
        data.fileCategory || "",

        data.fileSize || 0,

        data.uploadDate || toISO(new Date()),

        data.aiSummary || "",
        data.aiTags || "",

        now,
        now,
      ],
    );

    return true;
  } catch (e) {
    console.log("❌ insertDocument error:", e);
    return false;
  }
};
export const getDocumentsByCaseId = (caseId) => {
  try {
    return db.getAllSync(
      `SELECT * FROM document_vault
       WHERE caseId=?
       AND isDeleted=0
       ORDER BY id DESC`,
      [caseId],
    );
  } catch (e) {
    console.log("❌ getDocumentsByCaseId error:", e);
    return [];
  }
};
export const getAllDocuments = () => {
  try {
    return db.getAllSync(
      `SELECT * FROM document_vault
       WHERE isDeleted=0
       ORDER BY id DESC`,
    );
  } catch (e) {
    console.log("❌ getAllDocuments error:", e);
    return [];
  }
};
export const updateDocument = (id, data) => {
  try {
    db.runSync(
      `UPDATE document_vault
       SET
         name=?,
         description=?,
         category=?,
         aiSummary=?,
         aiTags=?,
         updatedAt=?,
         syncStatus='pending'
       WHERE id=?`,

      [
        data.name,
        data.description,
        data.category,
        data.aiSummary || "",
        data.aiTags || "",
        Date.now(),
        id,
      ],
    );

    return true;
  } catch (e) {
    console.log("❌ updateDocument error:", e);
    return false;
  }
};
export const deleteDocument = (id) => {
  try {
    db.runSync(
      `UPDATE document_vault
       SET
         isDeleted=1,
         updatedAt=?,
         syncStatus='pending'
       WHERE id=?`,
      [Date.now(), id],
    );

    return true;
  } catch (e) {
    console.log("❌ deleteDocument error:", e);
    return false;
  }
};
// 🧹 CLEAR ALL LOCAL DATA
export const clearAllLocalData = () => {
  db.runSync("DELETE FROM cases");
  db.runSync("DELETE FROM clients");
  db.runSync("DELETE FROM hearings");
  db.runSync("DELETE FROM case_notes");
  db.runSync("DELETE FROM citations");
  db.runSync("DELETE FROM quick_links");
  db.runSync("DELETE FROM master_items");
  db.runSync("DELETE FROM processFees");
};
