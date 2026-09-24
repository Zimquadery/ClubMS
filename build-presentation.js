const pptxgen = require("pptxgenjs");

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.33 x 7.5
pres.author = "Md Farhan Quadery, Md Saddam Hosen Molla";
pres.title = "ClubMS — University Club Management Platform";

const W = 13.33, M = 0.6;
const INK = "121A16";      // dark bg / headings
const TEXT = "1E2A24";     // body ink on light
const GREEN = "008749";    // HSTU accent (logo green)
const GREEN_LT = "52B788"; // accent tint for dark bg
const MUTED = "68766F";    // muted gray-green
const HAIR = "D8DFDA";     // hairlines
const TINT = "F2F6F3";     // faint card/frame tint
const SERIF = "Georgia";
const SANS = "Arial";

const ASSETS = "F:/Vibe coding/ClubMS/report";

function kicker(slide, label) {
  slide.addText(label, {
    x: M, y: 0.52, w: 8, h: 0.3, margin: 0,
    fontFace: SANS, fontSize: 12, bold: true, color: GREEN, charSpacing: 3,
  });
}
function slideTitle(slide, text) {
  slide.addText(text, {
    x: M, y: 0.9, w: W - 2 * M, h: 0.62, margin: 0,
    fontFace: SERIF, fontSize: 27, bold: true, color: INK,
  });
}
function footer(slide) {
  slide.addText("ClubMS  ·  CSE 352  ·  Hajee Mohammad Danesh Science and Technology University", {
    x: M, y: 7.02, w: 9, h: 0.28, margin: 0,
    fontFace: SANS, fontSize: 12, color: MUTED,
  });
}

/* ---------------- Slide 0 — Title (dark) ---------------- */
{
  const s = pres.addSlide();
  s.background = { color: INK };
  s.addImage({ path: `${ASSETS}/hstu-logo.png`, x: (W - 1.05) / 2, y: 0.55, w: 1.05, h: 1.05 });
  s.addText("Hajee Mohammad Danesh Science and Technology University", {
    x: 1, y: 1.78, w: W - 2, h: 0.32, margin: 0, align: "center",
    fontFace: SANS, fontSize: 12.5, color: "9FB0A7", charSpacing: 2,
  });
  s.addText("ClubMS", {
    x: 1, y: 2.3, w: W - 2, h: 1.15, margin: 0, align: "center",
    fontFace: SERIF, fontSize: 60, bold: true, color: "FFFFFF",
  });
  s.addText("University Club Management Platform", {
    x: 1, y: 3.62, w: W - 2, h: 0.4, margin: 0, align: "center",
    fontFace: SANS, fontSize: 18, color: GREEN_LT, charSpacing: 2,
  });
  s.addText("CSE 352 — Web and Mobile Application Development Sessional", {
    x: 1, y: 4.32, w: W - 2, h: 0.3, margin: 0, align: "center",
    fontFace: SANS, fontSize: 12.5, color: "8FA098",
  });
  s.addText([
    { text: "Md Farhan Quadery — 2202015", options: { breakLine: true } },
    { text: "Md Saddam Hosen Molla — 2202042" },
  ], {
    x: 1, y: 5.25, w: W - 2, h: 0.75, margin: 0, align: "center",
    fontFace: SANS, fontSize: 13.5, color: "E8EEEA", paraSpaceAfter: 6,
  });
  s.addText("Department of Computer Science and Engineering", {
    x: 1, y: 6.18, w: W - 2, h: 0.3, margin: 0, align: "center",
    fontFace: SANS, fontSize: 12, color: "8FA098",
  });
}

/* ---------------- Slide 1 — Motivation (light) ---------------- */
{
  const s = pres.addSlide();
  s.background = { color: "FFFFFF" };
  kicker(s, "01  ·  MOTIVATION");
  slideTitle(s, "Running a club still runs on paper and chat groups");

  s.addText([
    { text: "Not short on enthusiasm or effort —", options: { breakLine: true } },
    { text: "but no durable, shared record of decisions.", options: { breakLine: true } },
  ], {
    x: M, y: 2.35, w: 3.55, h: 1.9, margin: 0,
    fontFace: SERIF, fontSize: 17, italic: true, color: INK, paraSpaceAfter: 4,
  });
  s.addText("Recurring theme across four officer interviews", {
    x: M, y: 4.35, w: 3.4, h: 0.5, margin: 0,
    fontFace: SANS, fontSize: 12, color: MUTED,
  });

  const rows = [
    ["No club directory", "No single place to see which clubs exist."],
    ["Manual membership", "Google Forms + spreadsheets; approvals unrecorded."],
    ["Lost announcements", "WhatsApp posts scroll away; new members find nothing."],
    ["Unclear event ownership", "Joint events announced separately; attendance splits."],
    ["No alumni record", "Membership ends at graduation; history disappears."],
  ];
  const x0 = 4.75, w0 = W - M - x0, rowH = 0.92, y0 = 1.98;
  rows.forEach(([lead, sub], i) => {
    const ry = y0 + i * rowH;
    if (i > 0) s.addShape(pres.shapes.LINE, { x: x0, y: ry - 0.08, w: w0, h: 0, line: { color: HAIR, width: 0.75 } });
    s.addText(String(i + 1).padStart(2, "0"), {
      x: x0, y: ry + 0.06, w: 0.7, h: 0.55, margin: 0,
      fontFace: SERIF, fontSize: 21, bold: true, color: GREEN,
    });
    s.addText([
      { text: lead, options: { bold: true, fontSize: 15, color: TEXT, breakLine: true } },
      { text: sub, options: { fontSize: 12, color: MUTED } },
    ], {
      x: x0 + 0.8, y: ry, w: w0 - 0.8, h: rowH - 0.1, margin: 0,
      fontFace: SANS, paraSpaceAfter: 3,
    });
  });
  footer(s);
}

/* ---------------- Slide 2 — Requirement analysis (light) ---------------- */
{
  const s = pres.addSlide();
  s.background = { color: "FFFFFF" };
  kicker(s, "02  ·  REQUIREMENT ANALYSIS");
  slideTitle(s, "Requirements grounded in field interviews");
  s.addText("Face-to-face, semi-structured interviews with sitting officers of four HSTU student organizations", {
    x: M, y: 1.58, w: W - 2 * M, h: 0.32, margin: 0,
    fontFace: SANS, fontSize: 13, color: MUTED,
  });

  const fw = 3.73, gap = 0.35, fx0 = (W - (3 * fw + 2 * gap)) / 2, fy = 2.15, fh = 2.55;
  for (let i = 0; i < 3; i++) {
    const fx = fx0 + i * (fw + gap);
    s.addShape(pres.shapes.RECTANGLE, {
      x: fx, y: fy, w: fw, h: fh,
      fill: { color: TINT }, line: { color: "AEBBB2", width: 1, dashType: "dash" },
    });
    s.addText([
      { text: `Interview photo ${i + 1}`, options: { bold: true, fontSize: 13, color: MUTED, breakLine: true } },
      { text: "photo to be attached", options: { fontSize: 12, color: "97A49C" } },
    ], {
      x: fx, y: fy + fh / 2 - 0.45, w: fw, h: 0.9, margin: 0, align: "center",
      fontFace: SANS, paraSpaceAfter: 4,
    });
  }

  s.addShape(pres.shapes.LINE, { x: fx0, y: 5.32, w: 3 * fw + 2 * gap, h: 0, line: { color: HAIR, width: 0.75 } });
  s.addText("WHAT WE HEARD  →  WHAT CLUBMS DOES", {
    x: fx0, y: 5.5, w: 6, h: 0.28, margin: 0,
    fontFace: SANS, fontSize: 12, bold: true, color: GREEN, charSpacing: 2,
  });
  const findings = [
    ["Join requests went stale", "Visible PENDING state, officer approval, audit log"],
    ["Eligibility unenforceable", "Automatic department-based join rules"],
    ["Paper attendance sheets", "Per-event RSVP with attendee lists + CSV export"],
    ["Notices buried in chat", "Persistent, pinnable announcements + published rules"],
  ];
  const cw = (3 * fw + 2 * gap - 3 * 0.3) / 4;
  findings.forEach(([lead, sub], i) => {
    const fx = fx0 + i * (cw + 0.3);
    s.addText([
      { text: lead, options: { bold: true, fontSize: 13, color: TEXT, breakLine: true } },
      { text: sub, options: { fontSize: 12, color: MUTED } },
    ], {
      x: fx, y: 5.92, w: cw, h: 0.95, margin: 0,
      fontFace: SANS, paraSpaceAfter: 3,
    });
  });
  footer(s);
}

/* ---------------- Slide 3 — What we built (light) ---------------- */
{
  const s = pres.addSlide();
  s.background = { color: "FFFFFF" };
  kicker(s, "03  ·  WHAT WE BUILT");
  slideTitle(s, "One platform for the whole club lifecycle");

  const feats = [
    ["Club directory", "Every club in one browsable, public list."],
    ["Member access", "Join requests with approve / reject; member and officer roles."],
    ["Auto alumni", "Members move to alumni status; club history is preserved."],
    ["Event list", "Multi-club events with consent-based co-hosts."],
    ["RSVP", "Per-event attendance, visible to officers, exportable."],
  ];
  const x0 = M, w0 = 6.0, rowH = 0.94, y0 = 2.02;
  feats.forEach(([lead, sub], i) => {
    const ry = y0 + i * rowH;
    if (i > 0) s.addShape(pres.shapes.LINE, { x: x0, y: ry - 0.08, w: w0, h: 0, line: { color: HAIR, width: 0.75 } });
    s.addText(String(i + 1).padStart(2, "0"), {
      x: x0, y: ry + 0.06, w: 0.7, h: 0.55, margin: 0,
      fontFace: SERIF, fontSize: 21, bold: true, color: GREEN,
    });
    s.addText([
      { text: lead, options: { bold: true, fontSize: 15, color: TEXT, breakLine: true } },
      { text: sub, options: { fontSize: 12, color: MUTED } },
    ], {
      x: x0 + 0.8, y: ry, w: w0 - 0.8, h: rowH - 0.1, margin: 0,
      fontFace: SANS, paraSpaceAfter: 3,
    });
  });

  const iw = 5.5, ih = iw / (1485 / 927), ix = W - M - iw, iy = 2.02;
  s.addImage({ path: `${ASSETS}/All-clubs.png`, x: ix, y: iy, w: iw, h: ih });
  s.addShape(pres.shapes.RECTANGLE, {
    x: ix, y: iy, w: iw, h: ih, fill: { type: "none" }, line: { color: HAIR, width: 1 },
  });
  s.addText("Club directory — the public list of all clubs", {
    x: ix, y: iy + ih + 0.12, w: iw, h: 0.28, margin: 0, align: "center",
    fontFace: SANS, fontSize: 12, color: MUTED,
  });
  footer(s);
}

/* ---------------- Slide 4 — System design (light) ---------------- */
{
  const s = pres.addSlide();
  s.background = { color: "FFFFFF" };
  kicker(s, "04  ·  SYSTEM DESIGN");
  slideTitle(s, "Three-tier architecture, containerized");

  const boxLine = () => ({ color: "B9C4BD", width: 1.25 });
  // Client tier
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.7, y: 2.55, w: 2.85, h: 1.65, rectRadius: 0.06,
    fill: { color: TINT }, line: boxLine(),
  });
  s.addText([
    { text: "React SPA", options: { bold: true, fontSize: 16, color: TEXT, breakLine: true } },
    { text: "Vite · Tailwind CSS · Radix UI", options: { fontSize: 12, color: MUTED } },
  ], {
    x: 0.85, y: 2.95, w: 2.55, h: 0.9, margin: 0, fontFace: SANS, paraSpaceAfter: 4,
  });
  // API tier
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 4.3, y: 1.85, w: 4.9, h: 3.05, rectRadius: 0.06,
    fill: { color: "FFFFFF" }, line: { color: GREEN, width: 1.5 },
  });
  s.addText([
    { text: "Express REST API", options: { bold: true, fontSize: 16, color: TEXT, breakLine: true } },
    { text: "Node.js — layered request pipeline", options: { fontSize: 12, color: MUTED } },
  ], {
    x: 4.55, y: 2.02, w: 4.4, h: 0.75, margin: 0, fontFace: SANS, paraSpaceAfter: 3,
  });
  const chips = ["Helmet · CORS · rate limit", "JWT authentication", "RBAC — role + ownership", "Zod validation", "Service layer · transactions", "Prisma ORM"];
  chips.forEach((c, i) => {
    const cx = 4.55 + (i % 2) * 2.25, cy = 2.92 + Math.floor(i / 2) * 0.62;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: cx, y: cy, w: 2.1, h: 0.5, rectRadius: 0.05,
      fill: { color: TINT }, line: { color: HAIR, width: 0.75 },
    });
    s.addText(c, {
      x: cx, y: cy, w: 2.1, h: 0.5, margin: 0, align: "center", valign: "middle",
      fontFace: SANS, fontSize: 12, color: TEXT,
    });
  });
  // Data tier
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 10.05, y: 2.55, w: 2.6, h: 1.65, rectRadius: 0.06,
    fill: { color: TINT }, line: boxLine(),
  });
  s.addText([
    { text: "PostgreSQL 16", options: { bold: true, fontSize: 16, color: TEXT, breakLine: true } },
    { text: "via Prisma ORM 7", options: { fontSize: 12, color: MUTED } },
  ], {
    x: 10.2, y: 2.95, w: 2.3, h: 0.9, margin: 0, fontFace: SANS, paraSpaceAfter: 4,
  });
  // Arrows
  s.addShape(pres.shapes.LINE, { x: 3.55, y: 3.38, w: 0.75, h: 0, line: { color: MUTED, width: 1.5, endArrowType: "triangle" } });
  s.addText("HTTPS · JSON", {
    x: 3.3, y: 2.98, w: 1.25, h: 0.26, margin: 0, align: "center",
    fontFace: SANS, fontSize: 12, color: MUTED,
  });
  s.addShape(pres.shapes.LINE, { x: 9.2, y: 3.38, w: 0.85, h: 0, line: { color: MUTED, width: 1.5, endArrowType: "triangle" } });
  s.addText("SQL", {
    x: 9.1, y: 2.98, w: 1.05, h: 0.26, margin: 0, align: "center",
    fontFace: SANS, fontSize: 12, color: MUTED,
  });
  s.addText("Three Docker Compose containers — frontend (nginx) · API · database", {
    x: 0.7, y: 5.12, w: W - 1.4, h: 0.3, margin: 0, align: "center",
    fontFace: SANS, fontSize: 12, color: MUTED,
  });

  s.addShape(pres.shapes.LINE, { x: 0.7, y: 5.68, w: W - 1.4, h: 0, line: { color: HAIR, width: 0.75 } });
  const stats = [["18", "Prisma migrations"], ["345", "automated tests"], ["4", "system roles"], ["5", "months of iteration"]];
  stats.forEach(([num, label], i) => {
    const sx = 0.7 + i * 3.05;
    s.addText([
      { text: num, options: { fontFace: SERIF, fontSize: 30, bold: true, color: GREEN, breakLine: true } },
      { text: label, options: { fontFace: SANS, fontSize: 12, color: MUTED } },
    ], {
      x: sx, y: 5.88, w: 2.8, h: 1.05, margin: 0, align: "center", paraSpaceAfter: 2,
    });
  });
  footer(s);
}

/* ---------------- Slide 5 — Thank you (dark) ---------------- */
{
  const s = pres.addSlide();
  s.background = { color: INK };
  s.addImage({ path: `${ASSETS}/hstu-logo.png`, x: (W - 0.9) / 2, y: 1.0, w: 0.9, h: 0.9 });
  s.addText("Thank you", {
    x: 1, y: 2.85, w: W - 2, h: 1.0, margin: 0, align: "center",
    fontFace: SERIF, fontSize: 48, bold: true, color: "FFFFFF",
  });
  s.addText("Questions and discussion", {
    x: 1, y: 4.0, w: W - 2, h: 0.35, margin: 0, align: "center",
    fontFace: SANS, fontSize: 15, color: GREEN_LT, charSpacing: 2,
  });
  s.addText("Md Farhan Quadery  ·  Md Saddam Hosen Molla", {
    x: 1, y: 5.15, w: W - 2, h: 0.32, margin: 0, align: "center",
    fontFace: SANS, fontSize: 13.5, color: "E8EEEA",
  });
  s.addText("ClubMS  ·  CSE 352  ·  Department of Computer Science and Engineering, HSTU", {
    x: 1, y: 5.58, w: W - 2, h: 0.3, margin: 0, align: "center",
    fontFace: SANS, fontSize: 12, color: "8FA098",
  });
}

pres.writeFile({ fileName: "F:/Vibe coding/ClubMS/ClubMS-Presentation.pptx" }).then(() => console.log("written"));
