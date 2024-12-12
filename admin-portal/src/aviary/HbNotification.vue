<template>
    <span style="width:100%" class="hb-text-night">
        <v-row v-model="notification" class="pl-3 ma-0 hb-default-font-size" :class="notificationColorClass">
            <v-col :cols="colsLeft" :xs="xsColsLeft" :md="mdColsLeft" class="ma-0 px-0 hb-notification-column-1" :class="{ 'py-2' : type !== 'quick-actions' , 'hb-quick-action-title' : type === 'quick-actions' }">
                <hb-icon :color="iconColor" class="ml-0 mr-2 d-flex align-start">{{ notificationIcon }}</hb-icon>
                <span>
                    <span class="font-weight-medium text-subtitle-1">{{ notificationTitle }}</span>
                    <span class="pl-1 font-weight-regular hb-default-font-size">
                        <slot></slot>
                    </span>
                </span>
            </v-col>
            <v-col :cols="colsRight" :xs="xsColsRight" :md="mdColsRight" class="ma-0 pa-0 d-flex justify-end">
                <span class="font-weight-regular hb-default-font-size" :class="{ 'hb-quick-action-slot' : type === 'quick-actions' , 'px-1' : $vuetify.breakpoint.sm }">
                    <slot name="actions"></slot>
                </span>
                <span class="mr-0" :class="{ 'pt-1' : type === 'quick-actions' }" v-if="!notDismissable">
                    <hb-btn icon tooltip="Close" active-state-off :hover-background-color="closeHoverColor" @click="close">mdi-close</hb-btn> 
                </span>
            </v-col>
        </v-row>
    </span>
</template>
<script type="text/babel">

    export default {
        name: "HbNotification",
        data: function() {
            return {
                show: true,
                buttonGroup: null,
            };
        },
        computed: {
            notification: {
                get () {
                    return this.value
                },
                set (value) {
                    this.$emit('input', value)
                }
            },
            colsLeft(){
                if(!this.hasActionsSlot){
                    return 11;
                }
                if(this.type === 'quick-actions'){
                    return 4;
                }
                if(this.type === 'auction'){
                    return 7;
                }
                else {
                    return 8;
                }
            },
            colsRight(){
                if(!this.hasActionsSlot){
                    return 1;
                }
                if(this.type === 'quick-actions'){
                    return 8;
                }
                if(this.type === 'auction'){
                    return 5;
                }
                else {
                    return 4;
                }
            },
            xsColsLeft(){
                if(!this.hasActionsSlot){
                    return 11;
                }
                if(this.type === 'quick-actions'){
                    return 3;
                }
                if(this.type === 'auction'){
                    return 8;
                }
                else {
                    return 9;
                }
            },
            xsColsRight(){
                if(!this.hasActionsSlot){
                    return 1;
                }
                if(this.type === 'quick-actions'){
                    return 9;
                }
                if(this.type === 'auction'){
                    return 4;
                }
                else {
                    return 3;
                }
            },
            mdColsLeft(){
                if(!this.hasActionsSlot){
                    return 11;
                }
                if(this.type === 'quick-actions'){
                    return 2;
                }
                if(this.type === 'auction'){
                    return 9;
                }
                else {
                    return 10;
                }
            },
            mdColsRight(){
                if(!this.hasActionsSlot){
                    return 1;
                }
                if(this.type === 'quick-actions'){
                    return 10;
                }
                if(this.type === 'auction'){
                    return 3;
                }
                else {
                    return 2;
                }
            },
            hasActionsSlot(){
                return !!this.$slots['actions'];
            },
            notificationColorClass(){
                if(this.type === 'caution'){
                    return 'hb-notification-caution';
                }
                else if(this.type === 'warning' || this.type === 'auction'){
                    return 'hb-notification-warning';
                }
                else if(this.type === 'success'){
                    return 'hb-notification-success';
                }
                else if(this.type === 'quick-actions'){
                    return 'hb-notification-quick-actions';
                }
                else {
                    return '';
                }
            },
            notificationIcon(){
                if(this.type === 'caution'){
                    return 'mdi-alert';
                }
                else if(this.type === 'warning'){
                    return 'mdi-close-circle';
                }
                else if(this.type === 'success'){
                    return 'mdi-check'
                }
                else if(this.type === 'quick-actions'){
                    return 'mdi-flash-circle';
                }
                else if(this.type === 'auction') {
                    return 'gavel';
                }
                else {
                    return '';
                }
            },
            iconColor(){
                if(this.type === 'caution'){
                    return '#FFD600';
                }
                else if(this.type === 'warning' || this.type === 'auction'){
                    return '#FB4C4C';
                }
                else if(this.type === 'success'){
                    return '#02AD0F';
                }
                else if(this.type === 'quick-actions'){
                    return '#101318';
                }
                else {
                    return '';
                }
            },
            closeHoverColor(){
                if(this.type === 'caution'){
                    return '#FFD600';
                }
                else if(this.type === 'warning'){
                    return '#F3CCCC';
                }
                else if(this.type === 'success'){
                    return '#72d479';
                }
                else if(this.type === 'quick-actions'){
                    return '#b3dee0';
                }
                else {
                    return '';
                }
            },
            notificationTitle(){
                if(this.haveTitle == false) {
                    return '';
                } 
                if(this.title){
                    return this.title;
                }
                if(this.type === 'caution'){
                    return 'Caution:';
                }
                else if(this.type === 'warning'){
                    return 'Warning:';
                }
                else if(this.type === 'success'){
                    return 'Success:'
                }
                else if(this.type === 'quick-actions'){
                    return 'Quick Actions:';
                }
                else {
                    return '';
                }
            }
        },
        methods: {
            close(){
                this.notification = false;
                this.$emit('close');
            }
        },
        props: {
            type:{
                type: String
            },
            title:{
                type: String
            },
            haveTitle: {
                type: Boolean,
                default: true
            },
            notDismissable:{
                type: Boolean,
                default: false
            },
            value:{
                type: Boolean,
                default: false
            }
        }
    }
</script>

<style scoped>

</style>