<template>


  <div class="section-content pt-4" :class="{'mt-10' : $vuetify.breakpoint.xs , 'mt-n3' : $vuetify.breakpoint.sm}">
    <div class="primary-section-content1">
      <hb-header class="pt-5" fewer-actions>
        <template v-slot:left>
          <hb-page-header title="Triggers"></hb-page-header>
        </template>
        <!-- <template v-slot:right>
          <hb-btn
            color="primary"
            :disabled="isLoading($options.name)"
            @click="getLogs"
          >
            <v-icon left>mdi-refresh</v-icon>Refresh Data
          </hb-btn>

        </template> -->
      </hb-header>
      <div class="content-view">
        <!-- <v-alert
          
          outlined
          :type="data.dryrun ? '': 'warning'"
          border="left"
           :icon="data.dryrun ? '': 'mdi-alert'"
        >
      
        <span v-show="data.dryrun"> Dry Run is on. This is a test run.</span>
        <span v-show="!data.dryrun"> Dry Run is off. This process will run for real.</span>
         <span style="float: right">
          <v-switch
            hide-details
            dense
            class="ma-0 pa-0"
            v-model="data.dryrun"
            label="Dry Run"
          ></v-switch>
        </span>

        </v-alert> -->

        <v-alert
          v-show="data.run_actions"
          outlined
          type="warning"
          border="left"
          icon="mdi-alert"
          
        >
          The following actions will be run for this deliquency process up through the current day:
          <br /><br />
          Overlock, Deny Access, Deny Online Payments, Cancel Insurance, Schedule Action and Change Tenant Status.

        </v-alert>


        <v-container fluid>
          <v-row class="form-controls">
            <v-col>
              <company-selector v-model="data.company_id"></company-selector>
            </v-col>

            <v-col >
              <property-selector  v-show="data.company_id" :company_id="data.company_id" v-model="data.property_id" @input="loadTriggers"></property-selector>
            </v-col>

            <v-col >
              <div v-show="data.company_id && data.property_id">
                <label>Type</label>
                <v-select
                  class="ma-0"
                  style="background-color: white;"
                  type="text"
                  hide-details
                  v-validate="'required|max:255'"
                  v-model="data.type"
                  :items="['Migration', 'Date', 'Lease']"
                  required
                  dense
                  outlined
                  item-text="name"
                  item-value="company_id"
                  id="company_id"
                  name="company_id"
                  data-vv-as="Company"
                  :class="{'custom-field-error' : errors.first('company_id')}"
                  :error-messages="errors.first('company_id')"
                ></v-select>
                
              </div>
            </v-col>


            <v-col  >
              <div v-show="data.company_id && data.property_id && data.type === 'Date'">
                <label>Choose Date to Run</label>
                <hb-date-picker
                  @click:clear="data.date = ''" 
                  label="MM/DD/YYYY"
                  clearable
                  dense
                  id="date"
                  data-vv-name="date"
                  name="date"
                  v-model="data.date">
                </hb-date-picker>
              </div>

              <div v-show="data.company_id && data.property_id && data.type === 'Lease'">
                <label>Enter Lease Id</label>
                  <v-text-field
                    class="ma-0"
                    style="background-color: white;"
                    type="text"
                    hide-details
                    v-model="data.lease_id"
                    required
                    dense
                    outlined
                    id="lease_id"
                    name="lease_id"
                  ></v-text-field>

              </div>
              <div v-show="data.company_id && data.property_id && data.type === 'Migration'">
                <label>&nbsp;</label>
                 <v-switch
                  hide-details
                  dense
                  class="ma-0 pa-0"
                  v-model="data.run_actions"
                  label="Run Action"
                ></v-switch>
              </div>
            </v-col>


        
            <v-col class="mt-8 flex-shrink text-right" >
              <div v-if="data.company_id && data.property_id">
                <hb-btn
                  color="primary"
                  :disabled="isLoading($options.name)"
                  @click="generate"
                >
                  Generate
                </hb-btn>
              </div>
            </v-col>
          </v-row>
        </v-container>

        <v-row v-if="logs.length">

          <v-col cols="12">
            <v-data-table
              :headers="headers"
              :items="logs"
              :sort-by.sync="sortBy"
              :sort-desc.sync="sortDesc"
              disable-pagination
              hide-default-footer
              class="hb-data-table hb-data-table-cursor-on bordered-table"
            >
              <template v-slot:item.created_at="{ item }">
                {{ item.created_at | formatLocalDateTime }}
              </template>

              <template v-slot:item.item_count="{ item }">
                {{ item.data.length}}
              </template>

              <template v-slot:item.dryrun="{ item }">
                {{  item.dryrun ? 'Yes' : 'No' }}
              </template>


              <template v-slot:item.errors="{ item }">
                <span v-if="item.errors.length" v-html="$options.filters.splitRows(item.errors)"></span>
                <span v-else-if="hasErrors(item.data)">
                  <v-icon class="text-danger">mdi-alert-circle</v-icon>
                </span>
              </template>

              <template v-slot:item.actions="{ item }">
                <hb-btn color="primary" @click="showLogs(item.data)">View</hb-btn>
                <hb-btn color="delete" @click="deleteLogs(item)">Delete</hb-btn>
              </template>
            </v-data-table>
          </v-col>
        </v-row>


      </div>
    </div>


    <hb-modal
      v-model="dialog"
      :fullscreen="true"
      size="x-large"
      title="Trigger breakdown"
      @close="dialog = false"

    >
      <template v-slot:subheader>
        <span class="hb-text-light">Breakdown for a trigger</span>
      </template>
      <template v-slot:content>
        <div class="pa-10">

          <v-data-table
            :headers="data_headers"
            item-key="lease_id"
            single-expand
            show-expand
            :expanded.sync="expanded"
            :items="selected"
            disable-pagination
            hide-default-footer
            class="hb-data-table hb-data-table-cursor-on bordered-table "
          >

            <template v-slot:item.unit_number="{ item }">
              #{{ item.unit_number}}
            </template>

            <template v-slot:item.balance="{ item }">
              {{ item.balance | formatMoney}}
            </template>

            <template v-slot:item.due="{ item }">
              {{ item.due | formatDate}}
            </template>


            <template v-slot:item.errors="{ item }">
              <span v-if="hasError(item)">
                <v-icon class="text-danger">mdi-alert-circle</v-icon>
              </span>
            </template>


            <template v-slot:expanded-item="{ headers, item }">
              <td :colspan="data_headers.length + 1" class="pr-3 pl-3 pt-5 pb-5 colored-bg" >

                <div class="pl-3 pt-0 pb-2 subtable-header"><strong>Triggers</strong></div>
                <v-card>
                  <v-list>

                    <trigger-list-item label="Fees" :exists="item.fees.has_fees" :error="item.fees.error" :data="item.fees.data" :message="item.fees.msg">

                      <template v-slot="props">
                        Created invoice #{{props.data.number}} for {{props.data.total_due | formatMoney}} | ID: {{props.data.id}}
                      </template>
                    </trigger-list-item>

                    <v-divider></v-divider>


                    <trigger-list-item label="Status" :exists="item.status.has_status_change" :error="item.status.error" :data="item.status.data" :message="item.status.msg">

                      <template v-slot="props">
                        Updated Status from {{props.data.current_status}} to {{props.data.new_status}}
                      </template>
                    </trigger-list-item>

                    <v-divider></v-divider>

                    <trigger-list-item label="Documents" :exists="item.documents.has_docs" :error="item.documents.error" :data="item.documents.data" :message="item.documents.msg">
                      <template v-slot="props">
                        <v-row no-gutters v-for="(document, i) in props.data" :key="i">
                          <v-col>Generated document <a target="_blank" :href="document.Upload.src">{{ document.document_id }}</a></v-col>
                        </v-row>
                      </template>
                    </trigger-list-item>

                    <v-divider></v-divider>

                    <trigger-list-item label="Email" :exists="item.email.has_email" :error="item.email.error" :data="item.email.data" :message="item.email.msg">

                      <template v-slot="props">
                        <v-row no-gutters v-for="(email, i) in props.data" :key="i">
                          <v-col>Sent the following email to {{email.to }}</v-col>
                          <v-col>
                            <div class="colored-bg text-left pa-2" >
                              <strong>{{email.subject}}</strong><br />
                              {{email.message}}
                            </div>
                          </v-col>
                        </v-row>
                      </template>
                    </trigger-list-item>

                    <v-divider></v-divider>

                    <trigger-list-item label="SMS" :exists="item.sms.has_sms" :error="item.sms.error" :data="item.sms.data" :message="item.sms.msg">
                      <template v-slot="props">
                        <v-row no-gutters v-for="(sms, i) in props.data" :key="i">
                          <v-col>Sent the following SMS to {{sms.numbers.map(n => $options.filters.formatPhone(n)).join(', ')}}</v-col>
                          <v-col><div class="colored-bg text-left pa-2" >{{sms.message}}</div></v-col>
                        </v-row>
                      </template>
                    </trigger-list-item>

                    <v-divider></v-divider>

                    <trigger-list-item label="Events/Tasks" :exists="item.events.has_events" :error="item.events.error" :data="item.events.data" :message="item.events.msg">
                      <template v-slot="props">
                        <v-row no-gutters v-for="(data, i) in props.data" :key="i">
                          <v-col>  {{ data.event.type }} Task Created on {{ data.event.start_date | formatLocalDate }} for {{ data.contact }} </v-col>
                        </v-row>

                      </template>
                    </trigger-list-item>

                    <v-divider></v-divider>

                    <trigger-list-item label="Gate Access" :exists="item.gate_access.has_gate_access" :error="item.gate_access.error" :data="item.gate_access.data" :message="item.gate_access.msg">
                      <template v-slot="props">

                        <v-row no-gutters v-for="(tenant, i) in props.data.tenants" :key="i">
                          <v-col> Locked {{tenant.name}} out of unit #{{props.data.unit }}</v-col>
                        </v-row>

                      </template>>
                    </trigger-list-item>

                    <v-divider></v-divider>

                    <trigger-list-item label="Overlock" :exists="item.overlock.has_overlock" :error="item.overlock.error" :data="item.overlock.data" :message="item.overlock.msg">
                      <template v-slot="props">
                        {{ props.data.event.type }} Task Created for  {{ props.data.event.start_date | formatLocalDate }}
                      </template>

                    </trigger-list-item>


                    <v-divider></v-divider>

                    <trigger-list-item label="Deny Payments" :exists="item.deny_payments.has_deny_payments" :error="item.deny_payments.error" :data="item.deny_payments.data" :message="item.deny_payments.msg">
                      <template v-slot="props">
                        {{props.data}}
                      </template>
                    </trigger-list-item>


                    <v-divider></v-divider>

                    <trigger-list-item label="Cancel Insurance" :exists="item.cancel_insurance.has_cancel_insurance" :error="item.cancel_insurance.error" :data="item.cancel_insurance.data" :message="item.cancel_insurance.msg">
                      <template v-slot="props">Cancelled service {{props.data.name }} with ID: {{props.data.id}} </template>
                    </trigger-list-item>

                    <v-divider></v-divider>

                    <trigger-list-item label="Schedule Auction" :exists="item.schedule_auction.has_schedule_auction" :error="item.schedule_auction.error" :data="item.schedule_auction.data" :message="item.schedule_auction.msg">
                      <template v-slot="props">
                        {{ props.data.event.type }} Task Created for  {{ props.data.event.start_date | formatLocalDate }}
                      </template>
                    </trigger-list-item>

                  </v-list>
                </v-card>


              </td>
            </template>


          </v-data-table>
        </div>
      </template>
    </hb-modal>



  </div>

</template>

<script type="text/babel">
    import moment from 'moment';
    import api from '../../assets/api.js';
    import CompanySelector from '../includes/CompanySelector.vue';
    import PropertySelector from '../includes/PropertySelector.vue';
    import HbDatePicker from '../assets/HummingbirdDatepicker';
    import TriggerListItem from './TriggerListItem';
    export default {
        name: "TriggerIndex",
        data() {
            return {
                expanded: [],
                headers: [
                    {text: 'Created At', value: 'created_at'},
                    {text: 'Company', value: 'company_name'},
                    {text: 'Property', value: 'property_name'},
                    {text: 'Item Count', value: 'item_count'},
                    {text: 'Dry Run', value: 'dryrun'},
                    {text: 'Errors', value: 'errors'},
                    {text: 'Admin', value: 'admin'},
                    {text: 'Actions', value: 'actions'},
                ],
                data_headers: [
                    {text: 'Trigger ID', value: 'trigger_id'},
                    {text: 'Trigger Name', value: 'trigger_name'},
                    {text: 'Lease ID', value: 'lease_id'},
                    {text: 'Invoice ID', value: 'invoice_id'},
                    {text: 'Invoice Balance', value: 'balance'},
                    {text: 'Invoice Due', value: 'due'},
                    {text: 'Invoice No.', value: 'number'},
                    {text: 'Unit Number', value: 'unit_number'},
                    {text: 'Errors', value: 'errors'}
                ],
                sortBy: "created_at",
                sortDesc: "desc",
                data:{
                    company_id: '',
                    property_id: '',
                    date: '',
                    lease_id: '',
                    dryrun: false,
                    type: "Migration",
                    run_actions: false
                },
                triggers: [],
                logs: [],

                selected: {},
                dialog: false
            }
        },
        filters:{
            splitRows(arr){
                return arr.join("<br />");
            }
        },
        async created(){
           //  await this.getLogs();
        },
        computed:{
            table_data(){
                return [this.data];
            },

        },

        components: {
            CompanySelector,
            PropertySelector,
            HbDatePicker,
            TriggerListItem
        },
        methods:{
            async loadTriggers(){

                this.triggers = [];
                let r = await api.get(this, api.GET_TRIGGERS, this.data );
                this.triggers = r.triggers.map(t => {
                    return {
                        id: t.id,
                        name: t.id + " - " + t.name + " - " + t.group_name
                    }
                })

            },
            hasError(d){

                let keys = Object.keys(d);
                for (let i = 0; i < keys.length; i++){
                    if(d[keys[i]].error) return true;
                }
                return false
            },
            hasErrors(data){

                return data.filter(d => {
                    let keys = Object.keys(d);
                    for (let i = 0; i < keys.length; i++){
                        if(d[keys[i]].error) return true;
                    }
                    return false;

                }).length
            },
            getItemClass(exists, errors, data){
                if(!exists) return 'disabled';
                if(errors) return 'error';

            },
            getItemMessage(exists, errors, data){
                if(!exists) return 'NO triggers found'
                if(!errors.length) return 'NO triggers found'
            },
            async getLogs(){
                this.logs = [];

                let r = await api.get(this, api.GET_LOGS + 'triggers');
                this.logs = r.logs.map(l => {
                    try {
                        l.data = JSON.parse(l.data);
                    } catch(err){
                    }
                    return l;
                });
                this.logs = r.logs
            },
            async generate(){
                if(this.data.type === "Migration"){
                  this.data.date = null;
                  this.data.lease_id = null;
                }
                if(this.data.type === "Date"){
                  this.data.lease_id = null;
                  this.data.run_actions = false;
                }
                if(this.data.type === "Lease"){
                  this.data.date = null;
                  this.data.run_actions = false;
                }
                let r = await api.post(this, api.GENERATE_TRIGGERS, this.data);
            },
            showLogs(item){
                this.selected = item
                this.dialog = true;
            },

            async deleteLogs(item){
                console.log("item", item)
                let r = await api.delete(this, api.DELETE_LOGS + 'triggers?created_at=' + item.created_at);
                await this.getLogs();
            }

        }
    }

</script>
<style scoped>
  .colored-bg{
    background: #F9FAFB
  }
  .colored-bg .subtable-header{
    /*color: white;*/
  }

  .v-list-item.disabled .v-avatar.v-list-item__avatar i {
    color: #f0f0f0;
  }

  .text-danger{
    color:#ff5252;
  }

</style>




