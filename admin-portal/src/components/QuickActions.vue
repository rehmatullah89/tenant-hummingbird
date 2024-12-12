<template>
  <div style="background-color: #ffffff;" class="quick-actions-container">
    <hb-blade-header title="Quick Actions" title-icon="mdi-flash-circle" half back-button-off>
      <template v-slot:right>
          <hb-btn class="pr-1" icon tooltip="Close" @click="$emit('close')" active-state-off>mdi-close</hb-btn>
      </template>
    </hb-blade-header>

    <div class="quick-action-content">
      <status @resetStatus="errorClear($options.name)" v-if="errorHas($options.name)" :message="errorGet($options.name)" status="error"></status>
      <!--            <v-autocomplete-->
      <!--                    :items="$store.getters.property_id"-->
      <!--                    item-text="name"-->
      <!--                    item-value="id"-->
      <!--                    label="Select A Facility"-->
      <!--                    v-model="property_id"-->
      <!--                    rounded-->
      <!--                    background-color="white"-->
      <!--                    singleLine-->
      <!--                    outlined-->
      <!--                    prepend-inner-icon="mdi-magnify"-->
      <!--                    placeholder="Select A Facility"-->
      <!--            ></v-autocomplete>-->
      <!--            <v-divider></v-divider>-->

      <v-card
        outlined
        elevation="0"
        class="mt-1 mb-5"
      >
        <v-list-item class="pb-1" two-line @click="action = action === 'new-tenant' ?  null : 'new-tenant'" :ripple="false">
          <v-list-item-content class="pl-0">
            <v-list-item-title class="mb-0 d-flex align-center">
              <hb-icon color="#101318" class="pr-3">mdi-account-box</hb-icon>
              <div>
                <span class="font-weight-medium">Tenant On-Boarding</span><br />
                <v-list-item-subtitle class="text-body-2 hb-text-lighter">Capture Lead, Reservation, Move-In</v-list-item-subtitle>
                <div class="mt-1">
                  <hb-link @click="newLead" v-if="action !== 'new-tenant'">+ Create New Contact</hb-link>
                </div>
              </div>
            </v-list-item-title>
          </v-list-item-content>
          <v-list-item-action v-if="action !== 'new-tenant'">
            <hb-icon>mdi-chevron-down</hb-icon>
          </v-list-item-action>
        </v-list-item>

        <v-card-text v-if="action === 'new-tenant'">
          <hb-autocomplete
            :label="auto_complete_label"
            v-model="contact"
            :items="contact_results"
            :outlined="true"
            :hide-details="true"
            prepend_inner_icon="mdi-magnify"
            :no_filter="true"
            :return_object="true"
            @change="newLead"
            @fetchData="fetchSearchContacts"
            :page_size="20"
            :result_count="result_count"
            :search_input.sync="omniSearchContacts"
            :auto_focus="true"
          >
            <template v-slot:append-item>
              <p block class="btn-contact dark-btn px-6 py-2 ma-0" @click.stop="newLead">Create New Contact</p>
            </template>
            <template v-slot:no-data>
              <v-list-item v-show="contact_results && omniSearchContacts && contact_results.length === 0 && !isDataLoading">
                <v-list-item-title>
                  No Contacts found
                </v-list-item-title>
              </v-list-item>
            </template>


            <template v-slot:selection="data">
              <v-list-item>
                <v-list-item-content>
                  <v-list-item-title>
                    <strong>{{data.item.first}} {{data.item.last}}</strong>
                  </v-list-item-title>
                  <v-list-item-subtitle v-show="data.item.email">{{data.item.email}}</v-list-item-subtitle>
                  <v-list-item-subtitle v-if="data.item.Phones && data.item.Phones.length">{{data.item.Phones[0].phone | formatPhone}}</v-list-item-subtitle>
                </v-list-item-content>
              </v-list-item>
            </template>


            <template v-slot:item="data" >
              <v-row>
                <v-col>
                  <strong>{{data.item.first}} {{data.item.last}}</strong><br />
                  <span v-show="data.item.email">{{data.item.email}}</span><br />
                  <span v-if="data.item.Phones && data.item.Phones.length">{{data.item.Phones[0].phone | formatPhone}}</span>
                </v-col>
                <v-col class="text-right" v-if="data.item.Lease && data.item.Lease.Unit">
                  #{{data.item.Lease.Unit.number}}
                </v-col>
              </v-row>
            </template>
          </hb-autocomplete>
        </v-card-text>
      </v-card>

      <v-card
        outlined
        elevation="0"

        :ripple="false"
        class="mt-1 mb-5"
      >
        <v-list-item
          :ripple="false"
          class="pb-1"
          two-line
          @click="action = action === 'payment' ?  null : 'payment'"
        >
          <v-list-item-content class="pl-0">
            <v-list-item-title class="font-weight-medium mb-0 d-flex align-center">
              <hb-icon color="#101318" class="pr-3">mdi-currency-usd</hb-icon>
              <div>
              Take a Payment<br />
              <v-list-item-subtitle class="text-body-2 hb-text-lighter">Payments, Enroll in Autopay</v-list-item-subtitle>
              </div>
            </v-list-item-title>
          </v-list-item-content>
          <v-list-item-action v-if="action !== 'payment'">
            <hb-icon>mdi-chevron-down</hb-icon>
          </v-list-item-action>
        </v-list-item>
        <v-card-text v-if="action === 'payment'">
          <hb-autocomplete
            :label="auto_complete_label"
            :items="tenants_results"
            :outlined="true"
            :hide-details="true"
            prepend_inner_icon="mdi-magnify"
            :no_filter="true"
            :return_object="true"
            @change="newPayment"
            @fetchData="fetchSearchTenants"
            :page_size="20"
            :result_count="result_count"
            :search_input.sync="searchTenants"
            :auto_focus="true"
          >
              <template v-slot:no-data>
              <v-list-item v-show="tenants_results && searchTenants && tenants_results.length === 0 && !isDataLoading">
                <v-list-item-title>No Tenants found</v-list-item-title>
              </v-list-item>
            </template>


            <template v-slot:selection="data">
              <v-row>
                <v-col>
                  <strong>{{data.item.Contact.first}} {{data.item.Contact.last}}</strong><br />
                </v-col>
              </v-row>
            </template>


            <template v-slot:item="data" >
              <v-row>
                <v-col>
                  <strong>{{data.item.Contact.first}} {{data.item.Contact.last}}</strong><br />
                  <span v-show="data.item.Contact.email">{{data.item.Contact.email}}</span><br />
                  <span v-if="data.item.Contact.Phones && data.item.Contact.Phones.length">{{data.item.Contact.Phones[0].phone | formatPhone}}</span>
                </v-col>
                <v-col class="text-right">
                  #{{data.item.Lease.Unit.number}}<br />
                  <span >{{data.item.Lease.Unit.Address.address}}<br />{{data.item.Lease.Unit.Address.city}} {{data.item.Lease.Unit.Address.state}} {{data.item.Lease.Unit.Address.zip}}</span>
                </v-col>
              </v-row>
            </template>
          </hb-autocomplete>
        </v-card-text>
      </v-card>

      <v-card
        outlined
        elevation="0"

        :ripple="false"
        class="mt-1 mb-5"
      >
        <v-list-item
          :ripple="false"
          class="pb-1"
          @click="action = action === 'moveOut' ?  null : 'moveOut'"
        >
          <v-list-item-content class="pl-0">
            <v-list-item-title class="font-weight-medium mb-0 d-flex align-center">
              <hb-icon color="#101318" class="pr-3">mdi-system-navigation-custom-1</hb-icon>Move-Out
            </v-list-item-title>
            <!-- <v-list-item-subtitle style="color:#919EAB;">Payments, Enroll in Auto-Debit</v-list-item-subtitle> -->
          </v-list-item-content>
          <v-list-item-action v-if="action !== 'moveOut'">
            <hb-icon>mdi-chevron-down</hb-icon>
          </v-list-item-action>
        </v-list-item>
        <v-card-text v-if="action === 'moveOut'">
         <hb-autocomplete
            :label="auto_complete_label"
            :items="tenants_results"
            :outlined="true"
            :hide-details="true"
            prepend_inner_icon="mdi-magnify"
            :no_filter="true"
            :return_object="true"
            @change="moveOutProcess"
            @fetchData="fetchSearchTenants"
            :page_size="20"
            :result_count="result_count"
            :search_input.sync="searchTenants"
            :auto_focus="true"
          >
            <template v-slot:no-data>
              <v-list-item v-show="tenants_results && searchTenants && tenants_results.length === 0 && !isDataLoading">
                <v-list-item-title>No Tenants found</v-list-item-title>
              </v-list-item>
            </template>


            <template v-slot:selection="data">
              <v-row>
                <v-col>
                  <strong>{{data.item.Contact.first}} {{data.item.Contact.last}}</strong><br />
                </v-col>
              </v-row>
            </template>


            <template v-slot:item="data" >
              <v-row>
                <v-col>
                  <strong>{{data.item.Contact.first}} {{data.item.Contact.last}}</strong><br />
                  <span v-show="data.item.Contact.email">{{data.item.Contact.email}}</span><br />
                  <span v-if="data.item.Contact.Phones && data.item.Contact.Phones.length">{{data.item.Contact.Phones[0].phone | formatPhone}}</span>
                </v-col>
                <v-col class="text-right">
                  #{{data.item.Lease.Unit.number}}<br />
                  <span >{{data.item.Lease.Unit.Address.address}}<br />{{data.item.Lease.Unit.Address.city}} {{data.item.Lease.Unit.Address.state}} {{data.item.Lease.Unit.Address.zip}}</span>
                </v-col>
              </v-row>
            </template>
          </hb-autocomplete>
        </v-card-text>
      </v-card>

      <v-card
        outlined
        elevation="0"
        class="mt-1"
      >
        <v-list-item
          @click="action = action === 'merchandise' ?  null : 'merchandise'"
          :ripple="false"
          class="pb-1"
        >
          <v-list-item-content class="pl-0">
            <v-list-item-title class="font-weight-medium mb-0 d-flex align-center">
              <hb-icon color="#101318" class="pr-3">mdi-tag</hb-icon>
              <div>
                <span class="font-weight-medium">Services</span><br />
                <v-list-item-subtitle class="text-body-2 hb-text-lighter">Sell Merchandise, Fees</v-list-item-subtitle>
              </div>
            </v-list-item-title>
          </v-list-item-content>
          <v-list-item-action v-if="action !== 'merchandise'">
            <hb-icon>mdi-chevron-down</hb-icon>
          </v-list-item-action>
        </v-list-item>


        <v-card-text v-if="action === 'merchandise'">
          <hb-autocomplete
            :label="auto_complete_label"
            :items="contact_results"
            :outlined="true"
            :hide-details="true"
            prepend_inner_icon="mdi-magnify"
            :no_filter="true"
            :return_object="true"
            @change="sellMerchandise"
            @fetchData="fetchSearchContacts"
            :page_size="20"
            :result_count="result_count"
            :search_input.sync="omniSearchContacts"
            :auto_focus="true"
          >
            <template v-slot:append-item>
              <p block class="btn-contact dark-btn px-6 py-2 ma-0" @click="sellMerchandise(null)">Create New Contact</p>
            </template>

            <template v-slot:no-data>
              <v-list-item v-show="contact_results && omniSearchContacts && contact_results.length === 0 && !isDataLoading">
                <v-list-item-title>No Contacts found</v-list-item-title>
              </v-list-item>
            </template>


            <template v-slot:selection="data">
              <v-list-item>
                <v-list-item-content >
                  <v-list-item-title>
                    <strong>{{data.item.first}} {{data.item.last}} </strong> <span v-if="data.item.Lease"> - #{{data.item.Lease.Unit.number}}</span>
                  </v-list-item-title>
                  <v-list-item-subtitle v-show="data.item.email">{{data.item.email}}</v-list-item-subtitle>
                  <v-list-item-subtitle v-if="data.item.Phones && data.item.Phones.length">{{data.item.Phones[0].phone | formatPhone}}</v-list-item-subtitle>
                </v-list-item-content>
              </v-list-item>
            </template>


            <template v-slot:item="data" >
              <v-list-item-content >
                <v-list-item-title>
                  <strong>{{data.item.first}} {{data.item.last}} </strong> <span v-if="data.item.Lease"> - #{{data.item.Lease.Unit.number}}</span>
                </v-list-item-title>
                <v-list-item-subtitle v-show="data.item.email">{{data.item.email}}</v-list-item-subtitle>
                <v-list-item-subtitle v-if="data.item.Phones && data.item.Phones.length">{{data.item.Phones[0].phone | formatPhone}}</v-list-item-subtitle>
              </v-list-item-content>
            </template>
          </hb-autocomplete>
        </v-card-text>
      </v-card>
    </div>

    <v-card
      class="pending-transactions-container"
      style="height: 340px; width: 100%; bottom: 0; display:flex;flex-direction: column "
      v-if="pending.length"
      outlined
      tile
      dense
      elevation="0"
    >
      <v-container class="py-1"  style="color:#CF5136; background-color: rgba(211,75,48,.05);">
        <v-row>
          <v-col>
            <span class="title">Pending Transactions ({{pending.length}})</span>
          </v-col>
        </v-row>
      </v-container>
      <v-divider></v-divider>
      <div style="overflow-y: scroll;">
        <v-container v-for="(p, index) in pending" :key="index" @click="setLease(p)" class="py-0 pending-transaction">
          <v-row >
            <v-col>
              <span class="title" v-if="p.Tenants.length">{{p.Tenants[0].Contact.first}} {{p.Tenants[0].Contact.last}}<br /></span>
              <span class="subtitle" v-if="p.Tenants.length && p.Tenants[0].Contact.email">{{p.Tenants[0].Contact.email}}<br /></span>
              <span class="subtitle font-weight-light">{{p.start_date | formatDate}}</span>
            </v-col>
            <v-col class="align-right">
              <span class="subtitle-1 font-weight-medium">{{p.created | formatLocalFromNow}}<br /></span>
              <span class="title font-weight-medium">#{{p.Unit.number}}<br /></span>
              <span class="body-1" v-if="p.Tenants.length && p.Tenants[0].Contact.Phones.length">{{p.Tenants[0].Contact.Phones[0].phone | formatPhone}}</span>
            </v-col>
          </v-row>
          <v-row no-gutters class="pb-3" >
            <v-col>
            <hb-btn color="destructive" @click="deletePending(p)">Delete Pending</hb-btn>
            </v-col>
          </v-row>
          <v-divider></v-divider>

        </v-container>
      </div>
    </v-card>

  </div>

</template>
<script type="text/babel">

import api from '../assets/api';
import Status from './includes/Messages.vue';
import { EventBus } from '../EventBus.js';
import moment from 'moment';
import { mapGetters } from 'vuex';

export default {
  name: 'QuickActions',
  components: {
      Status
  },
  data: () => ({
      auto_complete_label: 'Search for Tenant',
      action: null,
      drawer: null,
      property_id: null,
      leads: [],
      omniSearchContacts: null,
      searchTenants: null,
      tenants_results:[],
      contact_results:[],
      payment_searcb: {},
      payment_tenants: [],
      contactResults:[],
      contact: {},
      customer: {},
      tenant: {},
      model: null,
      loading: false,
      search: null,
      pending: [],
      interval: {},
      latest_time: '',
      hideCreateContactBtn: false,
      result_count: 0,
      isDataLoading: false

  }),
  props: ['showQuickActions', 'open_panel'],
  beforeMount() {
      // this.$store.dispatch('getProperties');
  },
  created(){
      EventBus.$emit('priority_action');
      // this.findPending();
      this.interval = window.setInterval(() => this.calculateTime(), 1000);
      if(this.open_panel === 'payment'){
          this.action = 'payment'
      }
      if(this.open_panel === 'merchandise'){
          this.action = 'merchandise'
      }
      if(this.open_panel === 'movein'){
        this.action = 'new-tenant'
      }


  },
  filters:{
      formatDelay(time){
          time = Math.round(time / 1000);
          if(time < 60 * 60 ){
              let minutes = Math.floor(time / (60));
              var seconds = time - (minutes * 60);
              return minutes.toString().padStart(2, '0') + ':' + seconds.toString().padStart(2, '0')
          } else if(time < 60 * 60 * 24){
              let hours = Math.floor(time  / (60 * 60));
              var minutes = Math.floor( (time - (hours * 60 * 60)) / 60);
              var seconds = time  - (minutes * 60);
              return hours + ':' + minutes.toString().padStart(2, '0') + ':' + seconds.toString().padStart(2, '0')
          } else if(time < 60 * 60 * 24 * 2) {
              return Math.floor(time  / (60 * 60 * 24)) + ' Day Ago';
          } else {
              return Math.floor(time  / (60 * 60 * 24)) + ' Days Ago';
          }
      }
  },
  destroyed(){
      window.clearInterval(this.interval);
  },
  computed:{
      ...mapGetters({
          properties: 'propertiesStore/filtered',
          property: 'onBoardingStore/property',
      }),
  },
  methods:{
    async deletePending(lease){
        if(!lease.id) return;
        await api.delete(this, api.LEASES, lease.id);
        this.pending = this.pending.filter(l => l.id !== lease.id);
        EventBus.$emit('unit_available_changed');
    },
    
    calculateTime(){
        let now = moment();
        for(let i = 0; i < this.pending.length; i++){
            let created = moment.utc(this.pending[i].created).local().clone();
            this.pending[i].time = now.diff(created)
        }
    },

    async findPending(){
        let r = await api.get(this, api.LEASES +  'pending', { property_id: this.property_id });
        this.pending = r.leases.map(l => {
            l.start_date = moment(l.start_date, 'YYYY-MM-DD').startOf('day').valueOf();
            l.end_date = l.end_date ? moment(l.end_date , 'YYYY-MM-DD').startOf('day').valueOf() : null;
            l.time = 0;
            return l;
        });
    },

    async newLead(contact){
      if(contact && contact.id){
        await this.$store.dispatch('onBoardingStore/getContactInfo', {contact_id: contact.id});
      }
      EventBus.$emit('new_lead');
    },
    
    sellMerchandise(contact){
      let data = {
          lease_id: contact && contact.Lease ? contact.Lease.id: null,
          property_id: contact && contact.Lease ? contact.Lease.Unit.property_id: null,
          contact: contact
      };

      EventBus.$emit('sell_merchandise', data);
    },
    
    newPayment(contact){
      let data = {
          property_id: contact.Lease.Unit.property_id,
          contact_id: contact.Contact.id
      };

      EventBus.$emit('make_payment', data);
    },
    
    async setLease(pending){
        await this.$store.dispatch('onBoardingStore/getPropertyInfo', this.properties.find(p => p.id === pending.Unit.property_id));
        // await this.$store.commit('onBoardingStore/setUnit', pending.Unit);
        //await this.$store.dispatch('onBoardingStore/getTemplate');
        await this.$store.dispatch('onBoardingStore/getPending', { unit_id: pending.unit_id });
        EventBus.$emit('new_lead');
    },
    
    moveOutProcess(contact){
      contact.Contact.Leases.push(contact.Lease)
      let data = {
          property_id: contact.Lease.Unit.property_id,
          lease_id: contact.Lease.id,
          contact: contact.Contact,
          unit_id:  contact.Lease.Unit.id
      };

      EventBus.$emit('move_out', data);
    },
    
    async fetchSearchContacts(data) {
      var d = new Date();
      this.latest_time = d.getTime();

      data.t = this.latest_time;
      
      if(!this.omniSearchContacts) return;

      this.isDataLoading = true
      let r = await api.post(this, api.CONTACTS_OMNI, data)
      this.result_count = r.result_count

      if(this.latest_time === r.t){
        this.contact_results = this.contact_results.concat(r.results)
      }
      this.isDataLoading = false
    },
    
    async fetchSearchTenants(data) {
      var d = new Date();
      this.latest_time = d.getTime();

      data.t = this.latest_time;
      data.lease_types = ['lease']
      
      if(!this.searchTenants) return;

      this.isDataLoading = true
      let r = await api.post(this, api.TENANTS + 'search',data)
      this.result_count = r.result_count

      if(this.latest_time === r.t){
        this.tenants_results = this.tenants_results.concat(r.tenants)
      }
      this.isDataLoading = false
    }
  },
  watch: {
    property_id(){
        this.pending = [];
        this.findPending();
    },
    showQuickActions(){
        this.drawer = this.showQuickActions;
    },
    omniSearchContacts() {
      this.contact_results = [];
    },
    searchTenants(){
      this.tenants_results = [];
    }
  }
}
</script>

<style scoped>
  .quick-actions-container{
    display: flex;
    height: 100%;
    width: 100%;
    flex-direction: column;
  }
  .quick-actions-header{
    flex: 0 1;
  }
  .quick-action-content{
    width: 100%;
    padding: 20px 40px;
    flex: 1;
    background: #F9FAFB;
  }

  .pending-transactions-container{
    flex: 0 1;
  }
  .pending-transaction:hover{
    background: #f5f5f5;
  }

  .add-box-shadow{
    -moz-box-shadow:    0 1px 2px -1px #A1AAB5;
    -webkit-box-shadow: 0 1px 2px -1px #A1AAB5;
    box-shadow:         0 1px 2px -1px #A1AAB5;
  }
  .create-new-contact-btn {
    color:#00848E; 
    max-width: 150px;
  }
  .btn-contact {
    background: #00848E;
    cursor: pointer;
  }
  .v-list {
    padding-bottom: unset !important;
  }
  .v-icon {
    color: #677380 !important;
  }
</style>
