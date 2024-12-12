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

module.exports = {

    init: (load_io) => {
      io = load_io;
    },
    connect: () => {
        io.of('/v1').on('connection', function(socket){
          socket.on('disconnect', function(message){
              removeSocket(socket.id);
          });
          socket.on('watch', function(contactid){
                var contact_id = Hashes.decode(contactid)[0];
                addSocket(socket.id, contact_id);
            });
        });
    },
    isConnected: (contact_id) => {
        for( var socket in socketList ) {
            if( socketList.hasOwnProperty( socket ) ) {
                if( socketList[ socket ] === contact_id ){
                    return true;
                }
            }
        }
        return false;
    },
    getSockets: () => {
        return Object.keys(socketList);
    },
    getThisSocket: () => {
        return io.Client;
    },
    sendAlert: (type, user_id, payload) => {
      type = type || 'notification';
      console.log("type!", type);
      console.log("user_id!", user_id);
      console.log("payload!", payload);
      console.log("payload!", socketList);
      for (var socket in socketList) {
        if (socketList.hasOwnProperty(socket)) {
          if (socketList[socket] === user_id) {
            io.of('/v1').to(socket).emit(type, payload);
          }
        }
      }
    }
};
