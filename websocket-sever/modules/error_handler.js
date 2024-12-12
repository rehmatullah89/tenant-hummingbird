
/*
 400 Bad Request
 The server cannot or will not process the request due to an apparent client error (e.g., malformed request syntax, size too large, invalid request message framing, or deceptive request routing)

 401 Unauthorized
 Similar to 403 Forbidden, but specifically for use when authentication is required and has failed or has not yet been provided. 401 semantically means "unauthenticated",[35] i.e. the user does not have the necessary credentials.

 403 Forbidden
 The request was valid, but the server is refusing action. The user might not have the necessary permissions for a resource, or may need an account of some sort.

 404 Not Found
 The requested resource could not be found but may be available in the future. Subsequent requests by the client are permissible.

 408 Request Timeout
 The server timed out waiting for the request. According to HTTP specifications: "The client did not produce a request within the time that the server was prepared to wait. The client MAY repeat the request without modifications at any later time."

 409 Conflict
 Indicates that the request could not be processed because of conflict in the current state of the resource, such as an edit conflict between multiple simultaneous updates.

 410 Gone
 Indicates that the resource requested is no longer available and will not be available again. This should be used when a resource has been intentionally removed and the resource should be purged.

 429 Too Many Requests (RFC 6585)
 The user has sent too many requests in a given amount of time. Intended for use with rate-limiting schemes.[58]

 */


var codes = {
	400 : "Could not complete your request.",
	401 : "Unauthorized: Please log in.",
	403 : "Forbidden: You do not have access to access this resource.",
	404 : "The requested resource could not be found.",
	405 : "Request method not allowed.",
	408 : "Request Timeout",
	409 : "Conflict.",
	500 : "Application Error"

}

module.exports = {
	get: function(code,message){
		return {
			status: code,
			data: null,
			msg: message || codes[code] || "An error occurred"
		}
	},
	th(code, msg){
		var error = new Error(msg || codes[code]);
		error.code = code;
		//TODO Send email on 500 error

		throw error;
	}
};
