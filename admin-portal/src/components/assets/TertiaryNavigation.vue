<template>
    <div class="aside-header ml-1">
        <div class="aside-summary-row vertical" v-if="isSettingsMenu">
            <a class="menu-list no-text-underline" @click="$emit('activePage', item.key)" :class="{'font-weight-medium active-menu-color' : item.key == currentPage }" v-for="item in menuItems" :key="item.key">{{item.title}}</a>
        </div>
        <div class="aside-summary-row vertical" v-else>
            <span class="hb-larger-font-size" v-if="heading">{{heading}}</span>
            <router-link class="menu-list no-text-underline mt-2" :to="item.path" :class="{'font-weight-medium active-menu-color' : (item.path == $route.path) || (item.path === '/settings/templates' && $route.params.template_id) || (item.path === '/settings/automation/groups' && $route.params.id) }" v-for="item in menuItems" :key="item.key">{{item.title}}</router-link>
        </div>
    </div>
</template>
<script type="text/babel">
export default {
    name: "TertiaryNavigation",
    data() { 
        return {
        }
    },
    props:{
        heading: {
            required: false,
            type: String
        },
        menuItems: {
            required: true,
            type: Array
        },
        isSettingsMenu: {
            type: Boolean,
            default: false
        },
        currentPage: {
            type: String,
            default: ''
        }
    }
}
</script>
<style scoped>
.heading-3 {
    font-weight: 500;
    font-size: 16px;
    padding: 10px 0 0 20px;
}
.menu-list {
    color: #637381;
    padding: 20px 0 0 20px;
}
.menu-list:hover, .active-menu-color {
    color: #101318;
}
.no-text-underline{
    text-decoration: none;
    border: none;
}
</style>