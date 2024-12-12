<template>
  <hb-modal
    v-model="dialog"
    size="large"
    :title="dialogMode + ' Admin'"
    @close="$emit('close')"
    :footerCancelOption="!editMode"
  >
   
    <template v-slot:subheader>
      <span class="hb-text-light">
        Provide the relevant company details here
      </span>
       <status
      @resetStatus="errorClear($options.name)"
      v-if="errorHas($options.name)"
      :message="errorGet($options.name)"
      status="error"
       class="mb-2"
    ></status>
    </template>
    <template v-slot:content>
      <v-container class="pa-5">
        <v-row class="ma-0 pa-0">
          <v-col md="12" class="pt-0 px-5 ma-0">
            <label>Name</label>
            <v-row class="ma-0 pa-0" no-gutters>
              <v-col cols="6">
                <v-text-field
                  class="ma-0"
                  type="text"
                  v-validate="'required|max:255'"
                  v-model="data.first"
                  required
                  dense
                  outlined
                  placeholder="First Name"
                  :id="'First Name'"
                  :name="'First Name'"
                   data-vv-scope="general"
                  data-vv-as="First Name"
                  :hide-details="!errors.collect('general.First Name')"
                :error-messages="errors.collect('general.First Name')"
                ></v-text-field>
              </v-col>
              <v-col cols="6">
                <v-text-field
                  class="ma-0"
                  type="text"
                  v-validate="'required|max:255'"
                  v-model="data.last"
                  required
                  dense
                  outlined
                  placeholder="Last Name"
                  id="Last Name"
                  name="Last Name"
                   data-vv-scope="general"
                  data-vv-as="Last Name"
                  :hide-details="!errors.collect('general.Last Name')"
                :error-messages="errors.collect('general.Last Name')"
                ></v-text-field>
              </v-col>
            </v-row>
          </v-col>
        </v-row>

        <v-row class="ma-0 pa-0">
          <v-col md="12" class="pt-0 px-5 ma-0">
            <label>Email</label>
            <v-text-field
              class="ma-0"
              type="text"
              v-validate="'required|max:255'"
              v-model="data.email"
              required
              dense
              outlined
              placeholder="Email"
              id="Email"
                  name="Email"
                   data-vv-scope="general"
                  data-vv-as="Email"
                  :hide-details="!errors.collect('general.Email')"
                :error-messages="errors.collect('general.Email')"
            ></v-text-field>
          </v-col>
        </v-row>

        <v-row class="ma-0 pa-0">
          <v-col md="12" class="pt-0 px-5 ma-0">
            <label>Password</label>
            <v-text-field
              class="ma-0"
              type="password"
              v-validate="'required|max:255'"
              v-model="data.password"
              placeholder="Password"
              dense
              hint="Entering a new password will reset it"
              outlined
              id="password"
              name="password"
              data-vv-scope="general"
              data-vv-as="password"
             :hide-details="!errors.collect('general.password')"
                :error-messages="errors.collect('general.password')"
            ></v-text-field>
          </v-col>
        </v-row>

        <v-row class="ma-0 pa-0">
          <v-col md="12" class="pt-0 px-5 ma-0">
            <label>Password Confirmation</label>
            <v-text-field
              class="ma-0"
              type="password"
              v-validate="'required|max:255'"
              v-model="data.password2"
              dense
              outlined
              placeholder="Password"
              id="password2"
              name="password2"
              data-vv-as="password2"
              data-vv-scope="general"
             :hide-details="!errors.collect('general.password2')"
                :error-messages="errors.collect('general.password2')"
            ></v-text-field>
          </v-col>
        </v-row>

         <v-row class="ma-0 pa-0">
          <v-col md="12" class="pt-0 px-5 ma-0">
            <label>Admin Role</label>
            <v-select
              :items="roles"
              item-text="name"
              item-value="value"
              class="pa-0 mt-0"
              outlined
              dense
              id="admin_role"
              name="Admin Role"
              placeholder="Select"
              single-line
              data-vv-scope="general"
              v-model="data.superadmin"
              v-validate="'required'"
              data-vv-as="Admin Role"
             :hide-details="!errors.collect('general.Admin Role')"
                :error-messages="errors.collect('general.Admin Role')"
            ></v-select>
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
        name: "ManageCompany",
        data() {
            return {
                dialog: true,
                roles : [{name : 'Super Admin', value : true}, {name : 'Agent', value : false}],
                data:{
                    email: null,
                    first: null,
                    last: null,
                    password: null,
                    superadmin: null
                },

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
                this.data.password = '';
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
                return this.data.id ? "View/Edit" : "Add";
            }
        },

        methods: {
            ...mapActions({}),
            async save(){
                let general_status = await this.$validator.validateAll("general");
                 if (!general_status) {
                  this.errorSet(
                    this.$options.name,
                    "There are errors on your form. Please correct them before continuing."
                  );
                  return;
                }
                if(!this.selected.email || this.data.password){
                    if(!this.data.password) {
                        this.errorSet(this.$options.name, "Please enter a password");
                        return;
                    }
                    if(this.data.password !== this.data.password2) {
                        this.errorSet(this.$options.name, "Passwords do not match");
                        return;
                    }
                }

                if(this.selected.email){
                  await api.put(this, api.ADMINS, this.data).then((res) => {
                     this.$emit('close');
                     this.$emit('refetch');
                  }).catch(err =>{
                    const error = {
                  msg: err,
                };
                  let payload = {
                    id: "err",
                    formErrors: [error],
                  };
                  })
                } else {
                  await api.post(this, api.ADMINS, this.data).then((res) => {
                     this.$emit('close');
                     this.$emit('refetch');
                  }).catch(err =>{
                    console.log(err)
                    const error = {
                        msg: err,
                    };
                  let payload = {
                    id: "err",
                    formErrors: [error],
                  };
                })
                
               
                }
            }
        }
    };
</script>
<style >

</style>

