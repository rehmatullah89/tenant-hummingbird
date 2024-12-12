<template>
  <div class="section-content pt-4" :class="{'mt-10' : $vuetify.breakpoint.xs , 'mt-n3' : $vuetify.breakpoint.sm}">
    <div class="primary-section-content1">
      <hb-header class="pt-5" fewer-actions>
        <template v-slot:left>
          <hb-page-header title="Generate Exports"></hb-page-header>
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
              <company-selector v-model="companyId"></company-selector>
            </v-col>

            <v-col >
              <property-selector  v-show="companyId" :company_id="companyId" v-model="propertyId"></property-selector>
            </v-col>

            <v-col>
              <div v-show="companyId && propertyId">
                <label>From Date</label>
                <hb-date-picker
                  @click:clear="fromDate = ''" 
                  label="MM/DD/YYYY"
                  clearable
                  dense
                  id="date"
                  data-vv-name="date"
                  name="date"
                  v-model="fromDate">
                </hb-date-picker>
              </div>
            </v-col>

            <v-col>
              <div v-show="companyId && propertyId">
                <label>To Date</label>
                <hb-date-picker
                  @click:clear="toDate = ''" 
                  label="MM/DD/YYYY"
                  clearable
                  dense
                  id="date"
                  data-vv-name="date"
                  name="date"
                  v-model="toDate">
                </hb-date-picker>
              </div>
            </v-col>

            <v-col class="text-right">

              <v-row class="mt-8 justify-end">

                  <div class="mr-4" v-if="companyId && propertyId">
                    <hb-btn
                      color="primary"
                      :disabled="isLoading($options.name)"
                      @click="fetch"
                    >
                      <v-icon left>mdi-refresh</v-icon>Fetch
                    </hb-btn>
                  </div>

                  <div class="mr-4" v-if="companyId && propertyId">
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
        <v-row v-if="counts.length">
          <v-col cols="12">

            <v-data-table
              :headers="headers"
              :items="counts"
              disable-pagination
              hide-default-footer
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
                    {text: 'Name', value: 'name'},
                    {text: 'Count', value: 'count'}
              ],
              counts: [],
              companyId: '',
              propertyId: '',
              fromDate: '',
              toDate: ''
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
                    cid: this.companyId,
                    property_id: this.propertyId,
                    from_date: this.fromDate,
                    to_date: this.toDate
                }
                
                return data;
            },
            async generate(){
                let r = await api.post(this, api.GENERATE_EXPORTS, this.transformData());
            },
            async fetch(){
                let q = `?cid=${this.companyId}&property_id=${this.propertyId}${this.fromDate ? `&from_date=${this.fromDate}` : ''}${this.toDate ? `&to_date=${this.toDate}` : ''}`;
                let r = await api.get(this, api.GENERATE_EXPORTS + q);
                this.counts = r;
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