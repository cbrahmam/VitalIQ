import os
import sqlite3
from uuid import uuid4

from fastapi import APIRouter, Depends, UploadFile, File, Query

from config import UPLOAD_DIR
from database import get_db_connection
from models.db_models import (
    get_latest_wearable_date,
    insert_wearable_batch,
    get_wearable_latest,
    get_wearable_daily,
    get_wearable_range,
    get_sync_status,
)
from services.apple_health import parse_apple_health_export
from services.whoop_parser import parse_whoop_csv
from services.garmin_parser import parse_garmin_csv

router = APIRouter(prefix="/api/wearables", tags=["wearables"])


def _upload_and_parse(file: UploadFile, source: str, parser_fn, conn, ext: str):
    save_name = f"{uuid4().hex}_{file.filename}"
    save_path = os.path.join(UPLOAD_DIR, save_name)
    with open(save_path, "wb") as f:
        f.write(file.file.read())

    since_date = get_latest_wearable_date(conn, source)

    if source == "apple_health":
        data_points = parser_fn(save_path, since_date=since_date)
    else:
        data_points = parser_fn(save_path)
        if since_date:
            data_points = [dp for dp in data_points if dp["date"] > since_date]

    if not data_points:
        return {
            "source": source,
            "records_imported": 0,
            "records_skipped": 0,
            "date_range": {"start": None, "end": None},
            "metrics_found": [],
        }

    imported, skipped = insert_wearable_batch(conn, data_points)

    dates = [dp["date"] for dp in data_points]
    metrics = sorted(set(dp["metric_type"] for dp in data_points))

    return {
        "source": source,
        "records_imported": imported,
        "records_skipped": skipped,
        "date_range": {"start": min(dates), "end": max(dates)},
        "metrics_found": metrics,
    }


@router.post("/apple-health")
def upload_apple_health(file: UploadFile = File(...),
                        conn: sqlite3.Connection = Depends(get_db_connection)):
    return _upload_and_parse(file, "apple_health", parse_apple_health_export, conn, ".xml")


@router.post("/whoop")
def upload_whoop(file: UploadFile = File(...),
                 conn: sqlite3.Connection = Depends(get_db_connection)):
    return _upload_and_parse(file, "whoop", parse_whoop_csv, conn, ".csv")


@router.post("/garmin")
def upload_garmin(file: UploadFile = File(...),
                  conn: sqlite3.Connection = Depends(get_db_connection)):
    return _upload_and_parse(file, "garmin", parse_garmin_csv, conn, ".csv")


@router.get("/latest")
def latest_metrics(conn: sqlite3.Connection = Depends(get_db_connection)):
    return get_wearable_latest(conn)


@router.get("/daily/{date}")
def daily_metrics(date: str, conn: sqlite3.Connection = Depends(get_db_connection)):
    return get_wearable_daily(conn, date)


@router.get("/range")
def metric_range(metric: str = Query(...), start: str = Query(...), end: str = Query(...),
                 conn: sqlite3.Connection = Depends(get_db_connection)):
    return get_wearable_range(conn, metric, start, end)


@router.get("/sync-status")
def sync_status(conn: sqlite3.Connection = Depends(get_db_connection)):
    return get_sync_status(conn)
