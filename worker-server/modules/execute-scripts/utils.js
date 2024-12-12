module.exports = {
    formateQueriesArray(queries = []) {
        let formatted_queries_string = [];
        if (queries.length > 0) {
            formatted_queries_string = queries.map(query => query.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\r/g, '\r')).join(';\n\n');
        }
        return formatted_queries_string;

    },
    isDDLorDMLQuery(query){
        if(!query || query === '') return false;
        const MYSQL_DDL_KEYWORDS = ['RENAME ', 'TRUNCATE ', 'DROP ', 'ALTER ', 'CREATE ', 'DELETE ', 'UPDATE ', 'INSERT '];
        return MYSQL_DDL_KEYWORDS.some(keyword => query.toUpperCase().includes(keyword))
    },
}