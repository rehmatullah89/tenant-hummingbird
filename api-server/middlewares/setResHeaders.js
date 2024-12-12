module.exports = function (req, res, next) {
    res.header("Access-Control-Allow-Origin", req.headers.origin);
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PATCH,PUT,DELETE");
    res.header('Access-Control-Expose-Headers', 'Content-Length');
    res.header("Access-Control-Allow-Headers", "Access-Control-Allow-Origin, Origin, Referrer-Policy, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Range");
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    return next();
}