<template>


  <div class="section-content pt-4" :class="{'mt-10' : $vuetify.breakpoint.xs , 'mt-n3' : $vuetify.breakpoint.sm}">
    <div class="primary-section-content1">
      <hb-header class="pt-5" fewer-actions>
        <template v-slot:left>
          <hb-page-header title="Invoices"></hb-page-header>
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
            <v-col>
              <company-selector v-model="data.company_id"></company-selector>
            </v-col>

            <v-col>
              <property-selector v-show="data.company_id" v-if="data.company_id" :company_id="data.company_id" v-model="data.property_id"></property-selector>
            </v-col>

            <v-col>
              <div v-show="data.company_id">
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
            </v-col>

            <v-col>
              <div v-show="data.company_id">
                <label>Lease ID</label>
                <v-text-field
                  class="ma-0"
                  type="text"
                  hide-details
                  v-validate="'required|max:255'"
                  v-model="data.lease_id"
                  dense
                  outlined
                  clearable
                  id="lease_id"
                  name="lease_id"
                  data-vv-as="lease_id"
                  :class="{'custom-field-error' : errors.first('lease_id')}"
                ></v-text-field>
              </div>
            </v-col>

            <v-col class="mt-4 flex-shrink text-right">
              <div v-show="data.company_id">
                <v-switch
                  v-model="data.dryrun"
                  label="Dry Run"
                ></v-switch>
              </div>
            </v-col>

            <v-col class="mt-8 flex-shrink text-right">
              <div v-show="data.company_id">
                <hb-btn 
                  color="primary" 
                  @click="generate"
                  :disabled=" !(data.company_id && data.property_id && data.date) || isLoading($options.name)"
                >
                  Generate
                </hb-btn>
              </div>
            </v-col>
          </v-row>
        </v-container>

        <v-row v-if="invoices.length">
          <v-col cols="12">
            <v-data-table
              :headers="headers"
              :items="invoices"
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
        <span class="hb-text-light">Here is what the auto generated invoices look like</span>
      </template>
      <template v-slot:content>
        <div class="pa-10">


          <v-data-table
            :headers="invoice_headers"
            single-expand
            show-expand
            item-key="lease_id"
            :expanded.sync="expanded"
            :items="selected"
            disable-pagination
            hide-default-footer
            class="hb-data-table hb-data-table-cursor-on bordered-table "
          >
            <template v-slot:item.total_tax="{ item }">
              {{  item.total_tax  | formatMoney }}
            </template>

            <template v-slot:item.total_discounts="{ item }">
              {{  item.total_discounts  | formatMoney }}
            </template>

            <template v-slot:item.total_payments="{ item }">
              {{  item.total_payments  | formatMoney }}
            </template>

            <template v-slot:item.total_amt="{ item }">
              {{  item.total_amt | formatMoney }}
            </template>

            <template v-slot:item.due="{ item }">
              {{  item.due  | formatDate }}
            </template>

            <template v-slot:item.date="{ item }">
              {{  item.date  | formatDate }}
            </template>

            <template v-slot:item.balance="{ item }">
              {{  item.balance  | formatMoney }}
            </template>

            <template v-slot:expanded-item="{ headers, item }">
              <td :colspan="headers.length" class="pr-10 pl-10 pt-10 pb-10 colored-bg" >
                <div class="pl-3 pt-0 pb-2 subtable-header"><strong>Line Items</strong></div>
                <v-data-table
                  :headers="invoice_line_headers"
                  :items="item.InvoiceLines"
                  disable-pagination
                  hide-default-footer
                  class="hb-data-table hb-data-table-cursor-on bordered-table elevation-1"
                >
                  <template v-slot:item.product="{ item }">
                    {{item.Service.Product.name}} ({{item.Service.price | formatMoney }})<br />
                    {{item.start_date }} - {{ item.end_date }}
                  </template>
                  <template v-slot:item.product_type="{ item }">
                    {{item.Service.Product.default_type}}
                  </template>
                  <template v-slot:item.cost="{ item }">
                    {{ item.cost | formatMoney }}
                  </template>
                  <template v-slot:item.tax="{ item }">

                    <div v-for="(b,j) in  item.TaxLines" :key="j">
                      {{ b.amount | formatMoney}} <span class="hb-text-light">({{b.taxrate}}%)</span>
                    </div>

                  </template>

                  <template v-slot:item.discount="{ item }">
                    <div v-for="(d,j) in  item.DiscountLines" :key="j">
                      {{ d.amount | formatMoney}} <span class="hb-text-light">({{d.Promotion.name}})</span>
                    </div>

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
                invoice_headers: [
                    {text: 'Lease ID', value: 'lease_id'},
                    {text: 'Number', value: 'number'},
                    {text: 'Date', value: 'date'},
                    {text: 'Due', value: 'due'},
                    {text: 'Subtotal', value: 'total_amt'},
                    {text: 'Tax', value: 'total_tax'},
                    {text: 'Discounts', value: 'total_discounts'},
                    {text: 'Payments', value: 'total_payments'},
                    {text: 'Balance', value: 'balance'},
                ],
                invoice_line_headers: [
                    {text: 'Product', value: 'product'},
                    {text: 'Type', value: 'product_type'},
                    {text: 'Qty', value: 'qty'},
                    {text: 'Amount', value: 'cost'},
                    {text: 'Tax', value: 'tax'},
                    {text: 'Discounts', value: 'discount'},

                ],
                data:{
                    company_id: '',
                    property_id: '',
                    date: '',
                    lease_id: '',
                    dryrun: true
                },
                invoices: [],
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
                let r = await api.get(this, api.GET_LOGS + 'invoice-create');
                this.invoices = r.logs;
            },
            async generate(){
                let r = await api.post(this, api.GENERATE_INVOICES, this.data);
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




