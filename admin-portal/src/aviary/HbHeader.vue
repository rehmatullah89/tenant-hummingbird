<template>
    <span>
        <v-row class="pa-0 ma-0 d-flex" :class="verticalAlign" v-if="full">
            <v-col cols="12" class="ma-0 pa-0 mr-auto" :class="{ 'pb-1 pt-3' : padding, 'pb-3' : $vuetify.breakpoint.mdAndUp && padding, 'pt-0 pb-0' : !padding }">
                <slot></slot>
            </v-col>
        </v-row>
        <v-row class="pa-0 ma-0 d-flex" :class="verticalAlign" v-else>
            <v-col :cols="defaultCols" :md="mdCols" :lg="lgCols" class="ma-0 pa-0 mr-auto" :class="{ 'pb-1 pt-3' : padding, 'pb-3' : $vuetify.breakpoint.mdAndUp && padding, 'pt-0 pb-0' : !padding }">
                <slot name="left"></slot>
            </v-col>
            <v-col :cols="defaultCols === 12 ? 12 : 12 - defaultCols" :md="12 - mdCols" :lg="12 - lgCols" class="ma-0 px-3" :class="[{ 'pb-3 pt-1' : padding, 'pt-3' : $vuetify.breakpoint.mdAndUp && padding, 'pt-0 pb-0' : !padding}, verticalAlign]">
                <v-row justify="end" :class="{'d-flex align-center justify-end' : $vuetify.breakpoint.mdAndUp || $vuetify.breakpoint.smAndDown, 'mt-1' : $vuetify.breakpoint.smAndDown}">
                    <slot name="right"></slot>
                </v-row>
            </v-col>
        </v-row>
        <v-divider v-if="divider"></v-divider>
    </span>
</template>
<script type="text/babel">

    export default {
        name: "HbHeader",
        computed: {
            defaultCols(){
                if(this.fewerActions){
                    return 9;
                }
                else if(this.oneAction){
                    return 11;
                } else {
                    return 12;
                }
            },
            mdCols(){
                if(this.fewerActions){
                    return 9;
                }
                else if(this.oneAction){
                    return 11;
                } else {
                    return 6;
                }
            },
            lgCols(){
                if(this.fewerActions){
                    return 9;
                }
                else if (this.oneAction){
                    return 11;
                } else {
                    return 5;
                }
            },
            verticalAlign(){
                if(this.alignTop){
                    return 'align-start';
                }
                else if(this.alignBottom){
                    return 'align-end';
                }
                else if(this.alignCenter){
                    return 'align-center';
                }
                else {
                    return '';
                }
            }
        },
        props: {
            full:{
                type: Boolean,
                default: false
            },
            alignTop:{
                type: Boolean,
                default: false
            },
            alignCenter:{
                type: Boolean,
                default: true
            },
            alignBottom:{
                type: Boolean,
                default: false
            },
            padding:{
                type: Boolean,
                default: true
            },
            divider:{
                type: Boolean,
                default: true
            },
            oneAction:{
                type: Boolean,
                default: false
            },
            fewerActions:{
                type: Boolean,
                default: false
            }
        }
    }
</script>

<style scoped>

</style>