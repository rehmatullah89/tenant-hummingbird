<template>
    <div :class="{'pb-2' : $vuetify.breakpoint.smAndDown}">
        <v-row class="hb-header-font-size font-weight-medium ma-0 pa-0">
            {{ title }}
        </v-row>
        <v-row class="ma-0 pa-0">
            {{ description }}
        </v-row>
    </div>
</template>
<script type="text/babel">

    export default {
        name: "HbPageHeader",
        props: [ 'title', 'description' ],
    }
</script>

<style scoped>

</style>