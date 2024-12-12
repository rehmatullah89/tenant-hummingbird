<template>

    <auto-complete
        placeholder="Address"
        :options="addresses"
        :value="address.formatted_address"
        @search="findAddresses"
        @input="setAddress"
        :showLoading="showLoading"
        showAll
    ></auto-complete>

</template>
<script type="text/babel">
    import AutoComplete from './Autocomplete.vue';
    export default {
        name: "GoogleAddressSearcher",
        data() {
            return {
                display_address: '',
                addressList: [],
                showLoading:false,
                address: {
                    address: '',
                    address2: '',
                    city: '',
                    state: '',
                    zip: '',
                    lat:'',
                    lng:'',
                    neighborhood: '',
                    formatted_address: ''
                }
            }
        },
        components:{
            AutoComplete
        },
        computed:{
            addresses(){
                return this.addressList.map(function (address) {
                    return address.formatted_address;
                })
            }
        },
        created(){
            this.map = new window.GMap();

            if(this.selected){
                this.address = this.selected;
                this.addressList.push(this.selected);
            }





        },
        methods:{
            checkAddressSet(){
                if(!this.address.lat && !this.address.lng){
                    this.clearAddress();
                }

            },
            findAddresses(address){
                this.showLoading = true;
                this.address.formatted_address = address;
                this.searchGoogle(address);

            },
            clearAddress(){
                this.address = {
                    formatted_address: '',
                    lat: '',
                    lng: '',
                    address: '',
                    address2: '',
                    neighborhood: '',
                    city: '',
                    state: '',
                    country: '',
                    zip: '',
                }
            },
            searchGoogle: _.debounce(
                function(address) {
                    var _this = this;
                    this.map.search(address, function (err, data) {
                        if (err) {
                            console.error(err);
                        } else {
                            _this.addressList = data;
                        }
                        _this.showLoading = false;
                    })
                }, 500),
            setAddress(address){
                var ad = this.addressList.filter(function(a){
                    return a.formatted_address == address;
                }).map(function(a){
                    return {
                        formatted_address: a.formatted_address,
                        lat: a.geometry.location.lat(),
                        lng: a.geometry.location.lng(),
                        address: a.address_components[0].short_name + ' ' + a.address_components[1].short_name,
                        neighborhood: a.address_components[2].short_name,
                        city: a.address_components[3].short_name,
                        state: a.address_components[5].long_name,
                        country: a.address_components[6].long_name,
                        zip: a.address_components[7].short_name
                    };
                });


                if(ad.length){
                    this.address = ad[0];
                } else {
                    this.clearAddress();

                }


                this.$emit('input', this.address);

            }
        },
        props:['selected']
    }
</script>