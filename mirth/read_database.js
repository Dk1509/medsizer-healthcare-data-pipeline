var dbConn = null;
var rs = null;

var outputArray = [];

try {

    var dbUrl = configurationMap.get('MEDSIZER_DB_URL');
    var dbUser = configurationMap.get('MEDSIZER_DB_USER');
    var dbPassword = configurationMap.get('MEDSIZER_DB_PASSWORD');

    if (!dbUrl || !dbUser || !dbPassword) {
        throw new Error("MEDSIZER database configuration is missing");
    }

    logger.info("Connecting to MEDSIZER SQL Server");

    dbConn = DatabaseConnectionFactory.createDatabaseConnection(
        'com.microsoft.sqlserver.jdbc.SQLServerDriver',
        dbUrl,
        dbUser,
        dbPassword
    );

    logger.info("MEDSIZER SQL Server connection successful");

    var sql =
        "SELECT " +
        "SyntheticPatientID AS subject_id, " +
        "EventDateTimeShifted AS time, " +
        "CONCAT(CodeType, '//', Code) AS code, " +
        "CASE " +
        "WHEN Domain = 'PROCEDURE' THEN Quantity " +
        "WHEN Domain = 'MEDICATION' THEN MedicationDose " +
        "ELSE NULL " +
        "END AS numeric_value, " +
        "CodeDescription AS text_value " +
        "FROM dbo.patient_medsizer_test";

    logger.info("Executing MEDS query");

    rs = dbConn.executeCachedQuery(sql);

    var medsArray = [];

    while (rs.next()) {
        medsArray.push({
            subject_id: rs.getString("subject_id"),
            time: rs.getString("time"),
            code: rs.getString("code"),
            numeric_value: rs.getString("numeric_value"),
            text_value: rs.getString("text_value")
        });
    }

    logger.info("MEDS records retrieved: " + medsArray.length);

    var jsonOutput = JSON.stringify(medsArray);

    logger.info("MEDS JSON created successfully");

    globalChannelMap.put(
        "MEDS_JSON",
        jsonOutput
    );

} catch (e) {

    logger.error(
        "MEDS SQL Server query failed: " + e
    );

    throw e;

} finally {

    if (rs) {
        rs.close();
    }

    if (dbConn) {
        dbConn.close();
        logger.info("MEDS SQL Server connection closed");
    }
}

return true;
