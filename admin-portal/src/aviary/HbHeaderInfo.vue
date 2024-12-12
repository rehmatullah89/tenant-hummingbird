<template>
    <v-card class="ma-0 pa-0 d-flex align-stretch" flat color="transparent">
        <div>
            <v-avatar
                tile
                size="48"
                class="hb-header-avatar"
            >
                <svg v-if="contact" width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="24" cy="24" r="23.3947" fill="white" stroke="#DFE3E8" stroke-width="1.21053"/>
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M28.6793 19.3208C28.6793 21.906 26.5854 24 24.0001 24C21.4148 24 19.3208 21.906 19.3208 19.3208C19.3208 16.7355 21.4148 14.6415 24.0001 14.6415C26.5854 14.6415 28.6793 16.7355 28.6793 19.3208ZM14.6416 31.0189C14.6416 27.9072 20.8767 26.3396 24.0001 26.3396C27.1235 26.3396 33.3586 27.9072 33.3586 31.0189V33.3585H14.6416V31.0189Z" fill="#637381"/>
                </svg>

            <UnitIcon v-if="unit && unit.type" :unit="unit" :width=48 :height=48 />

            </v-avatar>
        </div>
        <div
            class="pl-6 hb-header-div hb-text-light hb-default-font-size"
        >
            <span v-if="contact">
                <v-row class="d-flex align-center" :style="maxWidthIsSet ? 'max-width:' + rowMaxWidth : ''">
                    <span class="text-h5 font-weight-medium black--text text-capitalize mr-1">
                        {{ contact.salutation }} {{ contact.first }} {{ contact.middle }} {{ contact.last }} {{ contact.suffix }}
                    </span>
                    <span v-if="contact.active_military === 1" class="mt-2 ml-1">
                        <v-tooltip bottom :disabled="disabled" open-delay="750">
                            <template v-slot:activator="{ on }">
                                <v-hover v-slot:default="{ hover }">
                                    <span v-on="on">
                                        <hb-icon small color="#101318">mdi-custom-active-military</hb-icon>
                                    </span>
                                </v-hover>
                            </template>
                            <span>Active Military</span>
                        </v-tooltip>
                    </span>
                    <hb-status v-if="!statusOff && status" :status="status" class="ml-1">{{ status }}</hb-status>
                </v-row>
                <v-row :style="maxWidthIsSet ? 'max-width:' + rowMaxWidth : ''" class="hb-default-font-size">
                    <span v-if="contact.Phones && contact.Phones[0]">{{ contact.Phones[0].phone | formatPhone }}</span>
                    <span v-if="(contact.Phones && contact.Phones[0]) && (contact.email && contact.email.length)" class="mx-1">|</span>
                    <a class="hb-link-secondary" @click="$emit('emailClicked')" v-if="contact.email && contact.email.length && !disableEmail">{{ contact.email }}</a>
                    <span v-else>{{ contact.email }}</span>
                    <span v-if="((contact.Phones && contact.Phones[0]) || (contact.email && contact.email.length)) && contact.Addresses && contact.Addresses[0] && contact.Addresses[0]" class="mx-1">|</span>
                    <span v-if="contact.Addresses && contact.Addresses[0]">{{contact.Addresses[0].Address.address}}<span v-if="contact.Addresses[0].Address.address2" class="ml-1">{{contact.Addresses[0].Address.address2}}</span>, {{contact.Addresses[0].Address.city}} {{contact.Addresses[0].Address.zip}}</span>
                    <span v-if="((contact.Phones && contact.Phones[0]) || (contact.email && contact.email.length) || contact.Addresses && contact.Addresses[0]) && access && access.length > 0" class="mx-1">|</span>
                    <span v-if="access && access.length === 1 && !disableCode">Access Code: <hb-link @click="$emit('pin')">{{access[0] && access[0].pin ? access[0].pin : 'Not Set'}}</hb-link></span>
                    <span v-else-if="access && access.length === 1">Access Code: {{access[0] && access[0].pin ? access[0].pin : 'Not Set'}}</span>
                    <span v-if="access && access.length > 1 && !disableCode"><hb-link @click="$emit('pin')">Multiple Access Codes</hb-link></span>
                    <span v-else-if="access && access.length > 1">Multiple Access Codes</span>
                </v-row>
            </span>
            <span v-if="unit">
                <v-row class="d-flex align-center" :style="maxWidthIsSet ? 'max-width:' + rowMaxWidth : ''">
                    <span class="text-h5 font-weight-medium black--text mr-1">Space {{unit.number}}</span>
                    <span v-if="insurance && insurance.id" class="mt-n1 ml-1">
                        <v-tooltip bottom :disabled="disabled" open-delay="750">
                            <template v-slot:activator="{ on }">
                                <v-hover v-slot:default="{ hover }">
                                    <span v-on="on">
                                        <hb-icon small color="#101318">mdi-security</hb-icon>
                                    </span>
                                </v-hover>
                            </template>
                            <span>{{insurance.name}}<br />{{insurance.description}}</span>
                        </v-tooltip>
                    </span>
                    <hb-status v-if="!statusOff && status" :status="status" class="ml-1">{{ status }}</hb-status>
                </v-row>
                <v-row :style="maxWidthIsSet ? 'max-width:' + rowMaxWidth : ''" class="hb-default-font-size">
                    <span v-if="unit.Category && unit.Category.name">{{ unit.Category.name }}</span><span v-if="unit.Category && unit.Category.name && (unit.property_number || unit.Address.city)" class="mx-1">|</span>{{unit.property_number}}<span v-if="unit.property_number && unit.Address.city" class="mx-1">-</span><span v-if="unit.Address && unit.Address.city">{{unit.Address.city}}</span>
                </v-row>
            </span>
        </div>
    </v-card>
</template>
<script type="text/babel">

    // todo register UnitIcon globally like we do for other aviary components, and rename to HbUnitIcon to match aviary naming structure
    import UnitIcon from './UnitIcon.vue'
    
    // we shouldn't put api calls into our aviary components because aviary will eventually be used by other applications, api call should be done outside the component and data should be passed into here
    // import api from '../assets/api.js';

    export default {
        name: "HbHeaderInfo",
        computed: {
            status(){
                if(this.statusIs){
                    return this.statusIs;
                }
                else if(this.contact && this.contact.status) {
                    return this.contact.status;
                }
                else if(this.unit && this.unit.status) {
                    return this.unit.state;
                }
                else {
                    return false;
                }
            },
            maxWidthIsSet(){
                if(this.rowMaxWidth){
                    return true;
                } else {
                    return false;
                }
            }
        },
        components:{
            UnitIcon
        },
        props: [ 'contact', 'unit', 'disabled', 'statusIs', 'statusOff', 'rowMaxWidth', 'unitTypeOff', 'insurance', 'access', 'disableEmail', 'disableCode' ],
        created(){
            // this.getAddress();    
        },
        watch:{
            /*
            contact(){
                    this.getAddress();    
            }
            */
        },
        methods:{
            // we shouldn't put api calls into our aviary components because aviary will eventually be used by other applications, api call should be done outside the component and data should be passed into here
            /*
            getAddress(){
                if(this.contact && this.contact.id && ((this.contact.Addresses && this.contact.Addresses.length === 0) || !this.contact.Addresses)){
                    api.get(this, api.CONTACTS + this.contact.id).then(r => {
                        this.$set(this.contact, 'Addresses', r.contact.Addresses);
                        if(this.contact && this.contact.Phones && this.contact.Phones.length==0){
                            this.$set(this.contact, 'Phones', r.contact.Phones);
                        }
                        if(this.contact && !this.contact.status){
                            this.$set(this.contact, 'status', r.contact.status);
                        }
                    });
                }
            }
            */
        },
        filters:{
            addressFormat(address){
                let result='';
                 if(address.address) result=address.address+'. ';
                 if(address.city) result=result+address.city+', ';
                 if(address.state) result=result+address.state+' ';
                 if(address.zip) result=result+address.zip+' ';
                return result
            }
        },
    }
</script>

<style scoped>
.break-word {
    word-break: break-word;
}
</style>