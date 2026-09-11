import { useState } from "react";
import ExcelJS from "exceljs/dist/exceljs.bare.min.js";
import { enqueueSnackbar } from "notistack";
import axiosInstance from "../../../../config/axios";
import { rejectTestDistricts } from "../../../../utils/excludedDistricts";
import { generatePerformanceReportPdf } from "../utils/generatePerformanceReportPdf";

let _cache = null;
let _cacheAt = 0;
let _cacheKey = "all";
const CACHE_TTL = 5 * 60 * 1000;
let _prefetchPromise = null;

function cacheKeyFor(districtId) {
  return districtId ? `d:${districtId}:assess-v6` : "all:assess-v6";
}

function isCacheValid(districtId) {
  return (
    _cache !== null &&
    _cacheKey === cacheKeyFor(districtId) &&
    Date.now() - _cacheAt < CACHE_TTL
  );
}

async function fetchDashboardExport(districtId) {
  const res = await axiosInstance.get("/admin/dashboard-export", {
    params: districtId ? { districtId: Number(districtId) } : {},
    timeout: 300000,
  });
  return res.data?.data || {};
}

async function prefetchExportData(onProgress, scopedDistrictId, { bypassCache = false } = {}) {
  if (!bypassCache && isCacheValid(scopedDistrictId)) return _cache;
  if (_prefetchPromise && !bypassCache) return _prefetchPromise;

  const run = async () => {
    try {
      onProgress?.({ phase: "schools" });
      const payload = await fetchDashboardExport(scopedDistrictId);
      const allSchools = payload.schools || [];
      const allDistrictEntries = rejectTestDistricts(payload.districts || []).filter(
        (d) => {
          if (!scopedDistrictId) return true;
          return String(d.districtId) === String(scopedDistrictId);
        },
      );

      const result = {
        allDistrictEntries,
        allSchools,
        blockBreakdown: payload.blockBreakdown || [],
        districtRows: payload.districtRows || [],
        blockRows: payload.blockRows || [],
        selfAssessmentSummary: payload.selfAssessmentSummary || null,
        managementBreakdown: payload.managementBreakdown || [],
        categoryBreakdown: payload.categoryBreakdown || [],
      };
      if (!bypassCache) {
        _cache = result;
        _cacheAt = Date.now();
        _cacheKey = cacheKeyFor(scopedDistrictId);
      }
      return result;
    } finally {
      if (!bypassCache) _prefetchPromise = null;
    }
  };

  if (bypassCache) return run();

  _prefetchPromise = run();
  return _prefetchPromise;
}

const SHEET_CONFIGS = {
  District: {
    tabColor: "818CF8",
    titleBg: "E0E7FF",
    headerBg: "C7D2FE",
    headerTxt: "312E81",
    altRowBg: "F5F3FF",
  },
  Block: {
    tabColor: "60A5FA",
    titleBg: "DBEAFE",
    headerBg: "BFDBFE",
    headerTxt: "1E3A8A",
    altRowBg: "F0F7FF",
  },
  Cluster: {
    tabColor: "34D399",
    titleBg: "D1FAE5",
    headerBg: "A7F3D0",
    headerTxt: "064E3B",
    altRowBg: "F0FDF8",
  },
  School: {
    tabColor: "4ADE80",
    titleBg: "DCFCE7",
    headerBg: "BBF7D0",
    headerTxt: "14532D",
    altRowBg: "F7FEF9",
  },
};

const COLUMN_LABELS = {
  districtId: "District ID",
  districtName: "District Name",
  blockId: "Block ID",
  blockName: "Block Name",
  clusterId: "Cluster ID",
  clusterName: "Cluster Name",
  schoolId: "School ID",
  schoolName: "School Name",
  overall_status: "Overall Status",
  overall_percent: "Overall %",
  assessment_1_name: "Assessment 1",
  assessment_1_status: "Assessment 1 Status",
  assessment_1_percent: "Assessment 1 %",
  assessment_2_name: "Assessment 2",
  assessment_2_status: "Assessment 2 Status",
  assessment_2_percent: "Assessment 2 %",
  total_schools: "Total Schools",
  govt_schools: "Govt Schools",
  private_schools: "Private Schools",
  govt_aided_schools: "Govt Aided Schools",
  schools_started: "Started",
  schools_pending: "Pending",
  schools_completed: "Completed",
  schools_not_started: "Not Started",
  primary_total: "Primary Total",
  primary_govt_total: "Primary Govt Total",
  primary_govt_completed: "Primary Govt Completed",
  primary_govt_started: "Primary Govt Started",
  primary_govt_pending: "Primary Govt Pending",
  primary_aided_total: "Primary Govt Aided Total",
  primary_aided_completed: "Primary Govt Aided Completed",
  primary_aided_started: "Primary Govt Aided Started",
  primary_aided_pending: "Primary Govt Aided Pending",
  primary_private_total: "Primary Private Total",
  primary_private_completed: "Primary Private Completed",
  primary_private_started: "Primary Private Started",
  primary_private_pending: "Primary Private Pending",
  secondary_total: "Secondary Total",
  secondary_govt_total: "Secondary Govt Total",
  secondary_govt_completed: "Secondary Govt Completed",
  secondary_govt_started: "Secondary Govt Started",
  secondary_govt_pending: "Secondary Govt Pending",
  secondary_aided_total: "Secondary Govt Aided Total",
  secondary_aided_completed: "Secondary Govt Aided Completed",
  secondary_aided_started: "Secondary Govt Aided Started",
  secondary_aided_pending: "Secondary Govt Aided Pending",
  secondary_private_total: "Secondary Private Total",
  secondary_private_completed: "Secondary Private Completed",
  secondary_private_started: "Secondary Private Started",
  secondary_private_pending: "Secondary Private Pending",
};

const COLUMN_WIDTHS = {
  districtId: 13,
  districtName: 26,
  blockId: 13,
  blockName: 24,
  clusterId: 15,
  clusterName: 30,
  schoolId: 15,
  schoolName: 34,
  overall_status: 16,
  overall_percent: 12,
  assessment_1_name: 28,
  assessment_1_status: 18,
  assessment_1_percent: 14,
  assessment_2_name: 28,
  assessment_2_status: 18,
  assessment_2_percent: 14,
  total_schools: 15,
  govt_schools: 14,
  private_schools: 16,
  govt_aided_schools: 18,
  schools_started: 13,
  schools_pending: 13,
  schools_completed: 15,
  schools_not_started: 15,
  primary_total: 14,
  primary_govt_total: 16,
  primary_govt_completed: 20,
  primary_govt_started: 18,
  primary_govt_pending: 18,
  primary_aided_total: 18,
  primary_aided_completed: 22,
  primary_aided_started: 20,
  primary_aided_pending: 20,
  primary_private_total: 18,
  primary_private_completed: 22,
  primary_private_started: 20,
  primary_private_pending: 20,
  secondary_total: 16,
  secondary_govt_total: 18,
  secondary_govt_completed: 22,
  secondary_govt_started: 20,
  secondary_govt_pending: 20,
  secondary_aided_total: 20,
  secondary_aided_completed: 24,
  secondary_aided_started: 22,
  secondary_aided_pending: 22,
  secondary_private_total: 20,
  secondary_private_completed: 24,
  secondary_private_started: 22,
  secondary_private_pending: 22,
};

const NUMERIC_KEYS = new Set([
  "total_schools",
  "govt_schools",
  "private_schools",
  "govt_aided_schools",
  "schools_started",
  "schools_pending",
  "schools_completed",
  "schools_not_started",
  "primary_total",
  "primary_govt_total",
  "primary_govt_completed",
  "primary_govt_started",
  "primary_govt_pending",
  "primary_aided_total",
  "primary_aided_completed",
  "primary_aided_started",
  "primary_aided_pending",
  "primary_private_total",
  "primary_private_completed",
  "primary_private_started",
  "primary_private_pending",
  "secondary_total",
  "secondary_govt_total",
  "secondary_govt_completed",
  "secondary_govt_started",
  "secondary_govt_pending",
  "secondary_aided_total",
  "secondary_aided_completed",
  "secondary_aided_started",
  "secondary_aided_pending",
  "secondary_private_total",
  "secondary_private_completed",
  "secondary_private_started",
  "secondary_private_pending",
]);

const PERCENT_KEYS = new Set([
  "overall_percent",
  "assessment_1_percent",
  "assessment_2_percent",
]);

function classifyStatus(school) {
  const flag = school.selfAssessmentIsSubmitted;
  if (flag === 1 || flag === "1") {
    return {
      isCompleted: true,
      isInProgress: false,
      isPending: false,
      isNotStarted: false,
    };
  }
  // 0 = In Progress. Do not use Number(flag): Number(null) === 0.
  if (flag === 0 || flag === "0") {
    return {
      isCompleted: false,
      isInProgress: true,
      isPending: false,
      isNotStarted: false,
    };
  }

  const raw = String(
    school.selfAssessmentStatus ??
      school.status ??
      school.assessmentStatus ??
      school.submissionStatus ??
      school.overallStatus ??
      "",
  )
    .toLowerCase()
    .trim();
  const isCompleted =
    raw === "submitted" || raw === "completed" || raw === "complete";
  const isInProgress =
    raw === "in_progress" ||
    raw === "in progress" ||
    raw === "started";
  const isNotStarted =
    !isCompleted &&
    !isInProgress &&
    (raw === "pending" ||
      raw === "not started" ||
      raw === "not_started" ||
      raw === "");
  return {
    isCompleted,
    isInProgress,
    isPending: isNotStarted,
    isNotStarted,
  };
}

function buildSheet(workbook, sheetName, rows, headers) {
  const { tabColor, titleBg, headerBg, headerTxt, altRowBg } =
    SHEET_CONFIGS[sheetName] || SHEET_CONFIGS.District;
  const colCount = headers.length;
  const HAIR = { style: "hair", color: { argb: "FFE2E8F0" } };
  const THIN = (argb) => ({ style: "thin", color: { argb } });

  const ws = workbook.addWorksheet(sheetName, {
    properties: { tabColor: { argb: `FF${tabColor}` } },
    pageSetup: {
      paperSize: 9,
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      printTitlesRow: "1:2",
    },
  });

  ws.columns = headers.map((h) => ({ key: h, width: COLUMN_WIDTHS[h] || 16 }));

  const dateStr = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  ws.addRow([]);
  ws.mergeCells(1, 1, 1, colCount);
  const tc = ws.getCell("A1");
  tc.value = `GSQAC Dashboard Report  ·  ${sheetName}-Level Data  ·  Generated: ${dateStr}`;
  tc.font = {
    name: "Calibri",
    bold: true,
    size: 13,
    color: { argb: `FF${headerTxt}` },
  };
  tc.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: `FF${titleBg}` },
  };
  tc.alignment = { horizontal: "center", vertical: "middle" };
  tc.border = { bottom: THIN(`FF${tabColor}`) };
  ws.getRow(1).height = 32;

  const hr = ws.addRow(headers.map((h) => COLUMN_LABELS[h] || h));
  hr.height = 20;
  hr.eachCell((cell) => {
    cell.font = {
      name: "Calibri",
      bold: true,
      size: 10,
      color: { argb: `FF${headerTxt}` },
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: `FF${headerBg}` },
    };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: HAIR,
      left: HAIR,
      bottom: THIN(`FF${tabColor}`),
      right: HAIR,
    };
  });

  rows.forEach((rowData, idx) => {
    const row = ws.addRow(headers.map((h) => rowData[h] ?? ""));
    row.height = 16;
    const bg = idx % 2 === 1 ? `FF${altRowBg}` : "FFFFFFFF";
    row.eachCell((cell, ci) => {
      const key = headers[ci - 1];
      const isNum = NUMERIC_KEYS.has(key);
      const isPct = PERCENT_KEYS.has(key);
      cell.font = { name: "Calibri", size: 10, color: { argb: "FF1E293B" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
      cell.border = { top: HAIR, left: HAIR, bottom: HAIR, right: HAIR };
      cell.alignment = {
        horizontal: isNum || isPct ? "right" : "left",
        vertical: "middle",
        indent: isNum || isPct ? 0 : 1,
      };
      if (isNum && typeof cell.value === "number") cell.numFmt = "#,##0";
      if (isPct && typeof cell.value === "number") cell.numFmt = '0"%"';
    });
  });

  if (rows.length > 0) {
    const totals = headers.map((h, i) => {
      if (PERCENT_KEYS.has(h)) {
        const values = rows
          .map((r) => r[h])
          .filter((v) => v != null && v !== "")
          .map(Number)
          .filter((n) => Number.isFinite(n));
        return values.length
          ? Math.round(values.reduce((s, n) => s + n, 0) / values.length)
          : "";
      }
      if (NUMERIC_KEYS.has(h)) {
        return rows.reduce((s, r) => s + (Number(r[h]) || 0), 0);
      }
      return i === 0 ? "GRAND TOTAL" : "";
    });
    const tr = ws.addRow(totals);
    tr.height = 20;
    tr.eachCell((cell, ci) => {
      const key = headers[ci - 1];
      const isNum = NUMERIC_KEYS.has(key);
      const isPct = PERCENT_KEYS.has(key);
      cell.font = {
        name: "Calibri",
        bold: true,
        size: 10,
        color: { argb: `FF${headerTxt}` },
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: `FF${titleBg}` },
      };
      cell.border = {
        top: THIN(`FF${tabColor}`),
        left: HAIR,
        bottom: THIN(`FF${tabColor}`),
        right: HAIR,
      };
      cell.alignment = {
        horizontal: isNum || isPct ? "right" : "left",
        vertical: "middle",
      };
      if (isNum && typeof cell.value === "number") cell.numFmt = "#,##0";
      if (isPct && typeof cell.value === "number") cell.numFmt = '0"%"';
    });
  }

  ws.views = [{ state: "frozen", ySplit: 2, xSplit: 0, activeCell: "A3" }];
  ws.autoFilter = {
    from: { row: 2, column: 1 },
    to: { row: 2, column: colCount },
  };
}

function classifyManagement(school) {
  const category = String(
    school.managementCategory ?? school.management_category ?? "",
  ).toLowerCase();
  if (category === "private") return "private";
  if (category === "aided") return "aided";
  if (category === "govt") return "govt";

  const rawId =
    school.schoolManagementId ??
    school.schoolmanagementid ??
    school.school_management_id ??
    school.schmgt;
  const id = Number(String(rawId ?? "").trim());
  if (!Number.isFinite(id)) return "govt";
  if (id === 5 || id === 97) return "private";
  if (id === 4 || id === 7) return "aided";
  return "govt";
}

function classifyCategoryGroup(school) {
  const id = Number(
    school.schoolCategoryId ??
      school.schoolcategoryid ??
      school.school_category_id ??
      school.categoryId,
  );
  if ([1, 2, 4, 12].includes(id)) return "primary";
  if ([3, 5, 6, 7, 8, 10, 11].includes(id)) return "secondary";
  return null;
}

function emptyMgmtBuckets() {
  return {
    govt: { label: "Government (Govt)", total: 0, completed: 0, started: 0, pending: 0 },
    aided: { label: "Grant-in-Aid (Aided)", total: 0, completed: 0, started: 0, pending: 0 },
    private: { label: "Private (Unaided)", total: 0, completed: 0, started: 0, pending: 0 },
  };
}

function emptyTypeBuckets() {
  return {
    primary: { label: "Primary Schools", total: 0, completed: 0, started: 0, pending: 0 },
    secondary: { label: "Secondary Schools", total: 0, completed: 0, started: 0, pending: 0 },
  };
}

function mgmtBucketsFromBreakdown(managementBreakdown = []) {
  const buckets = emptyMgmtBuckets();
  managementBreakdown.forEach((row) => {
    const name = String(row.managementName || "").toLowerCase();
    let key = "govt";
    if (name.includes("private")) key = "private";
    else if (name.includes("aid")) key = "aided";
    buckets[key].total += Number(row.total) || 0;
    buckets[key].completed += Number(row.completed) || 0;
    buckets[key].started += Number(row.started) || 0;
    buckets[key].pending += Number(row.pending) || 0;
  });
  return buckets;
}

function classifyCategoryGroupFromName(name = "") {
  const normalized = String(name).trim().toLowerCase();
  if (!normalized) return null;
  const primaryNames = new Set([
    "primary (1-5)",
    "upper primary (1-8)",
    "upper primary (6-8)",
    "pre-primary",
  ]);
  if (primaryNames.has(normalized)) return "primary";
  const secondaryNames = new Set([
    "secondary (1-12)",
    "secondary (6-12)",
    "elementary (1-10)",
    "upper primary (6-10)",
    "secondary (9-10)",
    "higher secondary (9-12)",
    "higher secondary (11-12)",
  ]);
  if (secondaryNames.has(normalized)) return "secondary";
  return null;
}

function typeBucketsFromBreakdown(categoryBreakdown = []) {
  const buckets = emptyTypeBuckets();
  categoryBreakdown.forEach((row) => {
    let group = classifyCategoryGroup({ schoolCategoryId: row.categoryId });
    if (!group) {
      group = classifyCategoryGroupFromName(row.categoryName || row.categoryId);
    }
    if (!group) return;
    buckets[group].total += Number(row.total) || 0;
    buckets[group].completed += Number(row.completed) || 0;
    buckets[group].started += Number(row.started) || 0;
    buckets[group].pending += Number(row.pending) || 0;
  });
  return buckets;
}

function buildMgmtBucketsFromSchools(allSchools = []) {
  const mgmtBuckets = emptyMgmtBuckets();
  allSchools.forEach((school) => {
    const status = classifyStatus(school);
    const mgmt = mgmtBuckets[classifyManagement(school)];
    if (!mgmt) return;
    mgmt.total += 1;
    if (status.isCompleted) mgmt.completed += 1;
    else if (status.isInProgress) mgmt.started += 1;
    else mgmt.pending += 1;
  });
  return mgmtBuckets;
}

function buildTypeBucketsFromSchools(allSchools = []) {
  const typeBuckets = emptyTypeBuckets();
  allSchools.forEach((school) => {
    const status = classifyStatus(school);
    const type = typeBuckets[classifyCategoryGroup(school)];
    if (!type) return;
    type.total += 1;
    if (status.isCompleted) type.completed += 1;
    else if (status.isInProgress) type.started += 1;
    else type.pending += 1;
  });
  return typeBuckets;
}

function totalsFromSummary(summary, allSchools = []) {
  if (summary) {
    const completed = Number(summary.completedSchools) || 0;
    const started = Number(summary.startedSchools) || 0;
    const pending = Number(summary.notStartedSchools) || 0;
    const total =
      summary.totalEligibleSchools != null
        ? Number(summary.totalEligibleSchools)
        : completed + started + pending || allSchools.length;
    return {
      total,
      completed,
      started,
      pending,
      active: completed + started,
    };
  }

  const totalSchools = allSchools.length;
  const totalCompleted = allSchools.filter((s) => classifyStatus(s).isCompleted).length;
  const totalStarted = allSchools.filter((s) => classifyStatus(s).isInProgress).length;
  const totalPending = Math.max(0, totalSchools - totalCompleted - totalStarted);
  return {
    total: totalSchools,
    completed: totalCompleted,
    started: totalStarted,
    pending: totalPending,
    active: totalCompleted + totalStarted,
  };
}

function getStatusKey(school) {
  const { isCompleted, isInProgress } = classifyStatus(school);
  if (isCompleted) return "completed";
  if (isInProgress) return "started";
  return "pending";
}

const MGMT_CATEGORY_HEADERS = [
  "districtId",
  "districtName",
  "primary_total",
  "primary_govt_total",
  "primary_govt_completed",
  "primary_govt_started",
  "primary_govt_pending",
  "primary_aided_total",
  "primary_aided_completed",
  "primary_aided_started",
  "primary_aided_pending",
  "primary_private_total",
  "primary_private_completed",
  "primary_private_started",
  "primary_private_pending",
  "secondary_total",
  "secondary_govt_total",
  "secondary_govt_completed",
  "secondary_govt_started",
  "secondary_govt_pending",
  "secondary_aided_total",
  "secondary_aided_completed",
  "secondary_aided_started",
  "secondary_aided_pending",
  "secondary_private_total",
  "secondary_private_completed",
  "secondary_private_started",
  "secondary_private_pending",
];

function createDistrictManagementCategoryRows(allSchools = []) {
  const map = new Map();
  allSchools.forEach((school) => {
    const districtId = school.districtId ?? school.district_id ?? "";
    const districtName = school.districtName ?? school.district_name ?? "Unassigned";
    const categoryGroup = classifyCategoryGroup(school);
    if (!categoryGroup) return;
    const management = classifyManagement(school);
    const status = getStatusKey(school);
    const key = String(districtId || "_unassigned");
    if (!map.has(key)) {
      map.set(key, Object.fromEntries(MGMT_CATEGORY_HEADERS.map((h) => [h, 0])));
      map.get(key).districtId = districtId;
      map.get(key).districtName = districtName;
    }
    const row = map.get(key);
    row[`${categoryGroup}_total`] += 1;
    row[`${categoryGroup}_${management}_total`] += 1;
    row[`${categoryGroup}_${management}_${status}`] += 1;
  });
  return Array.from(map.values()).sort((a, b) =>
    (a.districtName ?? "").localeCompare(b.districtName ?? ""),
  );
}

function emptyCounts() {
  return {
    total_schools: 0,
    govt_schools: 0,
    private_schools: 0,
    govt_aided_schools: 0,
    schools_started: 0,
    schools_pending: 0,
    schools_completed: 0,
    schools_not_started: 0,
  };
}

function tallySchool(entry, school) {
  entry.total_schools += 1;
  const management = classifyManagement(school);
  if (management === "private") {
    entry.private_schools += 1;
  } else if (management === "aided") {
    entry.govt_aided_schools += 1;
  } else {
    entry.govt_schools += 1;
  }
  const { isCompleted, isInProgress, isNotStarted } = classifyStatus(school);
  if (isCompleted) {
    entry.schools_completed += 1;
  } else if (isInProgress) {
    entry.schools_started += 1;
  } else if (isNotStarted) {
    entry.schools_pending += 1;
    entry.schools_not_started += 1;
  }
}

function aggregateByKey(allSchools, keyFn, initFn) {
  const map = {};
  allSchools.forEach((s) => {
    const key = keyFn(s);
    if (!key) return;
    if (!map[key]) map[key] = initFn(s);
    tallySchool(map[key], s);
  });
  return Object.values(map);
}

function districtRowsFromSchools(allSchools, fallbackDistricts) {
  const fromSchools = aggregateByKey(
    allSchools,
    (s) => String(s.districtId ?? s.district_id ?? "") || "_unassigned",
    (s) => ({
      districtId: s.districtId ?? s.district_id ?? "",
      districtName: s.districtName ?? s.district_name ?? "Unassigned",
      ...emptyCounts(),
    }),
  );

  if (fromSchools.length) {
    return fromSchools.sort((a, b) =>
      (a.districtName ?? "").localeCompare(b.districtName ?? ""),
    );
  }

  return (fallbackDistricts || [])
    .sort((a, b) => (a.districtName ?? "").localeCompare(b.districtName ?? ""))
    .map((d) => {
      const completed = d.completedSchools ?? d.completedVerification ?? 0;
      const started = d.startedSchools ?? d.pendingVerification ?? 0;
      const total = d.totalSchools ?? 0;
      return {
        districtId: d.districtId,
        districtName: d.districtName,
        total_schools: total,
        govt_schools: 0,
        private_schools: 0,
        govt_aided_schools: 0,
        schools_started: started,
        schools_pending: Math.max(
          0,
          total - (completed + started) || d.notStartedSchools || 0,
        ),
        schools_completed: completed,
        schools_not_started: Math.max(
          0,
          total - (completed + started) || d.notStartedSchools || 0,
        ),
      };
    });
}

function buildDistrictRankRowsByManagement(allSchools = []) {
  const map = new Map();
  allSchools.forEach((school) => {
    const districtId = Number(school.districtId ?? school.district_id) || 0;
    const districtName = school.districtName ?? school.district_name ?? "Unassigned";
    const management = classifyManagement(school);
    const status = getStatusKey(school);
    if (!map.has(districtId)) {
      map.set(districtId, {
        districtId,
        districtName,
        govt: { total: 0, active: 0, pend: 0 },
        aided: { total: 0, active: 0, pend: 0 },
        private: { total: 0, active: 0, pend: 0 },
        total: 0,
        completed: 0,
      });
    }
    const row = map.get(districtId);
    const bucket = row[management];
    bucket.total += 1;
    row.total += 1;
    if (status === "pending") bucket.pend += 1;
    else bucket.active += 1;
    if (status === "completed") row.completed += 1;
  });
  return Array.from(map.values())
    .map((r) => ({
      ...r,
      activePercent: r.total > 0 ? (100 * (r.govt.active + r.aided.active + r.private.active)) / r.total : 0,
    }))
    .sort((a, b) => b.activePercent - a.activePercent);
}

function buildDistrictRankRowsByType(allSchools = []) {
  const map = new Map();
  allSchools.forEach((school) => {
    const districtId = Number(school.districtId ?? school.district_id) || 0;
    const districtName = school.districtName ?? school.district_name ?? "Unassigned";
    const category = classifyCategoryGroup(school);
    if (!category) return;
    const status = classifyStatus(school);
    if (!map.has(districtId)) {
      map.set(districtId, {
        districtId,
        districtName,
        primary: { total: 0, completed: 0, started: 0, pending: 0 },
        secondary: { total: 0, completed: 0, started: 0, pending: 0 },
        total: 0,
        completed: 0,
      });
    }
    const row = map.get(districtId);
    const bucket = row[category];
    bucket.total += 1;
    row.total += 1;
    if (status.isCompleted) {
      bucket.completed += 1;
      row.completed += 1;
    } else if (status.isInProgress) {
      bucket.started += 1;
    } else {
      bucket.pending += 1;
    }
  });
  return Array.from(map.values())
    .map((r) => ({
      ...r,
      activePercent:
        r.total > 0
          ? (100 *
              (r.primary.completed +
                r.primary.started +
                r.secondary.completed +
                r.secondary.started)) /
            r.total
          : 0,
    }))
    .sort((a, b) => b.activePercent - a.activePercent);
}

export function useExportDashboard({ districtId } = {}) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState("");
  const [isMgmtCategoryExporting, setIsMgmtCategoryExporting] = useState(false);
  const [mgmtCategoryExportProgress, setMgmtCategoryExportProgress] = useState("");
  const [isPdfExporting, setIsPdfExporting] = useState(false);
  const [pdfExportProgress, setPdfExportProgress] = useState("");

  const exportToXlsx = async () => {
    if (isExporting) return;
    setIsExporting(true);
    setExportProgress(isCacheValid(districtId) ? "Building workbook…" : "Fetching data…");

    try {
      const {
        allDistrictEntries,
        allSchools,
        blockBreakdown,
        districtRows: apiDistrictRows,
        blockRows: apiBlockRows,
      } = await prefetchExportData((info) => {
          if (info.phase === "schools") {
            setExportProgress("Fetching school data…");
          }
        }, districtId);

      setExportProgress("Building workbook…");

      const districtRows =
        Array.isArray(apiDistrictRows) && apiDistrictRows.length
          ? apiDistrictRows
          : districtRowsFromSchools(allSchools, allDistrictEntries);

      const blockRowsFromSchools = aggregateByKey(
        allSchools,
        (s) => {
          const did = s.districtId ?? s.district_id ?? "";
          const bid = s.blockId ?? s.block_id ?? s.talukaId ?? s.taluka_id ?? "";
          return did && bid ? `${did}_${bid}` : "";
        },
        (s) => ({
          districtId: s.districtId ?? s.district_id ?? "",
          districtName: s.districtName ?? s.district_name ?? "",
          blockId: s.blockId ?? s.block_id ?? s.talukaId ?? s.taluka_id ?? "",
          blockName:
            s.blockName ?? s.block_name ?? s.talukaName ?? s.taluka ?? "",
          ...emptyCounts(),
        }),
      );

      const blockRows = (
        Array.isArray(apiBlockRows) && apiBlockRows.length
          ? apiBlockRows
          : blockRowsFromSchools.length
          ? blockRowsFromSchools
          : (blockBreakdown || []).map((b) => {
              const completed = b.completed ?? b.completedVerification ?? 0;
              const inProgress = b.inProgress ?? b.started ?? 0;
              const pending = b.pending ?? b.notStarted ?? 0;
              const total = b.totalSchools ?? b.total ?? 0;
              return {
                districtId: b.districtId ?? "",
                districtName: b.districtName ?? "",
                blockId: b.blockId ?? "",
                blockName: b.blockName ?? "",
                total_schools: total,
                govt_schools: 0,
                private_schools: 0,
                govt_aided_schools: 0,
                schools_started: inProgress,
                schools_pending: pending,
                schools_completed: completed,
                schools_not_started: pending,
              };
            })
      ).sort(
        (a, b) =>
          (a.districtName ?? "").localeCompare(b.districtName ?? "") ||
          (a.blockName ?? "").localeCompare(b.blockName ?? ""),
      );

      const clusterRows = aggregateByKey(
        allSchools,
        (s) => {
          const cid = s.clusterId ?? s.cluster_id ?? s.clusterCode ?? "";
          const bid = s.blockId ?? s.block_id ?? s.talukaId ?? s.taluka_id ?? "";
          const did = s.districtId ?? s.district_id ?? "";
          return cid ? `${did}_${bid}_${cid}` : "";
        },
        (s) => ({
          districtId: s.districtId ?? s.district_id ?? "",
          districtName: s.districtName ?? s.district_name ?? "",
          blockId: s.blockId ?? s.block_id ?? s.talukaId ?? s.taluka_id ?? "",
          blockName:
            s.blockName ?? s.block_name ?? s.talukaName ?? s.taluka ?? "",
          clusterId: s.clusterId ?? s.cluster_id ?? s.clusterCode ?? "",
          clusterName:
            s.clusterName ?? s.cluster_name ?? s.clusterNameEn ?? "",
          ...emptyCounts(),
        }),
      ).sort(
        (a, b) =>
          (a.districtName ?? "").localeCompare(b.districtName ?? "") ||
          (a.blockName ?? "").localeCompare(b.blockName ?? "") ||
          (a.clusterName ?? "").localeCompare(b.clusterName ?? ""),
      );

      const schoolRows = allSchools
        .map((s) => {
          const { isCompleted, isInProgress, isNotStarted } = classifyStatus(s);
          return {
            districtId: s.districtId ?? s.district_id ?? "",
            districtName: s.districtName ?? s.district_name ?? "",
            blockId: s.blockId ?? s.block_id ?? s.talukaId ?? s.taluka_id ?? "",
            blockName:
              s.blockName ?? s.block_name ?? s.talukaName ?? s.taluka ?? "",
            clusterId: s.clusterId ?? s.cluster_id ?? s.clusterCode ?? "",
            clusterName:
              s.clusterName ?? s.cluster_name ?? s.clusterNameEn ?? "",
            schoolId: s.schoolId ?? s.school_id ?? s.udiseCode ?? "",
            schoolName:
              s.schoolName ?? s.school_name ?? s.schoolNameEn ?? "",
            overall_status:
              s.selfAssessmentStatus ||
              (isCompleted
                ? "Submitted"
                : isInProgress
                  ? "In Progress"
                  : "Not Started"),
            overall_percent:
              s.overallPercent != null && s.overallPercent !== ""
                ? Number(s.overallPercent)
                : isCompleted
                  ? 100
                  : 0,
            assessment_1_name: s.assessment1Name || "",
            assessment_1_status: s.assessment1Status || "",
            assessment_1_percent:
              s.assessment1Percent == null || s.assessment1Percent === ""
                ? ""
                : Number(s.assessment1Percent),
            assessment_2_name: s.assessment2Name || "",
            assessment_2_status: s.assessment2Status || "",
            assessment_2_percent:
              s.assessment2Percent == null || s.assessment2Percent === ""
                ? ""
                : Number(s.assessment2Percent),
            total_schools: 1,
            schools_started: isInProgress ? 1 : 0,
            schools_pending: isNotStarted ? 1 : 0,
            schools_completed: isCompleted ? 1 : 0,
            schools_not_started: isNotStarted ? 1 : 0,
          };
        })
        .sort(
          (a, b) =>
            (a.districtName ?? "").localeCompare(b.districtName ?? "") ||
            (a.blockName ?? "").localeCompare(b.blockName ?? "") ||
            (a.clusterName ?? "").localeCompare(b.clusterName ?? "") ||
            (a.schoolName ?? "").localeCompare(b.schoolName ?? ""),
        );

      const workbook = new ExcelJS.Workbook();
      workbook.creator = "GSQAC Admin";
      workbook.company = "GSQAC";
      workbook.created = new Date();
      workbook.modified = new Date();

      buildSheet(workbook, "District", districtRows, [
        "districtId",
        "districtName",
        "total_schools",
        "govt_schools",
        "private_schools",
        "govt_aided_schools",
        "schools_started",
        "schools_pending",
        "schools_completed",
        "schools_not_started",
      ]);
      buildSheet(workbook, "Block", blockRows, [
        "districtId",
        "districtName",
        "blockId",
        "blockName",
        "total_schools",
        "govt_schools",
        "private_schools",
        "govt_aided_schools",
        "schools_started",
        "schools_pending",
        "schools_completed",
        "schools_not_started",
      ]);
      buildSheet(workbook, "Cluster", clusterRows, [
        "districtId",
        "districtName",
        "blockId",
        "blockName",
        "clusterId",
        "clusterName",
        "total_schools",
        "schools_started",
        "schools_pending",
        "schools_completed",
        "schools_not_started",
      ]);
      buildSheet(workbook, "School", schoolRows, [
        "districtId",
        "districtName",
        "blockId",
        "blockName",
        "clusterId",
        "clusterName",
        "schoolId",
        "schoolName",
        "overall_status",
        "overall_percent",
        "assessment_1_name",
        "assessment_1_status",
        "assessment_1_percent",
        "assessment_2_name",
        "assessment_2_status",
        "assessment_2_percent",
      ]);

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `GSQAC_Dashboard_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(
        "[useExportDashboard] Export failed:",
        err?.response?.data || err?.message,
        err,
      );
      enqueueSnackbar(
        err?.response?.data?.message ||
          err?.message ||
          "Export failed. Please try again.",
        { variant: "error" },
      );
    } finally {
      setIsExporting(false);
      setExportProgress("");
    }
  };

  const exportManagementCategoryToXlsx = async () => {
    if (isMgmtCategoryExporting) return;
    setIsMgmtCategoryExporting(true);
    setMgmtCategoryExportProgress(
      isCacheValid(districtId) ? "Building workbook…" : "Fetching data…",
    );

    try {
      const { allSchools } = await prefetchExportData((info) => {
        if (info.phase === "schools") {
          setMgmtCategoryExportProgress("Fetching school data…");
        }
      }, districtId);

      setMgmtCategoryExportProgress("Building workbook…");
      const rows = createDistrictManagementCategoryRows(allSchools);

      const workbook = new ExcelJS.Workbook();
      workbook.creator = "GSQAC Admin";
      workbook.company = "GSQAC";
      workbook.created = new Date();
      workbook.modified = new Date();

      buildSheet(workbook, "District Mgmt+Category", rows, MGMT_CATEGORY_HEADERS);

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `GSQAC_District_Management_Category_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(
        "[useExportDashboard] Mgmt/category export failed:",
        err?.response?.data || err?.message,
        err,
      );
      enqueueSnackbar(
        err?.response?.data?.message ||
          err?.message ||
          "Management/category export failed. Please try again.",
        { variant: "error" },
      );
    } finally {
      setIsMgmtCategoryExporting(false);
      setMgmtCategoryExportProgress("");
    }
  };

  const exportPerformancePdf = async () => {
    if (isPdfExporting) return;
    setIsPdfExporting(true);
    setPdfExportProgress("Fetching data…");

    try {
      const {
        allSchools,
        selfAssessmentSummary,
        managementBreakdown,
        categoryBreakdown,
      } = await prefetchExportData((info) => {
        if (info.phase === "schools") setPdfExportProgress("Fetching school data…");
      }, districtId, { bypassCache: true });

      setPdfExportProgress("Preparing report…");

      const totals = totalsFromSummary(selfAssessmentSummary, allSchools);
      const mgmtBuckets =
        managementBreakdown?.length > 0
          ? mgmtBucketsFromBreakdown(managementBreakdown)
          : buildMgmtBucketsFromSchools(allSchools);
      const typeBuckets =
        categoryBreakdown?.length > 0
          ? typeBucketsFromBreakdown(categoryBreakdown)
          : buildTypeBucketsFromSchools(allSchools);

      const districtMgmtRows = buildDistrictRankRowsByManagement(allSchools);
      const districtTypeRows = buildDistrictRankRowsByType(allSchools);
      const districtCount = new Set(
        allSchools.map((s) => s.districtId ?? s.district_id),
      ).size;

      const generatedAt = new Date();
      const generatedDate = generatedAt.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });

      setPdfExportProgress("Generating PDF…");
      generatePerformanceReportPdf({
        districtCount,
        generatedDate,
        fileDate: generatedAt.toISOString().slice(0, 10),
        mgmtBuckets,
        typeBuckets,
        totals,
        districtMgmtRows,
        districtTypeRows,
      });
    } catch (err) {
      console.error("[useExportDashboard] Performance PDF export failed:", err?.response?.data || err?.message, err);
      enqueueSnackbar(
        err?.response?.data?.message || err?.message || "PDF export failed. Please try again.",
        { variant: "error" },
      );
    } finally {
      setIsPdfExporting(false);
      setPdfExportProgress("");
    }
  };

  return {
    exportToXlsx,
    isExporting,
    exportProgress,
    exportManagementCategoryToXlsx,
    isMgmtCategoryExporting,
    mgmtCategoryExportProgress,
    exportPerformancePdf,
    isPdfExporting,
    pdfExportProgress,
  };
}
