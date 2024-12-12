
<template>


  <div class="section-content pt-4" :class="{'mt-10' : $vuetify.breakpoint.xs , 'mt-n3' : $vuetify.breakpoint.sm}">
    <div class="primary-section-content1">
      <hb-header class="pt-5" fewer-actions>
        <template v-slot:left>
          <hb-page-header title="Deployment Plan For Hummingbird Admin Portal"></hb-page-header>
        </template>
      </hb-header>
      <div class="content-view">
        <v-container fluid>

          <v-row>
            <v-col>
              <h4>1. Enter Mysql and Redshift database information</h4>
              <p>Ensure that the connection information is correct for all databases</p>
            </v-col>
          </v-row>

          <v-divider></v-divider>
          <v-row>
            <v-col>
              <h4>2. Configure the Sandbox Company</h4>
              <p>The sandbox company will be used to configure all other companies, so ensure the databases and schemas are set correctly for Sandbox.</p>
            </v-col>
          </v-row>
          <v-divider></v-divider>
          <v-row>
            <v-col>
              <h4>3. Migrate company information from Hummingbird to Dynamo</h4>
              <p>Click the button below to migrate all the companies into Dynamo.</p>
              <hb-btn color="primary" @click="migrate">Migrate Companies</hb-btn>
            </v-col>
          </v-row>
          <v-divider></v-divider>
          <v-row>
            <v-col>
              <h4>4. Bounce the API server and Worker Server</h4>
              <p>The database configuration in Dynamo is loaded when the server starts, so it needs to be restarted to have the up to date configuration</p>
            </v-col>
          </v-row>
          <v-divider></v-divider>
          <v-row>
            <v-col>
              <h4>5. Resubscribe GDS Facilities</h4>
              <p>Click the button below to resubscribe all GDS facilities to the new URL structure</p>
              <hb-btn color="primary" @click="resubscribe">Resubscribe Properties</hb-btn>
            </v-col>
          </v-row>
          <v-divider></v-divider>
        </v-container>
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
                headers: [],
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
            },
            async resubscribe(){
                let r = await api.get(this, api.RESUBSCRIBE);
            },
            async migrate(){
                let r = await api.get(this, api.MIGRATE);
            }
        }
    }

</script>
<style scoped>
  .login-box img{
    width: 100%;
  }
</style>
