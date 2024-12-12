<template>
    <span v-if="to">
        <router-link :class="linkClass" :to="to">
            <slot></slot>
        </router-link>
    </span>
    <span v-else>
        <a :class="linkClass" :href="href" :target="target" @click.stop="$emit('click')">
            <slot></slot>
        </a>
    </span>
</template>
<script type="text/babel">

    export default {
        name: "HbLink",
        computed: {
            linkClass(){
                if(this.color === 'primary'){
                    return 'hb-link';
                }
                else if(this.color === 'secondary'){
                    return 'hb-link-secondary';
                }
                else if(this.color === 'tertiary'){
                    return 'hb-link-tertiary';
                }
                else if(this.color === 'destructive'){
                    return 'hb-text-destroy-status';
                }
                else {
                    return 'hb-link';
                }
            }
        },
        props: [ 'to', 'href', 'target', 'color' ],
    }
</script>

<style scoped>

</style>