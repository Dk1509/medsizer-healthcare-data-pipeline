
import os
import json
import logging

import boto3
import pandas as pd
from botocore.exceptions import ClientError


BASE_DIR = "/opt/medsizer"
CONFIG_FILE = os.path.join(BASE_DIR, "config", "medsizer.conf")
INPUT_DIR = os.path.join(BASE_DIR, "input")
JSON_DIR = os.path.join(BASE_DIR, "json")
LOG_DIR = os.path.join(BASE_DIR, "logs")
STATE_FILE = os.path.join(BASE_DIR, "processed_files.json")
LOG_FILE = os.path.join(LOG_DIR, "parquet_to_json.log")


os.makedirs(INPUT_DIR, exist_ok=True)
os.makedirs(JSON_DIR, exist_ok=True)
os.makedirs(LOG_DIR, exist_ok=True)


def load_config():
    config = {}

    if not os.path.exists(CONFIG_FILE):
        raise FileNotFoundError(
            f"Configuration file not found: {CONFIG_FILE}"
        )

    with open(CONFIG_FILE, "r") as file:
        for line in file:
            line = line.strip()

            if not line or line.startswith("#"):
                continue

            if "=" in line:
                key, value = line.split("=", 1)
                config[key.strip()] = value.strip()

    if "S3_BUCKET" not in config:
        raise ValueError("S3_BUCKET is missing from configuration")

    if "S3_PREFIX" not in config:
        raise ValueError("S3_PREFIX is missing from configuration")

    return config


logging.basicConfig(
    filename=LOG_FILE,
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger(__name__)

config = load_config()

S3_BUCKET = config["S3_BUCKET"]
S3_PREFIX = config["S3_PREFIX"]

s3 = boto3.client("s3")


def load_processed_files():
    if not os.path.exists(STATE_FILE):
        return {}

    try:
        with open(STATE_FILE, "r") as file:
            return json.load(file)
    except Exception as e:
        logger.error("Unable to read state file: %s", e)
        return {}


def save_processed_files(processed_files):
    temp_file = STATE_FILE + ".tmp"

    with open(temp_file, "w") as file:
        json.dump(processed_files, file, indent=2)

    os.replace(temp_file, STATE_FILE)


def get_parquet_files():
    parquet_files = []

    paginator = s3.get_paginator("list_objects_v2")

    pages = paginator.paginate(
        Bucket=S3_BUCKET,
        Prefix=S3_PREFIX
    )

    for page in pages:
        for obj in page.get("Contents", []):
            key = obj["Key"]

            if not key.lower().endswith(".parquet"):
                continue

            parquet_files.append({
                "key": key,
                "etag": obj.get("ETag", "").replace('"', ""),
                "size": obj.get("Size", 0)
            })

    return parquet_files


def download_file(s3_key):
    filename = os.path.basename(s3_key)

    local_file = os.path.join(
        INPUT_DIR,
        filename
    )

    logger.info("Downloading %s", s3_key)

    s3.download_file(
        S3_BUCKET,
        s3_key,
        local_file
    )

    logger.info("Downloaded %s", local_file)

    return local_file


def convert_to_json(parquet_file):
    filename = os.path.basename(parquet_file)

    json_filename = (
        os.path.splitext(filename)[0] + ".json"
    )

    json_file = os.path.join(
        JSON_DIR,
        json_filename
    )

    temp_json = json_file + ".tmp"

    logger.info("Reading %s", parquet_file)

    df = pd.read_parquet(parquet_file)

    logger.info("Records: %s", len(df))
    logger.info("Columns: %s", list(df.columns))

    df.to_json(
        temp_json,
        orient="records",
        indent=2,
        date_format="iso"
    )

    os.replace(
        temp_json,
        json_file
    )

    logger.info("Created %s", json_file)

    return json_file


def process_file(file_info, processed_files):
    s3_key = file_info["key"]

    signature = (
        file_info["etag"] + "_" +
        str(file_info["size"])
    )

    if s3_key in processed_files:
        if processed_files[s3_key] == signature:
            logger.info("Already processed: %s", s3_key)
            return

    logger.info("Processing: %s", s3_key)

    try:
        parquet_file = download_file(s3_key)

        json_file = convert_to_json(parquet_file)

        processed_files[s3_key] = signature
        save_processed_files(processed_files)

        logger.info(
            "Successfully processed %s -> %s",
            s3_key,
            json_file
        )

        print(
            f"Processed: {s3_key} -> {json_file}"
        )

    except Exception as e:
        logger.exception(
            "Failed to process %s: %s",
            s3_key,
            e
        )

        print(
            f"ERROR processing {s3_key}: {e}"
        )


def main():
    logger.info("MEDSIZER processing started")

    try:
        processed_files = load_processed_files()

        files = get_parquet_files()

        logger.info(
            "Found %s Parquet file(s)",
            len(files)
        )

        print(
            f"Found {len(files)} Parquet file(s)"
        )

        for file_info in files:
            process_file(
                file_info,
                processed_files
            )

    except ClientError as e:
        logger.exception("S3 error: %s", e)
        print(f"S3 ERROR: {e}")

    except Exception as e:
        logger.exception("Unexpected error: %s", e)
        print(f"ERROR: {e}")

    logger.info("MEDSIZER processing finished")


if __name__ == "__main__":
    main()
