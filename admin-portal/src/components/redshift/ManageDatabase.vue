<template>
  <hb-modal
    v-model="dialog"
    size="large"
    :title="dialogMode + ' Redshift Database'"
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
        Provide the relevant redshift database details here
      </span>
    </template>
    <template v-slot:content>
      <v-container class="pa-5">
        <v-row class="ma-0 pa-0">
          <v-col md="12" class="pt-0 px-5 ma-0">
            <label>Name</label>
            <v-text-field
              :disabled="!!selected.name"
              class="ma-0"
              type="text"
              hide-details
              v-validate="'required|max:255'"
              v-model="data.name"
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
          <v-col md="12" class="pt-0 px-5 ma-0">
            <label>User</label>
            <v-text-field
              class="ma-0"
              type="text"
              hide-details
              v-validate="'required|max:255'"
              v-model="data.user"
              required
              dense
              outlined
              id="user"
              name="user"
              :class="{'custom-field-error' : errors.first('user')}"
              :error-messages="errors.first('user')"
            ></v-text-field>
          </v-col>
        </v-row>



        <v-row class="ma-0 pa-0">
          <v-col md="12" class="pt-0 px-5 ma-0">
            <label>Password</label>
            <v-text-field
              hide-details="auto"
              class="ma-0"
              type="text"
              v-validate="'required|max:255'"
              v-model="data.password"
              required
              dense
              outlined
              id="password"
              name="password"
              :class="{'custom-field-error' : errors.first('password')}"
              :error-messages="errors.first('password')"
            ></v-text-field>
          </v-col>
        </v-row>


        <v-row class="ma-0 pa-0">
          <v-col md="12" class="pt-0 px-5 ma-0">
            <label>Hostname</label>
            <v-text-field
              hide-details="auto"
              class="ma-0"
              type="text"
              v-validate="'required|max:255'"
              v-model="data.hostname"
              required
              dense
              outlined
              id="hostname"
              name="hostname"
            ></v-text-field>
          </v-col>
        </v-row>


        <v-row class="ma-0 pa-0">
          <v-col md="12" class="pt-0 px-5 ma-0">
            <label>Port</label>
            <v-text-field
              hide-details="auto"
              class="ma-0"
              type="text"
              v-validate="'required|max:255'"
              v-model="data.port"
              required
              dense
              outlined
              id="port"
              name="port"
            ></v-text-field>
          </v-col>
        </v-row>

        <v-row class="ma-0 pa-0">
          <v-col md="12" class="pt-0 px-5 ma-0">
            <label>Database</label>
            <v-text-field
              hide-details="auto"
              class="ma-0"
              type="text"
              v-validate="'required|max:255'"
              v-model="data.database"
              required
              dense
              outlined
              id="database"
              name="database"
            ></v-text-field>
          </v-col>
        </v-row>


      </v-container>
    </template>
    <template v-slot:actions>
      <hb-btn
        color="primary"
        :disabled="isLoading($options.name)"
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
        name: "ManageDatabase",
        data() {
            return {
                dialog: true,
                data:{
                    name: '',
                    user : "",
                    password : "",
                    hostname: "",
                    database: "",
                    port: ""
                }
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
            if(this.selected){
                this.data = JSON.parse(JSON.stringify(this.selected));
            }
        },
        destroyed() {},
        computed: {
            ...mapGetters({
            }),

            editMode() {
                return !!this.selected.id;
            },

            promotionType() {

            },
            dialogMode() {
                return this.selected.name ? "View/Edit" : "Add";
            }
        },

        methods: {
            ...mapActions({}),
            async save(){
                if(this.selected.name){
                    await api.put(this, api.REDSHIFTS + this.data.name, this.data);
                } else {
                    await api.post(this, api.REDSHIFTS, this.data)
                }
                this.$emit('refetch');
                this.$emit('close');
            }
        },
    };
</script>
<style >

</style>

