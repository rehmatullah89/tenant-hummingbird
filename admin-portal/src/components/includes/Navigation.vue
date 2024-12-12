<template>
    <v-navigation-drawer width="240" flat :value="drawer" class="fill-height mt-60" disable-resize-watcher clipped fixed
        elevation-0 mobile-breakpoint="415" id="main-navigation-drawer">

        <v-list dense class="nav-drawer-list mt-2">
            <template v-for="(item, a) in newLinks">
                <v-list-item class="py-1 px-4"
                    v-if="item.items.length === 0 && (!item.isSuperAdmin || (item.isSuperAdmin && isSuperAdmin))"
                    :to="item.to" :key="a">
                    <v-list-item-action class="ma-0 mr-2">
                        <hb-icon>{{ item.icon }}</hb-icon>
                    </v-list-item-action>
                    <v-list-item-content>
                        <v-list-item-title>
                            <span class="hb-default-font-size">{{ item.title }}</span>
                        </v-list-item-title>
                    </v-list-item-content>
                </v-list-item>
                <v-list-group append-icon="mdi-menu-down"
                    v-else-if="!item.isSuperAdmin || (item.isSuperAdmin && isSuperAdmin)" dense :key="a">
                    <template v-slot:activator class="pr-0">
                        <v-list-item class="py-1 px-0">
                            <v-list-item-action class="ma-0 mr-2">
                                <hb-icon>{{ item.icon }}</hb-icon>
                            </v-list-item-action>
                            <v-list-item-content style="min-width: 77px;">
                                <v-list-item-title>
                                    <span style="color:#637381;padding-left:1px;font-size:14px;font-weight:normal;">{{
                                            item.title
                                    }}</span>
                                </v-list-item-title>
                            </v-list-item-content>
                        </v-list-item>
                    </template>
                    <v-list-item class="py-1" :to="item.to" :key="b" v-for="(item, b) in getItems(item.items)">
                        <v-list-item-action class="ma-0 mr-2"></v-list-item-action>
                        <v-list-item-content>
                            <v-list-item-title>
                                <span class="hb-default-font-size">{{ item.title }}</span>
                            </v-list-item-title>
                        </v-list-item-content>
                    </v-list-item>

                </v-list-group>
                <v-divider v-if="a !== newLinks.length - 1" :key="'divider' + a" style="margin:0 20px;"></v-divider>
            </template>
        </v-list>

    </v-navigation-drawer>
</template>
<script type="text/babel">
// import Autocomplete from '../assets/Autocomplete.vue';
import Icons from '../../../src/mixins/icons.json';
import api from '../../assets/api.js';

import { mapGetters } from 'vuex';
export default {
    name: 'Navigation',
    data() {
        return {
            alertVisible: false,
            selectedCompany: '',
            notifications: [],
            loaded: false,
            containerHeight: '',
            links: [
                {
                    header: "Navigation",
                    targets: [{
                        to: '/admin',
                        title: "Administrators",
                        icon: 'mdi-view-dashboard'
                    }, {
                        to: '/companies',
                        title: "Companies",
                        icon: 'mdi-floppy'
                    }]
                }
            ],
            newLinks: [
                {
                    to: '',
                    title: "Setup",
                    icon: 'mdi-tools',
                    items: [

                        {
                            to: '/admins',
                            title: "Administrators",
                            icon: 'mdi-view-dashboard',
                            isSuperAdmin: true
                        },
                        {
                            to: '/companies',
                            title: "Companies",
                            icon: 'mdi-view-dashboard'
                        },
                        {
                            to: '/databases',
                            title: "Databases",
                            icon: 'mdi-view-dashboard',
                            isSuperAdmin: true
                        },
                        {
                            to: '/redshift-databases',
                            title: "Redshift",
                            icon: 'mdi-view-dashboard',
                            isSuperAdmin: true
                        },
                    ]
                },
                // {
                //     to:'/onboarding',
                //     title: "Onboarding",
                //     icon: 'mdi-settings',
                //     items: []
                // },
                {
                    to: '',
                    title: "Tools",
                    icon: 'mdi-tools',
                    items: [
                        {
                            to: '/hash',
                            title: "Hash"
                        },

                        {
                            to: '/unhash',
                            title: "Unhash"
                        },
                        {
                            to: '/deployment-plan',
                            title: "Deployment"
                        }
                    ]
                },
                {
                    to: '',
                    title: "Resiliency",
                    icon: 'mdi-tools',
                    items: [
                        {
                            to: '/resiliency/invoices',
                            title: "Invoices"
                        },
                        {
                            to: '/resiliency/auto-payments',
                            title: "Auto Payments"
                        },
                        {
                            to: '/resiliency/reconcile',
                            title: "Reconcile Accounts"
                        },
                        {
                            to: '/resiliency/triggers',
                            title: "Triggers"
                        },
                        {
                            to: '/resiliency/statuses',
                            title: "Statuses"
                        },
                        {
                            to: '/resiliency/invoice-allocation',
                            title: "Invoice Allocation"
                        },
                        {
                            to: '/resiliency/payment-allocation',
                            title: "Payment Allocation"
                        },
                        {
                            to: '/resiliency/jobs',
                            title: "Jobs",
                            icon: 'mdi-view-dashboard'
                        },
                    ]
                },
                {
                    to: '',
                    title: "Services",
                    icon: 'mdi-settings',
                    items: [
                        {
                            to: '/services/accounting',
                            title: "Accounting"
                        },
                        {
                            to: '/services/InboundCommunication',
                            title: "Inbound Communication"
                        },
                        {
                            to: '/services/DocmanagerSubscribe',
                            title: "Docmanager Subscribe"
                        },
                        {
                            to: '/services/DocmanagerTemplateUpload',
                            title: "Docmanager Template Upload"
                        }
                    ]
                },
                {
                    to: '/logout',
                    title: "Log Out",
                    icon: 'mdi-lock',
                    items: []
                }

            ]
        }
    },
    computed: {
        ...mapGetters({
            isSuperAdmin: 'authenticationStore/isSuperAdmin',
            getCompanyNames: 'authenticationStore/getCompanyNames'

        })
    },
    props: ['drawer'],
    created() {
    },
    methods: {
        setCompany(company) {
            api.post(this, api.SWITCH_COMPANY, { company: company }).then(r => {
                window.location = r.r;
            });
        },
        getItems(items) {
            if (this.isSuperAdmin) {
                return items;
            } else {
                return items.filter(i => {
                    return i.isSuperAdmin != true;
                });
            }
        }
    }
}


</script>

<style>
/********************
     Navigation Styles
    *********************/
.mt-60 {
    margin-top: 55px;
}

.ml-60 {
    margin-left: 60px;
}

.dl-60 {
    left: 60px;
}

.nav {
    transition: all .3s;
    transition-timing-function: cubic-bezier(0, 1, 0.5, 1);
}

span.nav-header {
    display: block;
    margin: 35px 0 10px 45px;
}

span.nav-header h3 {
    font-size: 12px;
    font-family: "Lato", sans-serif;
    font-weight: 700;
    color: #788f9b;
    letter-spacing: 1px;
    text-transform: uppercase;

}

.nav-wrapper {
    overflow-x: hidden;
}

.navigation {
    width: 100%;
    position: relative;
}

.navigation ul {
    margin: 0 0 0 0px;
    padding: 0;
    list-style: none;

}

.navigation ul li {
    padding: 0px 0;
    margin: 0;
}



/*.v-navigation-drawer__content a{*/
/*    color: #788f9b;*/
/*    font-family: "Roboto", sans-serif;*/
/*    font-weight: 500;*/
/*    font-size: 14px;*/
/*    cursor: pointer;*/
/*    line-height: 20px;*/
/*    display: block;*/

/*    padding: 7px 5px 7px 45px;*/
/*    position: relative;*/
/*    fill: currentColor;*/
/*    -webkit-transition: .6s cubic-bezier(0.77, 0, 0.175, 1);*/
/*    -moz-transition: .6s cubic-bezier(0.77, 0, 0.175, 1);*/
/*    -o-transition: .6s cubic-bezier(0.77, 0, 0.175, 1);*/
/*    border-top: 1px solid #FFFFFF;*/
/*    border-bottom: 1px solid #FFFFFF;*/

/*}*/

.icon-path-dark {
    -webkit-transition: .6s cubic-bezier(0.77, 0, 0.175, 1);
    -moz-transition: .6s cubic-bezier(0.77, 0, 0.175, 1);
    -o-transition: .6s cubic-bezier(0.77, 0, 0.175, 1);
    fill: #788f9b;
}


.icon-path {
    -webkit-transition: .6s cubic-bezier(0.77, 0, 0.175, 1);
    -moz-transition: .6s cubic-bezier(0.77, 0, 0.175, 1);
    -o-transition: .6s cubic-bezier(0.77, 0, 0.175, 1);
    fill: #788f9b;
}

.v-navigation-drawer__content a.v-list-item .v-list-item__title {
    color: #637381;
    font-weight: normal;
    padding-left: 1px;
}

.v-navigation-drawer__content a.v-list-item--active .v-list-item__title .hb-default-font-size {
    color: #101318;
    font-weight: 500;
}

.v-navigation-drawer__content a.v-list-item i {
    color: #637381;
}

.v-navigation-drawer__content a.v-list-item--active i {
    color: #101318 !important;
}

.v-navigation-drawer__content a.v-list-item--active svg path {
    fill: #101318 !important;
}

.v-navigation-drawer__content a.v-list-item--active .icon-path {
    fill: #00b2ce;
}

.v-navigation-drawer__content a.v-list-item--active .icon-path-dark {
    fill: #00a1c8;
    fill: #263238;
}

.v-navigation-drawer__content a.v-list-item--active {
    color: #47C1BF;
    border-top: 1px solid #e4eff4;
    border-bottom: 1px solid #e4eff4;
}

.v-navigation-drawer__content .v-list-item__icon.v-list-group__header__append-icon {
    justify-content: left !important;
    margin-left: 0 !important;
}

.v-navigation-drawer__content .v-list-item__icon.v-list-group__header__append-icon i {
    color: #637381;
}

.nav-drawer-list {
    padding-bottom: 80px;
}

.navigation ul li a,
.navigation ul li a:hover,
.navigation ul li a:visited,
.navigation ul li a:active {
    text-decoration: none;
}

span.nav-text {
    line-height: 20px;
}

span.nav-icon {
    display: inline-block;
    height: 20px;
    width: 20px;
    vertical-align: top;

}

.company-switcher {
    margin: 0 10px 10px;
    display: none;
    padding: 15px 30px 0;
}

.close-link-row {
    display: none;
}

#main-navigation-drawer .v-list-item__title {
    padding: 1px 0;
}

@media (max-width: 991px) {

    .nav {
        margin-left: -225px;
        width: 200px;
        position: fixed;
        top: 0px;
        bottom: 0;
        overflow: auto;
        z-index: 7000;


    }

    .nav-open .nav {
        margin-left: 0px;
        width: 100%;
    }

    .company-switcher {
        display: block;
    }

    .close-link-row {
        display: block;
        height: 30px;
    }


}



@media (max-width: 893px) {

    .navbar-toggle {
        display: block;
    }

}

@media (max-width: 768px) {
    .sm-remove {
        display: none;
    }

    /*.nav-wrapper{*/
    /*transform:translateX(-225px);*/
    /*}*/
    /*.nav-open .nav-wrapper{*/
    /*transform:translateX(0px);*/
    /*width: 100%;*/
    /*}*/

    /*.nav-open .content-container{*/
    /*transform:translateX(225px);*/
    /*}*/

    .nav-open .navigation .hide-small {
        opacity: 1;
    }
}

@media (min-width: 600px) {}

.rotate-icon {
    transform: rotate(30);
}
</style>
