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


Project Flow
1. Raw Healthcare Data

Healthcare data is received as Parquet files and stored in AWS S3.

The data can contain information related to:

Patients
Encounters
Diagnoses
Procedures
Lab Results
Medications
2. Parquet to JSON

An EC2-based Python process reads the Parquet files from S3 and converts them into JSON files.

S3 Parquet
    ↓
Python
    ↓
JSON
3. JSON to Database

Mirth Connect reads the JSON files and processes the records.

The data is inserted into the SQL Server table:

dbo.patient_medsizer_test
JSON
 ↓
Mirth Connect
 ↓
SQL Server
4. Database to MEDS

Mirth Connect reads the healthcare data from the database and maps it into the MEDS structure.

The main MEDS fields are:

subject_id
time
code
numeric_value
text_value

The mapping includes:

SyntheticPatientID    → subject_id
EventDateTimeShifted  → time
CodeType + Code       → code
Quantity / Dose       → numeric_value
CodeDescription       → text_value

This creates a standardized representation of healthcare events.

5. MEDS JSON to S3

The generated MEDS JSON is stored in AWS S3 under:

canonical/meds-json/

The files are organized by date:

year=YYYY/
month=MM/
day=DD/
6. Automatic JSON to Parquet Processing

When the MEDS JSON is available in S3, AWS Lambda processes the file.

The Lambda:

Reads the JSON from S3
Loads the healthcare records
Converts the data into a structured table
Converts the data into Parquet
Uploads the processed Parquet back to S3
