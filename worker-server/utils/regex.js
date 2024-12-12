exports.isMatch = (parent, pattern, opts) =>{

    if(pattern && parent){
    
        if(opts?.eq){
            return parent === pattern
        }

        return parent.toString().trim().toLowerCase().includes(pattern.toString().trim().toLowerCase())                 
    }
    
    return true
}