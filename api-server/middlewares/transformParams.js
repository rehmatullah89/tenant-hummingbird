/**
 * Maps a collection of params to be included in body on array type.
 * Used for combining bulk and single edit endpoints
 * 
 * @param {Object} mapping key-value pair showing { [param]: [key name to be injected on body] }
 * @example setArrayFieldFromUrlParam({ 'lease_id': 'leases' })
 * @returns {Number} Returns a middleware
 */
exports.setArrayFieldFromUrlParam = (mapping) => {
    return (req, res, next) => {
        let reqBody = req.body || {}

        for (const [ key, value ] of Object.entries(mapping)) {
            let parameter = req.params[key]
            if(!!parameter) reqBody[value] = Array(parameter)
        }

        req.body = reqBody

        next()
    }
}