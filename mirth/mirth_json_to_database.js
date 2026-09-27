var records = JSON.parse(connectorMessage.getRawData());
var dbConn = null;

try {

    var dbUrl = configurationMap.get('MEDSIZER_DB_URL');
    var dbUser = configurationMap.get('MEDSIZER_DB_USER');
    var dbPassword = configurationMap.get('MEDSIZER_DB_PASSWORD');

    if (!dbUrl || !dbUser || !dbPassword) {
        throw new Error("MEDSIZER database configuration is missing");
    }

    logger.info("Records received: " + records.length);
    logger.info("Connecting to MEDSizer SQL Server");

    dbConn = DatabaseConnectionFactory.createDatabaseConnection(
        'com.microsoft.sqlserver.jdbc.SQLServerDriver',
        dbUrl,
        dbUser,
        dbPassword
    );

    logger.info("Connected to MEDSizer SQL Server successfully");

    for (var i = 0; i < records.length; i++) {

        var r = records[i];

        var sql =
            "INSERT INTO dbo.patient_medsizer_test (" +
            "Domain, RecordType, SyntheticPatientID, SyntheticEncounterID, " +
            "SourceID, FacilityID, EncounterClass, RegistrationTypeID, " +
            "RegistrationTypeName, LocationID, LocationName, AgeAtEncounter, " +
            "Sex, EncounterStartDateTimeShifted, EncounterEndDateTimeShifted, " +
            "EventDateTimeShifted, CodeType, Code, CodeDescription, " +
            "MedicationDose, MedicationRoute, MedicationFrequency, " +
            "Quantity, Status, SourceTable" +
            ") VALUES (" +
            sqlValue(r.Domain) + "," +
            sqlValue(r.RecordType) + "," +
            sqlValue(r.SyntheticPatientID) + "," +
            sqlValue(r.SyntheticEncounterID) + "," +
            sqlValue(r.SourceID) + "," +
            sqlValue(r.FacilityID) + "," +
            sqlValue(r.EncounterClass) + "," +
            sqlValue(r.RegistrationTypeID) + "," +
            sqlValue(r.RegistrationTypeName) + "," +
            sqlValue(r.LocationID) + "," +
            sqlValue(r.LocationName) + "," +
            sqlInteger(r.AgeAtEncounter) + "," +
            sqlValue(r.Sex) + "," +
            sqlDateTime(r.EncounterStartDateTimeShifted) + "," +
            sqlDateTime(r.EncounterEndDateTimeShifted) + "," +
            sqlDateTime(r.EventDateTimeShifted) + "," +
            sqlValue(r.CodeType) + "," +
            sqlValue(r.Code) + "," +
            sqlValue(r.CodeDescription) + "," +
            sqlDecimal(r.MedicationDose) + "," +
            sqlValue(r.MedicationRoute) + "," +
            sqlValue(r.MedicationFrequency) + "," +
            sqlDecimal(r.Quantity) + "," +
            sqlValue(r.Status) + "," +
            sqlValue(r.SourceTable) +
            ")";

        dbConn.executeUpdate(sql);

        if ((i + 1) % 100 == 0) {
            logger.info(
                "Inserted " + (i + 1) +
                " of " + records.length + " records"
            );
        }
    }

    logger.info(
        "Successfully inserted " +
        records.length +
        " records into dbo.patient_medsizer_test"
    );

} catch (e) {

    logger.error(
        "MEDSizer SQL Server insert failed: " + e
    );

    channelMap.put(
        "ERROR_MESSAGE",
        e.toString()
    );

    throw e;

} finally {

    if (dbConn) {
        dbConn.close();
        logger.info("MEDSizer SQL Server connection closed");
    }
}

function sqlValue(value) {

    if (value === null || value === undefined || value === "") {
        return "NULL";
    }

    return "'" +
        String(value).replace(/'/g, "''") +
        "'";
}

function sqlInteger(value) {

    if (value === null || value === undefined || value === "") {
        return "NULL";
    }

    var number = Number(value);

    if (isNaN(number)) {
        return "NULL";
    }

    return String(Math.trunc(number));
}

function sqlDecimal(value) {

    if (value === null || value === undefined || value === "") {
        return "NULL";
    }

    var number = Number(value);

    if (isNaN(number)) {
        return "NULL";
    }

    return number.toFixed(2);
}

function sqlDateTime(value) {

    if (value === null || value === undefined || value === "") {
        return "NULL";
    }

    var dateString = String(value);

    if (dateString.indexOf("T") !== -1) {
        dateString = dateString.replace("T", " ");
    }

    if (dateString.endsWith("Z")) {
        dateString = dateString.substring(0, dateString.length - 1);
    }

    if (dateString.indexOf(".") !== -1) {
        dateString = dateString.split(".")[0];
    }

    return "'" +
        dateString.replace(/'/g, "''") +
        "'";
}

