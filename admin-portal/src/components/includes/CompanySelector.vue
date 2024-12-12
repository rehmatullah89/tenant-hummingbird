<template>
  <div>
    <label>Choose Company</label>
    <v-select
      class="ma-0"
      type="text"
      hide-details
      v-validate="'required'"
      v-model="company_id"
      :items="companies"
      required
      dense
      backgroundColor="white"
      outlined
      item-text="name"
      item-value="company_id"
      id="company_id"
      name="company_id"
      data-vv-as="Company"
      @input="sendValue"
      :class="{'custom-field-error' : errors.first('company_id')}"
      :error-messages="errors.first('company_id')"
    ></v-select>
  </div>
</template>

<script type="text/babel">
    import api from '../../assets/api.js';
    export default {
        name: "CompanySelector",
        data() {
            return {
                companies: [],
                company_id: '',
            }
        },
        props: ['value'],
        async created(){
            if(this.value){
                this.company_id = this.value;
            }
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
                let q = `?sort_by=name`;
                let r = await api.get(this, api.COMPANIES + q);
                this.companies = r.companies;
            },
            sendValue(){
                this.$emit('input', this.company_id)
            }
        },
        watch:{
            value(val){
                this.company_id = val;
            }
        }
    }

</script>
