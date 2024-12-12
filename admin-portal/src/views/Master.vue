<template>
    <v-flex>
      <audio ref="audio_receive" src="/audio/chat_alert_2.mp3"></audio>
      <app-header v-on:toggle-drawer="drawer = !drawer" :drawer="drawer"/>
      <navigation :drawer.sync="drawer" />
      <notifications></notifications>
      <v-flex class="hb-flex" :class="{'has-drawer': drawer && $vuetify.breakpoint.smAndUp, 'platform-page': $vuetify.breakpoint.smAndUp}">
        <slot v-if="isLoaded" />
        <div v-else class="loading"></div>
      </v-flex>



    </v-flex>
</template>

<script>

import AppHeader from '../components/includes/AppHeader/index.vue';

import Navigation from '../components/includes/Navigation.vue';
import { mapGetters, mapActions } from 'vuex';


import Modal from '../components/assets/Modal.vue';
import Notifications from '../components/assets/Notifications.vue';


export default {
    name: 'master-layout',
    data() {
        return {
            drawer: true,
            socket: {},
            socketEvents: {},

            open_panel: '',
            payment_key:0,
            merchadise_key: 0,
            drawer2: true,
            nav_drawer: true,
            drawer_type: false,
            drawer_width: 0,
            showMakePayment: false,
            showSellMerchandise: false,
            quick_actions: false,
            property_id: null,
            contact_id: null,
            contact: null,
            unit_id: null,
            lease_id: null,
            temporary: false,
            location: '',
            show_bulk_edit_unit_details: false,
            show_bulk_edit_unit_details_units: [],
            show_omni_Search: false,
            show_delinquency_center: false,
            show_lead_follow_up: false,
            showMoveOut: false,
            showTransfer: false,
            transferData: {},
            rateChangeComponent: '',
            rateChangeData: null,
            rateChangeID: null,
            rateChangeEditType: 'manual',
            rateChangeEdit: false,
            show_task_center: false,
            delinquencyData:null,
            auctionLease: {},
            show_auction_model: false
        }
    },
    components: {
        AppHeader,
        Navigation,
        Notifications,

    },
    computed:{
        ...mapGetters({
            userData: 'authenticationStore/getUserData',
            isLoaded: 'authenticationStore/isLoaded',
            isAdmin: 'authenticationStore/isAdmin',
        }),
        hasSidebar(){
            return !!this.slideOutComponent;
        },
    },
    mounted(){

    },
    created(){
        this.setSocketEvents();
        this.setUpWebsockets();
    },
    destroyed(){
    },

    methods:{
        watchWebsocketEvents(){
            if(this.userData.id) {
                this.socket.emit('watch', this.userData.id);
            }
        },



        setSocketEvents(){

        },

        setUpWebsockets(){
            this.socket = io(process.env.VUE_APP_WEBSOCKET_SERVER_APP_ENDPOINT);
            for(const socketEvent in this.socketEvents) {
                this.socket.on(socketEvent, this.socketEvents[socketEvent]);
            }
        },
    },


}
</script>
<style lang="scss" scoped>
.platform-page {
    padding: 60px 0 0 60px;
    background: #F9FAFB;
}
.has-drawer{
    padding-left: 220px;
}
.hb-flex{
    display: flex;
}
.loading {
    height: 100vh;
    vertical-align: middle;
    margin: 0 auto;
    .v-progress-circular {
        position: relative;
        top: 40%;
        left: 40%;
    }
}
</style>
