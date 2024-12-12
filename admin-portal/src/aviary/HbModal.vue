<template>
    <v-dialog
        v-model="dialog"
        :width="dialogSize"
        :fullscreen="fullscreen"
        :persistent="persistent"
        :scrollable="scrollable"
        slot="body"
        :content-class="confirmation ? 'hb-delete-border settings-dialog-modal' : 'settings-dialog-modal'"
    >
        <template v-slot:activator="{ on, attrs }">
            <span v-bind="attrs" v-on="on">
                <slot name="activator"></slot>
            </span>
        </template>

        <v-card>
            <v-card-title class="d-flex align-center ma-0 pa-0" :class="{'hb-modal-caution' : confirmation}">
                <v-col :cols="hasHeaderSlot ? 3 : 10" class="d-flex align-center">
                    <slot name="icon" v-if="hasIconSlot"></slot>
                    <hb-btn icon active-state-off v-if="confirmation" color="#101318">mdi-alert-circle-outline</hb-btn>
                    <span class="text-h6 font-weight-medium" :class="{'ml-3' : !confirmation}">{{ title }}</span>
                </v-col>
                <v-col :cols="hasHeaderSlot ? 9 : 2" class="d-flex justify-end">
                    <slot name="header"></slot>
                    <hb-btn icon tooltip="Close" @click="close" active-state-off>mdi-close</hb-btn>
                </v-col>
            </v-card-title>
            <v-divider></v-divider>
            <v-card-text class="pa-0 ma-0 hb-default-font-size">
                <div>
                    <span v-if="hasSubheaderSlot && size !== 'small'">
                        <div class="hb-modal-sub-header hb-default-font-size px-6">
                            <slot name="subheader"></slot>
                        </div>
                        <v-divider></v-divider>
                    </span>
                    <span class="hb-text-night hb-default-font-size">
                        <slot name="content"></slot>
                    </span>
                </div>
            </v-card-text>
            <v-divider v-if="!fullscreen" class="my-0 pa-0"></v-divider>
            <v-card-actions v-if="!footerOff" :class="{'hb-modal-fullscreen-footer' : fullscreen}">
                <slot name="leftactions"></slot>
                <v-spacer></v-spacer>
                <div class="my-2 d-flex justify-center align-center mr-2">
                    <a v-if="dispalyFooterCancelOption" class="hb-link mr-2" @click="close">{{closeInsteadOfCancel ? 'Close' : 'Cancel'}}</a>
                    <slot name="actions"></slot>
                </div>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>
<script type="text/babel">
    import { mapGetters } from 'vuex';

    export default {
        name: "HbModal",
        mounted() {
        },
        destroyed() {
            let app = document.getElementsByClassName('setting-sidebar-z-310')[0];
            if (app) {
                app.classList.remove('setting-sidebar-z-310');
            }
        },
        computed: {
            ...mapGetters({

            }),
            dialog: {
                get () {
                    return this.value
                },
                set (value) {
                    this.$emit('input', value)
                }
            },
            hasHeaderSlot(){
                return !!this.$slots['header'];
            },
            hasIconSlot(){
                return !!this.$slots['icon'];
            },
            fullscreen(){
                if(this.size === 'fullscreen'){
                    return true;
                } else {
                    return false;
                }
            },
            dialogSize(){
                if(this.size === 'small'){
                    return '360';
                }
                else if(this.size === 'medium'){
                    return '480';
                }
                else if(this.size === 'large'){
                    return '720';
                }
                else if(this.size === 'x-large'){
                    return '1200';
                }
                else {
                    return '720';
                }
            },
            hasSubheaderSlot(){
                return !!this.$slots['subheader'];
            },
            hasHeaderLeftSlot(){
                return !!this.$slots['header-left'];
            },
            dispalyFooterCancelOption() {
                return !!this.footerCancelOption;
            }
            /*
            contentClass(){
                if(this.size === 'small'){
                    return 'hb-modal-card-text-small';
                }
                else if(this.size === 'medium'){
                    return 'hb-modal-card-text-medium';
                }
                else if(this.size === 'large' || this.size === 'fullscreen'){
                    return 'hb-modal-card-text-large';
                }
                else {
                    return '';
                }
            },
            */
        },
        methods: {
            addClassToApp(){
                let app = document.getElementsByClassName('setting-sidebar-z-250')[0];
                if (app) {
                    app.classList.add('setting-sidebar-z-310');
                    let el = app.getElementsByClassName('settings-dialog-modal')[0];
                    if (el) {
                        setTimeout(() => {
                            if (app && el) {
                                let overlay = app.querySelector('.v-overlay.v-overlay--active.theme--dark');
                                if (overlay) {
                                    overlay.setAttribute("style", "z-index: 290");
                                }
                            }
                        }, 50);
                        el.parentElement.setAttribute("style", "z-index: 300");
                    }
                }
            },
            close(){
                this.$emit('close');
                setTimeout(() => {
                    this.dialog = false;
                }, 200);
            }
        },
        props: {
            size:{
                type: String
            },
            title:{
                type: String
            },
            persistent:{
                type: Boolean,
                default: true
            },
            value:{
                type: Boolean,
                default: false
            },
            footerOff:{
                type: Boolean,
                default: false
            },
            scrollable:{
                type: Boolean,
                default: true
            },
            footerCancelOption: {
                type: Boolean,
                default: true
            },
            closeInsteadOfCancel:{
                type: Boolean,
                default: false
            },
            confirmation: {
                type: Boolean,
                default: false
            }
        },
    }
</script>

<style scoped>

</style>
