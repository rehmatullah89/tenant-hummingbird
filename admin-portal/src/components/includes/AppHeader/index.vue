<template>
    <v-app-bar
      app
      clipped-left
      color="secondary">
        <v-tooltip bottom open-delay="750" style="background: #334450;">
            <template v-slot:activator="{ on }">
                <v-hover v-slot:default="{ hover }">
                    <v-btn style="width:40px;height:40px;" class="ml-n2" :class="{'hb-button-icon-hamburger-hover' : hover}" v-on="on" v-if="isAdmin" icon :ripple="false" color="#ffffff" @click="drawerToggle">
                        <span v-if="drawer">
                            <svg width="18" height="12" viewBox="0 0 18 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path fill-rule="evenodd" clip-rule="evenodd" d="M0 1C0 0.447715 0.447716 0 1 0H17C17.5523 0 18 0.447715 18 1C18 1.55228 17.5523 2 17 2H1C0.447715 2 0 1.55228 0 1ZM0 6C0 6.55228 0.447715 7 1 7H11C11.5523 7 12 6.55228 12 6C12 5.44772 11.5523 5 11 5H1C0.447715 5 0 5.44772 0 6ZM0 11C0 11.5523 0.447715 12 1 12H17C17.5523 12 18 11.5523 18 11C18 10.4477 17.5523 10 17 10H1C0.447716 10 0 10.4477 0 11Z" fill="#ffffff"/>
                            </svg>
                        </span>
                        <span v-else>
                            <svg width="24" height="24" viewBox="-1 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M3 5V19H4.56786L4.56786 5H3Z" fill="#ffffff"></path>
                                <path d="M15.2964 7.33333L14.1911 8.43L16.9993 11.2222H7.13572V12.7778H16.9993L14.1911 15.57L15.2964 16.6667L20 12L15.2964 7.33333Z" fill="#ffffff"></path>
                            </svg>
                        </span>
                    </v-btn>
                </v-hover>
            </template>
            <span v-if="drawer">Hide Navigation</span>
            <span v-else>Show Navigation</span>
        </v-tooltip>
        <v-spacer />
        <!-- <LiveVideoSupport /> -->
        <img class="mt-n1 ml-3 mr-sm-1 ti-logo" src="/img/tenantinc-logo-white.png" />
        <audio v-if="isAdmin" ref="audio_receive" src="/audio/chat_alert_2.mp3"></audio>
    </v-app-bar>
</template>
<script>

    import api from '../../../assets/api.js';
    import { EventBus } from '../../../EventBus.js';
    import { mapGetters, mapActions } from 'vuex';

    export default {
        name: 'AppHeader',
        data() {
            return {
                socket: {},
                socketEvents: {
                'connect': () => this.watch(),
                'error': (err) => { console.log('socket error', err); },
                'document_signed': (payload) => { EventBus.$emit('document_signed', payload); },
                'document_downloaded': (payload) => {
                    console.log("document_downloaded");
                    EventBus.$emit('document_downloaded', payload);
                },
                'todo': (payload) => { this.getTodo(); },
                'notification': () => { this.fetchData('socket'); },
                'message_sent_to_contact': () => { EventBus.$emit('message_sent_to_contact'); },
                'confirmation': (message) => { this.$store.dispatch('confirmationStore/setUpConfirmation', message); },
                'callStatusUpdate': (message) => { this.$store.dispatch('callStore/updateCall', message); },
                'brivoConnection': (message) => { EventBus.$emit('brivoConnection'); },
                'paymentReader': (message) => { EventBus.$emit('paymentReader'); },
                'incomingCall': (message) => { this.$store.dispatch('callStore/addCall', message); },
                'incomingText': (message) => {
                        EventBus.$emit('chat_updated', message.sms_thread_id);
                        if(this.$route.name !== 'Chat'){
                            this.$store.dispatch('callStore/addSMS', message);
                            this.$refs.audio_receive.play();
                        }
                    },
                "taskCreated": (payload) => {
                        EventBus.$emit('HB:Navigation-tasks-indicator', payload);
                    }
                }
            }
        },
        mounted() {
            this.setNotifications();
        },
        async created() {
            EventBus.$on('turn-off-hamburger-drawer', this.drawerToggle);
            await this.getGlobalSettings();
        },
        destroyed() {
            EventBus.$off('turn-off-hamburger-drawer', this.drawerToggle);
        },
        methods: {
            watch(){
                // if(this.userData.id && this.loaded) {
                //     this.socket.emit('watch', this.userData.id);
                // }

            },
            ...mapActions({
                setNotifications:'notificationsStore/setNotifications',
                getTodos: 'todoStore/getTodos',
                getGlobalSettings: 'authenticationStore/getGlobalSettings'
            }),
            setUpWebsockets(){
                // this is not where we set this up
                console.log("process.env.VUE_APP_SOCKET_PROTOCOL", process.env.VUE_APP_SOCKET_PROTOCOL)
                console.log("process.env.VUE_APP_SOCKET_SUBDOMAIN", process.env.VUE_APP_SOCKET_SUBDOMAIN)
                console.log("process.env.VUE_APP_DOMAIN", process.env.VUE_APP_DOMAIN)
                console.log("process.env.VUE_APP_SOCKET_PORT", process.env.VUE_APP_SOCKET_PORT)

                this.socket = io(process.env.VUE_APP_SOCKET_PROTOCOL + '://' + process.env.VUE_APP_SOCKET_SUBDOMAIN + '.' + process.env.VUE_APP_DOMAIN + ':' + process.env.VUE_APP_SOCKET_PORT + '/v1');

                for(const socketEvent in this.socketEvents) {
                    this.socket.on(socketEvent, this.socketEvents[socketEvent]);
                }




            },
            fetchData(type){
                this.setNotifications();
                if(type == 'initial'){
                    this.loaded = true;
                } if(type == 'socket' && newNotifications) {
                    this.$refs.audio.play();
                }
            },
            drawerToggle(){
                this.$emit('toggle-drawer');
                EventBus.$emit('main-drawer-is-toggled', this.drawer);
            }
        },
        computed: {
            ...mapGetters({
                userData: 'authenticationStore/getUserData',
                isAdmin: 'authenticationStore/isAdmin',
            })
        },
        components: {
        },
        props: ['drawer']
    }
</script>
<style lang="scss">
    .header {
        color: #fff;
        position: fixed;
        right:0;
        left:0;
        .hb-menu-icon {
            display: block;
            padding: 13px 10px;
        }

        .hb-quick-actions {
            color: #000;
            position: fixed;
            top:0;
            left:0;
            bottom:0;
            width: 320px;
            background: rgba(255,255,255,1);
        }
    }
    .main {
        padding-top: 60px;
    }
    .ti-logo {
        width:120px;
    }
</style>
