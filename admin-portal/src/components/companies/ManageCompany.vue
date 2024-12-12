<template>
  <hb-modal
    v-model="dialog"
    size="large"
    :title="dialogMode + ' Company'"
    @close="$emit('close')"
    :footerCancelOption="!editMode"
  >
    <status
      @resetStatus="errorClear($options.name)"
      v-if="errorHas($options.name)"
      :message="errorGet($options.name)"
      status="error"
    ></status>
    <template v-slot:subheader>
      <span class="hb-text-light">
        Provide the relevant company details here
      </span>
    </template>
    <template v-slot:content>
      <v-container class="pa-5">
        <v-row class="ma-0 pa-0" v-if="!!selected.company_id">
          <v-col md="12" class="pt-0 px-5 ma-0">
            <label>Company ID</label>
            <div style="padding: 5px 10px;">
              {{company.company_id}}
            </div>

          </v-col>
        </v-row>

        <v-row class="ma-0 pa-0" v-if="selected.hashed_company_id">
          <v-col md="12" class="pt-0 px-5 ma-0">
            <label>Hashed Company ID</label>
            <div style="padding: 5px 10px;">
              {{company.hashed_company_id}}
            </div>
          </v-col>
        </v-row>


        <v-row class="ma-0 pa-0">
          <v-col md="6" class="pt-0 px-5 ma-0">
            <label>Company Name</label>
            <v-text-field
              class="ma-0"
              type="text"
              hide-details
              v-validate="'required|max:255'"
              v-model="company.name"
              required
              dense
              outlined
              id="name"
              name="name"

              :class="{'custom-field-error' : errors.first('name')}"
              :error-messages="errors.first('name')"
            ></v-text-field>
          </v-col>
        </v-row>

        <v-row class="ma-0 pa-0">
          <v-col md="6" class="pt-0 px-5 ma-0">
            <label>Subdomain</label>
            <v-text-field
              dense
              outlined
              class="ma-0"
              type="text"
              hide-details
              v-validate="'required|max:255'"
              v-model="company.subdomain"
              required
              id="subdomain"
              name="subdomain"
              :class="{'custom-field-error' : errors.first('subdomain')}"
              :error-messages="errors.first('subdomain')"
            ></v-text-field>
          </v-col>
        </v-row>

        <v-row class="ma-0 pa-0">
          <v-col md="6" class="pt-0 px-5 ma-0">
            <label>Hummingbird ID</label>
            <v-text-field
              class="ma-0"
              type="text"
              hide-details
              v-validate="'required|max:255'"
              v-model="company.hb_company_id"
              required
              dense
              outlined
              id="hb_company_id"
              name="hb_company_id"
              data-vv-as="Hummingbird ID"
              :class="{'custom-field-error' : errors.first('hb_company_id')}"
              :error-messages="errors.first('hb_company_id')"
            ></v-text-field>
          </v-col>
        </v-row>


        <v-row class="ma-0 pa-0">
          <v-col md="6" class="pt-0 px-5 ma-0">
            <label>GDS Owner ID</label>
            <v-text-field
              class="ma-0"
              type="text"
              hide-details
              v-validate="'required|max:255'"
              v-model="company.gds_owner_id"
              required
              dense
              outlined
              id="gds_owner_id"
              name="gds_owner_id"
              data-vv-as="GDS Owner ID"
              :class="{'custom-field-error' : errors.first('gds_owner_id')}"
              :error-messages="errors.first('gds_owner_id')"
            ></v-text-field>

          </v-col>
        </v-row>

        <v-row class="ma-0 pa-0">
          <v-col md="6" class="pt-0 px-5 ma-0">
            <label>Namespace</label>
            <v-text-field
              dense
              outlined
              class="ma-0"
              type="text"
              hide-details
              v-validate="'required|max:255'"
              v-model="company.namespace"
              required
              id="namespace"
              name="namespace"
              :class="{'custom-field-error' : errors.first('namespace')}"
              :error-messages="errors.first('namespace')"
            ></v-text-field>
          </v-col>
        </v-row>

        <v-row class="ma-0 pa-0">
          <v-col md="6" class="pt-0 px-5 ma-0">
            <label>Database</label>
            <v-select
              :error-messages="errors.first('database')"
              hide-details
              :items="databases"
              item-text="name"
              item-value="name"
              class="pa-0 mt-0"
              outlined
              dense
              id="database"
              name="database"
              placeholder="Select"
              single-line
              v-model="company.database"
              v-validate="'required'"
            ></v-select>
          </v-col>
          <v-col md="6" class="pt-0 px-5 ma-0">
            <label>Schema</label>
            <v-text-field
              dense
              outlined
              class="ma-0"
              type="text"
              hide-details
              v-validate="'required|max:255'"
              v-model="company.collection"
              required
              id="collection"
              name="collection"
              data-vv-as="Schema Name"
              :class="{'custom-field-error' : errors.first('collection')}"
              :error-messages="errors.first('collection')"
            ></v-text-field>
          </v-col>
        </v-row>

        <v-row class="ma-0 pa-0">
          <v-col md="6" class="pt-0 px-5 ma-0">
            <label>Redshift Database</label>
            <v-select
              :error-messages="errors.first('redshift')"
              hide-details
              :items="redshift_databases"
              item-text="name"
              item-value="name"
              class="pa-0 mt-0"
              outlined
              dense
              id="redshift"
              name="redshift"
              placeholder="Select"
              single-line
              v-model="company.redshift"
              v-validate="'required'"
            ></v-select>
          </v-col>

          <v-col md="6" class="pt-0 px-5 ma-0">
            <label>Redshift Schema</label>
            <v-text-field
              dense
              outlined
              class="ma-0"
              type="text"
              hide-details
              v-validate="'required|max:255'"
              v-model="company.redshift_schema"
              required
              id="redshift_schema"
              name="redshift_schema"
              data-vv-as="Schema Name"
              :class="{'custom-field-error' : errors.first('redshift_schema')}"
              :error-messages="errors.first('redshift_schema')"
            ></v-text-field>
          </v-col>

        </v-row>
        
        <v-row class="ma-0 pa-0">
          <v-col md="12" class="pt-0 px-5 ma-0">
            <label>Namespace</label>
            <v-text-field
              dense
              outlined
              class="ma-0"
              type="text"
              hide-details
              v-validate="'required|max:255'"
              v-model="company.namespace"
              required
              id="namespace"
              name="namespace"
              :class="{'custom-field-error' : errors.first('namespace')}"
              :error-messages="errors.first('namespace')"
            ></v-text-field>
          </v-col>
        </v-row>
      </v-container>
    </template>
    <template v-slot:actions>
      <hb-btn
        color="primary"
        :disabled="!isSuperAdmin || isLoading($options.name)"
        @click="save"
      >
        Save
      </hb-btn>
      <span v-show="isLoading($options.name)">
        <loader color="#00b2ce" size="20px" class="inline-loader"></loader>
      </span>
    </template>
  </hb-modal>
</template>

<script type="text/babel">
    import api from "../../assets/api.js";
    import Dropdown from "../assets/Dropdown.vue";
    import Loader from "../assets/CircleSpinner.vue";
    import Status from "../includes/Messages.vue";
    import HbDatePicker from "../assets/HummingbirdDatepicker";
    import { mapGetters, mapActions } from "vuex";

    export default {
        name: "ManageCompany",
        data() {
            return {
              dialog: true,
              company:{
                id: null,
                hashed_company_id: null,
                gds_owner_id: null,
                hb_company_id: null,
                subdomain: null,
                name: null,
                database: null,
                collection: null,
                redshift: null,
                redshift_schema: null,
              },
              databases:[]
            };
        },

        components: {
            Dropdown,
            Status,
            Loader,
            HbDatePicker,
        },
        props: ["selected"],
        async created() {
            await this.getDatabases();
            await this.getRedshiftDatabases();
            if(this.selected){
                this.company = JSON.parse(JSON.stringify(this.selected));
            }
        },
        destroyed() {},
        computed: {
            ...mapGetters({
              isSuperAdmin: 'authenticationStore/isSuperAdmin'
            }),

            editMode() {
                return !!this.selected.id;
            },

            promotionType() {

            },
            dialogMode() {
                return this.company.id ? "View/Edit" : "Add";
            }
        },

        methods: {

            ...mapActions({}),
            async save(){
                if(this.selected.company_id){
                  await api.put(this, api.COMPANIES + this.company.company_id, this.company);
                } else {
                  await api.post(this, api.COMPANIES, this.company)
                }
                this.$emit('refetch');
                this.$emit('close');
            },
            async getDatabases(){
                let r = await api.get(this, api.DATABASES);
                this.databases = r.databases;
            },
            async getRedshiftDatabases(){
                let r = await api.get(this, api.REDSHIFTS);
                this.redshift_databases = r.databases;
            },
        },
    };
</script>
<style >

</style>

