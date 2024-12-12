<template>

  <div class="msgbox-area">

    <transition name="slide-fade">
    <v-card
      class="notification"
      elevation="10"
      :color="colors[n.status]"
      :dark="n.status !== 'open' && !isFormError(n) && !isFormSuccess(n)"
      v-for="(n, i) in notifications"
      :key="i"
    >
      <v-toolbar
        dense
        :color="colors[n.status]"
        elevation="0"
        :class="{'mb-3 success-border': isFormSuccess(n), 'mb-3 error-border': isFormError(n)}"
        >
          <v-icon
            :color="icon_color[n.status]"
          class="mr-2"
          >{{n.icon}}</v-icon>
        <v-toolbar-title class="font-weight-medium" :style="isFormError(n) ? 'font-size: 14px;' : ''">{{n.title}}</v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn v-if="n.dismissible" icon @click="removeNotification(n.id)">
          <v-icon
          >mdi-close</v-icon>
        </v-btn>
      </v-toolbar>
      <v-card-text class="pa-0 pl-4 font-weight-regular black--text" v-if="n.status == 'formError'">
        There are errors in your form, correct them before continuing.
      </v-card-text>
      <v-card-text class="pt-0 px-5 font-weight-regular black--text" :class="{'pb-0' : n.status == 'formError'}" color="white">
          {{n.text}}
      </v-card-text>
      <v-card-text class="pt-0 px-5 font-weight-regular black--text" color="white"  v-if="n.status == 'formError'">
          <ul>
            <li class="pt-1" v-for="(e, index) in n.errors"><span>{{e.msg}}</span></li>
          </ul>
      </v-card-text>
      <v-progress-linear
        :active="n.loading"
        :indeterminate="true"
        color="primary"
        height="2"
      ></v-progress-linear>
      <v-divider v-if="!isFormSuccess && !isFormError"></v-divider>
      <v-card-actions style="background-color: white" v-if="n.action">
        <v-spacer></v-spacer>
        <v-btn
          small
          color="secondary"
          @click="handleEventClick(n)"
        >
            {{n.btn_text}}
        </v-btn>
      </v-card-actions>
    </v-card>

    </transition>

  </div>

</template>

<script>

    import { mapGetters, mapActions } from 'vuex';
    import { EventBus } from '../../EventBus.js';

    export default {
        name: 'App',
        components: {},
        created(){},
        computed:{
            ...mapGetters({
                notifications: 'notificationsStore/notifications'
            }),
            filteredNotifications() {
              if(this.notifications.length) {
                return this.notifications.filter(n => (n.status == 'formWarning' || n.status == 'formSuccess' || (n.status == 'formError' && n.errors.length > 0)));
              }
            }
        },
        data: () => ({
            colors:{
               open: '#FFFFFF',
               success: 'primary',
                error: '#FB4C4C',
                formSuccess: '#e1fae3',
                formError: '#f8e5e1',
                formWarning: '#f8e5e1'
            },
            icon_color:{
                open: '#101318',
                success: 'white',
                error: 'white',
                formSuccess: '#02ad0f',
                formError: '#fb4c4c',
                formWarning: '#fb4c4c'
            }
        }),
        methods: {
          removeNotification(id){
              this.$store.commit('notificationsStore/removeNotification', id);

          },
          handleEventClick(notification){
              // Do this in notifications
              this.$store.dispatch('notificationsStore/handleEventClick', notification);
          },
          isFormError(n) {
            return (n.status === 'formError' || n.status === 'formWarning') ? true : false;
          },
          isFormSuccess(n) {
            return (n.status === 'formSuccess') ? true : false;
          }
        }
    }

</script>

<style scoped>

  .notification{
    transition: opacity 300ms ease-in;
    -webkit-transition: opacity 300ms ease-in;
    margin: 0 0 15px;
    -webkit-box-align: center;
    align-items: center;
  }

  .msgbox-area {
    max-height: 100%;
    position: fixed;
    bottom: 15px;
    left: 20px;
    right: 20px;
    z-index: 999999;
  }

  .success-border{
    border-bottom: 3px solid #02ad0f !important;
  }

  .error-border {
    border-bottom: 3px solid #fb4c4c !important;
  }



  .msgbox-area .notification:last-child {
    margin: 0;
  }

  @media (min-width: 481px) and (max-width: 767px) {
    .msgbox-area {
      left: 80px;
      right: 80px;
    }
  }
  @media (min-width: 768px) {
    .msgbox-area {
      width: 335px;
      height: 0;
      top: 88px;
      left: auto;
      right: 15px;
    }
  }
/* Enter and leave animations can use different */
/* durations and timing functions.              */
.slide-fade-enter-active {
  transition: all .3s ease;
}
.slide-fade-leave-active {
  transition: all .8s cubic-bezier(1.0, 0.5, 0.8, 1.0);
}
.slide-fade-enter, .slide-fade-leave-to
/* .slide-fade-leave-active below version 2.1.8 */ {
  transform: translateX(20px);
  opacity: 0;
}

</style>
