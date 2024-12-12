<template>
    <div style="display: inline-block;">
        <span class="icon" v-show="this.sort == this.field && this.sortdir == 'ASC'"></span>
        <span class="icon" v-show="this.sort == this.field && this.sortdir == 'DESC'"></span>
    </div>
</template>

<script type="text/babel">
    export default {
        name: "maintenanceRequests",
        data() {
            return {
            }
        },
        props: ['sort', 'sortdir', 'field']
    }

</script>