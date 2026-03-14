import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const PAGE_MARGIN = 14;
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;

function toText(value) {
  if (Array.isArray(value)) {
    return value.map((item) => toText(item)).filter(Boolean).join("\n");
  }
  if (value && typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }
  return String(value ?? "").trim();
}

function sanitizeFileName(value) {
  return String(value ?? "export")
    .trim()
    .replace(/[^\w.-]+/g, "_");
}

function ensurePageSpace(doc, y, neededHeight = 10) {
  if (y + neededHeight <= PAGE_HEIGHT - PAGE_MARGIN) return y;
  doc.addPage();
  return PAGE_MARGIN;
}

function addWrappedText(doc, text, y, options = {}) {
  const fontSize = options.fontSize ?? 11;
  const lineHeight = options.lineHeight ?? 6;
  const color = options.color ?? [31, 48, 72];
  const lines = doc.splitTextToSize(toText(text) || "Not available", CONTENT_WIDTH);

  doc.setFontSize(fontSize);
  doc.setTextColor(...color);

  let nextY = y;
  lines.forEach((line) => {
    nextY = ensurePageSpace(doc, nextY, lineHeight);
    doc.text(line, PAGE_MARGIN, nextY);
    nextY += lineHeight;
  });

  return nextY;
}

function addSection(doc, title, text, y) {
  let nextY = ensurePageSpace(doc, y, 12);
  doc.setFontSize(12);
  doc.setTextColor(18, 71, 52);
  doc.text(title, PAGE_MARGIN, nextY);
  nextY += 6;
  nextY = addWrappedText(doc, text, nextY, {
    fontSize: 10.5,
    lineHeight: 5.5,
    color: [31, 48, 72],
  });
  return nextY + 2;
}

function normalizeActionItems(value) {
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (item && typeof item === "object") {
        return [
          toText(item.task || item.task_desc),
          toText(item.owner || item.responsible || item.responsible_person),
          toText(item.due_date || item.due),
          toText(item.status),
        ];
      }
      return [toText(item), "", "", ""];
    });
  }

  if (typeof value === "string") {
    const rows = value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split("|").map((part) => part.trim());
        return [parts[0] || line, parts[1] || "", parts[2] || "", parts[3] || ""];
      });
    return rows.length ? rows : [[toText(value), "", "", ""]];
  }

  if (value && typeof value === "object") {
    return [[toText(value.task), toText(value.owner), toText(value.due_date), toText(value.status)]];
  }

  return [];
}

function addHeader(doc, title, subtitle) {
  doc.setFontSize(18);
  doc.setTextColor(18, 71, 52);
  doc.text("EcoClear", PAGE_MARGIN, 16);
  doc.setFontSize(16);
  doc.setTextColor(19, 36, 61);
  doc.text(title, PAGE_MARGIN, 25);
  doc.setFontSize(10);
  doc.setTextColor(79, 97, 128);
  doc.text(subtitle, PAGE_MARGIN, 31);
  return 38;
}

function addMetaTable(doc, y, rows) {
  autoTable(doc, {
    startY: y,
    theme: "grid",
    styles: { fontSize: 10, cellPadding: 2.5, textColor: [31, 48, 72] },
    headStyles: { fillColor: [18, 71, 52], textColor: [255, 255, 255] },
    columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: CONTENT_WIDTH - 50 } },
    head: [["Field", "Value"]],
    body: rows,
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
  });

  return (doc.lastAutoTable?.finalY ?? y) + 6;
}

export function exportFinalizedApplicationPdf(application) {
  const minutes = application?.finalizedMinutes && typeof application.finalizedMinutes === "object"
    ? application.finalizedMinutes
    : {};

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = addHeader(doc, "Finalized Minutes of Meeting", "Proponent Download Copy");

  y = addMetaTable(doc, y, [
    ["Application ID", toText(application?.id) || "N/A"],
    ["Project Name", toText(application?.name) || "N/A"],
    ["Category", toText(application?.category) || "N/A"],
    ["Status", toText(application?.status) || "N/A"],
    ["Date Submitted", toText(application?.date) || "N/A"],
  ]);

  y = addSection(
    doc,
    "Meeting Details",
    [
      `Meeting Title: ${toText(minutes.meetingTitle || application?.name) || "Not available"}`,
      `Meeting Type: ${toText(minutes.meetingType) || "Not available"}`,
      `Date: ${toText(minutes.date) || "Not available"}`,
      `Time: ${toText(minutes.time) || "Not available"}`,
      `Location: ${toText(minutes.location) || "Not available"}`,
      `Chairperson: ${toText(minutes.chairperson) || "Not available"}`,
      `Minute Taker: ${toText(minutes.minuteTaker) || "Not available"}`,
    ].join("\n"),
    y,
  );

  y = addSection(doc, "Participants", toText(minutes.participants) || "Not available", y);
  y = addSection(doc, "Agenda Items", toText(minutes.agendaItems) || "Not available", y);
  y = addSection(
    doc,
    "Summary of Discussion",
    toText(minutes.discussionSummary) || "Not available",
    y,
  );
  y = addSection(doc, "Decisions Taken", toText(minutes.decisionsTaken) || "Not available", y);

  const actionRows = normalizeActionItems(minutes.actionItems);
  if (actionRows.length > 0) {
    y = ensurePageSpace(doc, y, 16);
    doc.setFontSize(12);
    doc.setTextColor(18, 71, 52);
    doc.text("Action Items", PAGE_MARGIN, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      theme: "grid",
      styles: { fontSize: 9.5, cellPadding: 2.2, textColor: [31, 48, 72] },
      headStyles: { fillColor: [18, 71, 52], textColor: [255, 255, 255] },
      head: [["Task", "Owner", "Due Date", "Status"]],
      body: actionRows,
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    });
    y = (doc.lastAutoTable?.finalY ?? y) + 6;
  } else {
    y = addSection(doc, "Action Items", "Not available", y);
  }

  y = addSection(doc, "Risks / Concerns Raised", toText(minutes.risks) || "Not available", y);
  y = addSection(doc, "Next Steps", toText(minutes.nextSteps) || "Not available", y);
  y = addSection(
    doc,
    "Next Meeting Schedule",
    toText(minutes.nextMeetingSchedule) || "Not available",
    y,
  );

  if (!Object.keys(minutes).length && toText(application?.meetingGistText)) {
    addSection(doc, "AI Meeting Gist", toText(application?.meetingGistText), y);
  }

  doc.save(`${sanitizeFileName(application?.id)}-finalized-mom.pdf`);
}

export function exportMomMinutesPdf(record) {
  const minutes = record?.minutes && typeof record.minutes === "object" ? record.minutes : {};
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = addHeader(doc, "MoM Minutes Export", "MoM Team Document");

  y = addMetaTable(doc, y, [
    ["Case Ref", toText(record?.id) || "N/A"],
    ["Meeting Title", toText(record?.meetingTitle) || "N/A"],
    ["Department", toText(record?.department) || "N/A"],
    ["Status", toText(record?.status) || "N/A"],
    ["Assignee", toText(record?.assignee) || "N/A"],
    ["Date", toText(record?.date) || "N/A"],
  ]);

  y = addSection(doc, "AI Gist", toText(record?.gist) || "No gist available.", y);
  y = addSection(doc, "Participants", toText(minutes.participants) || "Not provided", y);
  y = addSection(doc, "Agenda Items", toText(minutes.agendaItems) || "Not provided", y);
  y = addSection(
    doc,
    "Summary of Discussion",
    toText(minutes.discussionSummary) || "Not provided",
    y,
  );
  y = addSection(doc, "Decisions Taken", toText(minutes.decisionsTaken) || "Not provided", y);

  const actionRows = normalizeActionItems(minutes.actionItems);
  if (actionRows.length > 0) {
    y = ensurePageSpace(doc, y, 16);
    doc.setFontSize(12);
    doc.setTextColor(18, 71, 52);
    doc.text("Action Items", PAGE_MARGIN, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      theme: "grid",
      styles: { fontSize: 9.5, cellPadding: 2.2, textColor: [31, 48, 72] },
      headStyles: { fillColor: [18, 71, 52], textColor: [255, 255, 255] },
      head: [["Task", "Owner", "Due Date", "Status"]],
      body: actionRows,
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    });
    y = (doc.lastAutoTable?.finalY ?? y) + 6;
  }

  y = addSection(doc, "Risks / Concerns", toText(minutes.risks) || "Not provided", y);
  y = addSection(doc, "Next Steps", toText(minutes.nextSteps) || "Not provided", y);
  addSection(
    doc,
    "Next Meeting Schedule",
    toText(minutes.nextMeetingSchedule) || "Not provided",
    y,
  );

  doc.save(`${sanitizeFileName(record?.id)}-minutes.pdf`);
}

export function exportMomGistPdf(record) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = addHeader(doc, "Meeting Gist Export", "MoM Team Document");

  y = addMetaTable(doc, y, [
    ["Case Ref", toText(record?.id) || "N/A"],
    ["Meeting Title", toText(record?.meetingTitle) || "N/A"],
    ["Department", toText(record?.department) || "N/A"],
    ["Status", toText(record?.status) || "N/A"],
    ["Date", toText(record?.date) || "N/A"],
  ]);

  addSection(doc, "AI Generated Meeting Gist", toText(record?.gist) || "No gist available.", y);
  doc.save(`${sanitizeFileName(record?.id)}-meeting-gist.pdf`);
}

export function exportScrutinyDocumentPdf(caseItem, documentItem) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const subtitle = "Scrutiny Team Document Export";
  let y = addHeader(doc, "Uploaded Document Export", subtitle);

  y = addMetaTable(doc, y, [
    ["Application ID", toText(caseItem?.id) || "N/A"],
    ["Applicant Entity", toText(caseItem?.entity) || "N/A"],
    ["Project Name", toText(caseItem?.projectName) || "N/A"],
    ["Category", toText(caseItem?.category) || "N/A"],
    ["Date Submitted", toText(caseItem?.dateSubmitted) || "N/A"],
    ["Current Status", toText(caseItem?.status) || "N/A"],
    ["Document Name", toText(documentItem?.fileName) || "N/A"],
  ]);

  if (documentItem?.storagePath) {
    y = addSection(doc, "Storage Path", toText(documentItem.storagePath), y);
  }

  addSection(
    doc,
    "Note",
    "This is a scrutiny export record for the selected uploaded document.",
    y,
  );

  doc.save(
    `${sanitizeFileName(caseItem?.id || "application")}-${sanitizeFileName(
      documentItem?.fileName || "document",
    )}.pdf`,
  );
}
