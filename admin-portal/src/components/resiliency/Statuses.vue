<template>


  <div class="section-content pt-4" :class="{'mt-10' : $vuetify.breakpoint.xs , 'mt-n3' : $vuetify.breakpoint.sm}">
    <div class="primary-section-content1">
      <hb-header class="pt-5" fewer-actions>
        <template v-slot:left>
          <hb-page-header title="Statuses"></hb-page-header>
        </template>
        <template v-slot:right>
          <hb-btn
            color="primary"
            :disabled="isLoading($options.name)"
            @click="getLogs"
          >
            <v-icon left>mdi-refresh</v-icon>Refresh Data
          </hb-btn>

        </template>
      </hb-header>
      <div class="content-view">
        <!-- <v-alert
          v-if="!data.dryrun"
          outlined
          type="warning"
          border="left"
          icon="mdi-alert"
        >Dry Run is off. This process will run for real.</v-alert> -->
        <v-container fluid>
         
        <v-row class="form-controls">
          <v-col cols="3">
            <company-selector v-model="data.company_id"></company-selector>
          </v-col>

          <v-col cols="3" v-if="data.company_id">
            <property-selector v-if="data.company_id" :company_id="data.company_id" v-model="data.property_id"></property-selector>
          </v-col>


          <!-- <v-col class="mt-4 flex-shrink text-right" v-if="data.company_id">
            <v-switch
              v-model="data.dryrun"
              label="Dry Run"
            ></v-switch>
          </v-col> -->

          <v-col class="mt-8 flex-shrink text-right" v-if="data.company_id && data.property_id">
            <hb-btn
              color="primary"
              :disabled="isLoading($options.name)"
              @click="generate"
            >
              Generate
            </hb-btn>
          </v-col>
        </v-row>
        </v-container>


        <v-row v-if="logs.length">
          <v-col cols="12">
            <v-data-table
              :headers="headers"
              :items="logs"
              disable-pagination
              hide-default-footer
              class="hb-data-table hb-data-table-cursor-on bordered-table"
            >
              <template v-slot:item.created_at="{ item }">
                {{ item.created_at | formatLocalDateTime }}
              </template>

              <template v-slot:item.item_count="{ item }">
                {{ JSON.parse(item.data).length}}
              </template>

              <template v-slot:item.dryrun="{ item }">
                {{  item.dryrun ? 'Yes' : 'No' }}
              </template>
              <template v-slot:item.actions="{ item }">
                <hb-btn color="primary" @click="showLogs(item.data)">View</hb-btn>
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
      title="Invoice Display"
      @close="dialog = false"

    >
      <template v-slot:subheader>
        <span class="hb-text-light">Discrepancy Breakdown</span>
      </template>

      <template v-slot:item.lease_start="{ item }">
        {{  item.lease_start | formatDate }}
      </template>




      <template v-slot:content>
        <div class="pa-10">

          <v-data-table
            :headers="data_headers"
            item-key="lease_id"
            :expanded.sync="expanded"
            :items="selected"
            disable-pagination
            hide-default-footer
            class="hb-data-table hb-data-table-cursor-on bordered-table "
          >
            <template v-slot:item.lease_end="{ item }">
              {{  item.lease_end | formatDate }}
            </template>

            <template v-slot:item.lease_start="{ item }">
              {{  item.lease_start | formatDate }}
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
    export default {
        name: "CompanyIndex",
        data() {
            return {
                expanded: [],
                headers: [
                    {text: 'Created At', value: 'created_at'},
                    {text: 'Company', value: 'company_name'},
                    {text: 'Property', value: 'property_name'},
                    {text: 'Item Count', value: 'item_count'},
                    {text: 'Dry Run', value: 'dryrun'},
                    {text: 'Admin', value: 'admin'},
                    {text: 'Actions', value: 'actions'},
                ],
                data_headers: [
                    {text: 'Lease ID', value: 'id'},
                    {text: 'Error Type', value: 'error_type'},
                    {text: 'Current Status', value: 'lease_standing_name'},
                    {text: 'Proper Status', value: 'proper_lease_status_name'},
                    {text: 'Start Date', value: 'lease_start'},
                    {text: 'End Date', value: 'lease_end'},
                    {text: 'Unit ID', value: 'unit_id'},
                ],
                data:{
                    company_id: '',
                    property_id: '',
                    date: '',
                    dryrun: false
                },
                logs: [],
                loading: false,
                selected: {},
                dialog: false
            }
        },

        async created(){
            await this.getLogs();
        },
        computed:{
            table_data(){
                return [this.data];
            },

        },

        components: {
            CompanySelector,
            PropertySelector,
            HbDatePicker
        },
        methods:{

            async getLogs(){
              //    let r = await api.get(this, api.GET_LOGS + 'status-discrepancies');
              //   this.logs = r.logs;
            },
            async generate(){
                let r = await api.post(this, api.GENERATE_STATUS_DISCREPANCIES, this.data);
            },
            showLogs(invoice){
                this.selected = JSON.parse(invoice);
                this.dialog = true;
            }

        }
    }

</script>
<style scoped>


</style>




