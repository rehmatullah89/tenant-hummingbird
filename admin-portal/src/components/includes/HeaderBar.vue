<template>

    <v-app-bar
            app
            clipped-left
            color="secondary"
    >
        <v-app-bar-nav-icon color="white" @click="$emit('toggleDrawer')" />
<!--        <v-text-field-->
<!--                solo-inverted-->
<!--                flat-->
<!--                hide-details-->
<!--                label="Search"-->
<!--                color="white"-->
<!--                prepend-inner-icon="mdi-magnify"-->
<!--        />-->


<!--        <button-->
<!--                v-if="$store.getters.isAdmin"-->
<!--                class="w-button  icon nav-toggle-btn"-->
<!--                :class="{ 'dark-btn': $store.getters.isNavOpen, 'primary-btn': !$store.getters.isNavOpen}"-->
<!--                @click="$store.commit('setNavState', {open: !$store.getters.isNavOpen})"-->
<!--        >-->
<!--            -->
<!--        </button>-->
        <v-spacer />


<!--        <v-btn icon @click="$emit('quick')">-->
<!--            <v-icon color="white">mdi-face</v-icon>-->
<!--        </v-btn>-->
<!--        <v-btn icon @click="$store.commit('setOmniSearch', true);" >-->
<!--            <v-icon color="white">mdi-magnify</v-icon>-->
<!--        </v-btn>-->





<!--        <v-menu offset-y max-height="400" max-width="300" min-width="250" nudge-left>-->
<!--          <template v-slot:activator="{ on }">-->
<!--            <v-btn icon v-on="on" >-->
<!--              <v-badge-->
<!--                :content="notificationUnreadCount"-->
<!--                :value="notificationUnreadCount"-->
<!--                color="red"-->
<!--                overlap-->
<!--              >-->
<!--                <v-icon color="white">mdi-bell</v-icon>-->
<!--              </v-badge>-->
<!--            </v-btn>-->
<!--          </template>-->
<!--          <v-list subheader class="notifications">-->
<!--            <v-list-item-->
<!--              v-for="notify in notifications"-->
<!--              :key="notify.id"-->
<!--              flast-->
<!--              :class="{unread: !notify.status}"-->
<!--              @click="handleAlertClick(notify, $event)"-->
<!--            >-->
<!--              <v-list-item-avatar>-->
<!--                <span class="activity-icon" :class="['action-' + notify.Activity.ActivityObject.name, 'status_' + notify.Activity.ActivityAction.name]"></span>-->
<!--              </v-list-item-avatar>-->
<!--              <v-list-item-content>-->
<!--                <span class="notify-date">{{notify.created | formatLocalDateTime}}</span><br />-->
<!--                <span v-html="$options.filters.nl2br(notify.Activity.message)"></span>-->
<!--              </v-list-item-content>-->
<!--            </v-list-item>-->
<!--          </v-list>-->

<!--        </v-menu>-->



      <v-menu v-model="todo_menu" offset-y max-width="500" min-width="500" nudge-left :close-on-content-click="false">
        <template v-slot:activator="{ on }">
          <v-btn icon v-on="on" >
            <v-icon color="white">mdi-calendar</v-icon>
          </v-btn>
        </template>
        <v-card>
          <todo @close="todo_menu = false"></todo>
        </v-card>

      </v-menu>

    </v-app-bar>


<!--    <header class="header">-->
<!--        <div class="brand-holder">-->
<!--            <router-link to="/" class="w-nav-brand"> <img src="/img/tenantinc-logo-white.png" class="logo"></router-link>-->
<!--        </div>-->

<!--        <div class="alert-holder">-->
<!--            <div class="alerts" v-if="$store.getters.isAdmin">-->
<!--                <a class="alert-icon active"  @click="$store.commit('setLeadIntake', true);"><span class="icon"></span></a>-->
<!--            </div>-->





<!--            <div class="alerts" v-if="$store.getters.isAdmin">-->
<!--                <a class="alert-icon active"  @click="$store.commit('setOmniSearch', true);"><span class="icon"></span></a>-->
<!--            </div>-->

<!--            <div class="alerts" v-if="$store.getters.isAdmin">-->
<!--                <audio ref="audio" src="/audio/alert2.wav"></audio>-->
<!--                <dropdown-menu-->
<!--                        width="300"-->
<!--                        ref="alerts"-->
<!--                        position="center"-->
<!--                >-->
<!--                    <template slot="trigger">-->
<!--                        <a class="alert-icon" :class="{active: notificationUnreadCount > 0}" @click="alertVisible = !alertVisible">-->
<!--                            <span class="icon"></span>-->
<!--                            <span class="alert-count">{{notificationUnreadCount}}</span>-->
<!--                        </a>-->
<!--                    </template>-->
<!--                    <template slot="dropdown" >-->

<!--                        <div class="notifications-title">-->
<!--                            Notifications-->
<!--                            <a @click="markAllRead"><span class="icon"></span></a>-->
<!--                            <a @click="markAllRead">Mark all as read</a>-->
<!--                        </div>-->

<!--                        <div class="notifications-holder">-->
<!--                            <div class="activity" @click="handleAlertClick(notify, $event)" v-for="notify in notifications" :key="notify.id" :class="{unread: !notify.status}">-->
<!--                                <span class="activity-icon" :class="['action-' + notify.Activity.ActivityObject.name, 'status_' + notify.Activity.ActivityAction.name]">-->
<!--                                </span>-->

<!--                                <span class="activity-text">-->
<!--                                    <span class="notify-date">{{notify.created | formatLocalDateTime}}</span><br />-->
<!--                                    <span v-html="$options.filters.nl2br(notify.Activity.message)"></span>-->
<!--                                </span>-->

<!--                            </div>-->
<!--                        </div>-->
<!--                    </template>-->
<!--                </dropdown-menu>-->
<!--           </div>-->

<!--            <div class="company-switcher w-hidden-tiny  w-hidden-small" v-if="$store.getters.isAdmin && $store.getters.getCompanyNames.length > 1" style="width: 250px;">-->
<!--                <autocomplete-->
<!--                    :options="$store.getters.getCompanyNames"-->
<!--                    :value="selectedCompany"-->
<!--                    placeholder="Switch Companies"-->
<!--                    showAll-->
<!--                    @input="setCompany">-->
<!--                </autocomplete>-->

<!--            </div>-->

<!--            <div class="alerts text-right"  v-if="$store.getters.isTenant">-->
<!--                <router-link to="/my-account" tag="a" class="nav-link">-->
<!--                    <span class="icon"></span>&nbsp;&nbsp;Home-->
<!--                </router-link>-->
<!--            </div>-->

<!--            <div class="alerts text-right"  v-if="$store.getters.isTenant">-->
<!--                <router-link to="/logout" tag="a" class="nav-link">-->
<!--                    <svg fill="#ffffff" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" x="0px" y="0px" viewBox="0 0 164 164" enable-background="new 0 0 164 164" xml:space="preserve">-->
<!--                        <path class="icon-path" fill-rule="evenodd" clip-rule="evenodd" d="M18.242,72.745h127.197c6.323,0,11.497,5.174,11.497,11.498v68.262  c0,6.322-5.174,11.496-11.497,11.496H18.242c-6.323,0-11.497-5.174-11.497-11.496V84.242C6.745,77.918,11.918,72.745,18.242,72.745  L18.242,72.745z M94.91,109.224c0-15.584-26.141-15.341-26.141,0c0,5.352,2.212,7.674,5.594,9.844  c-0.665,3.458-0.127,12.284-0.127,16.298c0,9.274,14.021,9.271,14.021,0c0-4.638,0.408-11.272-0.034-15.667  C92.214,117.644,94.91,114.787,94.91,109.224L94.91,109.224z M109.17,64.809c-0.001-51.89-54.661-51.551-54.66,0.907  c-9.109,0-18.219,0-27.328,0c0-86.884,109.316-87.201,109.316-0.907C127.39,64.809,136.498,64.809,109.17,64.809z"/>-->
<!--                    </svg>-->
<!--                    Logout-->
<!--                </router-link>-->
<!--            </div>-->

<!--        </div>-->




<!--    </header>-->
</template>

<script type="text/babel">

    import Dropdown from '../assets/Dropdown.vue';
    import DropdownMenu from '../assets/DropdownMenu.vue';

    import BreadcrumbBar from './BreadcrumbBar.vue';
    import Todo from './Todo.vue';

    import Status from '../includes/Messages.vue';
    import Loader from '../assets/CircleSpinner.vue';
    import api from '../../assets/api.js';

    import Autocomplete from '../assets/Autocomplete.vue';
    import { mapGetters } from 'vuex';
    import moment from 'moment';
    import Datepicker from 'vuejs-datepicker';

    var socket = {};
    import { EventBus } from '../../EventBus.js';


    export default {
        name: 'HeaderBar',
        data: function(){
            return {
                todo_menu: false,
                alertVisible: false,
                selectedCompany: '',
                todos:[],
                notifications:[],
                socket: {},
                loaded: false,
                reviewBillDate:'',
                sendBillDate: '',
                sendInvoices: false
            }
        },
        props:['loggedin', 'drawer'],
        mounted(){
        },
        created(){
            // if(this.$store.getters.isAdmin){
            //     this.fetchData('initial');
            //     this.fetchTodo('initial');
            // }
        },
        components:{
            Autocomplete,
            BreadcrumbBar,
            Dropdown,
            DropdownMenu,
            Datepicker,
            Status,
            Loader,
            Todo
        },
        computed:{
            getCompanyNames (){
                return this.$store.getters.getCompanyNames;
            },
            // notificationUnreadCount(){
            //     var n = this.notifications.filter(n =>{ return !n.status  });
            //     return n ? n.length: 0;
            //
            // },
            ...mapGetters({
                userData: 'getUserData'
            })

        },
        filters:{
        },

        methods:{
            // icon(notification){
            //
            //     switch(notification.Type.name){
            //         case "Event":
            //             this.$router.push('/leases/' + notification.lease_id);
            //             break;
            //         case "Message":
            //             this.$router.push('/messages');
            //             break;
            //         case "Maintenance Request":
            //             this.$router.push('/leases/' + notification.lease_id + '/maintenance-requests');
            //             break;
            //         case "Send Invoices":
            //             this.$router.push('/dashboard');
            //             break;
            //     }
            // },

            // fetchTodo(type){
            //     api.get(this, api.TODOS).then(r => {
            //         this.todos = r.todos;
            //         if(this.todos.length){
            //             this.$refs.audio.play();
            //             this.$store.dispatch('todoStore/setTodos', r.todos);
            //
            //         }
            //
            //     });
            // },
            //
            //
            //
            // fetchData(type){
            //     api.get(this, api.NOTIFICATIONS).then(r => {
            //         var newNotifications = this.notifications.length && r.notifications.length && this.notifications[0].id !== r.notifications[0].id;
            //         this.notifications = r.notifications;
            //         if(type === 'initial'){
            //             this.loaded = true;
            //             this.setUpNotifications();
            //         } if(type === 'socket' && newNotifications) {
            //             this.$refs.audio.play();
            //         }
            //     });
            // },
//             handleAlertClick(notification, event){
//                 event.preventDefault();
//
//                 api.put(this, api.NOTIFICATIONS + notification.id + '/read').then(function(){
//                     notification.status = 1;
//                     this.away();
// //                    switch(notification.Type.name){
// //                        case "Event":
// //                            this.$router.push('/leases/' + notification.lease_id);
// //                            break;
// //                        case "Message":
// //                            this.$router.push('/messages');
// //                            break;
// //                        case "Maintenance Request":
// //                            this.$router.push('/leases/' + notification.lease_id + '/maintenance-requests');
// //                            break;
// //                        case "Send Invoices":
// //                            this.$router.push('/dashboard');
// //                            break;
// //                        case "Lead":
// //                            this.$router.push('/leads/' + notification.reference_id);
// //                            break;
// //                    }
//
//                    // this.fetchData();
//                 });
                //this.alertVisible = false;




            // },
            // markAllRead(){
            //     api.put(this, api.NOTIFICATIONS + 'read').then(function(){
            //
            //         this.notifications.map(n => {
            //             n.status = 1;
            //             return n;
            //         })
            //
            //     })
            // },
            setCompany(company){

                api.post(this, api.SWITCH_COMPANY, {company: company}).then(r => {
                    console.log(r);
                    window.location = r.r;
                });

            },
            away(){
              this.alertVisible = false;
            },
            setUpNotifications(){
                // if(this.userData.id && this.loaded) {
                //     this.socket.emit('watch', this.userData.id);
                // }
            },

        },

        watch:{
            userData(){
            //    this.setUpNotifications();
            }
        }


    }

</script>


<style scoped>

    .header{
        display: flex;
    }
    .w-nav-brand{
        -webkit-box-flex: 1;
        -webkit-flex: 1;
        -ms-flex: 1;
        flex: 1;
    }
    .w-nav-brand,
    .w-nav-brand:focus,
    .w-nav-brand:visited,
    .w-nav-brand:hover,
    .w-nav-brand:active{
        border: 0;
        outline: 0;
    }
    /*.navbar-brand {*/
        /*float: left;*/
        /*height: 53px;*/
        /*padding: 5px 15px;*/
        /*font-size: 18px;*/
        /*line-height: 20px;*/
    /*}*/
    /*.breadcrumb{*/
        /*clear: both;*/
    /*}*/
    /*.search{*/
        /*width: 200px;*/
        /*float: right;*/
        /*padding: 7px 10px;*/
        /*margin-right: 20px;*/
    /*}*/
    /*.alerts{*/
        /*float: right;*/
    /*}*/

    /*.alerts a{*/
        /*padding: 5px 12px 5px;*/
        /*display: inline-block;*/
        /*margin: 0;*/
        /*position: relative;*/
    /*}*/

    .alerts .alert-icon{
        padding: 19px 15px;
        margin: 0;
        position: relative;
        display: block;
        cursor: pointer;
    }

    .alerts a .icon{
        /* color: #00a1c8; */
        color: rgba(255,255,255,.15);
        font-size: 21px;
    }

    .alerts a.active .icon{
        color: white;

    }



    .alerts a .alert-count{
        display:none;
        position: absolute;
    }

    .alerts a.active .alert-count {
        display: block;
        background-color: white;
        color: #e74c3c;
        width: 20px;
        height: 20px;
        text-align: center;
        line-height: 16px;
        border-radius: 15px;
        font-weight: bold;
        top: 12px;
        right: 3px;
        border: 2px solid #56bb68;
        font-size: 10px;
    }



    .header-search .icon{

        font-size: 14px;
    }

    .header .company-switcher{
        display: block;
        padding: 10px 0px;
        margin-bottom: 0;
    }

    .notifications-holder{
        overflow-y: scroll;
        max-height: 250px;
        text-align: left;
    }
    .notifications-holder a:focus{
        border: 0;
        outline: 0;
        border-bottom: 2px solid #f0f0f5;
    }

    .notifications-holder .activity{
        text-decoration: none;
        color: #263238;
        padding-bottom: 5px;
        border-bottom: 2px solid #f0f0f5;
    }
    .notifications-holder .activity.unread{
        background-color: #f2f9fd;
        border-bottom: 2px solid white;
    }

    .notifications-holder a:hover{
        background-color: #f0f0f5;
    }

    .notifications-holder .activity-text {
        padding: 7px 10px;
    }
    .notifications-holder .activity-icon {
        margin: 10px 0px 0px 10px
    }

    .notifications-title {
        padding: 10px 5px;
        font-size: 11px;
        background: white;
        font-weight: bold;
        line-height: 10px;
        border-bottom: 1px solid #f0f0f5;
    }
    .notifications-title a{
        float:right;
        padding:0 5px;
        cursor: pointer;
    }
    body .alerts .listbox-area .dropdown-area{
        border-bottom: 8px solid #00b2ce;
    }

    .notifications-title a:hover{
        text-decoration: underline;
    }

    .notifications-title a .icon{
        font-size: 10px;
    }


    .alerts .icon-path{
        -webkit-transition: .6s cubic-bezier(0.77, 0, 0.175, 1);
        -moz-transition: .6s cubic-bezier(0.77, 0, 0.175, 1);
        -o-transition: .6s cubic-bezier(0.77, 0, 0.175, 1);
        fill: #ffffff;
    }

    .alerts .icon-path{
        fill: #ffffff;
    }

    .alerts .nav-link{
        padding: 0px;
        display: inline-block;
        margin: 16px 0;
        position: relative;
        height: 16px;
        width: 100px;
        text-align:left;
        color: #fff;
        font-weight: bold;
        text-decoration: none;

    }
    .alerts .nav-link:focus{
        border: none;
    }
    .alerts .nav-link .icon{
        color: white;
        font-size: 16px;
    }
    .alerts .nav-link svg{
        max-height:100%;
        width: 20px;
        vertical-align: top;
    }

    /*.alerts .nav-link a.active{*/
        /*color: #ffffff;*/
        /*background-color: #f5f7f8;*/

    /*}*/

    .navigation ul li a,
    .navigation ul li a:hover,
    .navigation ul li a:visited,
    .navigation ul li a:active{
        text-decoration: none;
    }

    .notification-dropdown{
        max-height: 500px;
        overflow-x:auto;
    }


    .alert-holder {
        display: flex;
    }

    .w-button.nav-toggle-btn {
        display: none;
    }

    .brand-holder {
        flex:1;
    }



    @media (max-width: 991px){

        .w-button.nav-toggle-btn {
            display: inline-block;
            position: relative;
            float: left;
            padding: 19px;

            border: none;
        }


        .header .company-switcher{
            display: none;
        }





    }
    @media (max-width: 767px){
        /*.company-switch-head{*/
            /*display:none;*/
        /*}*/
        .alerts{
            flex:0;
        }
        .alerts a .icon{
            /* color: #00b2ce; */
            color: rgba(255,255,255,.15);
        }
        .alerts .alert-icon{
            padding: 10px 5px;
        }
        .w-button.nav-toggle-btn {
            padding: 15px;
            background: rgba(255,255,255,.15);
            border-right: 1px solid rgba(255,255,255,.15);
        }

        .alert-holder {
            display: flex;
            flex-wrap: nowrap;
            justify-content: space-evenly;
            border-top: 1px solid rgba(255,255,255,.25);
            padding: 2px;
        }


        .logo {
            padding: 9px 0px;
            width: 150px;
            max-width: 100%;
            vertical-align: middle
        }

        .header{
            flex-direction: column;
        }

        .alerts a.active .alert-count{
            top: 2px;
            right: -3px;
        }


    }
    .top-header {
        z-index: 1000;
        position: relative;
        background: #00b2ce;
    }
    .notifications .v-list-item.v-list-item--link.theme--light{
      border-bottom: 1px solid #e2e2e2;
    }
    .notifications  .v-list-item.v-list-item--link.theme--light.unread {
      background: #fafafa;
    }


</style>
