"""Generate sample wearable data files for testing: Apple Health XML, Whoop CSV, Garmin CSV."""

import csv
import random
from datetime import datetime, timedelta
from pathlib import Path
from xml.etree.ElementTree import Element, SubElement, ElementTree

OUTPUT_DIR = Path(__file__).resolve().parent.parent / "sample-data"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

START_DATE = datetime(2026, 4, 16)
DAYS = 30
random.seed(42)


def _date_str(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%d")


def _apple_ts(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%d %H:%M:%S -0500")


def generate_apple_health_xml():
    root = Element("HealthData", locale="en_US")

    for day_offset in range(DAYS):
        day = START_DATE + timedelta(days=day_offset)
        day_str = _date_str(day)

        morning = day.replace(hour=7, minute=0)
        noon = day.replace(hour=12, minute=0)
        evening = day.replace(hour=18, minute=0)

        resting_hr = round(random.uniform(58, 65), 1)
        SubElement(root, "Record",
                   type="HKQuantityTypeIdentifierRestingHeartRate",
                   startDate=_apple_ts(morning),
                   endDate=_apple_ts(morning + timedelta(minutes=1)),
                   value=str(resting_hr))

        hrv = round(random.uniform(35, 55), 1)
        SubElement(root, "Record",
                   type="HKQuantityTypeIdentifierHeartRateVariabilitySDNN",
                   startDate=_apple_ts(morning),
                   endDate=_apple_ts(morning + timedelta(minutes=1)),
                   value=str(hrv))

        for hour_offset in range(0, 14, 2):
            chunk_steps = random.randint(300, 1800)
            t = morning + timedelta(hours=hour_offset)
            SubElement(root, "Record",
                       type="HKQuantityTypeIdentifierStepCount",
                       startDate=_apple_ts(t),
                       endDate=_apple_ts(t + timedelta(hours=2)),
                       value=str(chunk_steps))

        for hour_offset in range(0, 14, 3):
            chunk_cal = round(random.uniform(30, 80), 1)
            t = morning + timedelta(hours=hour_offset)
            SubElement(root, "Record",
                       type="HKQuantityTypeIdentifierActiveEnergyBurned",
                       startDate=_apple_ts(t),
                       endDate=_apple_ts(t + timedelta(hours=3)),
                       value=str(chunk_cal))

        sleep_start = day.replace(hour=23, minute=random.randint(0, 30))
        total_sleep_min = random.randint(360, 480)
        segments = [
            ("HKCategoryValueSleepAnalysisAsleepCore", 0.4),
            ("HKCategoryValueSleepAnalysisAsleepDeep", 0.2),
            ("HKCategoryValueSleepAnalysisAsleepREM", 0.25),
            ("HKCategoryValueSleepAnalysisAsleepUnspecified", 0.15),
        ]
        cursor = sleep_start
        for sleep_val, fraction in segments:
            seg_min = int(total_sleep_min * fraction)
            seg_end = cursor + timedelta(minutes=seg_min)
            SubElement(root, "Record",
                       type="HKCategoryTypeIdentifierSleepAnalysis",
                       startDate=_apple_ts(cursor),
                       endDate=_apple_ts(seg_end),
                       value=sleep_val)
            cursor = seg_end

        weight = round(76.0 + random.uniform(-0.5, 0.5) + day_offset * -0.01, 1)
        SubElement(root, "Record",
                   type="HKQuantityTypeIdentifierBodyMass",
                   startDate=_apple_ts(morning),
                   endDate=_apple_ts(morning + timedelta(minutes=1)),
                   value=str(weight))

        body_fat = round(random.uniform(18.0, 19.0), 1)
        SubElement(root, "Record",
                   type="HKQuantityTypeIdentifierBodyFatPercentage",
                   startDate=_apple_ts(morning),
                   endDate=_apple_ts(morning + timedelta(minutes=1)),
                   value=str(body_fat / 100))

        vo2 = round(random.uniform(42, 44), 1)
        SubElement(root, "Record",
                   type="HKQuantityTypeIdentifierVO2Max",
                   startDate=_apple_ts(noon),
                   endDate=_apple_ts(noon + timedelta(minutes=1)),
                   value=str(vo2))

        resp = round(random.uniform(14, 18), 1)
        SubElement(root, "Record",
                   type="HKQuantityTypeIdentifierRespiratoryRate",
                   startDate=_apple_ts(morning),
                   endDate=_apple_ts(morning + timedelta(minutes=1)),
                   value=str(resp))

        spo2 = round(random.uniform(96, 99), 1)
        SubElement(root, "Record",
                   type="HKQuantityTypeIdentifierOxygenSaturation",
                   startDate=_apple_ts(morning),
                   endDate=_apple_ts(morning + timedelta(minutes=1)),
                   value=str(spo2 / 100))

        workout_min = random.choice([0, 0, 30, 45, 60, 75, 90])
        if workout_min > 0:
            SubElement(root, "Record",
                       type="HKQuantityTypeIdentifierAppleExerciseTime",
                       startDate=_apple_ts(evening),
                       endDate=_apple_ts(evening + timedelta(minutes=workout_min)),
                       value=str(workout_min))

    tree = ElementTree(root)
    path = OUTPUT_DIR / "sample_apple_health.xml"
    tree.write(str(path), encoding="unicode", xml_declaration=True)
    print(f"Apple Health XML: {path}")


def generate_whoop_csv():
    path = OUTPUT_DIR / "sample_whoop.csv"
    with open(path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["Date", "Recovery Score", "HRV (ms)", "Resting HR",
                         "Sleep Hours", "Sleep Quality", "Strain", "Calories"])

        for day_offset in range(DAYS):
            day = START_DATE + timedelta(days=day_offset)
            writer.writerow([
                _date_str(day),
                random.randint(35, 95),
                round(random.uniform(35, 55), 1),
                random.randint(55, 68),
                round(random.uniform(6.0, 8.5), 1),
                random.randint(50, 95),
                round(random.uniform(5.0, 18.0), 1),
                random.randint(1800, 3200),
            ])
    print(f"Whoop CSV: {path}")


def generate_garmin_csv():
    path = OUTPUT_DIR / "sample_garmin.csv"
    with open(path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["Date", "Steps", "Resting HR", "Sleep Hours",
                         "Active Calories", "Active Minutes", "Weight", "Body Fat"])

        for day_offset in range(DAYS):
            day = START_DATE + timedelta(days=day_offset)
            weight = round(76.5 + random.uniform(-0.5, 0.5) + day_offset * -0.01, 1)
            writer.writerow([
                _date_str(day),
                random.randint(5000, 15000),
                random.randint(56, 66),
                round(random.uniform(6.0, 8.5), 1),
                random.randint(200, 650),
                random.randint(0, 90),
                weight,
                round(random.uniform(17.5, 19.5), 1),
            ])
    print(f"Garmin CSV: {path}")


if __name__ == "__main__":
    generate_apple_health_xml()
    generate_whoop_csv()
    generate_garmin_csv()
    print("All sample wearable data generated.")
