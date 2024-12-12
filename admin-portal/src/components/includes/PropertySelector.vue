<template>
  <div>
    <label>Choose Property</label>
    <v-select
      class="ma-0"
      type="text"
      hide-details
      v-validate="'required'"
      v-model="property_id"
      :items="properties"
      :clearable="clearable"
      backgroundColor="white"
      required
      dense
      outlined
      item-text="name"
      item-value="id"
      id="property_id"
      name="property_id"
      data-vv-as="Property"
      @input="sendValue"
      :class="{'custom-field-error' : errors.first('property_id')}"
      :error-messages="errors.first('property_id')"
    ></v-select>
  </div>
</template>

<script type="text/babel">
    import api from '../../assets/api.js';
    export default {
        name: "CompanySelector",
        data() {
            return {
                properties: [],
                property_id: '',
            }
        },
        props: ['value', 'company_id', 'clearable'],
        async created(){
            if(this.value){
                this.company_id = this.value;
            }
            await this.getProperties();
        },
        computed:{
            table_data(){
                return [this.data];
            }
        },
        components: {

        },
        methods:{
            async getProperties(){
                if(!this.company_id) return;
                let q = `?sort=${true}`;
                let r = await api.get(this, 'companies/' + this.company_id + '/' + api.PROPERTIES + q);
                this.properties = r.properties;
            },
            sendValue(){
                this.$emit('input', this.property_id);
            }
        },
        watch:{
            value(val){
                this.property_id = val;
            },
            company_id(val){
                this.properties = [];
                this.company_id = val;
                this.getProperties();
            }
        }
    }

</script>
