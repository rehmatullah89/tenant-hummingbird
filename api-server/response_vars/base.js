


module.exports = {
	'/login': {
		post: 'id,first,last,email,created_at,roles,Companies(id,name,subdomain),Roles(*),Leases(*),Company(id,name,firstname,lastname,email,phone,subdomain,logo)'
	},
	'/set-password/:hash': {
		get: 'id,salutation,first,middle,last,suffix,email'
	},

}