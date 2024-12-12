<template>


  <div class="section-content pt-4" :class="{'mt-10' : $vuetify.breakpoint.xs , 'mt-n3' : $vuetify.breakpoint.sm}">
    <div class="primary-section-content1">
      <hb-header class="pt-5" fewer-actions>
        <template v-slot:left>
          <hb-page-header title="Inbound Communication"></hb-page-header>
        </template>
      </hb-header>
      <div class="content-view">
        <v-container fluid>
        <v-row class="form-controls">
          <v-col cols="3">
            <company-selector v-model="data.company_id"></company-selector>
          </v-col>

          <v-col cols="3" v-if="data.company_id">
            <property-selector v-if="data.company_id" :company_id="data.company_id" v-model="data.property_id"></property-selector>
          </v-col>

          <v-col class="mt-8 flex-shrink text-right" v-if="data.company_id && data.property_id">
            <hb-btn
              color="primary"
              :disabled="isLoading($options.name)"
              @click="subscribe"
            >
              Subscribe
            </hb-btn>
          </v-col>
        </v-row>
        </v-container>
      </div>
    </div>
  </div>

</template>

<script type="text/babel">
    import moment from 'moment';
    import api from '../../assets/api.js';
    import CompanySelector from '../includes/CompanySelector.vue';
    import PropertySelector from '../includes/PropertySelector.vue';
    export default {
        name: "CompanyIndex",
        data() {
            return {
                data:{
                    company_id: '',
                    property_id: ''
                },
                loading: false,
            }
        },

        async created(){
        },
        computed:{
        },

        components: {
            CompanySelector,
            PropertySelector
        },
        methods:{
            async subscribe(){
              api.post(this, api.SUBSCRIBE, this.data).then(r =>{
                this.$store.dispatch( "notificationsStore/setSuccessNotification", { id: this.$options.name, text: r.msg  } );
              }).catch(err =>{
                this.$store.dispatch("notificationsStore/setErrorNotification", {
                  id: this.$options.name,
                  formErrors: [{ msg: err }]
                });
              });
              
            },

        }
    }

</script>
<style scoped>


</style>




