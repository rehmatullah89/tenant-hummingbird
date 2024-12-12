var io;
var socketList = {};
// var io = require('socket.io')(http);
var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();

var removeSocket = function(socketId){
    if(socketList[socketId]) {
        delete socketList[socketId];
    }
};

var addSocket = function(socketId, userId){
    if(!socketList[socketId]) {
        socketList[socketId] = userId;
    }
};


module.exports = function(io){
    return {
        connect: function(){

            io.on('connection', function(socket){
                socket.on('disconnect', function(message){
                    removeSocket(socket.id);
                });
                socket.on('watch', function(userid){
                    var user_id = Hashes.decode(userid)[0]; // really contact_id
                    console.log("watch", user_id);
                    addSocket(socket.id, user_id);
                });
            });
        },
        getSockets:function(){
            return Object.keys(socketList);
        },
        getThisSocket:function(){
            return io.Client;
        },
        sendAlert: function(type, user_id, payload){

            type = type  || 'notification';
            console.log("socketList", socketList);
            for( var socket in socketList ) {
                if( socketList.hasOwnProperty( socket ) ) {
                    if( socketList[ socket ] === user_id ){
                    console.log("socket found!", type);
                        io.to(socket).emit(type, payload);
                    }
                }
            }
        }
    }
};