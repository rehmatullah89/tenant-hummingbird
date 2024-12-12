<template>
    <div>
        <v-card
            class="d-flex align-center ma-0 pa-0"
            min-height="72"
            flat
            tile
        >
            <v-col cols="3" :sm="half ? 2 : 4" class="pl-3 d-flex align-center">
                <hb-btn v-if="!backButtonOff" :type="'icon'" :tooltip="'Back'" active-state-off @click="$emit('back')"> <template slot-scope="{ hover, toggle }"> <hb-icon :hover="hover" :toggle="toggle"> mdi-system-navigation-custom-4 </hb-icon> </template> </hb-btn>
                <slot name="left"></slot>
            </v-col>
            <v-spacer></v-spacer>
            <v-col cols="6" :sm="half ? 8 : 4" class="d-flex justify-center align-center">
                <hb-icon v-if="titleIcon && !hasTitleSlot" :color="'#101318'" class="hb-header-bladido-icon">{{ titleIcon }}</hb-icon>
                <span class="ml-3 text-h5 font-weight-medium">
                    <span v-if="!hasTitleSlot">{{ title }}</span>
                    <slot name="title"></slot>
                </span>
            </v-col>
            <v-spacer></v-spacer>
            <v-col cols="3" :sm="half ? 2 : 4" class="d-flex justify-end">
                <slot name="right"></slot>
            </v-col>
        </v-card>
        <v-divider class="ma-0 pa-0"></v-divider>
    </div>
</template>
<script type="text/babel">

    export default {
        name: "HbBladeHeader",
        data: function() {
            return {
            };
        },
        computed: {
            hasTitleSlot(){
                return !!this.$slots['title'];
            },
        },
        props: {
            titleIcon:{
                type: String
            },
            title:{
                type: String
            },
            backButtonOff:{
                type: Boolean,
                default: false
            },
            half:{
                type: Boolean,
                default: false
            }
        }
    }
</script>

<style scoped>

</style>
