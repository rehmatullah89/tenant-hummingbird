<template>
  <div class="mt-4 mb-3">
    <v-data-table
      :headers="headers"
      :items="properties"
      item-key="id"
      disable-pagination
      hide-default-footer
      class="hb-data-table hb-data-table-cursor-on elevation-1"
    >
      <template v-slot:[`item.propertyName`]="{ item }">
          <span>{{ item.name }}</span>
      </template>
        <template v-slot:[`item.address`]="{ item }">
          <span>{{ item.Address.address }}, {{ item.Address.address2 }}</span>
          <div class="address-details">{{ item.Address.city }}, {{ item.Address.state }} {{ item.Address.zip }}</div>
      </template>

        <template v-slot:[`item.propertyEmail`]="{ item }">
          <span>{{ item.Emails[0].email }}</span>
      </template>

        <template v-slot:[`item.goLiveDate`]="{ item }">
          <span>{{  format_date(item.golive_date) }}</span>
      </template>

        <template v-slot:[`item.dueDate`]="{ item }">
          <span>{{  format_date(item.due_date) }}</span>
      </template>

        <template v-slot:[`item.progress`]="{ item }">
          <span class="progressPercentage">
            {{item.property_percentage}}%</span>
      </template>
      <template v-slot:[`item.status`]="{ item }">
         <span class="text-capitalize"  v-if="visibleUpload(item)" >
               {{item.merge_status}} upload 
          </span>
          <span class="text-capitalize" v-else >
          <span  v-if="trialLaunchVisible(item)"> {{item.merge_status}} </span>
            <span v-if="finalLaunchVisible(item)"> {{item.merge_status}} </span> {{item.property_status}}</span>
          
          
      </template>

      <template v-slot:[`item.actions`]="{ item }">
          <v-menu close-on-click close-on-content-click offset-y class="d-inline-block" >
            <template v-slot:activator="{ on, attrs }">
                <span>
                  <hb-btn color="primary" @click="launchCocoon(item)" class="" small> Launch Cocoon </hb-btn> 
                </span>
                <span v-bind="attrs" v-on="on" class="d-inline-block">
                  <hb-btn icon tooltip="Options" active-state-off> mdi-dots-vertical </hb-btn>
                </span>
            </template>
            <v-list>
              <!-- <v-list-item :ripple="false"  @click="">
                <v-list-item-title :ref='item.id' class="">Launch Hummingbird OPS</v-list-item-title>
              </v-list-item> -->
              <v-list-item :ripple="false"  @click="editProperty(item)">
                <v-list-item-title :ref='item.id' class="">View/Edit Property Info</v-list-item-title>
              </v-list-item>
               <v-list-item :ripple="false"  v-if="visibleMergeInhummingBird(item)" @click="mergeInHb(item,'merge-in-progress')">
                <v-list-item-title :ref='item.id' class=""> 
                         <span class="text-capitalize" > {{item.merge_status}} </span>Merge in Hummingbird</v-list-item-title>
              </v-list-item>
              <v-list-item :ripple="false"   v-if="visibleLaunchProperty(item)" @click="mergeInHbTrial(item,'active','trial')"> 
                <v-list-item-title :ref='item.id' class="">Re-upload and Re-Merge</v-list-item-title>
              </v-list-item>
              <v-list-item :ripple="false"  v-if="visibleLaunchProperty(item)" @click="mergeInHbTrial(item,'launched','final')"> 
                <v-list-item-title :ref='item.id' class="">Launch Property</v-list-item-title>
              </v-list-item>
              <!-- <v-list-item :ripple="false"  @click="">
                <v-list-item-title :ref='item.id' class="">Delete</v-list-item-title>
              </v-list-item> -->
            </v-list>
          </v-menu>
      </template>
    </v-data-table>
  </div>
</template>

<script>
import api from "../../../../assets/api.js";
import moment from 'moment';
import { EventBus } from '../../../../EventBus.js';
export default {
    name: 'OnboardingProperties',
    props: {
      properties: {
        type: [],
        default: []
      },
      companyDetails:{
      },
      getHostname:String
    },
    data() {
      return {
          isFetching: false,
          headers: [ { text: 'Property Name', value: 'propertyName' },
                     { text: 'Address', value: 'address', width: 170 },
                     { text: 'Property Email', value: 'propertyEmail' },
                     { text: 'Go Live Date', value: 'goLiveDate' },
                     { text: 'Due Date', value: 'dueDate' },
                     { text: 'Progress', value: 'progress' },
                     { text: 'Status', value: 'status' },
                     { text: "", value: "actions", align: "right", sortable: false, width: 200}
                   ],
      }
    },
    methods: {
      editProperty(data) {
        this.$emit('edit-property', data,this.companyDetails)
     },
    
  
      format_date(value){
         if (value) {
           return moment(String(value)).format('MMM DD,YYYY')
          }
      },
     launchCocoon(item){
        let url = 'https://'+this.companyDetails.subdomain+'.'+this.getHostname;
        if(item.property_status !== 'launched'){
           url = url+'/onboarding';
        } 
         window.open(url, '_newtab');
        if (item.property_status === 'new') {
          let cocoonUrl = this.companyDetails.subdomain + '.' + this.getHostname;
          let domain = this.companyDetails.subdomain + '.' + this.getHostname+'/onboarding';
          let adminPortalUrl = window.location.hostname;
          this.sendEmailToOwner(this.companyDetails.tech_contact_name, this.companyDetails.owner_firstname + ' ' + this.companyDetails.owner_lastname, domain, cocoonUrl, adminPortalUrl, this.companyDetails.owner_email,item.property_id);
          this.sendEmailToRI(this.companyDetails.tech_contact_name, this.companyDetails.owner_firstname + ' ' + this.companyDetails.owner_lastname, domain, cocoonUrl, adminPortalUrl, this.companyDetails.tech_contact_email,item.property_id);
          this.changePropertyStatus(item);
        }
     },
     changePropertyStatus(item){
        var data = {
          company_subdomain: this.companyDetails.subdomain,
          company_id: this.companyDetails.company_id,
          property_id: item.property_id,
          property_status: "active",  
        };
        api.put(this, api.ADD_ONBOARDING_PROPERTY, data).then((res) => {
          this.$emit("refreshComponyData");
        })
        .catch((err) => { const error = {  msg: err, }; let payload = {id: "err",formErrors: [error], };
        });
     },
    sendEmailToOwner(RIName, ownerName, domain, cocoonUrl, adminPortalUrl, contactEmail, propertyId) {
        let emailPayload = {
          subject: 'Launch Cocoon',
          ri_name: RIName,
          owner_name: ownerName,
          domain: domain,
          cocoon_url: cocoonUrl,
          admin_portal_url: adminPortalUrl,
          email_type: 'owner_launch_cocoon',
          contact_email: contactEmail,
          property_id : propertyId,
          company_id : this.companyDetails.company_id          
        }
        
        api.post(this, api.ONBOARDING_EMAIL, emailPayload).then(res => {
          console.log('send Email To Owner res:', res);
        }).catch(e => {
          console.log(e);
        });
    },

    sendEmailToRI(RIName, ownerName, domain, cocoonUrl, adminPortalUrl, contactEmail, propertyId) {
      let emailPayload = {
        subject: 'Launch Cocoon',
        ri_name: RIName,
        owner_name: ownerName,
        domain: domain,
        cocoon_url: cocoonUrl,
        admin_portal_url: adminPortalUrl,
        email_type: 'ri_launch_cocoon',
        contact_email: contactEmail,
        property_id : propertyId,
        company_id : this.companyDetails.company_id
      }
      
      api.post(this, api.ONBOARDING_EMAIL, emailPayload).then(res => {
        console.log('send Email To RI on Launch Cocoon, res:', res);
      }).catch(e => {
        console.log(e);
      });
    },
   
   mergeInHb(item,property_status) {
      var data = {
        company_subdomain: this.companyDetails.subdomain,
        company_id: this.companyDetails.company_id,
        property_id: item.property_id,
        property_status: property_status,  
      };
      
     api.put(this, api.ADD_ONBOARDING_PROPERTY, data).then((res) => {
        this.sendEmailOfMerge(item); 
        this.$emit("refreshComponyData");
       })
       .catch((err) => { const error = {  msg: err, }; let payload = {id: "err",formErrors: [error], };
       });  
    },
    mergeInHbTrial(item,property_status,merge_status) {
      var data = {
        company_subdomain: this.companyDetails.subdomain,
        company_id: this.companyDetails.company_id,
        property_id: item.property_id,
        property_name:item.name,
        company_name:this.companyDetails.name,
        property_status: property_status, 
        merge_status :merge_status 
      };
      
     api.put(this, api.ADD_ONBOARDING_PROPERTY, data).then((res) => {
        //this.sendEmailOfMerge(item); 
        this.$emit("refreshComponyData");
       })
       .catch((err) => { const error = {  msg: err, }; let payload = {id: "err",formErrors: [error], };
       });  
    },
    sendEmailOfMerge(item){
      let cocoonUrl = this.companyDetails.subdomain + '.' + this.getHostname;
      let domain = this.companyDetails.subdomain + '.' + this.getHostname;
      let adminPortalUrl = window.location.hostname;
      let emailPayload = {
        subject: item.name+'- Merge to Hummingbird',
        ri_name: this.companyDetails.tech_contact_name,
        owner_name: this.companyDetails.owner_firstname + ' ' + this.companyDetails.owner_lastname,
        domain: domain,
        cocoon_url: cocoonUrl,
        admin_portal_url: adminPortalUrl,
        email_type: 'owner_begin_merge',
        contact_email: this.companyDetails.owner_email,
        ri_email:this.companyDetails.tech_contact_email,
        ri_phone:this.companyDetails.tech_contact_phone,
        company_id: this.companyDetails.company_id,
        property_name:item.name,
        merge_status :item.merge_status 
      }
      api.post(this, api.ONBOARDING_EMAIL, emailPayload).then(res => {
        console.log('send Email To Owner res:', res);
      }).catch(e => {
        console.log(e);
      });
    },
     visibleUpload(item) {
      if (
        item.property_status === "active" &&
        item.property_percentage == 100
      ) {
        return true;
      } else {
       return false;
      }
    },
    trialLaunchVisible(item) {
      if (
        item.merge_status == "trial" &&
        (item.property_status == "merge-in-progress" ||
          item.property_status == "launched")
      ) {
        return true;
      } else {
        return false;
      }
    },
    finalLaunchVisible(item) {
      if (
        item.merge_status == "final" &&
        item.property_status == "merge-in-progress"
      ) {
        return true;
      } else {
        return false;
      }
    },
    visibleLaunchProperty(item) {
      if (
        item.property_percentage == 100 &&
        item.merge_status == "trial" &&
        item.property_status == "launched"
      ) {
        return true;
      } else {
        return false;
      }
    },
    visibleMergeInhummingBird(item) {
      if (
        item.property_percentage == 100 &&
        (item.property_status == "active" || item.property_status == "new")
      ) {
        return true;
      } else {
        return false;
      }
    },
  },
}
</script>

<style>
.progressPercentage{
  color: #FF6161;
}
.address-details{
  font-size: 12px;
  color: #637381;
}
</style>