/* eslint-disable no-unused-vars */
/* eslint-disable no-unused-vars */
<template>

    <div class="section-content pt-4" :class="{ 'mt-10': $vuetify.breakpoint.xs, 'mt-n3': $vuetify.breakpoint.sm }">
        <div class="primary-section-content1">
            <hb-header class="pt-5" fewer-actions>
                <template v-slot:left>
                    <hb-page-header title="Docmanager Subscribe"></hb-page-header>
                </template>
            </hb-header>
            <div class="pb-3 mb-2 mt-5" v-if="notify">
                <hb-notification :type="statusType" @close="resetNotification" :notDismissable="notDismissable">
                    {{ statusMessage }}
                </hb-notification>
            </div>
            <div class="content-view">
                <v-container fluid>
                    <v-row class="form-controls">
                        <v-col cols="3">
                            <div class="mb-2 mt-2"> select a company to add to docmanager</div>
                            <v-select class="ma-1" type="text" hide-details v-validate="'required'"
                                v-model="selectedCompany" :items="companies" return-object required dense
                                @change="selectionChanged" backgroundColor="white" outlined item-text="name"
                                id="gds_owner_id" name="gds_owner_id" data-vv-as="Company"
                                :class="{ 'custom-field-error': errors.first('gds_owner_id') }"
                                :error-messages="errors.first('gds_owner_id')"></v-select>
                        </v-col>

                        <v-col class="mt-3 flex-shrink text-right" v-if="selectedCompany">
                            <hb-btn color="primary" :disabled="!selectedCompany.gds_owner_id" @click="addToDocManager">
                                Add to docmanager
                            </hb-btn>
                        </v-col>
                    </v-row>
                </v-container>
            </div>
        </div>
    </div>

</template>

<script type="text/babel">
import docAxiosClient from '../../assets/api/docmanager.js';
import api from '../../assets/api.js';

export default {
    name: "DocmanagerInsert",
    data() {
        return {
            companies: [],
            selectedCompany: null,
            loading: false,
            statusMessage: '',
            statusType: "warning",
            notify: false,
        }
    },

    async created() {
        await this.getCompanies();
    },
    computed: {
    },

    components: {
    },
    methods: {
        async addToDocManager() {
            console.log(this.selectedCompany.name, this.selectedCompany.gds_owner_id);
            console.log(process.env.VUE_APP_DOCMANAGER_BASE_URL)
            docAxiosClient.post('companies', { name: this.selectedCompany.name, externalId: this.selectedCompany.gds_owner_id }).then(r => {
                this.showNotification("success", `${this.selectedCompany.name} added to docmanager!`)
            }).catch(err => {
                this.showNotification("warning", ` Could not add ${this.selectedCompany.name} to docmanager! - Error Message: ${err.response.data.message}`)
            });
        },
        async getCompanies() {

            let r = await api.get(this, api.COMPANIES);
            this.companies = r.companies;
        },

        async selectionChanged() {
            if (!this.selectedCompany.gds_owner_id) {
                this.showNotification("warning", `Gds owner id doesn't exist for selected company - (${this.selectedCompany.name})`)
            }
        },

        async resetNotification() {
            this.notify = false;
            this.statusMessage = ''
            this.statusType = "warning"
        },

        async showNotification(type, message) {
            this.statusType = type;
            this.statusMessage = message;
            this.notify = true;
        }

    }
}

</script>
<style scoped>
</style>