<template>
  <div
    class="section-content pt-4"
    :class="{
      'mt-10': $vuetify.breakpoint.xs,
      'mt-n3': $vuetify.breakpoint.sm,
    }"
  >
    <div class="primary-section-content1">
      <hb-header class="pt-5" fewer-actions>
        <template v-slot:left>
          <hb-page-header title="Onboarding Companies"></hb-page-header>
        </template>
      </hb-header>
    </div>
    <div class="content-view">
      <v-row>
        <v-col cols="4">
          <v-text-field
            outlined
            hide-details
            dense
            v-model.lazy="searchField"
            prepend-inner-icon="mdi-magnify"
            clear-icon="mdi-close-circle"
            class="hb-text-field-custom d-flex"
            :placeholder="'Search Companies'"
          ></v-text-field>
        </v-col>
        <v-col cols="8" class="pull-right-item">
          <hb-btn color="primary" @click="popUpModal()"> Add Company</hb-btn>
        </v-col>
      </v-row>
      <add-new-company
        v-if="dialog"
        :isEdit="isEdit"
        :companyDetails="companyDetails"
        :internal_contact="internal_contact"
        @close="closeModal"
      ></add-new-company>
      <add-property v-if="addPropertyDialog" :isEdit="isEdit" :propertyDetails="propertyDetails" :companyDetails="companyDetails" @close="closeAddPropertyDialog"></add-property>

    </div>
    <div>
      <v-expansion-panels v-model="panel" multiple class="hb-expansion-panel">
        <v-expansion-panel
          class="mt-2"
          v-for="company in companies"
          :key="company.id"
        >
          <v-expansion-panel-header class="hb-default-font-size py-4 px-4">
            <v-row class="pl-4">
              <v-col cols="7" class="pa-2 ma-0">
                <span
                  class="hb-larger-font-size font-weight-medium"
                  :title="company.name"
                  >{{ company.name }} </span
                >
                <span
                  class="font-weight-medium"
                  :title="company.subdomain+'.'+ getHostname ()"
                  style="color: #00848E;"
                >
                  {{ company.subdomain +'.'+getHostname () }}
                </span>
              </v-col>
              <v-col cols="5" class="pa-0 ma-0 pull-right-item">
                <!-- <span>
                  <b>Progress:</b><span class="red-label"> 0%</span>
                </span> -->
                <span class="ma-2">
                  <hb-btn :color="canAddProperty(company) ? 'secondary' : 'primary'" :disabled="canAddProperty(company) ? true : false" @click="addProperty(company)">Add Property </hb-btn>
                </span>

                <v-menu
                  close-on-click
                  close-on-content-click
                  offset-y
                  class="d-inline-block"
                >
                  <template v-slot:activator="{ on, attrs }">
                    <span
                      v-bind="attrs"
                      v-on="on"
                      class="d-inline-block"
                      style="margin-right: 10px;"
                    >
                      <hb-btn icon tooltip="Options" active-state-off>
                        mdi-dots-vertical
                      </hb-btn>
                    </span>
                  </template>
                  <v-list>
                    <v-list-item :ripple="false">
                      <v-list-item-title>
                        <v-list-item-title class="tooltip-cursor" @click="edit(company)"
                          >View/Edit Company Info</v-list-item-title
                        >
                      </v-list-item-title>
                    </v-list-item>

                    <v-list-item :ripple="false" v-if="company.status === 'new'">
                      <v-list-item-title>
                        <v-list-item-title class="tooltip-cursor" @click="statusChange(company)">Instance is ready</v-list-item-title>
                      </v-list-item-title>
                    </v-list-item>
                  </v-list>
                </v-menu>
              </v-col>
            </v-row>
          </v-expansion-panel-header>
          <v-divider></v-divider>
          <v-expansion-panel-content class="pa-0 ma-0" elevation="0">
            <div class="mx-3 my-3"> 
              <div>
              <span><span class="text_bold">Technical Lead:</span> {{company.tech_contact_name}}</span>
              <span class="float-right mr-2"><span class="text_bold">Company Added:</span> {{ format_date(company.created_at)}} </span>
            </div>

              <onboarding-properties :properties="company.properties" :companyDetails='company' v-on:edit-property="editProperty" @refreshComponyData='refreshGetComponyData' :getHostname='getHostname ()'></onboarding-properties>
            </div> 
          </v-expansion-panel-content>
        </v-expansion-panel>
        <v-expansion-panel class="mt-2" v-if="companies.length == 0">
          <v-container>
            <v-row justify="center">
              <span style="text-align:center;">No companies found</span>
            </v-row>
          </v-container>
        </v-expansion-panel>
      </v-expansion-panels>
    </div>
     <hb-success-error
            v-model="successError"
            :type="successErrorType"
            :description="successErrorDescription"
            :list="successErrorList && successErrorList.length ? successErrorList : []"
            :title="successErrorTitle"
            :icon="successErrorIcon"
            :complete="successErrorComplete"
        >
            <span v-if="successErrorContent" v-html="successErrorContent"></span>
            <template v-slot:footer>
                <span v-if="successErrorFooter" v-html="successErrorFooter"></span>
            </template>
        </hb-success-error>
  </div>
</template>
<script>
import HbBtn from "../../../aviary/HbBtn.vue";
import AddNewCompany from "./AddNewCompany";
import api from "../../../assets/api.js";
import OnboardingProperties from './property/OnboardingProperties.vue';
import AddProperty from "./property/AddProperty.vue";
import moment from 'moment';
import { EventBus } from '../../../EventBus.js';
export default {
  data() {
    return {
      dialog: false,
      searchField: "",
      companiesList: [],
      panel: [],
      isEdit: false,
      companies: [],
      companyDetails: {},
      addPropertyDialog:false,
      filterData: [],
      phone_types: ["Phone", "Cell", "Home", "Work", "Fax", "Other"],
      internal_contact: [],
      successError: false,
      successErrorType: '',
      successErrorDescription: '',
      successErrorList: [],
      successErrorTitle: '',
      successErrorIcon: '',
      successErrorComplete: false,
      successErrorContent: '',
      successErrorFooter: ''
    };
  },
  created() {
    this.getCompanies();
    this.getTechnicalContacts();
     EventBus.$on('success-error-message', this.setSuccessError);
  },
  components: {
    AddNewCompany,
    HbBtn,
    OnboardingProperties,
    AddProperty
  },
  watch: {
    searchField() {
      const term = this.searchField.toLowerCase();
      if (this.searchField.length) {
        this.companies = this.filterData.filter((filteredMountain) => {
          return filteredMountain.name.toLowerCase().includes(term);
        });
      } else {
        this.companies = this.filterData;
      }
    },
  },
  methods: {
    getCompanies() {
      api.get(this, api.ADD_ONBOARDING_COMPANY).then((res) => {
        this.companies = res.OnboardingCompanyData;
        this.filterData = res.OnboardingCompanyData;
      });
    },
    getTechnicalContacts(){
      api.get(this, api.TECHNICAL_CONTACTS).then((res) => {
        this.internal_contact = res.List;
      });
    },
    popUpModal() {
      this.dialog = true;
      this.isEdit = false;
      this.companyDetails = {};
    },
    closeModal() {
      this.dialog = false;
      this.getCompanies();
    },
    edit(data) {
      this.isEdit = true;
      this.dialog = true;
      this.companyDetails = data;
    },
    addProperty(company) {
      this.addPropertyDialog = true
      this.isEdit = false;
      this.propertyDetails = {};
      this.companyDetails = company
    },
    editProperty(data,conpanyData) {
      this.addPropertyDialog = true
      this.isEdit = true;
      this.propertyDetails = data;
      this.companyDetails = conpanyData
    },
    closeAddPropertyDialog () {
      this.addPropertyDialog = false
      this.getCompanies();
    },
    refreshGetComponyData () {
      this.getCompanies();
    },
    format_date(value){
         if (value) {
           return moment(String(value)).format('MMM DD,YYYY')
          }
    },
    getHostname () {
    // split hostname
        var hostName = window.location.hostname
        var nameSplit = hostName.split(".");
            nameSplit.shift();    
        var name = nameSplit.join(".");
        return name
    },
    statusChange(form){
      if (form.status === 'new') {
        let adminPortalUrl = window.location.hostname;
        let domain = form.subdomain + '.' + this.getHostname();
        this.sendEmailToRI(form.tech_contact_name, form.owner_firstname + ' ' + form.owner_lastname, domain, adminPortalUrl, form.tech_contact_email);
      }
        var data = {
        name: form.name,
        firstname: form.first_name,
        lastname: form.last_name,
        email: form.email,
        phone: form.owner_phone,
        subdomain: form.subdomain,
        status: "active",
        tech_contact_name: "",
        tech_contact_email: "",
        tech_contact_phone: "",
      };

      for (let i = 0; i < this.internal_contact.length; i++) {
        if (
          this.internal_contact[i].first_name === form.tech_contact_name
        ) {
          data.tech_contact_name = this.internal_contact[i].first_name;
          data.tech_contact_email = this.internal_contact[i].email;
          data.tech_contact_phone = this.internal_contact[i].phone;
        }
      }
      let currentLocalDate = this.$options.filters.formatDateTimeCustom(
        new Date(),
        "MMM DD, YYYY @ h:mma."
      );
      api
          .put(this, api.STATUS_ONBOARDING_COMPANY, data)
          .then((res) => {
            EventBus.$emit('success-error-message', {
                            type: 'success',
                            description: "The " + data.name + " has been Updated on " + currentLocalDate,
                        });
            this.getCompanies();
          })
          .catch((err) => {
            const error ={
              msg :err
            }
            let payload = {
              id: "err",
              formErrors:[error],
            };
           EventBus.$emit('success-error-message', {
                        type: 'error',
                        description: [error]
                     });
          });
    },

    sendEmailToRI(RIName, ownerName, domain, adminPortalUrl, contactEmail) {
      let emailPayload = {
        subject: 'Company Instance Created',
        ri_name: RIName,
        owner_name: ownerName,
        domain: domain,
        admin_portal_url: adminPortalUrl,
        email_type: 'ri_instance_ready',
        contact_email: contactEmail
      }
      
      api.post(this, api.ONBOARDING_EMAIL, emailPayload).then(res => {
        console.log('send Email To RI res:', res);
      }).catch(e => {
        console.log(e);
      });
    },

    canAddProperty(company){
       let enable = company.status != 'new';
       let ifAnyOfThePropertyInProgress=company.properties;
       if(company.properties.length){         
          ifAnyOfThePropertyInProgress = company.properties.filter(item =>
          { 
           if(item.merge_status  == 'final' && item.property_status == 'launched'){
              return false;
            }else{
            return true;
            }
          });
       }
       return !(enable && ifAnyOfThePropertyInProgress.length == 0);
    },
       setSuccessError(message){
            this.successErrorType = message.type;
            this.successErrorDescription = message.description;
            this.successErrorList = message.list;
            this.successErrorTitle = message.title;
            this.successErrorIcon = message.icon;
            this.successErrorComplete = message.complete;
            this.successErrorContent = message.content;
            this.successErrorFooter = message.footer;
            this.successError = true;
        },
        closeSuccessError(){
            this.successError = false;
            this.successErrorType = '';
            this.successErrorDescription = '';
            this.successErrorList = [];
            this.successErrorTitle = '';
            this.successErrorIcon = '';
            this.successErrorContent = '';
            this.successErrorFooter = '';
            this.successErrorComplete = false;
        }
  },
  destroyed(){
    EventBus.$off('success-error-message', this.setSuccessError);
  }
};
</script>
<style scoped>
.pull-right-item {
  text-align: end;
}
.red-label {
  color: #ff6161;
}

.tooltip-cursor{
  cursor:pointer;
}
.text_bold{
  font-weight: 500;
  margin-left: 10px;
}
</style>
