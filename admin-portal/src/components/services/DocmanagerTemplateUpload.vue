<template>
    <div class="section-content pt-4" :class="{ 'mt-10': $vuetify.breakpoint.xs, 'mt-n3': $vuetify.breakpoint.sm }">
        <div class="primary-section-content1">
            <hb-header class="pt-5" fewer-actions>
                <template v-slot:left>
                    <hb-page-header title="Docmanager Template Upload"></hb-page-header>
                </template>
            </hb-header>
            <div class="pb-3 mb-2 mt-5" v-if="notify">
                <hb-notification :type="statusType" @close="resetNotification">
                    {{ statusMessage }}
                </hb-notification>
            </div>
            <div class="content-view">
                <v-container fluid>
                    <v-row class="form-controls">
                        <v-col cols="3" align-self="center">
                            <v-select class="v-select-basic pt-2 mr-2" :items="companies" dense required
                                label="select company" outlined item-text="name" data-vv-as="Company"
                                v-model="selectedCompany" return-object name="gds_owner_id"
                                @change="companySelectionChanged"
                                :class="{ 'custom-field-error': errors.first('gds_owner_id') }"
                                :error-messages="errors.first('gds_owner_id')">
                            </v-select>
                        </v-col>
                        <v-col cols="3" align-self="center">
                            <v-select class="v-select-basic pt-2 mr-2" :items="properties" dense required
                                label="select properties" outlined item-text="name" data-vv-as="Property"
                                v-model="selectedProperties" multiple return-object @change="companySelectionChanged">
                                <template v-slot:prepend-item>
                                    <v-list-item ripple @mousedown.prevent @click="propertySelectToggle">
                                        <v-list-item-action>
                                            <v-icon :color="selectedProperties.length > 0 ? 'indigo darken-4' : ''">
                                                {{ icon }}
                                            </v-icon>
                                        </v-list-item-action>
                                        <v-list-item-content>
                                            <v-list-item-title>
                                                Select All
                                            </v-list-item-title>
                                        </v-list-item-content>
                                    </v-list-item>
                                    <v-divider class="mt-2"></v-divider>
                                </template>
                                <template v-slot:selection="{ item, index }">
                                    <!-- <v-chip v-if="index === 0">
                                       
                                    </v-chip> -->
                                    <span v-if="index === 0">{{ item.name }}</span>
                                    <span v-if="index === 1" class="grey--text text-caption">
                                        (+{{ selectedProperties.length - 1 }} others)
                                    </span>
                                </template>
                            </v-select>
                        </v-col>
                        <v-col cols="2">
                            <v-select class="v-select-basic pt-2" :items="types" item-text="value" dense return-object
                                v-model="selectedType" required label="select type" outlined>
                            </v-select>
                        </v-col>
                        <v-col cols="4" class="text-right flex-shrink" v-if="selectedCompany">
                            <hb-btn @click="clearList" color="primary" v-if="this.selectedCompany && this.selectedType"
                                class="mr-5">
                                clear
                            </hb-btn>
                            <hb-btn @click="openFileExp" color="primary"
                                v-if="this.selectedCompany && this.selectedType" class="mr-5">Add Template
                            </hb-btn>
                            <hb-btn @click="uploadTemplates" v-if="this.selectedCompany && this.selectedType"
                                color="primary" class="mr-5">upload
                            </hb-btn>
                            <input id="doc-temp-file-input" type="file" hidden ref="docfileInput" @input="filesLoaded"
                                multiple>
                        </v-col>
                    </v-row>
                    <v-row full-width>
                        <v-col col="12">
                            <div>
                                <div>
                                    Total files : {{ this.templates.length }}, Total file Length
                                    {{ Math.round(this.totalLength) }} KB
                                </div>
                            </div>
                            <div class="template-list">
                                <div v-for="(file, index) in templates" :key="index">
                                    <TemplateFile :file="file" @remove-file="removeFromList"></TemplateFile>
                                </div>
                            </div>
                        </v-col>
                    </v-row>
                </v-container>
            </div>
        </div>
    </div>
</template>

<script type="text/babel">
import docAxiosClient from '../../assets/api/docmanager.js';
import TemplateFile from '../assets/TemplateUploader.vue';
import api from '../../assets/api.js';
export default {
    name: "TemplateUploader",
    data() {
        return {
            companies: [],
            properties: [],
            types: [],
            selectedCompany: null,
            selectedProperties: [],
            selectedType: null,
            // templates: [{ name: "sdjfhasiudfsijdhfasdfasd.docx", action_status: "staged", errorText: 'There is some error', size: 12892 },
            // { name: "sdjfhasiudfsijdhfasdfasd.docx", action_status: "uploading", errorText: 'There is some error', size: 12892 },
            // { name: "sdjfhasiudfsijdhfasdfasd.docx", action_status: "error", errorText: 'There is some error', size: 12892 },
            // { name: "sdjfhasiudfsijdhfasdfasdsakjsdgfqihsdgfqiusgdfiqussqdgfqsdgfusasdfquysdgfiquysdfiqusefiquywetirquwe.docx", action_status: "success", errorText: 'There is some error', size: 12892 },
            // { name: "sdjfhasiudfsijdhfasdfasd.docx", action_status: "success", errorText: 'There is some error', size: 12892 }],
            templates: [],
            uploading: false,
            maxCount: 20,
            maxLength: 3000, // in KB ~3 MB
            totalLength: 0,
            statusMessage: '',
            statusType: "warning",
            notify: false,
        }
    },
    components: {
        TemplateFile
    },
    async created() {
        await this.getCompanies();
        await this.getTypes();
        // this.types = [{ value: "reversal" }, { value: "military" }];
    },
    computed: {
        allPropertySelected() {
            return this.selectedProperties.length === this.properties.length
        },
        somePropertySelected() {
            return this.selectedProperties.length > 0 && !this.allPropertySelected
        },
        icon() {
            if (this.allPropertySelected) return 'mdi-close-box'
            if (this.somePropertySelected) return 'mdi-minus-box'
            return 'mdi-checkbox-blank-outline'
        },
    },
    methods: {
        propertySelectToggle() {
            this.$nextTick(() => {
                if (this.allPropertySelected) {
                    this.selectedProperties = []
                } else {
                    this.selectedProperties = this.properties.slice();
                }
            })
        },
        async companySelectionChanged() {
            // validate company
            const isValidCompany = await this.validateCompany();
            if (isValidCompany) {
                await this.getProperties();
            } else {
                this.properties = [];
                this.selectedProperties = [];
            }

        },
        openFileExp() {
            this.removeFiles((e) => e.action_status !== "success")
            this.$refs.docfileInput.click();
        },
        removeFiles(func) {
            this.templates = this.templates.filter(func);
        },
        removeFromList(file) {
            this.templates = this.templates.filter((e => e.obj.name !== file.name));
            this.totalFileLength -= file.size
            // await this.updateFileLength(-file.size);
            console.log('removefrom list', file.name)
        },

        filesLoaded() {

            // console.log(this.$refs.docfileInput.files);

            for (let file of this.$refs.docfileInput.files) {
                if (!this.fileCanAdded(file)) {

                    break;
                }
                this.addToList(file);
            }
            // clear input files
            this.$refs.docfileInput.value = '';
        },

        addToList(file) {
            // console.log("addding to list");
            this.updateFileLength(file.size);
            this.templates.push({ obj: file, action_status: 'staged', errorText: '' });
        },



        async updateTotalFileLength() {
            this.totalLength = 0;
            for (let file of this.templates) {
                this.totalLength += (file.obj.size / 1000);
            }
        },

        updateFileLength(size) {
            this.totalLength += (size / 1000);
        },

        fileCanAdded(file) {
            if (this.totalFileLength + (file.size / 1000) > this.maxLength
            ) {
                this.showNotification("warning", `Cannot add files: Total file size is 3MB`);
                return false
            }

            if (this.templates.length + 1 > 20 // check if max file count reached

            ) {
                this.showNotification("warning", `Cannot add file: Max Count 20`);
                return false
            }

            if (
                this.templates.find((e) => e.obj.name === file.name) //unique file
            ) {
                this.showNotification("warning", `Cannot add file: Duplicate file entry`);
                return false
            }

            return true;
        },
        async getTypes() {
            docAxiosClient.get("doctypes").then(r => {
                this.types = r.data.data;
            }).catch(error => {
                console.log(error);
            })
        },
        async getCompanies() {
            // this.companies = [
            //     { company_id: 1, name: "Apple", gds_owner_id: "ownashgd238472983" },
            //     { company_id: 2, name: "Google", gds_owner_id: "ownsdjkfh52384283" },
            //     { company_id: 1, name: "Micro", gds_owner_id: "ownskjhu458472983" },
            // ];

            let r = await api.get(this, api.COMPANIES);
            this.companies = r.companies;
        },

        async getProperties() {
            // this.properties = [
            //     { name: "prop1", gds_id: "hdufduf" },
            //     { name: "prop2", gds_id: "dfsd33323" },
            //     { name: "prop3", gds_id: "io8293642" },
            //     { name: "prop4", gds_id: "io8293642" },
            //     { name: "prop5", gds_id: "io8293642" },
            //     { name: "prop6", gds_id: "io8293642" },
            //     { name: "prop7", gds_id: "io8293642" },
            // ];

            let r = await api.get(this, 'companies/' + this.selectedCompany.company_id + '/' + api.PROPERTIES);
            this.properties = r.properties;
        },

        async clearList() {
            this.templates = [];
            this.totalLength = 0;
        },

        async uploadTemplates() {
            this.uploading = true;
            if (this.templates.length > 0) {
                await Promise.all(this.templates.map((e) => this.addNewTemplate(e)));
            }
        },

        async validateCompany() {
            try {
                const res = await docAxiosClient.get(`companies/${this.selectedCompany.gds_owner_id}`);
                if (res.data.data.externalId !== this.selectedCompany.gds_owner_id) {
                    this.showNotification("warning", "Invalid gds id, selected company gds id is not same as in docmanager");
                    return false;
                }
                return true;
            } catch (error) {

                console.log(error.response.data);

                if (error.response.status === 404) {
                    this.showNotification("warning", "Company not found in docmanager");
                }
                else {
                    this.showNotification("warning", error.response.data.message);
                }
                return false;
            }

        },

        async addNewTemplate(file) {
            let formData = new FormData();
            formData.append("template", file.obj);
            formData.append("name", file.obj.name);
            formData.append("type", this.selectedType.value);
            formData.append("companyId", this.selectedCompany.gds_owner_id);
            if (this.selectedProperties.length > 0) {
                formData.append(
                    "properties",
                    JSON.stringify(this.selectedProperties.map((e) => ({ id: e.gds_id })))
                );
            }

            file.action_status = "uploading";

            docAxiosClient
                .post("templates", formData, {
                    params: {
                        convert: true,
                    },
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                })
                .then((r) => {
                    file.action_status = "success";
                    console.log(r.data);
                })
                .catch((error) => {
                    file.action_status = "error";
                    file.errorText = error.response.data.message;
                    console.log(error);
                });
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
.v-select-basic {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.v-select-basic {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.template-list {
    min-height: 50vh;
    width: 75vw
}
</style>