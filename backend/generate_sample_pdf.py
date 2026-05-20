"""Generate a realistic Thyrocare-style blood work PDF for testing."""

import os
from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

OUTPUT_DIR = Path(__file__).resolve().parent.parent / "sample-data"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_PATH = OUTPUT_DIR / "sample_bloodwork.pdf"

BIOMARKERS = [
    # (Name, Value, Unit, Ref Low, Ref High)
    # IRON PANEL
    ("Ferritin", 42.0, "ng/mL", 20.0, 250.0),             # suboptimal male
    ("Serum Iron", 85.0, "mcg/dL", 65.0, 175.0),           # suboptimal male
    ("TIBC", 380.0, "mcg/dL", 250.0, 400.0),               # suboptimal
    ("Transferrin Saturation", 22.0, "%", 20.0, 50.0),      # suboptimal

    # VITAMINS
    ("Vitamin D, 25-Hydroxy", 35.0, "ng/mL", 30.0, 100.0), # suboptimal
    ("Vitamin B12", 620.0, "pg/mL", 200.0, 900.0),          # optimal
    ("Folate, Serum", 12.5, "ng/mL", 3.0, 20.0),            # optimal
    ("Vitamin B6", 18.0, "ng/mL", 5.0, 50.0),               # optimal

    # LIPIDS
    ("Total Cholesterol", 195.0, "mg/dL", 0.0, 200.0),      # optimal
    ("LDL Cholesterol", 128.0, "mg/dL", 0.0, 130.0),        # suboptimal
    ("HDL Cholesterol", 52.0, "mg/dL", 40.0, 100.0),        # suboptimal male
    ("Triglycerides", 115.0, "mg/dL", 0.0, 150.0),          # suboptimal
    ("VLDL Cholesterol", 23.0, "mg/dL", 5.0, 40.0),         # optimal
    ("Cholesterol/HDL Ratio", 3.75, "ratio", 0.0, 5.0),     # suboptimal

    # THYROID
    ("TSH", 5.8, "mIU/L", 0.4, 4.5),                        # out_of_range
    ("Free T3", 2.8, "pg/mL", 2.0, 4.4),                    # suboptimal
    ("Free T4", 1.1, "ng/dL", 0.8, 1.8),                    # suboptimal
    ("T3, Total", 110.0, "ng/dL", 80.0, 200.0),             # optimal
    ("T4, Total", 7.5, "mcg/dL", 4.5, 12.0),                # optimal

    # LIVER
    ("ALT (SGPT)", 28.0, "U/L", 7.0, 56.0),                 # optimal
    ("AST (SGOT)", 24.0, "U/L", 10.0, 40.0),                # optimal
    ("Alkaline Phosphatase", 72.0, "U/L", 44.0, 147.0),     # optimal
    ("GGT (Gamma GT)", 22.0, "U/L", 8.0, 61.0),             # optimal
    ("Bilirubin, Total", 0.8, "mg/dL", 0.1, 1.2),           # optimal
    ("Albumin", 4.5, "g/dL", 3.5, 5.5),                     # optimal

    # KIDNEY
    ("Creatinine", 1.0, "mg/dL", 0.7, 1.3),                 # optimal
    ("Blood Urea Nitrogen", 14.0, "mg/dL", 7.0, 20.0),      # optimal
    ("Estimated GFR", 98.0, "mL/min/1.73m2", 60.0, 120.0),  # optimal
    ("Uric Acid", 6.8, "mg/dL", 3.5, 7.2),                  # suboptimal

    # METABOLIC
    ("Glucose, Fasting", 95.0, "mg/dL", 70.0, 100.0),       # suboptimal
    ("HbA1c", 5.5, "% ", 4.0, 5.7),                         # suboptimal
    ("Insulin, Fasting", 12.5, "uIU/mL", 2.6, 25.0),        # suboptimal

    # BLOOD COUNT
    ("Hemoglobin", 15.2, "g/dL", 13.0, 17.0),               # optimal
    ("RBC", 5.1, "million/uL", 4.5, 5.5),                   # optimal
    ("WBC", 6.8, "thousand/uL", 4.0, 11.0),                 # optimal
    ("Platelet Count", 245.0, "thousand/uL", 150.0, 400.0),  # optimal

    # INFLAMMATION
    ("hs-CRP", 2.4, "mg/L", 0.0, 3.0),                     # suboptimal
    ("Homocysteine", 12.4, "umol/L", 5.0, 15.0),            # suboptimal
    ("ESR", 8.0, "mm/hr", 0.0, 15.0),                       # optimal
]


def build_pdf():
    doc = SimpleDocTemplate(
        str(OUTPUT_PATH),
        pagesize=A4,
        leftMargin=15 * mm,
        rightMargin=15 * mm,
        topMargin=15 * mm,
        bottomMargin=15 * mm,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("LabTitle", parent=styles["Heading1"], fontSize=18,
                                 textColor=colors.HexColor("#1a365d"), spaceAfter=4)
    subtitle_style = ParagraphStyle("Subtitle", parent=styles["Normal"], fontSize=10,
                                    textColor=colors.grey, spaceAfter=10)
    section_style = ParagraphStyle("Section", parent=styles["Heading2"], fontSize=12,
                                   textColor=colors.HexColor("#2d3748"), spaceBefore=12, spaceAfter=6)

    elements = []

    elements.append(Paragraph("Thyrocare Technologies Ltd.", title_style))
    elements.append(Paragraph("NABL Accredited | CAP Certified | ISO 9001:2015", subtitle_style))
    elements.append(Spacer(1, 4 * mm))

    patient_data = [
        ["Patient Name:", "Rahul Sharma", "Report ID:", "TC-2026-041578"],
        ["Age / Sex:", "32 / Male", "Report Date:", "15/04/2026"],
        ["Ref. By:", "Self", "Collection Date:", "14/04/2026"],
    ]
    patient_table = Table(patient_data, colWidths=[80, 160, 80, 160])
    patient_table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    elements.append(patient_table)
    elements.append(Spacer(1, 6 * mm))

    current_category = None
    categories = {
        "iron": "IRON PANEL",
        "vitamins": "VITAMINS",
        "lipids": "LIPID PROFILE",
        "thyroid": "THYROID FUNCTION",
        "liver": "LIVER FUNCTION",
        "kidney": "KIDNEY FUNCTION",
        "metabolic": "METABOLIC PANEL",
        "blood_count": "COMPLETE BLOOD COUNT",
        "inflammation": "INFLAMMATION MARKERS",
    }

    category_map = {
        0: "iron", 4: "vitamins", 8: "lipids", 14: "thyroid",
        19: "liver", 25: "kidney", 29: "metabolic", 32: "blood_count", 36: "inflammation",
    }

    header = ["Test Name", "Result", "Unit", "Reference Range"]

    for idx, (name, value, unit, ref_low, ref_high) in enumerate(BIOMARKERS):
        if idx in category_map:
            cat_key = category_map[idx]
            if current_category != cat_key:
                current_category = cat_key
                elements.append(Paragraph(categories[cat_key], section_style))

                tbl_header = Table([header], colWidths=[180, 80, 80, 140])
                tbl_header.setStyle(TableStyle([
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#edf2f7")),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, 0), 9),
                    ("BOTTOMPADDING", (0, 0), (-1, 0), 4),
                    ("TOPPADDING", (0, 0), (-1, 0), 4),
                    ("LINEBELOW", (0, 0), (-1, 0), 1, colors.HexColor("#cbd5e0")),
                ]))
                elements.append(tbl_header)

        val_str = f"{value:.1f}" if value != int(value) else f"{value:.1f}"
        ref_str = f"{ref_low:.1f} - {ref_high:.1f}"

        row_data = [[name, val_str, unit, ref_str]]
        row_table = Table(row_data, colWidths=[180, 80, 80, 140])

        row_style = [
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("LINEBELOW", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ]

        is_out = value < ref_low or value > ref_high
        if is_out:
            row_style.append(("TEXTCOLOR", (1, 0), (1, 0), colors.red))
            row_style.append(("FONTNAME", (1, 0), (1, 0), "Helvetica-Bold"))

        row_table.setStyle(TableStyle(row_style))
        elements.append(row_table)

    elements.append(Spacer(1, 10 * mm))
    disclaimer = Paragraph(
        "<i>This report is for informational purposes only. Please consult your healthcare "
        "provider for medical advice. Results may vary based on methodology and sample conditions.</i>",
        ParagraphStyle("Disclaimer", parent=styles["Normal"], fontSize=8, textColor=colors.grey),
    )
    elements.append(disclaimer)

    doc.build(elements)
    print(f"Sample PDF generated: {OUTPUT_PATH}")


if __name__ == "__main__":
    build_pdf()
