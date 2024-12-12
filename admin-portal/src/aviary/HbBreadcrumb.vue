<template>
    <span class="pa-0 ma-0 mb-n2" v-if="to">
        <router-link class="hb-link" :to="to">
            <span class="d-flex align-center">
                <hb-icon class="mt-1 mr-1" color="#00848E">mdi-chevron-left</hb-icon> 
                <span class="mt-1 hb-default-font-size ml-n1">
                    <slot></slot>
                </span>
            </span>
        </router-link>
    </span>
    <span class="pa-0 ma-0 mb-n2" v-else>
        <a class="hb-link" :href="href" :target="target" @click="$emit('click')">
            <span class="d-flex align-center">
                <hb-icon class="mt-1 mr-1" color="#00848E">mdi-chevron-left</hb-icon> 
                <span class="mt-1 hb-default-font-size ml-n1">
                    <slot></slot>
                </span>
            </span>
        </a>
    </span>
</template>
<script type="text/babel">

    export default {
        name: "HbBreadcrumb",
        props: [ 'to', 'href', 'target' ],
    }
</script>

<style scoped>

</style>