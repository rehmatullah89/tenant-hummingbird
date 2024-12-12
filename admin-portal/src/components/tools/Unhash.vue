<template>


  <div class="section-content pt-4" :class="{'mt-10' : $vuetify.breakpoint.xs , 'mt-n3' : $vuetify.breakpoint.sm}">
    <div class="primary-section-content1">
      <hb-header class="pt-5" fewer-actions>
        <template v-slot:left>
          <hb-page-header title="Hash IDs"></hb-page-header>
        </template>
      </hb-header>
      <div class="content-view">
        <v-row>
          <v-col cols="3">
            <label>ID To Unhash</label>
            <v-text-field
              class="ma-0"
              type="text"
              hide-details
              v-validate="'required|max:255'"
              v-model="hash"
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
              @click="unhash"
            >
              Hash
            </hb-btn>
          </v-col>
        </v-row>


        <v-row v-if="data.id">
          <v-col cols="8">
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
                headers: [
                  {text: 'ID', value: 'id'},
                  {text: 'Company ID', value: 'company_id'},
                  {text: 'Company Name', value: 'company_name'},
                  {text: 'Company Database', value: 'company_database'},
                  {text: 'Company Schema', value: 'company_collection'}
                ],
                companies: [],
                data:{
                    id: '',
                    company_id: '',
                    company_name: '',
                    company_database: '',
                    company_collection: ''
                },
                hash: ''
            }
        },

        async created(){
            await this.getCompanies();
        },
        computed:{
            table_data(){
                return [this.data];
            }
        },
        components: {
        },
        methods:{
            async getCompanies(){
                let r = await api.get(this, api.COMPANIES);
                this.companies = r.companies;
            },
            async unhash(){
                let r = await api.post(this, api.UNHASH, { hash:this.hash });
                this.data = r;
            }

        }
    }

</script>
<style scoped>
  .login-box img{
    width: 100%;
  }
</style>




