<template>
    <v-card elevation="1" class="pt-3 pb-4 hb-default-font-size">
        <div v-if="hasButtonSlot" :class="{'hb-info-card-button' : $vuetify.breakpoint.mdAndUp, 'mt-1 mb-2 mr-4 align-right' : !$vuetify.breakpoint.mdAndUp}">
            <slot name="button"></slot>
        </div>
        <div v-if="unit" class="px-6">
            <v-row class="ma-0 pa-0">
                <hb-link color="secondary" @click="$emit('click')">
                    <div class="d-flex align-center">
                        <div class="pt-1" style="padding-left:3px; padding-right:3px;"> 
                            <UnitIcon v-if="unit" :width="'16'" :height="'16'" :unit="unit" :applyStroke=false color="#306FB6" />
                        </div>
                        <div class="font-weight-medium">
                            #{{ unit.number }}
                        </div>
                    </div>
                </hb-link>
            </v-row>
            <v-row class="ma-0 pa-0">
                <span v-if="status">
                    <hb-status>{{ status }}</hb-status>
                </span>
                <span v-else>
                    <hb-status>{{ unit.state }}</hb-status>
                </span>
            </v-row>
            <v-row class="ma-0 pa-0" v-if="property">
                {{ property.number }} I {{ property.Address.city }} I {{ property.Address.address }}
            </v-row>
            <v-row class="ma-0 pa-0" v-else>
                {{unit.Address.city}} {{unit.Address.state}} {{unit.Address.zip}} I {{ unit.Address.address}}
            </v-row>
            <v-row class="ma-0 pa-0">
                <span v-if="unit.Category">{{ unit.Category.name }}</span><span v-if="unit.Category && unit.Category.name && unit.type" class="mr-1">,</span>{{ unit.type | capitalize }}
            </v-row>
            <v-row class="ma-0 pa-0">
                <span v-for="(a, k, i) in amenities" :key="'amenities' + i">
                    {{ k }}: {{ a[0].name }}<span class="mr-1" v-if="i !== Object.keys(amenities).length - 1">,</span> 
                </span>
            </v-row>
        </div>

        <div v-if="contact" class="px-6">
            <v-row class="ma-0 pa-0">
                <hb-link color="secondary" @click="$emit('click')">
                    <div class="d-flex align-center">
                        <div class="pr-1 pb-1"> 
                            <hb-icon small color="#306FB6">mdi-account</hb-icon>
                        </div>
                        <div class="font-weight-medium">
                            {{ contact.salutation | capitalize }} {{ contact.first | capitalize }} {{ contact.middle | capitalize }} {{ contact.last | capitalize }} {{ contact.suffix | capitalize }}
                        </div>
                    </div>
                </hb-link>
            </v-row>
            <v-row class="ma-0 pa-0">
                <span v-if="status">
                    
                    <hb-status>{{ status }}</hb-status>
                </span>
                <span v-else>
                    <hb-status :status="contact.status">{{ contact.status }}</hb-status>
                </span>
            </v-row>
            <v-row class="ma-0 pa-0">
                {{ contact.email }}
            </v-row>
            <v-row class="ma-0 pa-0" v-for="(phone, i) in contact.Phones" :key="'phone' + i">
                {{ phone.phone | formatPhone }}
            </v-row>
            <v-row class="ma-0 pa-0" v-for="(address, i) in contact.Addresses" :key="'address' + i">
                {{ address.Address.address }},<br>
                {{ address.Address.city }}, {{ address.Address.state + ' ' + address.Address.zip }}
            </v-row>
            <v-row class="ma-0 pa-0" v-if="access && access.length">
                Access Code: {{ access }}
            </v-row>
        </div>

    </v-card>
</template>
<script type="text/babel">

    // todo register UnitIcon globally like we do for other aviary components, and rename to HbUnitIcon to match aviary naming structure
    import UnitIcon from './UnitIcon.vue'
    export default {
        name: "HbInfoCard",
        props: [ 'unit', 'contact', 'property', 'amenities', 'access', 'status' ],
        components:{
            UnitIcon
        },
        computed: {
            hasButtonSlot(){
                return !!this.$slots['button'];
            },
        },
    }
</script>

<style scoped>
    
</style>