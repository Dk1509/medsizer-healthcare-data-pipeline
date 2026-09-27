# medsizer-healthcare-data-pipeline
End-to-end healthcare data pipeline for transforming hospital data into standardized MEDS format using Mirth Connect, SQL Server, AWS S3, EC2, and Lambda.

# MEDSizer Healthcare Data Pipeline

An end-to-end healthcare data pipeline that converts incoming healthcare data into a standardized MEDS format and prepares it for downstream analytics.

## End-to-End Flow

```text
AWS S3
Raw Parquet Files
        ↓
EC2 + Python
Parquet → JSON
        ↓
Mirth Connect
JSON → SQL Server
        ↓
SQL Server
patient_medsizer_test
        ↓
Mirth Connect
Database → MEDS JSON
        ↓
AWS S3
canonical/meds-json/
        ↓
AWS Lambda
JSON → Parquet
        ↓
AWS S3
processed/meds-parquet/
