<template>


  <div class="section-content pt-4" :class="{'mt-10' : $vuetify.breakpoint.xs , 'mt-n3' : $vuetify.breakpoint.sm}">
    <div class="primary-section-content1">
      <hb-header class="pt-5" fewer-actions>
        <template v-slot:left>
          <hb-page-header title="Auto Payments"></hb-page-header>
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
        <v-alert
          v-if="!data.dryrun"
          outlined
          type="warning"
          border="left"
          icon="mdi-alert"
        >Dry Run is off. This process will run for real.</v-alert>

        <v-container fluid>
          <v-row class="form-controls">
            <v-col cols="3">
              <company-selector v-model="data.company_id"></company-selector>
            </v-col>

            <v-col cols="3" v-if="data.company_id">
              <property-selector v-if="data.company_id" :company_id="data.company_id" v-model="data.property_id"></property-selector>
            </v-col>

            <v-col cols="3" v-if="data.company_id && data.property_id">
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
            </v-col>

            <v-col class="mt-4 flex-shrink text-right" v-if="data.company_id">
              <v-switch
                v-model="data.dryrun"
                label="Dry Run"
              ></v-switch>
            </v-col>

            <v-col class="mt-8 flex-shrink text-right" v-if="data.company_id && data.property_id && data.date">
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
      title="Auto Payments Display"
      @close="dialog = false"

    >
      <template v-slot:subheader>
        <span class="hb-text-light">Discrepancy Breakdown</span>
      </template>
      <template v-slot:content>
        <div class="pa-10">

          <v-data-table
            :headers="data_headers"
            single-expand
            show-expand
            item-key="id"
            :expanded.sync="expanded"
            :items="selected"
            disable-pagination
            hide-default-footer
            class="hb-data-table hb-data-table-cursor-on bordered-table "
          >
            <template v-slot:item.total="{ item }">
              {{ item.total | formatMoney }}
            </template>

            <template v-slot:item.payment_id="{ item }">
              {{ item.payment.status}}
            </template>
            <template v-slot:item.payment_status="{ item }">
              {{ item.payment.status}}
            </template>
            <template v-slot:item.payment_status_desc="{ item }">
              {{ item.payment.status}}
            </template>
            <template v-slot:item.payment_transaction_id="{ item }">
              {{ item.payment.transaction_id}}
            </template>


            <template v-slot:expanded-item="{ headers, item }">
              <td :colspan="data_headers.length + 1" class="pr-3 pl-3 pt-5 pb-5 colored-bg" >
                <div class="pl-3 pt-0 pb-2 subtable-header"><strong>Invoices</strong></div>

                <v-data-table
                  :headers="invoice_headers"
                  :items="item.invoice_applications"
                  disable-pagination
                  hide-default-footer
                  class="hb-data-table hb-data-table-cursor-on bordered-table elevation-1"
                >
                  <template v-slot:item.rent_to_pay_amount="{ item }">
                    {{item.rent_to_pay_amount | formatMoney}} <br />({{item.rent_to_pay_percent}})
                  </template>

                  <template v-slot:item.other_to_pay_amount="{ item }">
                    {{item.other_to_pay_amount | formatMoney}} <br />({{item.other_to_pay_percent}})
                  </template>

                  <template v-slot:item.payment_total="{ item }">
                    {{item.payment_total | formatMoney}}
                  </template>

                  <template v-slot:item.sub_total="{ item }">
                    {{item.sub_total | formatMoney}}
                  </template>

                  <template v-slot:item.total_tax="{ item }">
                    {{item.total_tax | formatMoney}}
                  </template>

                  <template v-slot:item.total_discounts="{ item }">
                    {{item.total_discounts | formatMoney}}
                  </template>

                  <template v-slot:item.original_total="{ item }">
                    {{item.original_total | formatMoney}}
                  </template>

                  <template v-slot:item.total_payments="{ item }">
                    {{item.total_payments | formatMoney}}
                  </template>

                  <template v-slot:item.balance="{ item }">
                    {{item.balance | formatMoney}}
                  </template>

                </v-data-table>

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
                    {text: 'Payment Method ID', value: 'id'},
                    {text: 'Name On Card', value: 'name_on_card'},
                    {text: 'Card End', value: 'card_end'},
                    {text: 'Token', value: 'token'},
                    {text: 'Total Payment', value: 'total'},
                    {text: 'Payment ID', value: 'payment_id'},
                    {text: 'Transaction ID', value: 'payment_transaction_id'},
                    {text: 'Status', value: 'payment_status'},
                    {text: 'Status Description', value: 'payment_status_desc'},


                ],
                invoice_headers: [
                    {text: 'Inv ID', value: 'id'},
                    {text: 'Lease ID', value: 'lease_id'},
                    {text: 'Unit #', value: 'unit_number'},
                    {text: 'Subtotal', value: 'sub_total'},
                    {text: 'Tax', value: 'total_tax'},
                    {text: 'Discounts', value: 'total_discounts'},
                    {text: 'Inv. Total', value: 'original_total'},
                    {text: 'Prev Payments', value: 'total_payments'},
                    {text: 'Balance', value: 'balance'},
                    {text: 'Rent', value: 'rent_to_pay_amount'},
                    {text: 'Other', value: 'other_to_pay_amount'},
                    {text: 'Pay Total', value: 'payment_total'},
                ],
                data:{
                    company_id: '',
                    property_id: '',
                    date: '',
                    dryrun: true
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
                let r = await api.get(this, api.GET_LOGS + 'auto-payments');
                this.logs = r.logs;
            },
            async generate(){
                let r = await api.post(this, api.GENERATE_AUTOPAYMENTS, this.data);
            },
            showLogs(invoice){
                this.selected = JSON.parse(invoice);
                this.dialog = true;
            }

        }
    }

</script>
<style scoped>
  .login-box img{
    width: 100%;
  }
  .colored-bg{
    background: #F9FAFB
  }
  .colored-bg .subtable-header{
    /*color: white;*/
  }
</style>




