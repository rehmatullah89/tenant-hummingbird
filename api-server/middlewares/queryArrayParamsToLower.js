exports.queryArrayParamsToLower = (qlist)=>{
    return (req, res, next)=>{
        for(let q of qlist){
            if(Array.isArray(req.query[q]) && req.query[q].length >0){
                req.query[q] = req.query[q].map((i) => i.toLowerCase().trim().replace(' ', '_'));
            }
            
        }
        next();
    }
}