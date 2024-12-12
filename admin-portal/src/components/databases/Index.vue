<template>
  <div class="section-content pt-4" :class="{'mt-10' : $vuetify.breakpoint.xs , 'mt-n3' : $vuetify.breakpoint.sm}">
    <div class="primary-section-content1">
      <hb-header class="pt-5" fewer-actions>
        <template v-slot:left>
          <hb-page-header title="Databases"></hb-page-header>
        </template>
        <template v-slot:right>
          <a class="hb-link" @click="showAdd = true">+ Add Database</a>
        </template>
      </hb-header>
      <div class="content-view">

        <v-data-table
          :headers="headers"
          :items="databases"
          disable-pagination
          hide-default-footer
          class="hb-data-table hb-data-table-cursor-on"
          @click:row="editItem"
        >
        </v-data-table>
      </div>
    </div>


    <manage-database v-if="showAdd" :selected="selected" @close="close" @refetch="getDatabases"></manage-database>
  </div>

</template>

<script type="text/babel">
    import api from '../../assets/api.js';
    import ManageDatabase from './ManageDatabase.vue';
    export default {
        name: "DatabaseIndex",
        data() {
            return {
                selected:{},
                databases: [],
                showAdd: false,
                headers: [
                    { text: "Name", value: "name" },
                    { text: "User", value: "user" },
                    { text: "Password", value: "password" },
                    { text: "Read Hostname", value: "read_hostname" },
                    { text: "Write Hostname", value: "write_hostname" },
                    { text: "Redshift Hostname", value: "redshift_hostname" },
                    // { text: "Actions", value: "actions", align: "right", sortable: false, width: 10 },
                ]
            }
        },

        async created(){
            await this.getDatabases();
        },
        computed:{},
        components: {
            ManageDatabase
        },
        methods:{
            async getDatabases(){
                let r = await api.get(this, api.DATABASES);
                this.databases = r.databases;
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
