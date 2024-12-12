<template>
    <div style="display: inline-block;">
        <dropdown
                :list="properties"
                v-model="property_id"
                placeholder="Choose Facility"
                label="label"
                id="id"
        ></dropdown>
        <button class="btn btn-dark" @click="$emit('input', property_id)">{{label || 'Select Facility'}}</button>
    </div>
</template>

<script type="text/babel">
    import api from '../../assets/api.js';
    import Loader from '../assets/CircleSpinner.vue';
    import Status from '../includes/Messages.vue';
    import Dropdown from '../assets/Dropdown.vue';
    import { mapGetters } from 'vuex';
    
    export default {
        name: "PropertySelector",
        data() {
            return {
                property_id: ''
            }
        },
        components: {
            Dropdown
        },
        computed:{
            ...mapGetters({
                properties: 'propertiesStore/filtered' 
            })
        },
        created(){
          //this.fetchPropertyList();
        },
        methods: {
            fetchPropertyList(){
                api.get(this, api.PROPERTIES).then(r => {
                    r.properties.map(p => {
                        p.label = p.Address.address + ' ' + p.Address.city + ' ' + p.Address.state + ' ' + p.Address.zip;
                    });
                    this.properties = r.properties;
                });
            },
        },
        props: ['label']

    }
</script>