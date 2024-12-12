<template>
    <div>
        <div class="container-fluid">
            <div class="col-xs-12 ">
                <status @resetStatus="errorClear($options.name)" v-if="errorHas($options.name)" :message="errorGet($options.name)" status="error"></status>
                <div class="row">
                    <draggable class="sort-container" :list="data" @update="saveNewOrder">
                        <div class="col-xs-12 col-sm-6 col-md-4 img-holder" v-for="image, i in data" :key="image.id">
                            <div class="delete-btn">
                                <div class="dropdown">
                                    <a class="btn dropdown-toggle" data-toggle="dropdown" aria-haspopup="true">
                                        <i class="fa fa-remove"></i>
                                    </a>
                                    <ul class="dropdown-menu dropdown-menu-right dropdown-modal" aria-labelledby="dropdownMenu1">
                                        <li @click="prevent">
                                            <h5>Delete This Image?</h5>
                                            <p>Are you sure you want to delete this upload?</p>

                                            <div class="modal-footer">
                                                <button @click.prevent="closeDropdown" class="btn btn-sm btn-std">Cancel</button>
                                                <button @click="deleteImage(image, i)" class="btn btn-sm btn-delete">
                                                    <i class="fa fa-remove"></i>
                                                    &nbsp;&nbsp;Delete Upload
                                                </button>
                                            </div>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                            <img :src="image.src" v-show="image.type == 'image'" />
                            <img class="pdf-holder" src="/img/multiple_pdf_icon.png" v-show="image.extension == 'pdf'" />
                            <p>{{image.name}}</p>
                        </div>
                    </draggable>
                </div>
                <div class="row">
                    <div class="col-xs-12 text-center">
                        <vue-clip :options="options" class="uploader" :on-added-file="fileAdded" :on-complete="complete" :on-sending="sending" >

                            <template slot="clip-uploader-body" slot-scope="props">
                                <div v-for="file in props.files" class="text-center file-loading" v-show="uploading && file.status == 'added'">

                                    <h2 v-show="file.progress < 100">{{file.progress.toFixed(0)}}%</h2>
                                    <h2 v-show="file.progress == 100">
                                        <span v-show="isLoading($options.name)" >
                                            <loader color="#00b2ce" size="20px" class="inline-loader"></loader>
                                        </span>
                                       Processing... </h2>
                                    <div class="progress-holder">
                                        <div class="progress-bar" :style="{width: file.progress + '%'}"></div>
                                    </div>

                                </div>
                            </template>
                            <template slot="clip-uploader-action" slot-scope="props">
                                <div class="drag-and-drop-area text-center" v-show="canUploadMore ">

                                    <div class="dz-message upload-text">
                                        <div class="upload-icon">
                                            <i class="fa fa-cloud-upload"></i>
                                        </div>
                                        <h4>Drag and drop files here <br />or <span class="underlined">click to browse</span></h4></div>
                                </div>
                            </template>
                        </vue-clip>

                    </div>
                </div>
            </div>
        </div>

        <div class="modal-footer" v-if="model != 'document'">
            <button class="btn btn-dark" @click="$emit('close')">Close</button>
        </div>

    </div>
</template>



<script type="text/babel">
    import Status from '../includes/Messages.vue';
    import draggable from 'vuedraggable';
    import Loader from '../assets/CircleSpinner.vue';
    import { mapGetters } from 'vuex';

    export default {
        name: "EditUploads",
        data() {
            return {
                uploading: false,
                data:[],
                options: {
                    url: '',
                    headers: {

                    }
                },
                files:[]
            }
        },
        components:{
            draggable,
            Status,
            Loader
        },
        filters:{

        },
        props: {
            uploads:{
                required: false,
                type: Array
            },
            model:{
                required: true,
                type: String
            },
            foreignId:{
                required: true,
                type: String
            },
            type:{
                type: String,
                required: true
            }
        },
        beforeCreate(){
        },
        created(){
            var paths = location.hostname.split('.');
            var subdomain = paths[0];
            // if(paths[1] + '.' + paths[2] == 'leasecaptain.xyz'){
            //     this.options.url = 'https://api.leasecaptain.xyz/v1/uploads/save';
            //
            // } else if(paths[1] + '.' + paths[2] == 'leasecaptain.com'){
            //     this.options.url = 'https://api.leasecaptain.com/v1/uploads/save'
            // }

            this.options.url = process.env.VUE_APP_API_PROTOCOL + '://' + process.env.API_SUBDOMAIN + '.' + process.env.DOMAIN + ':' + process.env.API_PORT + '/v1/uploads/save';

            this.options.headers = {
                "Authorization":  this.getAuthHeader,
                'Access-Control-Allow-Origin': 'https://' + subdomain +'.leasecaptain.com'
            };

            if(this.uploads && this.uploads.length){
                this.data = JSON.parse(JSON.stringify(this.uploads));
            }
        },
        computed:{
            ...mapGetters({
                getAuthHeader: 'authenticationStore/getAuthHeader'
            }),
            canUploadMore(){
                console.log(this.model);
                console.log(this.uploads.length);
                if((this.model == 'documents' && this.uploads.length) || this.uploading) return false;
                return true;
            }
        },
        methods:{
            fileAdded(file){
                this.uploading = true;
                // this.data.push(file);
            },
            complete (file, status, xhr) {
                // Adding server id to be used for deleting
                // the file.
                if(xhr.statusText == "OK"){
                    try{
                        var f = JSON.parse(xhr.response);
                        if(!f.status){
                            this.errorSet(this.$options.name, f.msg);
                        } else {
                            console.log(f.data);
                            this.data.push(f.data);
                            this.saveNewOrder();
                        }
                    } catch(err){
                        console.log(err);
                    }
                }
                this.uploading = false;
            },
            sending (file, xhr, formData) {

                formData.append('type', this.type);
                formData.append('model', this.model);
                formData.append('foreign_id', this.foreignId);
            },
            closeDropdown(){
                //TODO JQUERY FIX
                //$(event.target).closest('.dropdown-menu').dropdown('toggle');
            },
            prevent(event){
                event.stopPropagation();
            },

            deleteImage(image, i, event){
                this.$http.delete('uploads/' + image.id).then(function(response){
                    if(response.body.status){
                        this.$emit('refetch');
                      //  this.closeDropdown(event);
                        this.data.splice(i, 1);
                    } else {
                        console.log(response.body);
                    }
                });
            },
            saveNewOrder(){

                this.$http.post('uploads/set-sort',  {uploads: this.data}).then(function(response){
                    if(response.body.status){
                        this.$emit('refetch');
                    } else {
                        console.log(response.body);
                    }
                }, function(response){
                    console.log(response);
                });
            },
        }

    }


</script>
<style scoped>

    .img-holder{
        position: relative;
        margin-bottom: 20px;
        text-align: center;
        z-index: 0;
        height: 150px;
        overflow:visible;
    }
    .img-holder:hover{
        z-index: 0;
        background-color: #f5f7f8;
    }
    .img-holder img{
        max-width: 100%;
        max-height: 125px;
        margin-top: 10px;
        margin-bottom: 10px;
    }




    .delete-btn{
        z-index: 1000;
    }
    .delete-btn .dropdown-toggle{
        position: absolute;
        top: 0px;
        right: 0px;
        display:none;
        z-index:1000;
        color: #C52828;
        padding: 5px 10px;
    }

    .img-holder:hover    .delete-btn .dropdown-toggle{
        display: block;
    }
    .uploader{
        margin: 0px auto 50px;
        padding: 0px 20px 0 20px;
        width: 100%;
        display: block;
        z-index:0;
    }
    .uploader .drag-and-drop-area{
        margin-bottom: 0;
    }

    ul.dropdown-menu.dropdown-modal {
        top: 30px;
        background-color: white;
    }

    .dropdown-modal .modal-footer {
        padding: 10px 0;
        text-align: right;
        border-top: 1px solid #e5e5e5;
        margin-top: 20px;
    }
    .dropdown-modal .modal-footer .btn{
        font-weight: 700;
        font-size: 11px;
    }
    .pdf-holder{
        border:1px solid #e2e2e2;
        padding: 30px;
    }
    .file-loading {
        position: relative;

    }

    .progress-holder{
        position: relative;
        left: 0;
        right: 0;
        background-color:  #e2e2e2;
        height: 8px;
    }

    .progress-holder .progress-bar{
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        background-color: #2287c8;
    }



</style>
