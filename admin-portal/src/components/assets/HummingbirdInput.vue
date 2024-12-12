<template>
    <v-text-field
            hide-details
            v-model="fieldValue"
            :label="label"
            :type="type"
            data-vv-name="as"
            :error-messages="message"
            :dense=" dense?true:false"
            :prepend-inner-icon="prependIcon"
            outlined>
    </v-text-field>
</template>

<script type="text/babel">
    export default {
        name: 'HummingbirdInput',
        components: {},
        data: () => ({

        }),
        props: {
            type: {
                type: String,
                default: 'text'
            },
            value: {
                required: true
            },
            label: {
                type: String
            },
            message: {},
            dense: {},
            prependIcon: {},
            validate: {
                type: String
            },
            as: {
                type: String
            }
        },
        created(){

        },
        computed:{
            fieldValue: {
                get: function() {
                    return this.value;
                },
                set: function(value) {
                    this.$emit('input', value)
                }
            }
        },
        methods:{
        }
    }
</script>