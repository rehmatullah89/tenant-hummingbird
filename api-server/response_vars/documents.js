

module.exports = {
	'/types':{
		get: 'id,name,value,description'
	},
	'/':{
		get: 'id,name,type,Properties(*),key,description,document_type_id,unit_type,public,Upload(*),DocumentType(name),created_on,modified_on'
	},
	'/:document_id':{
		get: 'id,name,description,document_type_id,unit_type,public,Upload(*),DocumentType(name)'
	},

}