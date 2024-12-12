<template>
  <v-app>
    <component :is="layout" class="content-wrap">
      <router-view></router-view>
    </component>
  </v-app>
</template>

<script type="text/babel">
  import { mapGetters, mapActions } from 'vuex';
  import AsyncLoader from './components/includes/Loading.vue';

  export default {
    name: 'App',
    components: {
        UnauthenticatedLayout: () => import('./views/Unauthenticated.vue'),
        MasterLayout: () => ({
            component: import(/* webpackChunkName: 'master' */'./views/Master.vue'),
            loading: AsyncLoader
        }),
        NoSidebarLayout: () => import(/* webpackChunkName: 'NoSidebar' */ './views/NoSidebar.vue'),
        NoHeaderLayout: () => import(/* webpackChunkName: 'NoHeader' */ './views/NoHeader.vue'),
    },

      computed:{
          ...mapGetters({
              isLoaded: 'authenticationStore/isLoaded',
              isAdmin: 'authenticationStore/isAdmin',
              // hasOmniSearch: 'navigationStore/hasOmniSearch',


          }),
          hasSidebar(){
            return !!this.slideOutComponent;
          },
          layout() {
            return this.$route.meta.layout ? this.$route.meta.layout + "-layout" : "unauthenticated-layout";
          },
          isMini() {
            switch (this.$vuetify.breakpoint.name) {
              case 'xs': return false
              case 'sm': return false
              case 'md': return false
              case 'lg': return false
              case 'xl': return true
            }

          }
    },
    data: () => ({
    }),
    methods: {
    }
  };
</script>


<style lang="scss">

  @import "../node_modules/@ag-grid-community/all-modules/dist/styles/ag-grid.css";
  @import "../node_modules/@ag-grid-community/all-modules/dist/styles/ag-theme-balham.css";

  html {
    font-size: 14px;
  }

  label {
    padding: 5px;
    display: block;
  }

  .bordered-table{
    border: 1px solid #e2e2e2;
  }

  #app {
    font-family: 'Graphik Web', sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    color: #101318;

    .v-application {
      .navigation {
        ul {
          padding: 0;
        }
      }
    }

    .section-content {
      display: flex;
      flex-direction: column;
      outline: 0;
      width: 100%;
      padding: 17px 20px 10px 40px;
    }

    &.xs {
      .section-content {
        padding: 60px 10px 60px 10px;
      }
    }
  }

  .section-header{
    text-align: center;
  }

  .nav-drawer-header{
    border-bottom:  1px solid #C6CDD4;
  }

  .new_lead .v-navigation-drawer__content {
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    display: flex;
  }

  .content-wrap{
    display: flex;
    flex-direction: column;
    height: 100vh;
  }


  .slide-out-right {
    top: 8.91rem !important;
  }

  .hb-table{
    border: 1px solid #DFE3E8;
    padding: 0;
  }

  .hb-table-row{
    margin: 0;
    font-size: 14px;
    border-bottom: 1px solid #DFE3E8;
  }

  .hb-table-row-textarea {
    margin: 0;
    font-size: 14px;
    border-bottom: 1px solid #DFE3E8;
  }

  .hb-table-row input, .hb-table-row textarea {
    font-size: 14px;
  }

  .hb-table-row:last-child{
    border-bottom: none;
  }

  .hb-table-label{
    background: #F4F6F8;
    padding: 15px 12px;
    font-weight: 500;
  }

  .hb-table-value .v-input--radio-group{
    margin: 0;
  }

  .hb-table-value{
    padding: 8px 12px;
    margin: 0;
  }
  .hb-table-value.text{
    padding-top: 15px;
  }

  .hb-table-checkbox{
    padding: 8px 12px;
    margin: 0;
  }
  .editor-container{
    position: absolute;
    top: 55px;
    bottom: 0;
    /* overflow: scroll; */
    padding-bottom: 64px;
    width: 100%;
  }
  .editor-container{
    position: absolute;
    top: 55px;
    bottom: 0;
    /* overflow: scroll; */
    padding-bottom: 64px;
    width: 100%;
  }
  .hb-table-value > .row.inner-form-row{
    padding: 0;
    margin: 0;
  }
  .hb-table-value > .row.inner-form-row > .col{
    padding: 0;
    margin: 0 10px 0 0;
  }
  .hb-table-value .v-input {
    border-radius: 0;
  }


  .v-text-field.v-input--dense:not(.v-text-field--outlined) input {
    padding: 5px 0 8px 0;
  }


  .hb-table-value .row.inner-form-row  .v-text-field>.v-input__control>.v-input__slot:before {
    /*border-style: none;*/
    border-color: #DFE3E8;
  }




  .hb-table-value .row.inner-form-row .col .v-input {
    /*border-bottom: 1px solid #DFE3E8;*/
    margin-bottom: 10px;
    padding-bottom: 5px;
  }

  /*.hb-table-value .row.inner-form-row:last-child .col .v-input {*/
  /*  border-bottom: none;*/
  /*  margin-bottom: 0;*/
  /*  padding-bottom: 0px;*/
  /*}*/


  .panel-footer{
    border-top: 1px solid #DFE3E8 !important;
    z-index: 5;
    position: absolute;
    bottom: 0;
    width: 100%;
  }
  .edit-panel{
    position: absolute;
    overflow-y: scroll;
    width: 100%;
    top: 0px;
    bottom: 60px;
  }
  .v-card {
    position: relative !important;
  }

  .hb-table-lined-input{
    margin: 0 15px 15px;


  }

  .danger-color{
    color: #F44336;
  }

  .container.payment-method-container {
    padding: 0;
  }
  .adjust-label .v-label {
    left: -26px !important;
  }
  .v-input--selection-controls .v-input__slot > .v-label, .v-input--selection-controls .v-radio > .v-label{
    font-size: 14px;
  }
  .v-icon.v-icon{
    color: #101318;
    font-size: 22px;
  }

  .blade-container-content {
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    max-height: 80vh;
  }
  .edit-panel-hasSideBar {
    overflow-y: scroll;
    width: 100%;
    top: 0px;
    bottom: 60px;
    height: 100%;
    max-height: 48vh;
  }
  .btn-style {
    font-weight: normal;
    letter-spacing: normal;
  }
  .secondary-button {
    background: linear-gradient(180deg, #FFFFFF 0%, #F9FAFB 100%);
    border: 1px solid #C4CDD5;
    box-shadow: 0px 1px 0px rgba(22, 29, 37, 0.05);
  }
  .primary-button {
    background: linear-gradient(180deg, #47C0BF -70%, #00848E 126.25%);
    border: 1px solid #00848E;
    box-shadow: 0px 1px 0px rgba(22, 29, 37, 0.05);
    color: #FFFFFF;
  }
  .custom-edit {
    color: #00848E;
    cursor: pointer;
  }
  .interaction {
    display: -webkit-box;
    display: -webkit-flex;
    display: -ms-flexbox;
    display: flex;
    border-bottom: 1px solid #dce8ef;
  }
  .custom-description {
    background: #FFFFFF;
    padding: 16px 24px;
    font-size: 14px;
    line-height: 20px;
    color: #637381;
  }
  .contact-details .v-label, .automation .v-label , .automation .v-select, .automation textarea, .automation .v-text-field__slot{
    font-size: 14px !important;
  }
  .contact-details .v-text-field.v-input--dense .v-input__prepend-inner .v-input__icon > .v-icon, .v-text-field.v-input--dense .v-input__append-inner .v-input__icon > .v-icon {
    margin-top: 0px;
  }
  .contact-details .v-list-item--dense .v-list-item__content, .v-list--dense .v-list-item .v-list-item__content {
    text-transform: capitalize;
  }
  .leads-section .v-slide-group__wrapper {
    border-bottom: 4px solid rgba(0, 0, 0, 0.12) !important;
  }
  .setup-transfer .theme--light.v-data-table.hb-data-table-cursor-on tbody tr td {
    max-width: 100px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .z-250,
  .setting-sidebar-z-250 .v-menu__content.theme--light.v-menu__content--fixed
  {
    z-index: 250 !important;
  }
  .setting-sidebar-z-310 .v-menu__content.theme--light.v-menu__content--fixed
  {
    z-index: 310 !important;
  }
  .groups th {
    font-size: 14px !important;
    font-weight: 500;
  }

  /*.theme--light.v-stepper .v-stepper__step:not(.v-stepper__step--active):not(.v-stepper__step--complete):not(.v-stepper__step--error) .v-stepper__step__step {*/
  /*  border: 2px solid rgba(0, 0, 0, 0.38);*/
  /*  background-color: white;*/
  /*}*/

  .theme--light.v-stepper .v-stepper__step.editable .v-stepper__step__step,
  .theme--light.v-stepper .v-stepper__step.v-stepper__step--editable .v-stepper__step__step {
    border: 2px solid #00848E;
    background-color: white !important;
    color: white;
  }

  .theme--light.v-stepper .v-stepper__step.editable .v-stepper__step__step,
  .theme--light.v-stepper .v-stepper__step.v-stepper__step--innactiv   html {
    font-size: 14px;
  }

  /*.theme--light.v-stepper .v-stepper__step:not(.v-stepper__step--active):not(.v-stepper__step--complete):not(.v-stepper__step--error) .v-stepper__step__step {*/
  /*  border: 2px solid rgba(0, 0, 0, 0.38);*/
  /*  background-color: white;*/
  /*}

   */

  .theme--light.v-stepper .v-stepper__step.step-editable .v-stepper__step__step,
  .theme--light.v-stepper .v-stepper__step.v-stepper__step--editable .v-stepper__step__step {
    border: 2px solid #00848E;
    background-color: white !important;
    color: white;
  }


  .theme--light.v-stepper .v-stepper__step.step-active .v-stepper__step__step,
  .theme--light.v-stepper .v-stepper__step.v-stepper__step--active .v-stepper__step__step {
    border: 2px solid #00848E;
    background-color: white  !important;
    color: white;
  }


  .theme--light.v-stepper .v-stepper__step.step-active .v-stepper__step__step:before {
    content: "";
    background: #00848E;
    border-radius: 50%;
    width: 8px;
    height: 8px;
    margin: 0 auto;
    display: block;
    position: absolute;
  }



  .theme--light.v-stepper {
    cursor: pointer;
  }

  .theme--light.v-stepper .v-stepper__step.step-error .v-stepper__step__step,
  .theme--light.v-stepper .v-stepper__step.v-stepper__step--error .v-stepper__step__step {
    color: white;
    border: 2px solid #FB4C4C;
    background: #FB4C4C;

  }

  .theme--light.v-stepper .v-stepper__step.step-disabled .v-stepper__step__step {
    border: 2px solid #DFE3E8;
    background-color: white !important;
    color: white;
  }

  .theme--light.v-stepper .v-stepper__label,
  .theme--light.v-stepper .v-stepper__step.step-editable .v-stepper__label,
  .theme--light.v-stepper .v-stepper__step.step-active .v-stepper__label{
    color: rgba(0, 0, 0, 0.87);
  }


  .theme--light.v-stepper .v-stepper__step.step-error .v-stepper__label {
    color: #FB4C4C;
  }

  .theme--light.v-stepper .v-stepper__step.step-disabled .v-stepper__label {
    color: #DFE3E8;
  }

  .v-stepper--alt-labels .v-stepper__step {
    -ms-flex-preferred-size: 100px;
    flex-basis: 100px;
  }

  .v-stepper--alt-labels .v-stepper__header .v-divider {
    margin: 35px -30px 0 !important;
  }

  .v-stepper--alt-labels .v-stepper__step {
    -ms-flex-preferred-size: 100px;
    flex-basis: 100px;
  }

  .v-stepper--alt-labels .v-stepper__header .v-divider {
    margin: 35px -30px 0;
  }

/* turn off focus border */
a:focus, button:focus {
  outline: none;
  border: none;
}

/* design system styles */
.hb-flex-align {
    display: flex;
    align-items: center;
}
.hb-flex-all {
    display: flex;
    justify-content: center;
    align-items: center;
}

/* type styles */
.hb-default-font-size{
  font-size: 14px;
  line-height: 20px;
  font-weight: normal;
  letter-spacing: normal;
}
.hb-larger-font-size{
  font-size: 16px;
  line-height: 20px;
  font-weight: normal;
  letter-spacing: normal;
}
.hb-header-font-size{
  font-size: 28px;
  line-height: 32px;
  font-weight: 500;
  letter-spacing: normal;
}
strong {
  font-weight: 500;
}

/* color styles */
.hb-teal-lighter{
  background-color: #E0F5F5;
}
.hb-teal{
  background-color: #47C1BF;
}
.hb-teal-dark{
  background-color: #00848E;
}
.hb-teal-darkest{
  background-color: #003135;
}
.hb-cloud-lighter{
  background-color: #F9FAFB;
}
.hb-cloud-light{
  background-color: #F4F6F8;
}
.hb-cloud{
  background-color: #DFE3E8;
}
.hb-cloud-dark{
  background-color: #C4CDD5;
}
.hb-text-night{
  color: #101318;
}
.hb-text-lighter{
  color: #C6CDD4;
}
.hb-text-light{
  color: #637381;
}
.hb-text-cloud{
  color: #DFE3E8;
}
.hb-accept{
  background-color: #02AD0F;
}
.hb-accept-light{
  background-color: #E1FAE3;
}
.hb-caution{
  background-color: #FFD600;
}
.hb-caution-light{
  background-color: #FEF7E1;
}
.hb-destroy{
  background-color: #CD2400;
}
.hb-destroy-status{
  background-color: #FB4C4C;
}
.hb-destroy-light{
  background-color: #F8E5E1;
}
.hb-retired{
  background-color: #919EAB;
}
.hb-chart-color-1{
  background-color: #CE6EE2;
}
.hb-chart-color-2{
  background-color: #4AC3AB;
}
.hb-chart-color-3{
  background-color: #FAA838;
}
.hb-chart-color-4{
  background-color: #67CFF5;
}
.hb-chart-color-5{
  background-color: #C6CDD4;
}
.hb-chart-color-6{
  background-color: #F17A37;
}
.hb-chart-color-7{
  background-color: #38AFC6;
}
.hb-chart-color-8{
  background-color: #E4DE3E;
}
.hb-chart-color-9{
  background-color: #E24F60;
}
.hb-chart-color-10{
  background-color: #4B5FC7;
}

.hb-text-teal-lighter{
  color: #E0F5F5;
}
.hb-text-teal{
  color: #47C1BF;
}
.hb-text-teal-dark{
  color: #00848E;
}
.hb-text-teal-darkest{
  color: #003135;
}
.hb-text-accept{
  color: #02AD0F;
}
.hb-text-accept-light{
  color: #E1FAE3;
}
.hb-text-caution{
  color: #FFD600;
}
.hb-text-caution-light{
  color: #FEF7E1;
}
.hb-text-destroy{
  color: #CD2400;
}
.hb-text-destroy-status{
  color: #FB4C4C;
}
.hb-text-destroy-light{
  color: #F8E5E1;
}
.hb-text-retired{
  color: #919EAB;
}

/* status styles */
.hb-status-font {
  font-family: 'Graphik Web', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #101318
}
.hb-v-chip.v-chip.v-size--small {
  height: 22px;
  padding: 0 7px 0 5px;
}
.hb-v-chip-text {
  font-size: 11px;
}
.hb-v-chip.v-chip.v-chip--outlined.v-chip.v-chip {
  background-color: #ffffff !important;
}

/* tertiary styles */
.theme--light.v-navigation-drawer.hb-tertiary-navigation {
  background: #F9FAFB;
}
.theme--light.v-navigation-drawer.hb-tertiary-navigation * {
  -webkit-transition: none !important;
  -moz-transition: none !important;
  -o-transition: none !important;
  transition: none !important;
}
.hb-tertiary-navigation .theme--light.v-list-item:not(.v-list-item--active):not(.v-list-item--disabled) {
  color: #637381 !important;
}
.hb-tertiary-navigation .v-navigation-drawer__content a.v-list-item--active {
    color: #101318;
    font-weight: 500;
    border: none;
}
.hb-tertiary-navigation .theme--light.v-list-item:not(.v-list-item--active):not(.v-list-item--disabled):hover{
  color: #101318 !important;
  font-weight: normal;
}
.hb-tertiary-navigation .v-list-item--link::before {
  background: none;
}
.v-ripple__container {
  opacity: 0 !important;
}

/* header styles */
.hb-header-avatar{
  margin-top:2px;
}
.v-input.hb-header-select{
  min-width: 200px;
  max-width: 327px;
}
.hb-header-actions{
  flex-basis: auto;
}
.hb-text-field-custom.v-input {
  background: #FFFFFF;
}
.hb-header-search-bar {
  min-width: 200px;
}
.hb-text-field-custom .v-icon.v-icon {
  color: #637381;
}
.hb-text-field-custom .v-input__icon--clear .v-icon {
  color: #C6CDD4;
  font-size: 18px;
}
.v-text-field--outlined fieldset {
  border-color: #C6CDD4;
}
.v-select.v-text-field input {
  font-size: 14px;
}
.hb-header-autocomplete.v-select.v-text-field input {
  font-size: 16px;
}
.hb-header-bladido-icon {
  margin-right: -1px;
  padding-top: 3px;
}

/* notifications styles */
.hb-notification-column-1 {
  display: flex;
  flex: 1;
}
.hb-notification-caution {
  background-color: #FFF9DA;
  border: 1px solid #FFD600;
  border-radius: 5px;
}
.hb-notification-warning {
  background-color: #F8E5E1;
  border: 1px solid #f96060;
  border-radius: 5px;
}
.hb-notification-success {
  background-color: #E1FAE3;
  border: 1px solid #72d479;
  border-radius: 5px;
}
.hb-notification-quick-actions {
  background-color: #E0F5F5;
  border: 1px solid #b3dee0;
  border-radius: 5px;
}
.hb-quick-action-title {
  margin: 3px 0;
}
.hb-quick-action-slot {
  padding-top: 6px;
}

/* modal styles */
.hb-modal-fullscreen-footer {
  position: fixed;
  border-top: 1px solid #DFE3E8;
  bottom: 0;
  width: 100%;
}
.hb-modal-sub-header {
  min-height: 44px;
  padding-top: 11px;
  padding-bottom: 14px;
}
.settings-dialog-modal.hb-delete-border {
  border: 2px solid #FFD600;
  border-radius: 6px !important;
}
.hb-modal-caution {
  background-color: #FFF9DA;
}

/* icon styles */
.v-tooltip {
  position: relative;
  z-index: 99999;
}
.v-tooltip__content {
  background: #334450 !important;
  opacity: 1 !important;
}
.v-btn.hb-button-icon-hamburger-hover-settings {
  background: #333333;
}
.v-btn.hb-button-icon-hamburger-hover {
  background: #004247;
}
.v-btn.hb-button-icon-hover {
  background: #DFE3E8;
}
.v-btn.hb-button-icon-active {
  background: #E0F5F5;
}
.v-btn > .v-btn__content .v-icon {
  color: #637381;
}
.v-btn.v-btn--disabled svg:not(.svg-outlier) path {
  fill: #cecece;
}
.v-btn.v-btn--disabled svg.svg-outlier path {
  stroke: #cecece;
}
.hb-user-avatar {
  font-size: 18px;
}
.hb-v-btn-icon.v-btn--icon.v-size--default {
  height: 40px;
  width: 40px;
}

/* table styles */
.ag-theme-material, .ag-theme-material .ag-header {
  font-family: 'Graphik Web', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
.theme--light.v-data-table table thead {
  background-color: #F4F6F8;
}
.theme--light.v-data-table table thead tr th {
  color: #474F5A !important;
  font-weight: 500;
  font-size: 12px !important;
}
.theme--light.v-data-table table thead tr th:hover {
  color: #101318 !important;
}
.theme--light.v-data-table.hb-data-table-cursor-on tbody tr {
  cursor: pointer;
}
.theme--light.v-data-table.hb-data-table-cursor-on tbody tr:hover {
  background: #eeeeee !important;
}

/* tab styles */
* .v-slide-group__wrapper {
  border-bottom-width: 1px !important;
}
.v-tab, a.v-tab {
  letter-spacing: normal !important;
  font-size: 14px !important;
  font-weight: normal !important;
}
.theme--light.v-tabs > .v-tabs-bar .v-tab:not(.v-tab--active), .theme--light.v-tabs > .v-tabs-bar .v-tab:not(.v-tab--active) > .v-icon, .theme--light.v-tabs > .v-tabs-bar .v-tab:not(.v-tab--active) > .v-btn, .theme--light.v-tabs > .v-tabs-bar .v-tab--disabled {
  color: #637381 !important;
}
.theme--light.v-tabs > .v-tabs-bar .v-tab:not(.v-tab--active):hover, .theme--light.v-tabs > .v-tabs-bar .v-tab:not(.v-tab--active) > .v-icon:hover, .theme--light.v-tabs > .v-tabs-bar .v-tab:not(.v-tab--active) > .v-btn:hover, .theme--light.v-tabs > .v-tabs-bar .v-tab--disabled:hover {
  color: #101318 !important;
  background-color: #F9FAFB;
}
.v-tab--active, a.v-tab--active {
  font-weight: 500 !important;
}
.hb-dot {
    height: 9px;
    width: 9px;
    margin: 1px 0 0 5px;
    background-color: #02AD0F;
    border-radius: 50%;
    display: inline-block;
}
.hb-doterror {
    background-color: #CD2400;
}

.hb-dot-task {
  background-color: #F26500;
}

/* card styles */
.theme--light.v-expansion-panels.hb-expansion-panel .v-expansion-panel-header .v-expansion-panel-header__icon .v-icon {
    color: #637381;
}
.theme--light.v-expansion-panels.hb-expansion-panel .v-expansion-panel-header {
  padding: 2px 0;
}
.theme--light.v-expansion-panels.hb-expansion-panel .v-expansion-panel--active > .v-expansion-panel-header {
  min-height: 52px;
}
.theme--light.v-expansion-panels.hb-expansion-panel .v-expansion-panel-header.hb-subpanel-header {
  min-height: 38px;
}
.hb-expansion-panel .v-expansion-panel-content__wrap {
  padding: 0;
  margin: 0;
}
.hb-expansion-panel .v-input, .hb-expansion-panel .v-input label {
  font-size: 14px;
}
.hb-expansion-panel .v-input label {
  margin-top: -2px;
}
.hb-expansion-panel .v-expansion-panel-header {
  border-radius: 0 !important;
}
.hb-expansion-panel .v-expansion-panel {
  border-radius: 4px !important;
}
.v-expansion-panel:not(:first-child)::after {
  border-top: none !important;
}
.hb-custom-switch-label {
  min-width: 30px;
}

/* toggle styles */

.theme--light.v-input--selection-controls.v-input--is-disabled:not(.v-input--indeterminate) i.v-icon {
  color: #00848E !important;
  opacity: .2;
}

/* background & border styles */
.hb-background-color-caution {
  background-color: #FFF9DA;
}
.hb-background-color-warning {
  background-color: #F8E5E1;
}
.hb-background-color-success {
  background-color: #E1FAE3;
}
.ti-widget.v-card.hb-border-caution, .hb-border-caution {
  border: 1px solid #FFD600;
}
.ti-widget.v-card.hb-border-warning, .hb-border-warning {
  border: 1px solid #f96060;
}
.ti-widget.v-card.hb-border-success, .hb-border-success {
  border: 1px solid #72d479;
}

/* button styles */
.v-btn {
  letter-spacing: normal;
}
.v-btn::before {
  background: inherit;
}
.hb-opacity-50 {
  opacity: .5;
}
.hb-button-text-small {
  font-size: 12px;
}
.hb-button-text-regular {
  font-size: 14px;
}
.hb-button-text-large {
  font-size: 16px;
}
.hb-primary-button {
  background: linear-gradient(180deg, #47C0BF -70%, #00848E 126.25%);
  border: 1px solid #00848E;
  box-shadow: 0px 1px 0px rgba(22, 29, 37, 0.05);
  color: #FFFFFF;
}
.hb-primary-button-hover {
  background: linear-gradient(180deg, #47C0BF -142.5%, #00848E 103.75%);
  border: 1px solid #005F66;
}
.hb-secondary-button {
  background: linear-gradient(180deg, #FFFFFF 0%, #F9FAFB 100%);
  border: 1px solid #C4CDD5;
  box-shadow: 0px 1px 0px rgba(22, 29, 37, 0.05);
}
.hb-secondary-button-hover {
  background: linear-gradient(180deg, #FAFBFC 0%, #EBEFF2 100%);
}
.hb-full-width-button {
  background: #FFFFFF !important;
  border: 1px solid #C4CDD5;
  box-shadow: 0px 1px 0px rgba(22, 29, 37, 0.05);
}
.hb-destructive-button {
  background: linear-gradient(180deg, #D34B30 -70%, #C24228 126.25%);
  border: 1px solid #A13621;
  box-shadow: 0px 1px 0px rgba(22, 29, 37, 0.05);
}
.hb-destructive-button-hover {
  background: linear-gradient(180deg, #D34B30 -133.75%, #C24228 106.25%);
  border: 1px solid #8C2F1D;
}
.v-application a.hb-link-secondary, .hb-link-secondary {
  color: #306FB6;
  text-decoration:none;
}
.v-application a.hb-link-tertiary, .hb-link-tertiary {
  color: #637381;
  text-decoration:none;
}
.v-application a.hb-link-night, .hb-link-night {
  color: #101318;
  text-decoration:none;
}
.v-application a.hb-text-destroy-status, .hb-text-destroy-status {
  color: #FB4C4C;
  text-decoration:none;
}
.v-application a.hb-link-disabled, .hb-link-disabled {
  color: #919EAB;
  text-decoration:none;
  cursor:default;
}
.v-application a.hb-link, .hb-link {
  color: #00848E;
  text-decoration:none;
}

/* info card styles */
.hb-info-card-button{
  position: absolute;
  top: 15px;
  right: 15px;
}

/* improvement fixes */
.container.hb-table {
  padding-top: 0;
  padding-bottom: 0;
}

/* form fixes */
.theme--light.v-text-field > .v-input__control > .v-input__slot::before {
  border-color: #F3F3F4 !important;
}
.theme--light.v-label {
  color: #637381 !important;
}
.hb-form-editable {
  cursor: pointer;
}
.hb-form-editable:hover {
   background-color: #F9FAFB;
}
.v-label.v-label--active.theme--light {
  color: #637381 !important;
}
.hb-z-index-99999 {
  position: relative;
  z-index: 99999;
}
.hb-z-index-100000 {
  position: relative;
  z-index: 100000;
}
.hb-clear-icon-select .v-icon.notranslate.v-icon--link.material-icons.theme--light.primary--text {
  color: #637381 !important;
}

.hb-input-overflow {
  width:100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.hand{
  cursor: pointer;
}
.task-list-container{
  max-height: 89vh;
  overflow: auto;
}

/* new forms styles */
.hb-forms-label{
  background: #F4F6F8;
  padding: 10px 17px !important;
  font-weight: 500;
}

.hb-forms-max-width-498{
  max-width: 498px !important;
}

.hb-half-pixel-fix-lead {
  margin-top:-12.5px !important;
}

.hb-half-pixel-fix{
  padding-top:.5px !important;
}

.hb-forms-content {
  padding: 10px 20px !important;
}

.hb-forms-content-onboarding {
  padding: 4.5px 17px 13px !important;
}

.hb-table-row .v-input .v-label {
  line-height: 24px;
}

.hb-table-row-textarea .v-input .v-label {
  line-height: 16px !important;
}

.hb-table-row-textarea .v-textarea textarea {
  height: 28px;
  min-height: 28px;
}

  .form-controls{
    background: #f5f5f5;
    border: 1px solid #e2e2e2;
  }


</style>
