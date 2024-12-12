

module.exports = {
	'/types':{
		get: 'id,name,description'
	},
	'/':{
		get: 'id,name,description,document_type_id,unit_type,public,Upload(*),DocumentType(name)'
	},
	'/:document_id':{
		get: 'id,name,description,document_type_id,unit_type,public,Upload(*),DocumentType(name)'
	},

}