<template>


  <div class="section-content pt-4" :class="{'mt-10' : $vuetify.breakpoint.xs , 'mt-n3' : $vuetify.breakpoint.sm}">
    <div class="primary-section-content1">
      <hb-header class="pt-5" fewer-actions>
        <template v-slot:left>
          <hb-page-header title="Super Admins"></hb-page-header>
        </template>
        <template v-slot:right>
          <a class="hb-link" @click="showAdd = true">+ Add Admin</a>
        </template>
      </hb-header>
      <div class="content-view">

        <v-data-table
          :headers="headers"
          :items="admins"
          disable-pagination
          hide-default-footer
          class="hb-data-table hb-data-table-cursor-on"
          @click:row="editItem"
        >
          <template v-slot:item.password="{ item }">
            <span v-if="item.password ">**********</span>
          </template>

          <template v-slot:item.superadmin="{ item }">
            <span v-if="item.superadmin">
              <!-- <hb-icon color="success">mdi-check-circle-outline</hb-icon> -->
              Super Admin
            </span>
            <span v-else>
              <!-- <hb-icon color="red">mdi-close-circle-outline</hb-icon> -->
              Agent
            </span>
          </template>
        </v-data-table>
      </div>
    </div>
    <manage-admin v-if="showAdd" :selected="selected" @close="close" @refetch="getAdmins">
    </manage-admin>
  </div>

</template>

<script type="text/babel">
    import api from '../../assets/api.js';
    import ManageAdmin from './ManageAdmin.vue';
    export default {
        name: "AdminIndex",
        data() {
            return {
                selected:{},
                admins: [],
                showAdd: false,
                headers: [
                    { text: "First", value: "first" },
                    { text: "Last", value: "last" },
                    { text: "Email", value: "email" },
                    { text: "Password", value: "password" },
                    { text: "Admin Type", value: "superadmin" },
                    // { text: "Actions", value: "actions", align: "right", sortable: false, width: 10 },
                ]
            }
        },

        async created(){
            await this.getAdmins();
        },
        computed:{},
        components: {
            ManageAdmin
        },
        methods:{
            async getAdmins(){
                let r = await api.get(this, api.ADMINS);
                this.admins = r.admins;
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
