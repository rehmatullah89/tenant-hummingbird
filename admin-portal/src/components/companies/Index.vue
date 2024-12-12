<template>


  <div class="section-content pt-4" :class="{'mt-10' : $vuetify.breakpoint.xs , 'mt-n3' : $vuetify.breakpoint.sm}">
    <div class="primary-section-content1">
      <hb-header class="pt-5" fewer-actions>
        <template v-slot:left>
          <hb-page-header title="Companies"></hb-page-header>
        </template>
        <template v-slot:right v-if="isSuperAdmin">
          <a class="hb-link" @click="showAdd = true">+ Add Company</a>
        </template>
      </hb-header>
      <div class="content-view">

        <v-data-table
          :headers="headers"
          :items="companies"
          disable-pagination
          hide-default-footer
          class="hb-data-table hb-data-table-cursor-on"
          @click:row="editItem"
        >
          <template v-slot:item.database="{ item }">
            {{ item.database }} - {{ item.collection }}
          </template>
          <template v-slot:item.redshift="{ item }">
            {{ item.redshift }} - {{ item.redshift_schema }}
          </template>
        </v-data-table>
      </div>
    </div>


    <manage-company v-if="showAdd" :selected="selected" @close="close" @refetch="getCompanies">
    </manage-company>
  </div>

</template>

<script type="text/babel">
    import api from '../../assets/api.js';
    import ManageCompany from './ManageCompany.vue';
    import { mapGetters } from 'vuex';
    export default {
        name: "CompanyIndex",
        data() {
            return {
                selected:{},
                companies: [],
                showAdd: false,
                headers: [
                    { text: "ID", value: "company_id" },
                    { text: "Hashed ID", value: "hashed_company_id" },
                    { text: "Name", value: "name" },
                    { text: "GDS Owner ID", value: "gds_owner_id" },
                    { text: "HB Company ID", value: "hb_company_id" },
                    { text: "Subdomain", value: "subdomain" },
                    { text: "Namespace", value: "namespace" },
                    { text: "Database", value: "database" },
                    { text: "Redshift", value: "redshift" },
                    { text: "Schema", value: "collection" },
                    // { text: "Actions", value: "actions", align: "right", sortable: false, width: 10 },
                ]
            }
        },

        async created(){
            await this.getCompanies();
        },
        computed:{
          ...mapGetters({
                isSuperAdmin: 'authenticationStore/isSuperAdmin'
            })
        },
        components: {
            ManageCompany
        },
        methods:{
            async getCompanies(){
                let r = await api.get(this, api.COMPANIES);
                this.companies = r.companies;
            },
            async editItem(item){
              this.selected = item;
              this.showAdd = true;
            },
            close(){
                this.selected = {};
                this.showAdd = false
            }
        }
    }

</script>
<style scoped>
  .login-box img{
    width: 100%;
  }
</style>
