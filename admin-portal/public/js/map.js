(function() {
    this.GMap = function(){
        this.map = '';
        this.markers = [];
        this.options =  {};
        return this;
    };
// Methods
    this.GMap.prototype.show = function(options, cb){
        var defaults = {
            container: '',
            mapOptions: {
                center: {
                    lat: 0,
                    lng: 0
                },
                zoom:9
            }
        };
        if (options && typeof options === "object") {
            this.options = Object.assign({}, defaults, options);
            showMap.call(this, cb);
        } else {
            console.log('Map initialized with no options');
        }
    };

    this.GMap.prototype.search = function(address, cb){
        console.log("SEARCHING", address);
        if(typeof cb !== 'function'){
            console.log('Error: No callback specified');
            return;
        };

        var geocoder = new google.maps.Geocoder();
        geocoder.geocode( { 'address': address}, function(results, status) {

            console.log("RESULTS", results);

            if (status == google.maps.GeocoderStatus.OK) {
                cb(null,results);
            } else {
                console.log('Error: ' + status);
                cb('Address not found');
            }
        });
    };

    this.GMap.prototype.geocode = function(address, cb){


        if(typeof cb !== 'function'){
            console.log('Error: No callback specified');
            return;
        };

        var geocoder = new google.maps.Geocoder();
        geocoder.geocode( { 'address': address}, function(results, status) {


            if (status == google.maps.GeocoderStatus.OK) {
                var components = {
                    formatted_address: results[0].formatted_address,
                    lat: results[0].geometry.location.lat(),
                    lng: results[0].geometry.location.lng()
                };
                results[0].address_components.forEach(function(c){
                    components[c.types[0]] = c.long_name;
                });
                cb(null,components);

            } else {
                console.log('Error: ' + status);
                if(results[0].partial_match){
                    cb('partial_match', {
                        formatted_address: results[0].formatted_address,
                        lat: results[0].geometry.location.lat(),
                        lng: results[0].geometry.location.lng()
                    });
                } else {
                    cb('Address not found');
                }
            }
        });
    };

    this.GMap.prototype.addMarker = function(pointOptions, cb){

        pointOptions.map = pointOptions.map || this.map;
        var marker = new google.maps.Marker(pointOptions);
        this.markers.push(marker);
        if(typeof cb == 'function'){
            cb(marker);
        }
    };

// Helper Functions

    function showMap(cb){
        this.map = this.map || new google.maps.Map(document.getElementById(this.options.container));
        this.map.setOptions(this.options.mapOptions);
        if(typeof cb == 'function'){
            cb(this.map);
        }
    }

}());