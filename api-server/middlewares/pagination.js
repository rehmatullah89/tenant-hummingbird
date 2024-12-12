const _DEFAULTS = {
    offset: 0,
    limit: 20,
    max_limit: 100
}

const _parseInt = (val) =>{
    let _pInt = parseInt(val);
    return isNaN(_pInt) ? null: _pInt;
}

/**
 * offset pagination can identify following pagination identifiers
 * < limit, offset, count, page>
 * and transform them to limit and offset values for offset pagination
 * transformed values are available under req.pagination {limit, offset}
 * user has the freedom to use the identifiers in following combo
 * (limit, page)  (limit, offset)  (page, count) (count, offset)
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
exports.offsetPaginate = (req, res, next) => {

    let _limit;
    let _offset;

    let { limit, offset, page, count } = req.query;

    let pLimit = _parseInt(limit);
    let pOffset = _parseInt(offset);
    let pCount = _parseInt(count);
    let pPage = _parseInt(page);

    _limit = pLimit || pCount || _DEFAULTS.limit;

    _limit = (_limit > _DEFAULTS.max_limit) ? _DEFAULTS.max_limit : _limit;

    _offset = pOffset ? pOffset: (pPage ? ((pPage - 1) * _limit) : _DEFAULTS.offset)

    req.pagination = { limit: _limit, offset: _offset };

    next();
}

/**
 * Cursor pagination should be able to transform the cursor and limit identifiers and should be made available under
 * req.pagination
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
exports.cursorPagination = (req, res, next) => {
    // TODO
}