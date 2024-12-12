module.exports = {
    get: function(req, res, next){

        req.session.Flash = req.session.Flash || {};
        if(req.session.Flash.msg){
            res.locals.Flash = req.session.Flash
        }
        req.session.Flash = {};
        next();
    },
    set: function(req, msg, type){
        req.session.Flash = req.session.Flash || {};
        req.session.Flash.msg = msg;
        req.session.Flash.type = type;
    }
};



