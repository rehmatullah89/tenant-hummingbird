<template>
    <div class="template-file pa-2 mb-2" :class="{ 'hover-border': hovered }" @mouseover="hovered = true"
        @mouseleave="hovered = false">
        <v-row>
            <v-col col="1" md="auto" align-self="center">
                <div class="action-space ml-1">
                    <v-menu bottom right>
                        <template v-slot:activator="{ on, attrs }">
                            <v-btn icon v-bind="attrs" v-on="on">
                                <v-icon dark>mdi-dots-vertical</v-icon>
                            </v-btn>
                        </template>
                        <v-list>
                            <v-list-item>
                                <v-list-item-title @click="menuActionClick('remove')">remove</v-list-item-title>
                            </v-list-item>
                        </v-list>
                    </v-menu>
                </div>
            </v-col>
            <v-col col="8" align-self="center" class="hb-overflow-handler">
                <div>
                    <div class="text-label mb-1">Name</div>
                    <div class="file">{{ file.obj.name }}</div>
                </div>
            </v-col>
            <v-col col="2">
                <div>
                    <div class="text-label mb-1 clr-label">Size</div>
                    <div class="file">{{ Math.round(file.obj.size / 1000) }} KB</div>
                </div>

            </v-col>

            <v-col col="1" class="text-right" align-self="center">
                <v-progress-circular class="mr-3" :width="3" :size="24" v-if="file.action_status === 'uploading'"
                    indeterminate color="green">
                </v-progress-circular>
                <v-icon class="mr-3" color="red" v-if="file.action_status === 'error'">
                    mdi-alert-circle</v-icon>
                <v-icon class="mr-3" color="green" v-if="file.action_status === 'success'">mdi-check-bold</v-icon>

            </v-col>
        </v-row>
        <v-row v-if="file.errorText" class="ml-2 mt-2 mb-1">

            <div class="text-error ">{{ file.errorText }}</div>


        </v-row>
    </div>
</template>

<script>
export default {
    name: "TemplateListItem",
    props: ['file'],
    data() {
        return {
            hovered: false,
        }
    },
    computed: {

    },
    methods: {
        async menuActionClick(action) {
            if (action === "remove") {
                this.$emit('remove-file', { name: this.$props.file.obj.name, size: this.$props.file.obj.size })
            }
        }
    }
}
</script>

<style scoped>
.template-file {
    background: rgb(249, 249, 249);
    margin: 5px;
    padding: 10px 20px;
    width: auto;
    border: 1px solid;
    border-color: rgb(191, 192, 192);
    border-radius: 15px;
}

.hover-border {
    border-color: rgb(79, 138, 193);
    border-width: 1px;
}

.file {
    font-size: small;
    font-weight: bold;
}

.text-label {
    font-size: small;
    font-weight: bold;
    color: rgb(94, 97, 99);
}

.text-error {
    font-size: small;
    font-weight: bold;
    color: rgb(207, 70, 63);
}

.display-inline {
    display: inline-block;
}

.action-space {
    width: 30px;
}

.hb-overflow-handler {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
</style>