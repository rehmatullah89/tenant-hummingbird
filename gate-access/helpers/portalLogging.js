module.exports = {
    setLogs(logs, reqObj, transaction = null, type = null) {
        logs = logs || null;
        let logsObject = {
            type: type,
            'transaction': transaction,
            'gate_portal_logs': logs,
            'reqObj': reqObj,
            'component': 'HB_GATE_ACCESS_GATE_PORTAL'
        };
        return JSON.stringify(logsObject);
    }
        
}