#!/usr/bin/env python3
"""Build the five-slide CDSS Smart Card architecture briefing.

Requires python-pptx==1.0.2. All architecture layers and Angular snippets are
labelled as proposals; this deck does not claim they are deployed or clinically
validated in Aybek HMS.
"""
from pathlib import Path
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.util import Inches, Pt

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "docs" / "clinical-cdss-smart-card-architecture.pptx"

# Palette from the brief.
C = {
    "ink": "090D16",
    "navy": "0F172A",
    "slate": "334155",
    "muted": "64748B",
    "pale": "F8FAFC",
    "white": "FFFFFF",
    "line": "E2E8F0",
    "cyan": "0284C7",
    "sky": "38BDF8",
    "blue_pale": "E0F2FE",
    "green": "16A34A",
    "green_pale": "DCFCE7",
    "rose": "E11D48",
    "rose_pale": "FFF1F2",
    "amber": "D97706",
    "amber_pale": "FEF3C7",
    "code": "111827",
    "code_muted": "94A3B8",
}
FONT = "Inter"
MONO = "JetBrains Mono"
W, H = 13.333, 7.5


def rgb(hex_color: str) -> RGBColor:
    return RGBColor.from_string(hex_color.replace("#", ""))


def set_bg(slide, color: str) -> None:
    fill = slide.background.fill
    fill.solid()
    fill.fore_color.rgb = rgb(color)


def rect(slide, x, y, w, h, fill, line=None, rounded=True, transparency=0):
    kind = MSO_SHAPE.ROUNDED_RECTANGLE if rounded else MSO_SHAPE.RECTANGLE
    shape = slide.shapes.add_shape(kind, Inches(x), Inches(y), Inches(w), Inches(h))
    shape.fill.solid()
    shape.fill.fore_color.rgb = rgb(fill)
    if transparency:
        shape.fill.transparency = transparency
    if line:
        shape.line.color.rgb = rgb(line)
        shape.line.width = Pt(1)
    else:
        shape.line.fill.background()
    return shape


def circle(slide, x, y, d, fill, line=None, transparency=0):
    shape = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(x), Inches(y), Inches(d), Inches(d))
    shape.fill.solid()
    shape.fill.fore_color.rgb = rgb(fill)
    if transparency:
        shape.fill.transparency = transparency
    if line:
        shape.line.color.rgb = rgb(line)
        shape.line.width = Pt(1)
    else:
        shape.line.fill.background()
    return shape


def text(slide, x, y, w, h, value, size=14, color="0F172A", bold=False,
         font=FONT, align=PP_ALIGN.LEFT, valign=MSO_ANCHOR.TOP,
         margin=0, italic=False, break_lines=True):
    box = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = box.text_frame
    tf.clear()
    tf.word_wrap = True
    tf.margin_left = Inches(margin)
    tf.margin_right = Inches(margin)
    tf.margin_top = Inches(margin)
    tf.margin_bottom = Inches(margin)
    tf.vertical_anchor = valign
    p = tf.paragraphs[0]
    p.alignment = align
    p.space_before = Pt(0)
    p.space_after = Pt(0)
    run = p.add_run()
    run.text = value
    run.font.name = font
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.italic = italic
    run.font.color.rgb = rgb(color)
    return box


def pill(slide, x, y, w, h, label, fill, fg, size=9, line=None, font=FONT):
    rect(slide, x, y, w, h, fill, line=line, rounded=True)
    return text(slide, x + 0.04, y + 0.01, w - 0.08, h - 0.02, label,
                size=size, color=fg, bold=True, font=font,
                align=PP_ALIGN.CENTER, valign=MSO_ANCHOR.MIDDLE)


def footer(slide, page, dark=False, note="AYBEK HMS  ·  ARCHITECTURE BRIEF"):
    color = "64748B" if not dark else "64748B"
    line_color = "1E293B" if dark else "E2E8F0"
    rect(slide, 0.55, 7.12, 12.23, 0.012, line_color, rounded=False)
    text(slide, 0.58, 7.19, 8.7, 0.16, note, size=7.2, color=color, bold=True)
    text(slide, 12.18, 7.17, 0.55, 0.18, f"0{page} / 05", size=7.5,
         color=color, bold=True, align=PP_ALIGN.RIGHT)


def header(slide, eyebrow, title, subtitle, page):
    text(slide, 0.63, 0.38, 9.8, 0.2, eyebrow.upper(), size=8.5,
         color=C["cyan"], bold=True)
    text(slide, 0.63, 0.72, 12.0, 0.47, title, size=25.5,
         color=C["ink"], bold=True)
    text(slide, 0.65, 1.35, 11.95, 0.46, subtitle, size=11.2,
         color=C["muted"])
    footer(slide, page)


def dot_bullet(slide, x, y, color, heading, body, width=3.15, body_size=10.8):
    circle(slide, x, y + 0.035, 0.12, color)
    text(slide, x + 0.22, y, width - 0.22, 0.25, heading, size=10.5,
         color=C["ink"], bold=True)
    text(slide, x + 0.22, y + 0.30, width - 0.22, 0.58, body,
         size=body_size, color=C["slate"])


def make_slide_1(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(slide, C["ink"])

    # Quiet technical motif: layered circles and signal paths.
    circle(slide, 9.25, -1.25, 4.8, "0F172A", transparency=8)
    circle(slide, 10.22, -0.28, 2.9, "0B2236", line="164E63", transparency=3)
    circle(slide, 10.93, 0.43, 1.45, "0C3146", line="0369A1", transparency=2)
    nodes = [(8.75, 2.05), (10.05, 1.55), (11.55, 2.18), (9.25, 3.32),
             (10.83, 3.65), (12.1, 3.02), (11.55, 4.65), (9.8, 5.15)]
    paths = [(0,1),(1,2),(0,3),(1,4),(2,5),(3,4),(4,5),(4,6),(3,7),(6,7)]
    for a, b in paths:
        x1, y1 = nodes[a]
        x2, y2 = nodes[b]
        line = slide.shapes.add_connector(1, Inches(x1 + 0.045), Inches(y1 + 0.045),
                                          Inches(x2 + 0.045), Inches(y2 + 0.045))
        line.line.color.rgb = rgb("164E63")
        line.line.width = Pt(1.2)
    for i, (x, y) in enumerate(nodes):
        circle(slide, x, y, 0.1 if i % 3 else 0.14,
               C["sky"] if i in (1, 4, 6) else "155E75")

    rect(slide, 0.72, 0.78, 0.045, 4.95, C["cyan"], rounded=False)
    text(slide, 1.02, 0.82, 6.5, 0.25, "SYSTEM DEVELOPMENT BRIEFING  ·  CONCEPT + STATUS",
         size=8.8, color=C["sky"], bold=True)
    text(slide, 1.0, 1.38, 7.5, 1.42,
         "AI CDSS Smart Card\nArchitecture & Level 10 Hospital OS",
         size=29, color=C["white"], bold=True)
    text(slide, 1.03, 3.18, 6.55, 0.9,
         "A proposed layered model for clinical inference, alert routing and sign-off governance—grounded in Aybek HMS’s current build and review status.",
         size=13.5, color="CBD5E1")
    pill(slide, 1.03, 4.35, 2.15, 0.37, "IBAK CLINICALOS · CONCEPT", "102A43", "BAE6FD", 8.2, line="164E63")
    pill(slide, 3.33, 4.35, 2.12, 0.37, "AYBEK HMS · TEN-BED", "102A43", "BAE6FD", 8.2, line="164E63")
    pill(slide, 1.03, 5.02, 3.35, 0.34, "PROPOSED ARCHITECTURE · NOT CLINICALLY CLEARED", "3B1020", "FDA4AF", 7.4, line="881337")
    text(slide, 1.03, 6.37, 6.5, 0.3,
         "717 conditions  ·  4 specialty reviews pending  ·  ISO gate merged",
         size=9.2, color="94A3B8", bold=True)
    footer(slide, 1, dark=True, note="AYBEK HMS  ·  PROPOSED ARCHITECTURE, VERIFIED REPOSITORY STATUS")
    return slide


def make_slide_2(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(slide, C["pale"])
    header(slide, "01  /  HOSPITAL OS MODEL",
           "10-Level Hospital OS Architecture",
           "A target-state map from telemetry ingestion to decision routing—not a claim that a 10-layer runtime is deployed; physician, lab and pharmacy workflows stay sectioned.", 2)

    cards = [
        {"x":0.62, "accent":C["cyan"], "tint":C["blue_pale"], "levels":"LEVELS 1–3", "title":"Data Ingestion",
         "items":[("01", "Sensor stream intake"), ("02", "Bed-matrix telemetry normalization"), ("03", "Protocol translation + provenance")],
         "tag":"INGEST  ·  NORMALIZE"},
        {"x":4.78, "accent":C["green"], "tint":C["green_pale"], "levels":"LEVELS 4–7", "title":"Clinical Inference",
         "items":[("04", "Patient + context matching"), ("05", "Clinical rule checks"), ("06", "Dose safety screening"), ("07", "Drug-interaction detection")],
         "tag":"MATCH  ·  CHECK  ·  REVIEW"},
        {"x":8.94, "accent":C["rose"], "tint":C["rose_pale"], "levels":"LEVELS 8–10", "title":"Decision Routing",
         "items":[("08", "Priority alert dispatch"), ("09", "Reactive UI rendering · proposed"), ("10", "ISO build + artifact verification")],
         "tag":"ROUTE  ·  VERIFY"},
    ]
    cw, cy, ch = 3.77, 2.14, 4.53
    for card in cards:
        x = card["x"]
        rect(slide, x, cy, cw, ch, C["white"], line=C["line"])
        rect(slide, x, cy, cw, 0.08, card["accent"], rounded=False)
        pill(slide, x + 0.24, cy + 0.31, 1.06, 0.31, card["levels"], card["tint"], card["accent"], 8.2)
        text(slide, x + 0.24, cy + 0.82, cw - 0.45, 0.45, card["title"], size=19,
             color=C["ink"], bold=True)
        for i, (level, label) in enumerate(card["items"]):
            yy = cy + 1.55 + i * 0.58
            circle(slide, x + 0.26, yy + 0.02, 0.34, card["tint"])
            text(slide, x + 0.29, yy + 0.075, 0.28, 0.15, level, size=7.2,
                 color=card["accent"], bold=True, align=PP_ALIGN.CENTER)
            text(slide, x + 0.76, yy, cw - 1.02, 0.43, label, size=10.2,
                 color=C["slate"], bold=(i == 0))
        rect(slide, x + 0.24, cy + 3.91, cw - 0.48, 0.36, "F8FAFC", line=C["line"])
        text(slide, x + 0.32, cy + 3.995, cw - 0.64, 0.15, card["tag"], size=7.6,
             color=card["accent"], bold=True, align=PP_ALIGN.CENTER)

    # Directional connectors between cards.
    for x in (4.52, 8.68):
        conn = slide.shapes.add_connector(1, Inches(x), Inches(4.28), Inches(x + 0.2), Inches(4.28))
        conn.line.color.rgb = rgb("94A3B8")
        conn.line.width = Pt(1.5)

    # Departmental workflow strip inspired by the supplied dashboard mock-up.
    # These are section boundaries, not claims of clinical approval or live data.
    sections = [
        (0.88, C["blue_pale"], C["cyan"], "DOCTOR  ·  CLINIC WORKFLOW"),
        (4.94, C["green_pale"], C["green"], "LABORATORY  ·  RESULTS WORKFLOW"),
        (9.00, C["amber_pale"], C["amber"], "PHARMACY  ·  DISPENSING WORKFLOW"),
    ]
    for sx, fill, fg, label in sections:
        pill(slide, sx, 6.77, 3.45, 0.25, label, fill, fg, 7.0)

    footer(slide, 2, note="TARGET MODEL  ·  LAYERS REQUIRE VALIDATION BEFORE IMPLEMENTATION")
    return slide


def make_slide_3(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(slide, C["white"])
    header(slide, "02  /  FRONTEND REFERENCE",
           "Smart Cards within Sectioned Workflows",
           "An Angular Signals proposal for separate physician, laboratory and pharmacy workspaces; current Aybek HMS UI is Next.js / React.", 3)

    # Left explanation column, reflecting the department boundaries in the supplied mock-up.
    blocks = [
        ("01", "Fine-grained updates", "Severity follows this alert only; the physician remains responsible for review."),
        ("02", "Separate department flows", "Physician, laboratory and pharmacy actions stay in their own sections."),
        ("03", "Latency target, not SLA", "Sub-10 ms is a benchmark goal; profile on ward hardware before making a claim."),
    ]
    for i, (n, title, body) in enumerate(blocks):
        y = 2.12 + i * 1.31
        rect(slide, 0.66, y, 4.44, 1.08, "F8FAFC", line=C["line"])
        circle(slide, 0.88, y + 0.2, 0.42, C["blue_pale"])
        text(slide, 0.89, y + 0.31, 0.4, 0.14, n, size=8.2, color=C["cyan"], bold=True,
             align=PP_ALIGN.CENTER)
        text(slide, 1.48, y + 0.19, 3.35, 0.25, title, size=11.5, color=C["ink"], bold=True)
        text(slide, 1.48, y + 0.53, 3.34, 0.42, body, size=9.2, color=C["slate"])

    # Right code hero.
    rect(slide, 5.42, 2.05, 7.25, 4.45, C["code"], line="1E293B")
    circle(slide, 5.72, 2.31, 0.1, C["rose"])
    circle(slide, 5.9, 2.31, 0.1, "F59E0B")
    circle(slide, 6.08, 2.31, 0.1, C["green"])
    text(slide, 6.33, 2.27, 3.2, 0.18, "cdss-smart-card.component.ts", size=8.2,
         color=C["code_muted"], bold=True, font=MONO)
    pill(slide, 10.85, 2.22, 1.4, 0.27, "ANGULAR · PROPOSAL", "123047", "BAE6FD", 7.0, line="164E63", font=MONO)

    code = [
        "import { Component, computed, input, signal }",
        "  from '@angular/core';",
        "",
        "@Component({ standalone: true,",
        "  selector: 'cdss-smart-card',",
        "  template: `<article [attr.data-severity]=\"severity()\">",
        "    <h3>{{ alert().title }}</h3>",
        "    <button (click)=\"snoozed.set(true)\">Snooze</button>",
        "  </article>`,",
        "})",
        "export class CdssSmartCardComponent {",
        "  readonly alert = input.required<Alert>();",
        "  readonly snoozed = signal(false);",
        "  readonly rationaleOpen = signal(false);",
        "  readonly severity = computed(() => this.alert().severity);",
        "}",
    ]
    y = 2.72
    for i, line in enumerate(code):
        # Line numbers are intentionally subtle; one textbox per line keeps spacing robust.
        text(slide, 5.73, y + i * 0.205, 0.25, 0.17, f"{i+1:02d}" if line else "",
             size=7.5, color="475569", font=MONO, align=PP_ALIGN.RIGHT)
        text(slide, 6.12, y + i * 0.205, 6.22, 0.18, line or " ",
             size=8.1, color=(C["sky"] if "computed" in line or "input.required" in line else "E2E8F0"),
             font=MONO)
    pill(slide, 0.69, 6.21, 4.39, 0.34, "CURRENT UI: NEXT.JS / REACT  ·  ANGULAR IS A PROPOSAL", C["amber_pale"], "92400E", 7.2)
    footer(slide, 3, note="TECHNICAL CONCEPT  ·  NO SUB-10MS SLA IS CURRENTLY ESTABLISHED")
    return slide


def make_slide_4(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(slide, C["pale"])
    header(slide, "03  /  GOVERNANCE & DELIVERY",
           "Clinical Governance & CI/CD Enforcement",
           "PR #11 exposed a process gap; PR #12 added a clinical-label check and a real ISO rebuild pipeline.", 4)

    y, h = 2.12, 4.55
    # Left: prior state.
    rect(slide, 0.66, y, 5.72, h, C["rose_pale"], line="FECDD3")
    pill(slide, 0.94, y + 0.29, 1.6, 0.31, "PR #11  ·  MERGED", "FFE4E6", C["rose"], 8.1)
    text(slide, 0.95, y + 0.82, 4.96, 0.4, "A review-gate gap", size=17.5, color=C["ink"], bold=True)
    dot_bullet(slide, 0.96, y + 1.48, C["rose"], "PED + OBG expanded the catalogue", "The chapters were merged before a clinical-approved label gate existed.", width=4.95, body_size=9.4)
    dot_bullet(slide, 0.96, y + 2.48, C["rose"], "No external sign-off was recorded", "Merge and passing software checks did not equal clinical approval.", width=4.95, body_size=9.4)
    pill(slide, 0.96, y + 3.75, 2.5, 0.31, "4 SPECIALTIES  ·  SIGN-OFF PENDING", "FFFFFF", "9F1239", 7.4, line="FECDD3")

    # Center bridge arrow.
    circle(slide, 6.48, 3.98, 0.38, C["white"], line=C["line"])
    text(slide, 6.49, 4.08, 0.36, 0.17, "→", size=15, color=C["cyan"], bold=True, align=PP_ALIGN.CENTER)

    # Right: current control.
    rect(slide, 6.95, y, 5.72, h, C["white"], line="BAE6FD")
    rect(slide, 6.95, y, 5.72, 0.08, C["cyan"], rounded=False)
    pill(slide, 7.23, y + 0.29, 1.6, 0.31, "PR #12  ·  MERGED", C["blue_pale"], C["cyan"], 8.1)
    text(slide, 7.24, y + 0.82, 4.96, 0.4, "A fail-closed CI check", size=17.5, color=C["ink"], bold=True)
    dot_bullet(slide, 7.25, y + 1.48, C["cyan"], "Clinical file detection + label", "Requires `clinical-approved` when a PR changes clinical source paths.", width=4.98, body_size=9.4)
    dot_bullet(slide, 7.25, y + 2.48, C["green"], "Actual release build + ISO check", "Runs `npm run release:iso` and validates ISO9660 descriptors.", width=4.98, body_size=9.4)
    pill(slide, 7.25, y + 3.75, 4.7, 0.31, "BRANCH PROTECTION MUST REQUIRE THE CHECK", C["green_pale"], "166534", 7.4)
    footer(slide, 4, note="LABEL = HUMAN ATTESTATION MARKER  ·  NOT AUTOMATED PROOF OF CLINICAL VALIDITY")
    return slide


def make_slide_5(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(slide, C["ink"])
    circle(slide, 10.4, -0.72, 3.8, "0F172A", transparency=4)
    circle(slide, 11.15, 0.1, 2.15, "0B2236", line="164E63", transparency=2)
    text(slide, 0.73, 0.55, 9.5, 0.2, "NEXT GATE  ·  BEFORE A WARD PILOT", size=8.8, color=C["sky"], bold=True)
    text(slide, 0.7, 0.98, 10.7, 0.96, "Clinical review first.\nThen a controlled ISO pilot.",
         size=28, color=C["white"], bold=True)
    text(slide, 0.73, 2.16, 10.9, 0.42,
         "Physician, lab and pharmacy workflows remain sectioned. The dashboard concept uses no live patient data; clinical release remains pending.",
         size=10.7, color="CBD5E1")

    steps = [
        ("01", "Review exact version", "Specialists inspect the commit and record findings in the review form."),
        ("02", "Approve through governance", "Apply `clinical-approved` only after genuine, documented specialist sign-off."),
        ("03", "Protect + test", "Require the CI check on `main`; rebuild ISO and validate on a test ward node."),
    ]
    x0, y, cw, gap = 0.73, 3.0, 3.88, 0.25
    for i, (n, title, body) in enumerate(steps):
        x = x0 + i * (cw + gap)
        rect(slide, x, y, cw, 1.58, "111827", line="1E293B")
        text(slide, x + 0.22, y + 0.2, 0.46, 0.25, n, size=10, color=C["sky"], bold=True, font=MONO)
        text(slide, x + 0.22, y + 0.58, cw - 0.42, 0.28, title, size=12.3, color=C["white"], bold=True)
        text(slide, x + 0.22, y + 0.98, cw - 0.44, 0.44, body, size=9.1, color="CBD5E1")

    pill(slide, 0.74, 5.05, 2.65, 0.35, "4 SPECIALTIES  ·  SIGN-OFF PENDING", "102A43", "BAE6FD", 8.1, line="164E63")
    pill(slide, 3.58, 5.05, 3.52, 0.35, "OFFLINE INSTALL NEEDS NODE.JS PRESENT", "3B1020", "FDA4AF", 7.3, line="881337")
    pill(slide, 7.31, 5.05, 3.23, 0.35, "STATUS: NOT CLINICALLY APPROVED", "3B1020", "FDA4AF", 8.1, line="881337")
    text(slide, 0.75, 6.18, 11.7, 0.3,
         "Next catalogue chapter: Surgery  ·  Keep all new clinical material marked educational until reviewed.",
         size=10.4, color="94A3B8", bold=True)
    footer(slide, 5, dark=True, note="AYBEK HMS  ·  GOVERNANCE FIRST, DEPLOYMENT SECOND")
    return slide


def main():
    prs = Presentation()
    prs.slide_width = Inches(W)
    prs.slide_height = Inches(H)
    prs.core_properties.title = "AI CDSS Smart Card Architecture & Level 10 Hospital OS"
    prs.core_properties.subject = "Proposed architecture and verified Aybek HMS governance status"
    prs.core_properties.author = "Aybek HMS project"
    prs.core_properties.keywords = "CDSS, Smart Card, Hospital OS, Aybek HMS, clinical governance, ISO"

    make_slide_1(prs)
    make_slide_2(prs)
    make_slide_3(prs)
    make_slide_4(prs)
    make_slide_5(prs)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    prs.save(OUTPUT)
    print(f"Wrote {OUTPUT} ({OUTPUT.stat().st_size / 1024:.1f} KB)")


if __name__ == "__main__":
    main()
