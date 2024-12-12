<template>
    <span>
        <span v-if="icon">
            <v-tooltip bottom :disabled="disabled" open-delay="750">
                <template v-slot:activator="{ on }">
                    <v-hover v-slot:default="{ hover }">
                        <v-btn :to="to" :href="href" :target="target" medium class="hb-v-btn-icon" :ripple="false" :disabled="disabled" icon v-on="on" :class="{'hb-button-icon-hover' : hover && !hoverBackgroundColor, 'hb-button-icon-active' : button && !activeBackgroundColor}" @click="buttonClicked" :style="(hoverBackgroundColor && hover) || (activeBackgroundColor && button) ? 'background-color:' + overwriteDefaultColors : ''">
                            <hb-icon
                                :hover="hover"
                                :toggle="toggle"
                                :small="small"
                                :color="color"
                                :hover-color="hoverColor"
                                :active-color="activeColor"
                                :active-state-off="activeStateOff"
                            >
                                <slot></slot>
                            </hb-icon>
                        </v-btn>
                    </v-hover>
                </template>
                <span>{{ tooltip }}</span>
            </v-tooltip>
        </span>
        <span v-else-if="type === 'icon' && !icon">
            <v-tooltip bottom :disabled="disabled" open-delay="750">
                <template v-slot:activator="{ on }">
                    <v-hover v-slot:default="{ hover }">
                        <v-btn :to="to" :href="href" :target="target" medium class="hb-v-btn-icon" :ripple="false" :disabled="disabled" icon v-on="on" :class="{'hb-button-icon-hover' : hover && !hoverBackgroundColor, 'hb-button-icon-active' : button && !activeBackgroundColor}" @click="buttonClicked" :style="(hoverBackgroundColor && hover) || (activeBackgroundColor && button) ? 'background-color:' + overwriteDefaultColors : ''">
                            <slot :hover="hover" :toggle="toggle"></slot>
                        </v-btn>
                    </v-hover>
                </template>
                <span>{{ tooltip }}</span>
            </v-tooltip>
        </span>
        <span v-else>
            <v-hover v-slot:default="{ hover }">
                <v-btn :to="to" :href="href" :target="target" :small="sizeSmall" :loading="loading" :large="sizeLarge" :block="block" :class="[ buttonClass, hover ? hoverClass : '' ]" depressed :ripple="false" :disabled="disabled" @click="$emit('click')">
                    <span :class="[ textSize, textColor ]" class="font-weight-regular">
                        <slot></slot>
                    </span>
                    <v-icon v-if="appendIcon" right size="18" color="#212b36" class="hb-opacity-50 ml-0">{{ appendIcon }}</v-icon>
                </v-btn>
            </v-hover>
        </span>
    </span>
</template>
<script type="text/babel">
    
    export default {
        name: "HbBtn",
        data: function() {
            return {
                toggle: false,
            };
        },
        created(){
            if(this.activeByDefault){
                this.toggle = true;
            }
            if(this.active){
                this.toggle = true;
            }
        },
        computed: {
            buttonClass() {
                if(this.color === 'primary'){
                    return 'hb-primary-button';
                }
                else if(this.color === 'destructive'){
                    return 'hb-destructive-button';
                }
                else if(this.color === 'secondary'){
                    return 'hb-secondary-button';
                }
                else {
                    return '';
                }
            },
            hoverClass() {
                if(this.color === 'primary'){
                    return 'hb-primary-button-hover';
                }
                else if(this.color === 'destructive'){
                    return 'hb-destructive-button-hover';
                }
                else if(this.color === 'secondary'){
                    return 'hb-secondary-button-hover';
                }
                else {
                    return '';
                }
            },
            sizeSmall() {
                if(this.small){
                    return true;
                } else {
                    return false;
                }
            },
            sizeLarge() {
                if(this.large){
                    return true;
                } else {
                    return false;
                }
            },
            textSize() {
                if(this.small){
                    return 'text-body-2';
                } 
                else if(this.large) {
                    return 'hb-larger-font-size';
                } 
                else {
                    return 'hb-default-font-size';
                }
            },
            textColor() {
                if(this.color === 'secondary'){
                    return 'black--text';
                } else {
                    return 'white--text';
                }
            },
            button(){
                if(this.active === true){
                    return true;
                }
                if(this.activeStateOff === true){
                    return false;
                }
                else {
                    return this.toggle;
                }
            },
            overwriteDefaultColors(){
                if(this.activeBackgroundColor && this.button){
                    return this.activeBackgroundColor;
                }
                else if(this.hoverBackgroundColor){
                    return this.hoverBackgroundColor;
                }
                else {
                    return '';
                }
            }
        },
        methods: {
            buttonClicked(){
                this.toggle = !this.toggle;
                this.$emit('click');
            }
        },
        watch:{
            active(){
                this.toggle = this.active;
            },
        },
        props: {
            type:{
                type: String
            },
            icon: {
                type: Boolean,
                default: false
            },
            color:{
                type: String
            },
            disabled: {
                type: Boolean,
                default: false
            },
            small: {
                type: Boolean,
                default: false
            },
            large: {
                type: Boolean,
                default: false
            },
            appendIcon:{
                type: String
            },
            tooltip:{
                type: String
            },
            activeByDefault: {
                type: Boolean,
                default: false
            },
            activeStateOff: {
                type: Boolean,
                default: false
            },
            hoverBackgroundColor:{
                type: String
            },
            activeBackgroundColor:{
                type: String
            },
            active:{
                type: Boolean,
                default: false
            },
            block:{
                type: Boolean,
                default: false
            },
            to:{
                type: String
            },
            href:{
                type: String
            },
            target:{
                type: String
            },
            color:{
                type: String
            },
            activeColor:{
                type: String
            },
            hoverColor:{
                type: String
            },
            loading:{
                type: Boolean,
                default: false
            }
        }
    }
</script>

<style scoped>

</style>