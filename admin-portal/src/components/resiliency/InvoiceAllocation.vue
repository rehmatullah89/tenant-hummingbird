<template>
  <div class="section-content pt-4" :class="{'mt-10' : $vuetify.breakpoint.xs , 'mt-n3' : $vuetify.breakpoint.sm}">
    <div class="primary-section-content1">
      <hb-header class="pt-5" fewer-actions>
        <template v-slot:left>
          <hb-page-header title="Generate Invoice Allocations"></hb-page-header>
        </template>
      </hb-header>
      <div class="content-view">
        <!--    <v-alert
          v-show="data.run_actions"
          outlined
          type="warning"
          border="left"
          icon="mdi-alert"
        >
          The following actions will be run for this deliquency process up through the current day:
          <br /><br />
          Overlock, Deny Access, Deny Online Payments, Cancel Insurance, Schedule Action and Change Tenant Status.
        </v-alert> -->

        <v-container fluid>
          <v-row class="form-controls">
            <v-col>
              <company-selector v-model="data.companyId"></company-selector>
            </v-col>

            <v-col >
              <property-selector  v-show="data.companyId" :company_id="data.companyId" v-model="data.propertyId"></property-selector>
            </v-col>

            <v-col>
              <div v-show="data.companyId && data.propertyId">
                <label>Invoice ID</label>
                <v-text-field
                  class="ma-0"
                  type="text"
                  hide-details
                  v-validate="'required|max:255'"
                  v-model="data.invoiceId"
                  dense
                  outlined
                  clearable
                  id="invoiceId"
                  name="invoiceId"
                  data-vv-as="invoiceId"
                  :class="{'custom-field-error' : errors.first('invoiceId')}"
                  :error-messages="errors.first('invoiceId')"
                ></v-text-field>
              </div>
            </v-col>

            <v-col class="text-right">

              <v-row class="mt-8 justify-end">

                  <div class="mr-4" v-if="data.companyId && data.propertyId">
                    <hb-btn
                      color="primary"
                      :disabled="isLoading($options.name)"
                      @click="fetch"
                    >
                      <v-icon left>mdi-refresh</v-icon>Fetch
                    </hb-btn>
                  </div>

                  <div class="mr-4" v-if="data.companyId && data.propertyId">
                    <hb-btn
                      color="primary"
                      :disabled="isLoading($options.name)"
                      @click="generate"
                    >
                      Generate
                    </hb-btn>
                  </div>
              </v-row>
            </v-col>
          </v-row>
        </v-container>

        <v-row v-if="invoices.length">
          <v-col cols="12">

            <v-data-table
              :headers="headers"
              :items="invoices"
              :items-per-page="15"
              :page.sync="pagination.current"
              :footer-props="{
                itemsPerPageOptions: [15, 30, 50, -1],
              }"
              class="hb-data-table hb-data-table-cursor-on bordered-table"
            >

            </v-data-table>
          </v-col>
        </v-row>

      </div>
    </div>
  </div>

</template>

<script type="text/babel">
    import api from '../../assets/api.js';
    import CompanySelector from '../includes/CompanySelector.vue';
    import PropertySelector from '../includes/PropertySelector.vue';
    import HbDatePicker from '../assets/HummingbirdDatepicker';

    export default {
        name: "GenerateExports",
        data() {
            return {
              headers: [
                    {text: 'Invoice ID', value: 'invoice_id'},
                    {text: 'Payable', value: 'invoice_payable'},
                    {text: 'Paid', value: 'invoice_total_payment'},
                    {text: 'BreakDown Amt', value: 'invoice_breakdown_amount'},
                    {text: 'Allocation Amt', value: 'invoice_allocation_amount'},
                    {text: 'Affected Breakdown IDs', value: 'breakdown_ids'},
                    {text: 'Affected Refund IDs', value: 'refund_ids'},
              ],
              data: {
                companyId: '',
                propertyId: '',
                invoiceId: '',
              },
              invoices: [],
              pagination: {
                current: 1
              }
            }
        },
        async created(){
        },
        computed:{            
        },
        components: {
            CompanySelector,
            PropertySelector,
            HbDatePicker
        },
        methods:{
            transformData() {
                const data = {
                    cid: this.data.companyId,
                    property_id: this.data.propertyId,
                    invoice_id: this.data.invoiceId,
                }
                
                return data;
            },
            async generate(){
                let r = await api.post(this, api.GENERATE_INVOICE_ALLOCATION, this.transformData());
            },
            async fetch(){
                let q = `?cid=${this.data.companyId}&property_id=${this.data.propertyId}${this.data.invoiceId ? `&invoice_id=${this.data.invoiceId}` : ''}`;
                let r = await api.get(this, api.GENERATE_INVOICE_ALLOCATION + q);
                this.invoices = r;
                this.pagination.current = 1;
            },
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