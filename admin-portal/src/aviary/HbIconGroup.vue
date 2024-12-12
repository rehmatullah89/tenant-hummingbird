
<!-- do not use this component as of right now, it is not at a finished point or an approved part of the design system -->
<template>
    <v-item-group v-model="buttonGroup">
        <v-item
            v-for="(icon, i) in icons"
            :key="'icon' + i"
            v-slot:default="{ active, toggle }"
        >
            <v-tooltip bottom open-delay="1500">
                <template v-slot:activator="{ on }">
                    <v-hover v-slot:default="{ hover }">
                        <v-btn class="ml-1 hb-v-btn-icon" :ripple="false" icon v-on="on" :class="{'hb-button-icon-hover' : hover}" active-class="hb-button-icon-active" :input-value="active" @click="buttonGroup !== i ? buttonGroup = i : buttonGroup = null">
                            <v-icon :color="hover || active ? '#101318' : ''" size="24">{{ icon }}</v-icon>
                        </v-btn>
                    </v-hover>
                </template>
                <span>Button {{ i + 1 }}</span>
            </v-tooltip>
        </v-item>
    </v-item-group>
</template>
<script type="text/babel">
    
    export default {
        name: "HbIconGroup",
        data: function() {
            return {
                buttonGroup: null,
            };
        },
        props: ['icons'],
    }
</script>

<style scoped>

</style>