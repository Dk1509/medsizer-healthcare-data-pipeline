import json
import boto3
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq
import tempfile
import os
from urllib.parse import unquote_plus

s3 = boto3.client("s3")


def lambda_handler(event, context):

    print("EVENT:", event)

    try:
        for record in event["Records"]:

            bucket = record["s3"]["bucket"]["name"]
            key = unquote_plus(record["s3"]["object"]["key"])

            print("Processing:", bucket, key)

            response = s3.get_object(
                Bucket=bucket,
                Key=key
            )

            body = response["Body"].read().decode("utf-8")
            data = json.loads(body)

            print("JSON loaded")

            df = pd.DataFrame(data)
            print("DataFrame created:", df.shape)

            table = pa.Table.from_pandas(df)
            print("Arrow table created")

            parquet_key = key.replace(
                "canonical/meds-json/",
                "processed/meds-parquet/"
            ).replace(".json", ".parquet")

            with tempfile.NamedTemporaryFile(
                delete=False,
                suffix=".parquet"
            ) as temp:

                pq.write_table(
                    table,
                    temp.name,
                    compression="snappy"
                )

                print("Parquet written locally:", temp.name)

                s3.upload_file(
                    temp.name,
                    bucket,
                    parquet_key
                )

                print("Uploaded:", parquet_key)

            os.remove(temp.name)

        return {
            "statusCode": 200
        }

    except Exception as e:
        print("ERROR:", str(e))
        raise e

