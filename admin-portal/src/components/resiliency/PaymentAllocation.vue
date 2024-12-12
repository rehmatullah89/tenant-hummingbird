<template>
  <div class="section-content pt-4" :class="{'mt-10' : $vuetify.breakpoint.xs , 'mt-n3' : $vuetify.breakpoint.sm}">
    <div class="primary-section-content1">
      <hb-header class="pt-5" fewer-actions>
        <template v-slot:left>
          <hb-page-header title="Generate Payment Allocations"></hb-page-header>
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
              <property-selector  v-show="data.companyId" :company_id="data.companyId" :clearable=true v-model="data.propertyId"></property-selector>
            </v-col>

            <v-col>
              <div v-show="data.companyId">
                <label>Contact ID</label>
                <v-text-field
                  class="ma-0"
                  type="text"
                  hide-details
                  v-validate="'required|max:255'"
                  v-model="data.contactId"
                  dense
                  outlined
                  clearable
                  id="contactId"
                  name="contactId"
                  data-vv-as="contactId"
                  :class="{'custom-field-error' : errors.first('contactId')}"
                  :error-messages="errors.first('contactId')"
                ></v-text-field>
              </div>
            </v-col>

            <v-col>
              <div v-show="data.companyId">
                <v-checkbox
                  class="mt-10"
                  dense
                  v-model="data.activeLease"
                  :label="'Active Leases'"
                  id="activeLease"
                  name="activeLease"
                  data-vv-as="activeLease"
                  :class="{'custom-field-error' : errors.first('activeLease')}"
                  :error-messages="errors.first('activeLease')"
                ></v-checkbox>
              </div>
            </v-col>

            <v-col class="text-right">

              <v-row class="mt-8 justify-end">

                  <div class="mr-4" v-if="data.companyId">
                    <hb-btn
                      color="primary"
                      :disabled="isLoading($options.name)"
                      @click="fetch"
                    >
                      <v-icon left>mdi-refresh</v-icon>Fetch
                    </hb-btn>
                  </div>

                  <div class="mr-4" v-if="data.companyId">
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

        <v-row v-if="payments.length">
          <v-col cols="12">

            <v-data-table
              :headers="headers"
              :items="payments"
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
                    {text: 'Payment ID', value: 'payment_id'},
                    {text: 'Contact ID', value: 'contact_id'},
                    {text: 'Contact Name', value: 'name'},
                    {text: 'Property ID', value: 'property_id'},
                    {text: 'Property Name', value: 'property_name'},
                    {text: 'UnApplied', value: 'remaining'},
                    {text: 'Active Leases', value: 'active_leases'},
                    {text: 'Active Lease IDs', value: 'active_lease_ids'}
              ],
              data: {
                companyId: '',
                propertyId: '',
                contactId: '',
                activeLease: false,
              },
              payments: [],
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
                    contact_id: this.data.contactId,
                    active_lease: this.data.activeLease,
                }
                
                return data;
            },
            async generate(){
                let r = await api.post(this, api.GENERATE_PAYMENT_ALLOCATION, this.transformData());
            },
            async fetch(){
                let q = `?cid=${this.data.companyId}&active_lease=${this.data.activeLease}`;
                if(this.data.propertyId) q += `&property_id=${this.data.propertyId}`;
                if(this.data.contactId) q += `&contact_id=${this.data.contactId}`;

                let r = await api.get(this, api.GENERATE_PAYMENT_ALLOCATION + q);
                this.payments = r;
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