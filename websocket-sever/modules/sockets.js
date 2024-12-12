var io;
var socketList = {};
var cachedEvents = {};

var Hash = require(__dirname + '/../modules/hashes.js');
var Hashes = Hash.init();
var moment = require('moment');
let Event_Cache_Time = process.env.EVENT_CACHE_TIME || 5 // in minutes

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

var sendAlert = function(type, contact_id, payload, isConnected = false){
    type = type || 'notification';

    if (!isConnected) {
        let event = {
            type,
            payload,
            time: moment()
        }
        console.log(`Cachng event type of ${type} against contact id of ${contact_id}`);

        if(!cachedEvents[contact_id]) {
            cachedEvents[contact_id] = {
                events: [event]
            }
            let interval = setInterval(()=>{
                let cached_events = cachedEvents[contact_id] && cachedEvents[contact_id].events;
                if(cached_events && cached_events.length) {
                    cached_events.forEach((e,i) => {
                        if(moment().diff(e.time,'minutes') >= Event_Cache_Time) {
                            cachedEvents[contact_id].events.splice(i,1);
                        }
                    });
    
                    if(!cachedEvents[contact_id].events.length){
                        delete cachedEvents[contact_id];
                        clearInterval(interval);
                    }
    
                } else {
                    clearInterval(interval);
                }
    
            }, Event_Cache_Time * 60 * 1000);
            console.log(`Contact id: ${contact_id} Interval Id: ${interval}`);
        } else {
            cachedEvents[contact_id].events.push(event)
        }
        return;
    }

    console.log("-- sendAlert -- ");
    console.log("Contact: ", contact_id);
    console.log("All Sockets: ", socketList);
    for (var socket in socketList) {
        if (socketList.hasOwnProperty(socket)) {
            console.log("socketList.hasOwnProperty( socket )", socketList.hasOwnProperty( socket ))
            console.log("Contact: ", parseInt(contact_id));
            if (socketList[socket] === parseInt(contact_id)) {
                console.log("Sending Event: ", type, " to ", contact_id, " on socket: ", socket);
                io.to(socket).emit(type, payload);
            } else {
                console.log("Contact: ", contact_id, " on socket: ", socket, "Not found");
            }
        }
    }
}


module.exports = {

    init: (load_io) => {
      io = load_io;
    },
    connect: () => {
        io.on('connection', function(socket){
            console.log('hello', socket.id);
            socket.on('create', function(room) {
                console.log('connected to room:', room);
                socket.join(room);
            });
            socket.on('disconnect', function(message){
                console.log('disconnecting', socket.id);
              removeSocket(socket.id);
            });
            socket.on('watch', function(contact_id){
                let c = Hashes.decode(contact_id)[0]
                console.log('watching', c, ' on socket ', socket.id );
                addSocket(socket.id, c);

                // sending cached events
                let cached_events = cachedEvents[c] && cachedEvents[c].events;
                if(cached_events && cached_events.length) {
                    cached_events.forEach(e => {
                        sendAlert(e.type, c, e.payload, true);
                    })
                    delete cachedEvents[c];
                }
            });
        });
    },
    isConnected: (contact_id) => {
        console.log("--isConnected-- ");
        console.log("Contact: ", contact_id);
        console.log("All Sockets: ", socketList);
        for( var socket in socketList ) {
        console.log("socketList.hasOwnProperty( socket )", socketList.hasOwnProperty( socket ))
            if( socketList.hasOwnProperty( socket ) ) {
            console.log("Contact: ", parseInt(contact_id));
            console.log("is connected: ", socketList[socket] === parseInt(contact_id) );
                if( socketList[ socket ] === parseInt(contact_id) ){
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
    sendAlert: (type, contact_id, payload, isConnected = false) => {
        sendAlert(type, contact_id, payload, isConnected);
    }
};
