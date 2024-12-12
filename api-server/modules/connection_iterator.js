class connectionIterator {
  constructor(databases, companies, type){
    this.type = type === 'write' ? 'write_pool' : 'read_pool';
    this.db_pointer = 0;
    this.collection_pointer = 0;
    this.connections = {};
    this.databases = databases;
    this.companies = companies;
    this.current_collection = null;
    this.current_companies = [];
    


  }
  async build(){
    for(let db in this.databases){
        try {
            console.log("db", db);
            console.log("this.databases[db]", this.databases[db]);
            console.log("this.type", this.type);
            console.log("this.databases[db][this.type]", this.databases[db][this.type]);
            let c = await this.databases[db][this.type].getConnectionAsync();
            this.connections[this.databases[db].name] = {
                connection: c,
                collections: {}
            }
        } catch(err){
            continue;
        }
        
        console.log("this.connections", this.connections);
    }

    for(let i = 0; i < this.companies.length; i++){
        if(this.connections[this.companies[i].database]){
            this.connections[this.companies[i].database].collections[this.companies[i].collection] = this.connections[this.companies[i].database].collections[this.companies[i].collection] || [];
            this.connections[this.companies[i].database].collections[this.companies[i].collection].push(this.companies[i])
        }
    }
}
async next(){

    let db_entry = Object.values(this.connections);
    
    this.current_collection = null;
    this.current_companies = [];
    try { 
        
        if(db_entry.length > this.db_pointer){
            let current_db = db_entry[this.db_pointer];
            let connection = current_db.connection;
            connection.db = null;
           
            let collection_list = Object.keys(current_db.collections);
            
            this.current_collection = collection_list[this.collection_pointer];
            
            this.current_companies = db_entry[this.db_pointer].collections[this.current_collection];
            await connection.changeUser({database : this.current_collection });
            this.collection_pointer++;
            if(collection_list.length <= this.collection_pointer){
                this.collection_pointer = 0;
                this.db_pointer++;
            }
            return connection;
        } else {
            return null;
        }
        
        

        
    } catch(err){
        console.log("err");
    }
    return null;
    
}

  async release(){
      
      let connections = Object.entries(this.connections);
      

    for(let i = 0; i < connections.length; i++){
        let [db_name, con_object] = connections[i];
        if(this.databases[db_name][this.type]._freeConnections.indexOf(con_object.connection) < 0){
            await con_object.connection.release();
        }
    }

  }

}


module.exports = connectionIterator;
