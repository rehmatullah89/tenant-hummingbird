<template>
    <v-autocomplete
            :items="items"
            hide-details
            :item-text="item_text"
            :item-value="item_value"
            v-model="fieldValue"
            :label="label"
            outlined>
    </v-autocomplete>
</template>

<script type="text/babel">
    export default {
        name: 'HummingbirdAutocomplete',
        components: {},
        data: () => ({}),
        props: {
            value: {
                required: true
            },
            label: {
                type: String,
                required: true
            },
            item_text: {
                type: String,
            },
            item_value: {
                type: String,
            },
            message: {},
            items:{
                type: Array,
                default: () => [],
                required: true
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