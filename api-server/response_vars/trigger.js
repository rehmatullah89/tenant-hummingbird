module.exports = {
	'/': {
		get: 'id,name,description,start,trigger_reference,repeat,silence,max_repeat,trigger_group_id,apply_to_all,Actions(*)',
	},
	'/:trigger_id': {
		get: 'id,name,description,start,trigger_reference,repeat,silence,max_repeat,trigger_group_id,apply_to_all,Actions(*)',
	},
    '/groups': {
      	get: 'id,name,description,triggers_count,duration,Properties(id)',
		post: 'id,name,description,Properties(id)'
	},

	'/groups/:id': {
		put: 'id,name,description,Properties(id)'
	},

	'/action-types': {
		get: 'id,name,label'
	},
}
