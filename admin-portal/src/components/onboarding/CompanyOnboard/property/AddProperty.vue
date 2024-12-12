<template>
  <hb-modal
    v-model="dialog"
    size="large"
    :title="isEdit ? 'Edit Property' : 'Add Property'"
    @close="$emit('close')"
  >
    <template v-slot:subheader>
      <span class="add-propery-text ml-0">
        Complete the fields below in order to create a property inside the OPS.
      </span>
    </template>
    <template v-slot:content>
      <v-form>
        <status
          @resetStatus="errorClear($options.name)"
          v-if="errorHas($options.name)"
          :message="errorGet($options.name)"
          status="error"
          class="mb-2"
        ></status>
        <v-container class="ma-0 pa-0">
          <hb-form label="Property ID" required> 
              <v-text-field
                v-validate="'required|max:45'"
                v-model.lazy="form.PropertyID"
                label="Property ID"
                single-line
                :id="'Property ID'"
                :name="'Property ID'"
                data-vv-scope="general"
                data-vv-as="Property ID"
                :hide-details="!errors.collect('general.Property ID')"
                :error-messages="errors.collect('general.Property ID')"
              ></v-text-field>
          </hb-form>
        <hb-form label="Property Name" required> 
              <v-text-field
                v-validate="'required|max:45'"
                v-model.lazy="form.name"
                label="Property Name"
                single-line
                :id="'Property Name'"
                :name="'Property Name'"
                data-vv-scope="general"
                data-vv-as="Property Name"
                :hide-details="!errors.collect('general.Property Name')"
                :error-messages="errors.collect('general.Property Name')"
              ></v-text-field>
        </hb-form>
          <hb-form label="GDS Property ID" required v-if="isEdit"> 
              <v-text-field
                v-model.lazy="form.gdsFacilityId"
                single-line
                :id="'GDS Property ID'"
                :name="'GDS Property ID'"
                data-vv-scope="general"
                data-vv-as="GDS Property  ID"
                :disabled="isEdit"
              ></v-text-field>
          </hb-form>
              <hb-form label="Company Email" required > 
              <v-text-field
                v-model.lazy="form.email"
                label="Email"
                data-vv-name="email"
                single-line
                data-vv-scope="general"
                name="form-email"
                id="form-email"
                autocomplete="cc-form-email"
                v-validate="'required|max:45|email'"
                :hide-details="!errors.collect('general.email')"
                :error-messages="
                  errors.collect('general.email').length
                    ? 'A valid Email is required'
                    : null
                "
              >
              </v-text-field>
              </hb-form>
                   <hb-form label="Phone Number" required > 
                     <v-row class="ma-0 pa-0">
                <v-col cols="3" class="ma-0 pa-0 mb-n2 pr-3">
                  <v-autocomplete
                    autocomplete="hb-cc-phone-code"
                    :items="countryCodesList"
                    v-validate="'required'"
                    v-model.lazy="form.phone.code"
                    data-vv-name="phone.code"
                    label="Code"
                    single-line
                    :id="'phone_code'"
                    data-vv-scope="general"
                    data-vv-as="phone code"
                    :name="'phone code'"
                    :hide-details="!errors.collect('general.phone.code').length"
                    :error-messages="
                      errors.collect('general.phone.code').length
                        ? 'A country code field is required'
                        : null
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
                    class="ma-0 pa-0"
                    v-model.lazy="form.phone.number"
                    v-mask="phoneMask(form.phone.code)"
                    label="Number"
                    single-line
                    data-vv-name="phone number"
                    data-vv-scope="general"
                    v-validate="'required'"
                    name="phone number"
                    id="phone number"
                    :hide-details="!errors.collect('general.phone number')"
                    :error-messages="
                      errors.collect('general.phone number')
                        ? errors.collect('general.phone number')
                        : 'Please Enter a Valid Phone Number'
                    "
                  ></v-text-field>
                </v-col>
              </v-row>
                   </hb-form>
            <hb-form label="Address" required> 
              <v-row class="mx-0 pb-0  hb-forms-content-row">
                <v-col cols="12" class="pa-0 ma-0">
                  <v-text-field
                    v-validate="'max:45|required'"
                    label="Street"
                    id="Street"
                    v-model.lazy="form.address"
                    data-vv-name="Street"
                    data-vv-as="Street"
                    data-vv-scope="general"
                    single-line
                    :hide-details="!errors.collect('general.Street')"
                    :error-messages="errors.collect('general.Street')"
                  ></v-text-field>
                </v-col>
              </v-row>
              <v-row class="mx-0 pb-0  hb-forms-content-row">
                <v-col cols="12" class="pa-0 ma-0">
                  <v-text-field
                    v-validate="'max:45'"
                    label="Suite / Apt"
                    id="Suite / Apt"
                    v-model.lazy="form.address2"
                    data-vv-name="Suite / Apt"
                    data-vv-as="Suite / Apt"
                    data-vv-scope="general"
                    :hide-details="!errors.collect('general.Suite / Apt')"
                    :error-messages="errors.collect('general.Suite / Apt')"
                    single-line
                  ></v-text-field>
                </v-col>
              </v-row>
              <v-row class="mx-0 pb-0 mb-3  hb-forms-content-row">
                <v-col cols="3" class="ma-0 pa-0 pr-3">
                  <v-text-field
                    v-validate="'required|alpha_num|max:45'"
                    label="Zip"
                    id="Zip"
                    v-model.lazy="form.zip"
                    data-vv-name="Zip"
                    data-vv-as="Zip"
                    data-vv-scope="general"
                    :hide-details="!errors.collect('general.Zip')"
                    :error-messages="errors.collect('general.Zip')"
                    single-line
                  ></v-text-field>
                </v-col>
                <v-col cols="4" class="ma-0 pa-0 hb-z-index-99999">
                  <v-autocomplete
                    autocomplete="hb-cc-phone-code"
                    :items="states"
                    :disabled="propertyStatusActive"
                    v-validate="'required'"
                    v-model.lazy="form.state"
                    data-vv-name="state"
                    label="State"
                    single-line
                    :id="'state'"
                    data-vv-scope="general"
                    data-vv-as="phone code"
                    :name="'phone code'"
                    :hide-details="!errors.collect('general.state').length"
                    :error-messages="
                      errors.collect('general.state').length
                        ? 'A State field is required'
                        : null
                    "
                  >
                  </v-autocomplete>
                </v-col>
                <v-col cols="5" class="ma-0 pa-0 pl-3">
                  <v-text-field
                    v-validate="'required|max:45'"
                    label="City"
                    id="City"
                    v-model.lazy="form.city"
                    data-vv-name="City"
                    data-vv-as="City"
                    data-vv-scope="general"
                    :hide-details="!errors.collect('general.City')"
                    :error-messages="errors.collect('general.City')"
                    single-line
                  ></v-text-field>
                </v-col>
              </v-row>
            </hb-form>
              <hb-form label="Go Live Date" required> 
              <span class="mb-2 add-propery-text">
                The Go Live Date is predefined 30 days from today’s date. If you
                would like to adjust this date, select a new date below.
              </span>
              <hb-date-picker
                label="MM/DD/YYYY"
                v-model.lazy="form.goLiveDate"
                clearable
                dense
                :min="currentDate"
                id="date"
                name="date"
                @change="changeGoLiveDate"
              >
              </hb-date-picker>
              </hb-form>
               <hb-form label="Due Date" required> 
              <span class="add-propery-text">
                The Due Date is predefined 14 days before the Go Live Date. If
                you would like to adjust this date, select a new date below.
              </span>
              <hb-date-picker
                label="MM/DD/YYYY"
                v-model.lazy="form.dueDate"
                clearable
                dense
                :min="currentDate"
                id="date"
                name="date"
              >
              </hb-date-picker>
               </hb-form>
        </v-container>
      </v-form>
    </template>
    <template v-slot:actions>
      <hb-btn color="primary" @click="save"> Save </hb-btn>
      <span v-show="isLoading($options.name)">
        <loader color="#00b2ce" size="20px" class="inline-loader"></loader>
      </span>
    </template>
  </hb-modal>
</template>

<script>
import api from "../../../../assets/api.js";
import { parsePhoneNumber } from "libphonenumber-js";
import HbDatePicker from "../../../assets/HummingbirdDatepicker.vue";
import Status from "../../../includes/Messages.vue";
import Loader from "../../../assets/CircleSpinner.vue";
import moment from "moment";
import { EventBus } from '../../../../EventBus.js';
export default {
  components: {
    HbDatePicker,
    Status,
    Loader,
  },
  props: ["isEdit", "propertyDetails", "companyDetails"],
  data() {
    return {
      dialog: true,
      form: {
        PropertyID: "",
        email: "",
        name: "",
        gdsFacilityId: "",
        phone: {
          code: "",
          number: "",
        },
        address: "",
        address2: "",
        state: "",
        zip: "",
        city: "",
        goLiveDate: "",
        dueDate: "",
      },
      currentDate: "",
      goLiveDate: "",
      dueDate: "",
      propertyStatusActive:false,
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
      states: [
        "AK",
        "AL",
        "AR",
        "AS",
        "AZ",
        "CA",
        "CO",
        "CT",
        "DC",
        "DE",
        "FL",
        "GA",
        "GU",
        "HI",
        "IA",
        "ID",
        "IL",
        "IN",
        "KS",
        "KY",
        "LA",
        "MA",
        "MD",
        "ME",
        "MI",
        "MN",
        "MO",
        "MP",
        "MS",
        "MT",
        "NC",
        "ND",
        "NE",
        "NH",
        "NJ",
        "NM",
        "NV",
        "NY",
        "OH",
        "OK",
        "OR",
        "PA",
        "PR",
        "RI",
        "SC",
        "SD",
        "TN",
        "TX",
        "UT",
        "VA",
        "VI",
        "VT",
        "WA",
        "WI",
        "WV",
        "WY",
      ],
    };
  },
  created() {
    // set go live date and due date
    this.currentDate = moment().format("YYYY-MM-DD");
    this.form.goLiveDate = moment().add(30, "d").format("YYYY-MM-DD");
    this.form.dueDate = moment().add(16, "d").format("YYYY-MM-DD");

    if (this.isEdit) {
      // split phone number
      const splitAt = index => x => [x.slice(0, index), x.slice(index)]
      this.form.PropertyID = this.propertyDetails.number
      this.form.name = this.propertyDetails.name
      this.form.gdsFacilityId = this.propertyDetails.gds_facility_id
      this.form.dueDate = this.propertyDetails.due_date
      this.form.goLiveDate = this.propertyDetails.golive_date
      this.form.address = this.propertyDetails.Address.address
      this.form.address2 = this.propertyDetails.Address.address2
      this.form.zip = this.propertyDetails.Address.zip
      this.form.state = this.propertyDetails.Address.state
      this.form.city = this.propertyDetails.Address.city
      this.form.phone.code = splitAt(-10)(this.propertyDetails.Phones[0].phone)[0]
      this.form.phone.number = splitAt(-10)(this.propertyDetails.Phones[0].phone)[1]
      this.form.email = this.propertyDetails.Emails[0].email

      // disable state when property status active
      this.propertyStatusActive = this.propertyDetails.property_status == 'new'? false:true;
    }
  },
  methods: {
    phoneMask(code) {
      return "(###) ###-####";
    },
     close() {
      this.$emit("close");
      this.dialog = false;
    },
    // change go live date
    changeGoLiveDate() {
      if (
        moment(this.form.goLiveDate).diff(moment(this.currentDate), "days") <=
        14
      ) {
        this.form.dueDate = this.form.goLiveDate;
      } else {
        this.form.dueDate = moment(this.form.goLiveDate).subtract(14, "d").format("YYYY-MM-DD");;
      }
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
      var phoneNumber = this.form.phone.number.replace(/\D/g, "");
      let t = moment.tz.guess();
      let timeZone = moment.tz(t).zoneAbbr();
      var data = {
        company_subdomain: this.companyDetails.subdomain,
        company_id: this.companyDetails.company_id,
        number: this.form.PropertyID,
        name: this.form.name.trim(),
        due_date: this.form.dueDate,
        golive_date: this.form.goLiveDate,
        Address: {
          address: this.form.address,
          address2: this.form.address2,
          zip: this.form.zip,
          state: this.form.state,
          city: this.form.city,
        },
        utc_offset:moment().format("Z"),
        timezone_abrv:timeZone,
        Phones: [{ type: "", phone: this.form.phone.code + "" + phoneNumber }],
        Emails: [{ type: "", email: this.form.email }],
      };
      if (this.isEdit) {
        data["property_id"] = this.propertyDetails.property_id;
      }
      var data_str = JSON.stringify(data);
       let currentLocalDate = this.$options.filters.formatDateTimeCustom(
        new Date(),
        "MMM DD, YYYY @ h:mma."
      );
      if (this.isEdit == false) {
        api.post(this, api.ADD_ONBOARDING_PROPERTY, data).then((res) => {
            EventBus.$emit('success-error-message', {
                            type: 'success',
                            description: "The " + data.name + " has been Added on " + currentLocalDate
                        });
            this.close();
          })
          .catch((err) => {const error = {  msg: err, };
            let payload = { id: "err",formErrors: [error], };
          });
      } else {
        api.put(this, api.ADD_ONBOARDING_PROPERTY, data).then((res) => {
          EventBus.$emit('success-error-message', {
                            type: 'success',
                            description: "The " + data.name + " has been Updated on " + currentLocalDate
                        });
            this.close();
          })
          .catch((err) => { const error = {  msg: err, }; let payload = {id: "err",formErrors: [error], };
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
.add-propery-text {
  color: #637381;
  font-size: 14px;
}
.error-message {
  color: #ff5252 !important;
  caret-color: #ff5252 !important;
  font-size: 12px;
}
</style>
