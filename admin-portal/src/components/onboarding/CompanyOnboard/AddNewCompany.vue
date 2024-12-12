<template>
  <hb-modal
    v-model="dialog"
    size="large"
    :title="isEdit ? 'Edit Company' : 'Add Company'"
    @close="$emit('close')"
  >
    <template v-slot:subheader>
      <span class="hb-text-light">
        Complete all the fields below to setup the company.
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
      <v-form>
        <v-container class="ma-0 pa-0">
          <hb-form label="Company Name" required> 
              <v-text-field
                v-validate="'required|max:45'"
                v-model.lazy="form.name"
                label="Company Name"
                single-line
                :id="'Company name'"
                :name="'Company name'"
                data-vv-scope="general"
                data-vv-as="Company name"
                :hide-details="!errors.collect('general.Company name')"
                :error-messages="errors.collect('general.Company name')"
              ></v-text-field>
               </hb-form>
              <hb-form label="Subdomain" required :tooltip="true" :tooltipHeader="'This is their production URL.'" :tooltipBody="'For example:subdomain.tenantinc.com'"> 
              <v-text-field
                v-validate="'required|max:45|alpha_num'"
                v-model.lazy="form.subdoamin"
                label="Enter Subdomain"
                single-line
                :id="'Subdomain name'"
                :name="'Subdomain name'"
                data-vv-scope="general"
                data-vv-as="Subdomain name"
                :hide-details="!errors.collect('general.Subdomain name')"
                :error-messages="errors.collect('general.Subdomain name')"
                :disabled="isEdit"
              ></v-text-field>
              </hb-form>
              <hb-form label="GDS Owner ID"   v-if="isEdit" > 
              <v-text-field
                v-model.lazy="form.gdsOwnerId"
                single-line
                :id="'GDS Owner ID'"
                :name="'GDS Owner ID'"
                data-vv-scope="general"
                data-vv-as="GDS Owner ID"
                :disabled="isEdit"
              ></v-text-field>
              </hb-form>
                   <hb-form label="Owner Name" required :tooltip="true"  :tooltipBody="'This is the owner of the company.'" > 
                      <v-row class="ma-0 pa-0">
                        <v-col cols="6" class="ma-0 pa-0">
                  <v-text-field
                    v-model.lazy="form.first_name"
                    v-validate="'required|max:45'"
                    label="First Name"
                    single-line
                    data-vv-scope="general"
                    data-vv-as="First name"
                    name="First name"
                    :hide-details="!errors.collect('general.First name').length"
                    :error-messages="errors.collect('general.First name')"
                    autocomplete="cc-lease-first-name"
                  ></v-text-field>
                </v-col>
                <v-col cols="6" class="ma-0 pa-0">
                  <v-text-field
                    v-model.lazy="form.last_name"
                    v-validate="'required|max:45'"
                    label="Last Name"
                    single-line
                    data-vv-scope="general"
                    data-vv-as="Last name"
                    name="Last name"
                    :hide-details="!errors.collect('general.Last name').length"
                     :error-messages="errors.collect('general.Last name')"
                    autocomplete="cc-lease-last-name"
                  ></v-text-field>
                  </v-col>
                      </v-row>
                   </hb-form>
                <hb-form label="Email" required> 
              <v-text-field
                v-model.lazy="form.email"
                label="Email"
                data-vv-name="Email"
                single-line
                data-vv-scope="general"
                name="form-email"
                id="form-email"
                autocomplete="cc-form-email"
                v-validate="'required|email'"
                :hide-details="!errors.collect('general.Email').length"
                :error-messages="
                  errors.collect('general.Email').length
                    ? 'A valid Email is required'
                    : null
                "
              >
              </v-text-field>
                </hb-form>
               <hb-form label="Cell Phone" required> 
              <v-row class="ma-0 pa-0">
                <v-col cols="3" class="ma-0 pa-0 mb-n2 pr-3">
                  <v-autocomplete
                    autocomplete="hb-cc-phone-code"
                    :items="countryCodesList"
                    v-validate="'required'"
                    v-model.lazy="form.phone.code"
                    label="Code"
                    single-line
                    :id="'phone_code'"
                    data-vv-scope="general"
                    data-vv-as="phone code"
                    :name="'phone code'"
                    :hide-details="!errors.collect('general.phone code').length"
                    :error-messages="
                      errors.collect('general.phone code').length
                        ? 'The Code is required'
                        : ''
                    "
                  >
                    <template v-slot:selection="data">
                      +{{ data.item }}
                    </template>
                    <template v-slot:item="data"> +{{ data.item }} </template>
                  </v-autocomplete>
                </v-col>
                <v-col cols="5" class="ma-0 pa-0">
                  <v-text-field
                    autocomplete="hb-cc-phone-number"
                    v-model.lazy="form.phone.number"
                    v-mask="phoneMask()"
                    label="Number"
                    single-line
                    data-vv-name="Phone"
                    data-vv-scope="general"
                    v-validate="'required'"
                    name="Phone"
                    id="phone"
                    :hide-details="
                      !errors.collect('general.Phone')
                    "
                    :error-messages="
                      errors.collect('general.Phone').length
                        ? 'The Phone Number is required'
                        : ''
                    "
                  ></v-text-field>
                 </v-col>
              </v-row>
               </hb-form>
                  <hb-form label="Internal Technical Contact" required :tooltip="true"  :tooltipBody="'This is the responsible individual who’s in charge of onboarding the company.'"  > 
                  <v-select
                    :items="internal_contact"
                    item-text="name"
                    item-value="name"
                    v-validate="'required'"
                    v-model="form.internal_contact"
                    label="Select"
                    single-line
                    id="internal_type"
                    name="internal_type"
                    data-vv-scope="general"
                    :hide-details="
                      !errors.collect('general.internal_type').length
                    "
                    :error-messages="
                      errors.collect('general.internal_type').length
                        ? 'An Internal Technical Contact is required'
                        : ''
                    "
                  ></v-select>
                  </hb-form>
        </v-container>
      </v-form>
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

<script>
import api from "../../../assets/api.js";
import { parsePhoneNumber } from "libphonenumber-js";
import Loader from "../../assets/CircleSpinner.vue";
import Status from "../../includes/Messages.vue";
import { EventBus } from '../../../EventBus.js';
import { mapGetters } from 'vuex';
export default {
  name: "AddCompany",
  data() {
    return {
      dialog: true,
      form: {
        phone: {
          code: "",
          number: "",
        },
        email: "",
        name: "",
        subdoamin: "",
        gdsOwnerId:"",
        first_name: "",
        last_name: "",
        tech_contact_name: "",
        tech_contact_email: "",
        tech_contact_phone: "",
        status: "",
        internal_contact:""
      },
      phone_types: ["Phone", "Cell", "Home", "Work", "Fax", "Other"],
      invalidPhones: {},
      countryCodesList: [
        "1",
        "7",
        "20",
        "27",
        "30",
        "31",
        "32",
        "33",
        "34",
        "36",
        "39",
        "40",
        "41",
        "43",
        "44",
        "45",
        "46",
        "47",
        "48",
        "49",
        "51",
        "52",
        "53",
        "54",
        "55",
        "56",
        "57",
        "58",
        "60",
        "61",
        "62",
        "63",
        "64",
        "65",
        "66",
        "81",
        "82",
        "84",
        "86",
        "90",
        "91",
        "92",
        "93",
        "94",
        "95",
        "98",
        "211",
        "212",
        "213",
        "216",
        "218",
        "220",
        "221",
        "222",
        "223",
        "224",
        "225",
        "226",
        "227",
        "228",
        "229",
        "230",
        "231",
        "232",
        "233",
        "234",
        "235",
        "236",
        "237",
        "238",
        "239",
        "240",
        "241",
        "242",
        "243",
        "244",
        "245",
        "246",
        "247",
        "248",
        "249",
        "250",
        "251",
        "252",
        "253",
        "254",
        "255",
        "256",
        "257",
        "258",
        "260",
        "261",
        "262",
        "263",
        "264",
        "265",
        "266",
        "267",
        "268",
        "269",
        "290",
        "291",
        "297",
        "298",
        "299",
        "350",
        "351",
        "352",
        "353",
        "354",
        "355",
        "356",
        "357",
        "358",
        "359",
        "370",
        "371",
        "372",
        "373",
        "374",
        "375",
        "376",
        "377",
        "378",
        "380",
        "381",
        "382",
        "383",
        "385",
        "386",
        "387",
        "389",
        "420",
        "421",
        "423",
        "500",
        "501",
        "502",
        "503",
        "504",
        "505",
        "506",
        "507",
        "508",
        "509",
        "590",
        "591",
        "592",
        "593",
        "594",
        "595",
        "596",
        "597",
        "598",
        "599",
        "670",
        "672",
        "673",
        "674",
        "675",
        "676",
        "677",
        "678",
        "679",
        "680",
        "681",
        "682",
        "683",
        "685",
        "686",
        "687",
        "688",
        "689",
        "690",
        "691",
        "692",
        "850",
        "852",
        "853",
        "855",
        "856",
        "880",
        "886",
        "960",
        "961",
        "962",
        "963",
        "964",
        "965",
        "966",
        "967",
        "968",
        "970",
        "971",
        "972",
        "973",
        "974",
        "975",
        "976",
        "977",
        "992",
        "993",
        "994",
        "995",
        "996",
        "998",
      ],
    };
  },
  props: ["isEdit", "companyDetails" , "internal_contact"],
  created() {
    if (this.isEdit) {
      // split phone number
      const splitAt = (index) => (x) => [x.slice(0, index), x.slice(index)];
      this.form.name = this.companyDetails.name;
      this.form.subdoamin = this.companyDetails.subdomain;
      this.form.gdsOwnerId = this.companyDetails.gds_owner_id;
      this.form.phone.code = splitAt(-10)(this.companyDetails.owner_phone)[0];
      this.form.phone.number = splitAt(-10)(this.companyDetails.owner_phone)[1];
      this.form.status = this.companyDetails.status;
      this.form.internal_contact = this.companyDetails.tech_contact_name;
      this.form.company_id = this.companyDetails.company_id;
      this.form.email = this.companyDetails.owner_email;
      this.form.first_name = this.companyDetails.owner_firstname;
      this.form.last_name = this.companyDetails.owner_lastname;
    }
  },
  components: {
    Status,
    Loader,
  },
  computed:{
    ...mapGetters({
      isSuperAdmin: 'authenticationStore/isSuperAdmin'
    })
  },
  methods: {
    close() {
      this.$emit("close");
      this.dialog = false;
    },
    phoneMask() {
      return "(###) ###-####";
    },
    async save() {
      let general_status = await this.$validator.validateAll("general");
      var invalidPhones = this.form.phone.number.replace(/\D/g, "");

      
      
      if (!general_status) {
        this.errorSet(
          this.$options.name,
          "There are errors on your form. Please correct them before continuing."
        );
        return;
      }

      if (invalidPhones.length != 10) {
        this.errorSet(
          this.$options.name,
          "Please enter valid phone number(s) before continuing."
        );
        return;
      }
      
      var data = {
        name: this.form.name.trim(),
        firstname: this.form.first_name,
        lastname: this.form.last_name,
        email: this.form.email,
        phone:
          this.form.phone.code + "" + this.form.phone.number.replace(/\D/g, ""),
        subdomain: this.form.subdoamin.trim(),
        status: "new",
        tech_contact_name: "",
        tech_contact_email: "",
        tech_contact_phone: "",
      };
      if (this.isEdit) {
        data.company_id = this.form.company_id;
      }

      for (let i = 0; i < this.internal_contact.length; i++) {
        if (
          this.internal_contact[i].name === this.form.internal_contact
        ) {
          data.tech_contact_name = this.internal_contact[i].name;
          data.tech_contact_email = this.internal_contact[i].email;
          data.tech_contact_phone = this.internal_contact[i].phone;
          data.tech_contact_id = this.internal_contact[i].contact_id;
        }
      }
      let currentLocalDate = this.$options.filters.formatDateTimeCustom(
        new Date(),
        "MMM DD, YYYY @ h:mma."
      );
      if (this.isEdit == false) {
        api
          .post(this, api.ADD_ONBOARDING_COMPANY, data)
          .then((res) => {
             EventBus.$emit('success-error-message', {
                            type: 'success',
                            description: "The " + data.name + " has been Added on " + currentLocalDate
                        });
            this.close();
          })
          .catch((err) => {
            const error = {
              msg: err,
            };
            let payload = {
              id: "err",
              formErrors: [error],
            };
          });
      } else {
        api
          .put(this, api.ADD_ONBOARDING_COMPANY, data)
          .then((res) => {
            EventBus.$emit('success-error-message', {
                            type: 'success',
                            description: "The " + data.name + " has been Updated on " + currentLocalDate,
                        });
            this.close();
          })
          .catch((err) => {
            const error = {
              msg: err,
            };
            let payload = {
              id: "err",
              formErrors: [error],
            };
          });
      }
    },
  },
};
</script>

<style>
.v-label {
  line-height: 12px !important;
  font-size: 14px;
}
.v-application .error--text .v-text-field__slot {
  color: #ff5252 !important;
  caret-color: #ff5252 !important;
}
.v-input.error--text input,
.v-input.error--text label,
.v-input.error--text .v-select__selection,
.v-input.error--text textarea,
.v-label.v-label--active.theme--light.error--text {
  color: #ff5252 !important;
}

.tooltip-cursor {
  cursor: pointer;
}
</style>
