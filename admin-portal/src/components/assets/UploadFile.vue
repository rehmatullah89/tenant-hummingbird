<template>
    <hb-modal v-model="dialog" size="medium" title="Upload Files" @close="$emit('close')">
        <template v-slot:content>
          <div class="px-6">
            <status @resetStatus="errorClear($options.name)" v-if="errorHas($options.name)" :message="errorGet($options.name)" status="error"></status>
            <v-file-input multiple v-model="files"></v-file-input>
            <v-select
              v-if="multipleLeases && multipleLeases.length > 0"
              :items="multipleLeases"
              id="leases"
              name="leases"
              flat
              item-text="Unit.number"
              item-value="id"
              label="Select Space"
              v-model="uploadSpace"
              v-validate="'required'"
              single-line
              hide-details
              data-vv-as="upload_space"
              class="pa-0 ma-0 pb-5">
            </v-select>
          </div>
        </template>
        <template v-slot:actions>
            <hb-btn @click="upload" :disabled="isLoading($options.name)" :loading="isLoading($options.name)" color="primary">Upload</hb-btn>
        </template>
      </hb-modal>
</template>
<!--
    <div>
        <div class="form-section">
            <status @resetStatus="errorClear($options.name)" v-if="errorHas($options.name)" :message="errorGet($options.name)" status="error"></status>

            <v-file-input multiple v-model="files"></v-file-input>
-->

<!--            <v-card v-for="file in filePreview">-->
<!--              <img :src="file.img" />-->
<!--            </v-card>-->




<!--            <vue-clip-->
<!--                :options="options"-->
<!--                class=""-->
<!--                :on-added-file="fileAdded"-->
<!--                :on-sending="sending"-->
<!--                :on-complete="complete"-->
<!--            >-->
<!--                <template slot="clip-uploader-body" slot-scope="props">-->
<!--                    <div class="uploader-files ">-->
<!--                        <div class="uploader-file clearfix" v-for="file in props.files">-->
<!--                            <div class="img-preview">-->
<!--                                <img :src="file.dataUrl" v-show="file.type != 'application/pdf'" />-->
<!--                                <img src="/img/multiple_pdf_icon.png" class="pdf-icon" v-show="file.type == 'application/pdf'">-->
<!--                            </div>-->

<!--                            <div class="file-details">-->
<!--                                <div class="file-name">-->
<!--                                    <h5>{{file.name}}</h5>-->
<!--                                </div>-->
<!--                                <div class="file-progress">-->
<!--                                    <span class="progress-indicator" :style="{width:file.progress + '%'}"></span>-->
<!--                                </div>-->


<!--                                <div class="file-meta">-->
<!--                                    <span class="file-size subdued">{{file.size}}</span>-->
<!--                                    <span class="file-status">{{file.status}}</span>-->
<!--                                </div>-->
<!--                            </div>-->
<!--                        </div>-->

<!--                    </div>-->
<!--                </template>-->

<!--                <template slot="clip-uploader-action" slot-scope="props" >-->
<!--                    <div class="drag-and-drop-area text-center" >-->
<!--                        <div class="dz-message upload-text">-->
<!--                            <div class="upload-icon">-->
<!--                                <span class="icon"></span>-->
<!--                            </div>-->
<!--                            <h4 class="hide-sm">Drag and drop files here <br />or <span class="underlined">click to browse</span></h4>-->
<!--                            <h4 class="show-sm">Click to take a picture <br />or upload from your phone</h4>-->
<!--                        </div>-->
<!--                    </div>-->
<!--                </template>-->
<!--            </vue-clip>-->

<!--
        </div>
        <div class="modal-footer">
            <v-btn class="text-capitalize mr-2 secondary-button" @click="close">Close Window</v-btn>&nbsp;&nbsp;
            <v-btn @click="upload" color="primary">Upload</v-btn>
        </div>

    </div>
</template>
-->
<script type="text/babel">

    import Status from '../includes/Messages.vue';
    import api from '../../assets/api';
    import { mapGetters } from 'vuex';

    export default {
        name: 'UploadFile',
        data: function(){
           return {
               id: null,
               options: {
                   url: 'https://api.leasecaptain.xyz/v1/',
                   uploadMultiple: false,
                   headers: {

                   }
               },
               files:[],
               filePreview: [],
               uploadSpace: ''
           }
        },
        components:{
            Status
        },
        computed: {
            ...mapGetters({
                getAuthHeader: 'authenticationStore/getAuthHeader'
            }),
            dialog: {
                get () {
                    return this.value
                },
                set (value) {
                    this.$emit('input', value)
                }
            },
        },
        created(){
            var paths = location.hostname.split('.');
            this.options.url = process.env.API_PORT + '://' + process.env.API_SUBDOMAIN + '.' + process.env.DOMAIN + ':' + process.env.API_PORT + '/v1/maintenance' + this.id;
            var subdomain = paths[0];
            this.options.headers = {
                "Authorization":  this.getAuthHeader,
                'Access-Control-Allow-Origin': 'https://' + subdomain +'.' + process.env.DOMAIN,
                'Referrer-Policy': 'origin-when-cross-origin'
            };

        },
        filers:{
            getFileName(file){
              let read = new FileReader();
                read.readAsBinaryString(file);
                return read.onloadend = function(){
                    return read.result;
                }
            }
        },
        methods:{
            // async getFilePreview(){
            //     let read = new FileReader();
            //
            //     for(let i = 0; i < this.files.length; i++){
            //       read.onloadend = () => {
            //           this.filePreview[i] = {
            //               img: read.result
            //           }
            //       }
            //       read.readAsBinaryString(this.files[i]);
            //     }
            //
            //
            // },
            async upload(){
                let path = '';
                switch(this.model){
                    case 'leases':
                        path += api.LEASES;
                        break;
                    case 'contacts':
                        path += api.CONTACTS;
                        break;
                    case 'units':
                        path += api.UNITS;
                        break;
                    case 'properties':
                        path += api.PROPERTIES;
                        break;
                }

                if(this.multipleLeases && this.multipleLeases.length > 0){
                    path += this.uploadSpace + '/upload';
                } else {
                    path += this.foreign_id + '/upload';
                }

                let body = {
                    document_type: this.type,
                    document_type_id: this.document_type_id
                }

                let response = await api.postFile(this, path, body, this.files);

                this.files = [];
                this.$emit('refetch');
                this.$emit('close');
                console.log(response);
                this.$emit('save', response);
                this.dialog = false;

            },
            close(){
                this.$emit('close');
            }
        },
        props: {
            model:{
                required: true,
                type: String
            },
            foreign_id:{
                required: true,
                type: String
            },
            type:{
                type: String,
                required: false,
                default: null
            },
            document_type_id: {
                type: String,
                required: false,
                default: null
            },
            path:{
                type: String,
                required: false
            },
            file_types:{
                type: Array,
                required: false
            },
            upload_single:{
                type: Boolean,
                required: false
            },
            value:{
                type: Boolean,
                default: false
            },
            multipleLeases:{
                type: Array,
                required: false
            }
        }
    }

</script>

<style>
    .img-preview{
        float: left;
        padding: 20px;
        width: 100px;
        position: relative;
    }

    .file-details{
        margin-left: 80px;
        padding: 20px;
    }

    .file-progress{
        height: 2px;
        border-radius: 2px;
        overflow: hidden;
        margin: 6px 0;
        width: 100%;
        background-color: #e2e2e2;
        position:relative;

    }
    .progress-indicator{
        position: absolute;
        top: 0;
        left: 0;
        bottom: 0;
        height: 100%;
        background-color: #00a1c8;
    }

    .uploader-file h5{
        color: #788f9b;
        font-size: 14px;
        margin: 0 0 10px 0;
        padding: 0;
        text-transform: none;
        font-weight: normal;
    }

    .img-preview img{
        max-width: 100%;

        border:1px solid #e2e2e2;
    }

    .drag-and-drop-area{
        min-height: 250px;
        text-align: center;
        border: 2px dashed #e2e2e2;
        padding: 15px 20px;
        margin-bottom: 20px;

    }
    .upload-text{
        margin-top: 60px;
        cursor: pointer;

    }
    .upload-icon{
        font-size: 36px;
        color: #00b2ce;
    }
    .underlined{
        padding-bototm: 3px;
        border-bottom: 1px solid #788f9b;
    }

    .drag-and-drop-area h4{
        color: #788f9b;
        font-weight: 300;
        font-size: 16px;
        text-transform: none;
        line-height: 24px;
        margin: 10px 0 0 0;

        padding: 0;

    }
    .file-status{
        text-transform: uppercase;
    }


    .hide-sm{
        display:block;
    }
    .show-sm{
        display:none;
    }
    @media (max-width: 767px) {

        .hide-sm{
            display:none;
        }
        .show-sm{
            display:block;

        }
    }


</style>
