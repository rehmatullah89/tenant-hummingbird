<template>
  <v-navigation-drawer
    id="hb-navigation"
    class="pa-0"
    :class="{ 'isMobile': $vuetify.breakpoint.xs }"
    :width="$vuetify.breakpoint.smAndUp ? 60 : '100%'"
    clipped
    disable-resize-watcher
    hide-overlay
    app
    elevation-1
    mobile-breakpoint="1"
    flat
  >
    <v-layout
      :column="$vuetify.breakpoint.smAndUp"
      :fill-height="$vuetify.breakpoint.smAndUp"
      :row="$vuetify.breakpoint.xs"
      :wrap="$vuetify.breakpoint.xs"
    >
      <v-list
        :row="$vuetify.breakpoint.xs"
        :wrap="$vuetify.breakpoint.xs"
        class="mt-sm-1"
        :class="{ 'isMobile': $vuetify.breakpoint.xs }"
        style="padding-left: 9px;"
        dense
      >
        <v-list-item class="pl-0 pr-1 my-sm-1" :class="{ 'pl-3' : $vuetify.breakpoint.xs }" :style="$vuetify.breakpoint.xs ? 'padding-top:3px;' : ''">
          <hb-btn
            icon
            tooltip="Search"
            active-state-off
            @click="goSearch"
          >
            mdi-magnify
          </hb-btn>
        </v-list-item>
        <v-list-item class="pl-0 pr-1 my-sm-1">
          <hb-btn
            icon
            tooltip="Quick Actions"
            active-state-off
            @click="goQuickLinks"
          >
            mdi-flash-circle
          </hb-btn>
        </v-list-item>

        <v-list-item v-if="isAdmin" class="pl-0 pr-1 my-sm-1">
            <hb-btn icon tooltip="Create Task" :active="todo" @click="todo = true">mdi-calendar-today</hb-btn>
            <todo v-model="todo" v-if="todo"></todo>
        </v-list-item>

        <v-list-item class="pl-0 pr-1 my-sm-1">
            <hb-btn
              type="icon"
              tooltip="Tasks"
              active-state-off
              @click="goTaskCenter"
            >
              <template slot-scope="{ hover }">
                <v-badge
                  :value="(tasksCounter && tasksCounter > 0) || showTasksIndicator"
                  color="#F26500"
                  overlap
                  dot
                  offset-x="8"
                >
                  <hb-icon
                    :hover="hover"
                  >mdi-playlist-check</hb-icon>
                </v-badge>
              </template>
            </hb-btn>
        </v-list-item>

      </v-list>
      <v-spacer></v-spacer>
      <v-list
        :row="$vuetify.breakpoint.xs"
        :wrap="$vuetify.breakpoint.xs"
        :class="{ 'isMobile': $vuetify.breakpoint.xs }"
        dense
      >
        <v-list-item v-if="!isSettings" class="my-sm-1 pr-1" :style="$vuetify.breakpoint.xs ? 'padding-left:0;' : 'padding-left:9px;'">
          <hb-btn
            icon
            tooltip="Settings"
            @click="showSettings = true"
            active-state-off
          >

                mdi-settings

          </hb-btn>
        </v-list-item>
        <v-list-item class="pr-3 mb-sm-4 mt-sm-2" :style="$vuetify.breakpoint.xs ? 'padding-left:0;' : 'padding-left:14px;'">
          <v-avatar color="#000" size="32">
            <span class="white--text" style="font-size:18px;">{{contact.first.substring(0, 1).toUpperCase()}}</span>
          </v-avatar>

        </v-list-item>
      </v-list>
    </v-layout>


    <app-settings v-if="showSettings" @hideSettings="showSettings = false" />

  </v-navigation-drawer>
</template>
<script>
import NavLink from './NavLink.vue';
import NotificationsList from '../Notifications/List.vue';
// import TodoCreate from '../Todo/Create.vue';
import Todo from '../Todo.vue';
import { mapGetters, mapActions } from 'vuex';
import { EventBus } from '../../../EventBus.js';
import api from '../../../assets/api.js'

export default {

    props: ['isSettings'],
    data() {
        return {
            showSettings: false,
            drawer: true,
            globalDownload: false,
            downloadStatus: false,
            exportLoading: false,
            todo: false,
            headerNavLinks: [
              {
                title: 'Dashboard',
                to:'/dashboard',
                class: 'align-self-center',
                activeClass:'active',
                //action: () => { this.$store.commit('setNavState', { open: !this.$store.getters.isNavOpen}) },
                svg: {
                    x:'0px',
                    y:'0px',
                    style:'enable-background:new 0 0 24 24;',
                    viewBox: '0 0 24 24',
                    path: {
                        fill: '#788f9b',
                        class: 'icon-path',
                        d: 'M10 20V14H14V20H19V12H22L12 3L2 12H5V20H10Z'
                    }
                } //M2.02002 12C2.02002 6.49002 6.49002 2.02002 12 2.02002C17.51 2.02002 21.98 6.49002 21.98 12C21.98 17.51 17.51 21.98 12 21.98C6.49002 21.98 2.02002 17.51 2.02002 12ZM11.48 13.74V20L16.35 10.26H13V4.00002L8.00002 13.74H11.48Z
            }
          ],
          tasksLength: 0,
          pendingMoveIns: [],
          showTasksIndicator: false
        }
    },
    computed: {
        ...mapGetters({
          contact: 'authenticationStore/getUserData',
          isAdmin: 'authenticationStore/isAdmin',
          tasksCount: 'taskCenterStore/tasksCount'
        }),
        initial(){
            return this.contact.first ? this.contact.first.substring(0,1): 'H';
        },
        tasksCounter(){
          let count = 0;
          if (this.tasksCount && this.tasksCount.length) {
            count = count + this.tasksCount.find( arrEl => arrEl.event_type_name == 'all').count;
          }
          if (this.pendingMoveIns.length && this.pendingMoveIns.length > 0) {
            count = count + this.pendingMoveIns.length;
          }
          return count;
        }
    },
    methods: {
      ...mapActions({
          getTasksCount: 'taskCenterStore/getTasksCount'
      }),
      closeExport(){
        this.globalDownload = false;
        this.exportLoading = false;
        this.downloadStatus = false;
      },
      exportLoad() {
        this.exportLoading = true;
        this.downloadStatus = true;
        setTimeout(() => {
          this.exportLoading = false;
        }, 2000);
      },
      goSearch(){
        var payload = { foo: 'bar' };
        EventBus.$emit('HB-Navigation:Search', payload);
      },
      goQuickLinks(){
        var payload = { foo: 'bar' };
        EventBus.$emit('HB-Navigation:QuickLinks', payload);
      },
      goDelinquencyCenter() {
        EventBus.$emit('HB-Navigation:DelinquencyCenter');
      },
      goLeadFollowUp() {
        EventBus.$emit('HB-Navigation:LeadFollowUp');
      },
      goTaskCenter() {
        EventBus.$emit('HB-Navigation:TaskCenter');
      },
      async findPending(){
          let r = await api.get(this, api.LEASES +  'pending', { property_id: '' });
          this.pendingMoveIns = r.leases;
      },
      eventShowSettings(){
        this.showSettings = false;
      },
      eventShowTasksIndicator(value){
        this.showTasksIndicator = value;
      }
    },
    components: {
      // TodoCreate,
      Todo,
      NavLink,
      NotificationsList,
      'app-settings': () => import('../../settings/Index.vue')
    },
    created() {
      // console.log('object :>> ', this.tasksCounter);
      this.getTasksCount();
      this.findPending();
      EventBus.$on('HB-Navigation:Hide-Settings-Modal', this.eventShowSettings);
      EventBus.$on('HB:Navigation-tasks-indicator', this.eventShowTasksIndicator);
    },
    destroyed() {
      EventBus.$off('HB-Navigation:Hide-Settings-Modal', this.eventShowSettings);
      EventBus.$off('HB:Navigation-tasks-indicator', this.eventShowTasksIndicator);
    },
}
</script>
<style lang="scss">
#hb-navigation {
  display: flex;
  flex-direction: column;
  width: 60px;
  .v-list.isMobile {
    display: flex !important;
    flex-direction: row;
    padding: 8px 15px;
    .v-list-item {
      padding: 0 10px;
    }
  }
  &.isMobile {
    height: 60px !important;
    bottom: 0;
    position: fixed;
    top: initial !important;
    box-shadow: 0 0 5px rgba(0,0,0,0.3);
      .v-navigation-drawer__content {

      }
  }
}


    /*#hb-nav {*/
    /*    min-width: 56px;*/
    /*    display: flex;*/
    /*    align-items: stretch;*/
    /*    .hb-nav--inner {*/
    /*        position: fixed;*/
    /*        top: 0;*/
    /*        left: 0;*/
    /*        bottom: 0;*/
    /*        background: rgba(255,255,255,1);*/
    /*        border-right: 1px solid rgba(0,0,0,0.25);*/
    /*        width: 56px;*/
    /*        padding-top:70px;*/
    /*        &>.row {*/
    /*            padding: 5px;*/
    /*        }*/
    /*        .row {*/
    /*            span.nav-icon{*/
    /*                display: inline-block;*/
    /*                height: 24px;*/
    /*                width: 24px;*/
    /*                vertical-align: top;*/
    /*                margin-right: 0px;*/
    /*            }*/
    /*            .col {*/
    /*                padding: 0;*/
    /*            }*/
    /*        }*/
    /*        v-col {*/
    /*            text-align: center;*/
    /*        }*/
    /*    }*/
    /*    .hb-nav--footer {*/

    /*    }*/
    /*}*/






    /********************
    Navigation Styles
   *********************/

    .nav{
      transition: all .3s;
      transition-timing-function: cubic-bezier(0, 1, 0.5, 1);
    }

    span.nav-header {
      display: block;
      margin: 35px 0 10px 45px;
    }

    span.nav-header h3 {
      font-size: 12px;
      font-family: "Lato", sans-serif;
      font-weight: 700;
      color: #788f9b;
      letter-spacing: 1px;
      text-transform: uppercase;

    }

    .nav-wrapper{
      overflow-x: hidden;
    }
    .navigation {
      width: 100%;
      position: relative;
    }
    .navigation ul {
      margin: 0 0 0 0px;
      padding: 0;
      list-style: none;

    }

    .navigation ul li{
      padding: 0px 0;
      margin: 0;
    }



    /*.v-navigation-drawer__content a{*/
    /*    color: #788f9b;*/
    /*    font-family: "Roboto", sans-serif;*/
    /*    font-weight: 500;*/
    /*    font-size: 14px;*/
    /*    cursor: pointer;*/
    /*    line-height: 20px;*/
    /*    display: block;*/

    /*    padding: 7px 5px 7px 45px;*/
    /*    position: relative;*/
    /*    fill: currentColor;*/
    /*    -webkit-transition: .6s cubic-bezier(0.77, 0, 0.175, 1);*/
    /*    -moz-transition: .6s cubic-bezier(0.77, 0, 0.175, 1);*/
    /*    -o-transition: .6s cubic-bezier(0.77, 0, 0.175, 1);*/
    /*    border-top: 1px solid #FFFFFF;*/
    /*    border-bottom: 1px solid #FFFFFF;*/

    /*}*/

    .icon-path-dark{
      -webkit-transition: .6s cubic-bezier(0.77, 0, 0.175, 1);
      -moz-transition: .6s cubic-bezier(0.77, 0, 0.175, 1);
      -o-transition: .6s cubic-bezier(0.77, 0, 0.175, 1);
      fill: #788f9b;
    }


    .icon-path{
      -webkit-transition: .6s cubic-bezier(0.77, 0, 0.175, 1);
      -moz-transition: .6s cubic-bezier(0.77, 0, 0.175, 1);
      -o-transition: .6s cubic-bezier(0.77, 0, 0.175, 1);
      fill: #788f9b;
    }

    .v-navigation-drawer__content a.v-list-item--active .icon-path{
      fill: #00b2ce;
    }

    .v-navigation-drawer__content a.v-list-item--active .icon-path-dark{
      fill: #00a1c8;
      fill: #263238;
    }

    .v-navigation-drawer__content a.v-list-item--active{
      color: #00a1c8;
      border-top: 1px solid #e4eff4;
      border-bottom: 1px solid #e4eff4;
    }

    .navigation ul li a,
    .navigation ul li a:hover,
    .navigation ul li a:visited,
    .navigation ul li a:active{
      text-decoration: none;
    }
    span.nav-text {
      line-height: 20px;
    }
    span.nav-icon{
      display: inline-block;
      height: 20px;
      width: 20px;
      vertical-align: top;
    }

    .company-switcher{
      margin: 0 10px 10px;
      display: none;
      padding: 15px 30px 0;
    }

    .close-link-row {
      display: none;
    }

    .v-progress-circular {
      margin: 1rem;
    }

    .v-dialog{
      box-shadow: 0 !important;
    }

    .notifications-custom-padding{
      padding-left:11px;
    }
    .task-indicator{
      position: absolute;
      padding: 4.5px;
      background-color: red;
      border-radius: 50%;
      right: 25%;
      top: 25%;
      transform: translate(-50%, -50%);
      z-index: 1;
    }

    @media (max-width: 991px){

      .nav {
        margin-left: -225px;
        width: 200px;
        position: fixed;
        top: 0px;
        bottom: 0;
        overflow: auto;
        z-index: 7000;


      }

      .nav-open .nav{
        margin-left: 0px;
        width: 100%;
      }

      .company-switcher{
        display:block;
      }

      .close-link-row {
        display: block;
        height: 30px;
      }


    }



    @media (max-width: 893px) {

      .navbar-toggle {
        display: block;
      }

    }
    @media (max-width: 768px) {
      .sm-remove{
        display:none;
      }
      /*.nav-wrapper{*/
      /*transform:translateX(-225px);*/
      /*}*/
      /*.nav-open .nav-wrapper{*/
      /*transform:translateX(0px);*/
      /*width: 100%;*/
      /*}*/

      /*.nav-open .content-container{*/
      /*transform:translateX(225px);*/
      /*}*/

      .nav-open .navigation .hide-small{
        opacity: 1;
      }
    }

    @media (min-width: 600px){



    }


</style>
