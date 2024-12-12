<template>
    <v-autocomplete
        :items="states"
        :hide-details="!error_message"
        label="State"
        :single-line="single_line"
        :dense="dense"
        :value="value"
        @input="emitState"
        @blur="emitSelect"
        class="pt-0 hb-clear-icon-select"
        :error-messages="error_message"
        :clearable="clearable"
        >
    </v-autocomplete>

</template>


<script type="text/babel">

    export default{
        name: "VuetifyStatepicker",
        data(){
            return {
                states: [
                    'AK', 'AL', 'AR', 'AS', 'AZ', 'CA', 'CO', 'CT', 'DC', 'DE', 'FL', 'GA', 'GU', 'HI', 'IA', 'ID', 'IL', 'IN', 'KS', 'KY', 'LA', 'MA', 'MD', 'ME', 'MI', 'MN', 'MO', 'MP', 'MS', 'MT', 'NC', 'ND', 'NE', 'NH', 'NJ', 'NM', 'NV', 'NY', 'OH', 'OK', 'OR', 'PA', 'PR', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VA', 'VI', 'VT', 'WA', 'WI', 'WV', 'WY'
                ],
            }
        },
        methods:{
            emitState(value){
                this.$emit('input', value)
            },
            emitSelect(){
                this.$emit('blur')
            }
        },
        props: ['value', 'dense', 'error_message', 'single_line', 'clearable'],
    }


</script>


<style scoped>

</style>
