
<template>


  <div class="section-content pt-4" :class="{'mt-10' : $vuetify.breakpoint.xs , 'mt-n3' : $vuetify.breakpoint.sm}">
    <div class="primary-section-content1">
      <hb-header class="pt-5" fewer-actions>
        <template v-slot:left>
          <hb-page-header title="Unhash ID"></hb-page-header>
        </template>
      </hb-header>
      <div class="content-view">
        <v-row>
          <v-col cols="3">

            <label>Company</label>
            <v-select
              class="ma-0"
              type="text"
              hide-details
              v-validate="'required|max:255'"
              v-model="data.company_id"
              :items="companies"
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
          </v-col>
          <v-col cols="3">
            <label>ID To Hash</label>
            <v-text-field
              class="ma-0"
              type="text"
              hide-details
              v-validate="'required|max:255'"
              v-model="data.id"
              required
              dense
              outlined
              id="id"
              name="id"
              data-vv-as="id"
              :class="{'custom-field-error' : errors.first('id')}"
              :error-messages="errors.first('id')"
            ></v-text-field>
          </v-col>
          <v-col cols="3" class="mt-8">
            <hb-btn
              color="primary"
              :disabled="isLoading($options.name)"
              @click="hash"
            >
              Hash
            </hb-btn>
          </v-col>
        </v-row>

        <v-row v-if="hashed_id">
          <v-col cols="3">
            <v-data-table
              :headers="headers"
              :items="table_data"
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

    export default {
        name: "CompanyIndex",
        data() {
            return {
                headers: [{text: 'Hashed ID', value: 'hashed_id'}],
                companies: [],
                data:{
                    id: '',
                    company_id: ''

                },
                hashed_id: '',
            }
        },

        async created(){
            await this.getCompanies();
        },
        computed:{
            table_data(){
                return [{hashed_id: this.hashed_id}];
            }
        },
        components: {
        },
        methods:{
            async getCompanies(){
                let r = await api.get(this, api.COMPANIES);
                this.companies = r.companies;
            },
            async hash(){
                let r = await api.post(this, api.HASH, this.data);
                this.hashed_id = r.hashed_id;
            }

        }
    }

</script>
<style scoped>
  .login-box img{
    width: 100%;
  }
</style>
