<template>
    <div class="pb-3">
        <hb-notification :type="type" @close="$emit('resetStatus')" :notDismissable="notDismissable">
            {{message}}
        </hb-notification>
    </div>
    <!--
    <div :class="{'error-block': status == 'error', 'success-block': status == 'success' }" role="alert" class="status-block pa-2">
        <div class="status-icon" >
            <span class="icon" v-if="status == 'success'"></span>
            <span class="icon" v-if="status == 'error'"></span>
        </div>
        <div class="status-text">
            <h5 class="" v-if="title">{{title}}</h5>
            <p class="mb-0" v-show="message" v-html="message"> </p>
        </div>
        <button  class="status-close" type="button" @click="$emit('resetStatus')" aria-label="Close">
            <span aria-hidden="true" class="icon"></span>
        </button>

    </div>
    -->
</template>

<script type="text/babel">
    export default {
        data() {
            return {
                close: false
            }
        },
        created(){

        },
        computed:{
            type(){
                if(this.status == 'error'){
                    return 'warning';
                }
                else if(this.status == 'success'){
                    return 'success';
                }
                else {
                    return '';
                }
            }
        },
        methods: {
            resetStatus (){}
        },
        props: {
            status: {
                type: String,
                required: false
            },
            message: {
                type: String,
                required: true
            },
            title: {
                type: String,
                required: false
            },
            notDismissable: {
                type: Boolean,
                required: false
            }
        }

    }
</script>

<style scoped>
    /*.status-block{*/
        /*position: relative;*/
    /*}*/

    /*.status-block .status-icon{*/
        /*padding: 5px;*/
    /*}*/


    /*.alert-body{*/
        /*display: block;*/
        /*margin-left: 0px;*/
        /*padding: 5px;*/
    /*}*/
    /*.status-block p{*/
        /*margin-bottom: 0;*/
    /*}*/

    /*.close {*/
        /*opacity: .25;*/
        /*background: transparent;*/
        /*position: absolute;*/
        /*top: 0px;*/
        /*right: 0px;*/
        /*padding: .75rem 1.25rem;*/
        /*color: inherit;*/
        /*z-index: 100;*/
    /*}*/



</style>
