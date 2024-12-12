<template>
    <transition name="modal">
        <div class="modal-mask">
            <div class="modal-wrapper">
                <div class="modal-container" :class="[modalSize, modalBlank, {'no-padding': noPadding}]" v-on-clickaway="away">

                    <div class="modal-header" v-if="!hideHeader">
                        <slot name="header">

                        </slot>
                        <button v-if="!alert" @click="$emit('close')" class="close icon"></button>
                    </div>

                    <div class="modal-body">
                        <slot name="body"></slot>
                    </div>
                </div>
            </div>
        </div>
    </transition>
</template>

<script type="text/babel">

    import { mixin as clickaway } from 'vue-clickaway';

    export default {
        name: 'RootModal',
        data() {
            return {
                paymentMethods:[],
                showAddPaymentMethodModal: false,
                modalSize: '',
                modalBlank: '',
                scrollTop: 0
            }
        },

        created(){

            this.$nextTick(() => {
                this.scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
                document.body.classList.add('noscroll');
                if(this.size) this.modalSize = 'modal-' + this.size;
                if(this.blank) this.modalBlank = 'modal-blank';
                window.scrollTo(0, this.scrollTop);
                document.body.style.top =  '-' + this.scrollTop + 'px';
            })





        },
        destroyed(){
            document.body.classList.remove('noscroll');
            document.body.scrollTop = this.scrollTop;
        },
        props:[ 'allowClickAway', 'size', 'blank', 'hideHeader', 'alert', 'noPadding' ],
        mixins: [ clickaway ],
        methods: {
            away (){
                if(this.allowClickAway === true){
                    this.$emit('close');
                }
            }

        }
    }


</script>

<style >

    .modal-footer {
        text-align: right;
    }


    .modal-header {
        border-bottom: 1px solid #e2e2e2;
        padding: 0px 10px;
    }
    .modal-body{
        /*padding: 10px;*/
    }

    .modal-mask {
        background-color: rgba(0, 0, 0, .5);
        transition: opacity .3s ease;
        overflow-y: scroll;
        position: fixed;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        z-index: 999999;
        -webkit-overflow-scrolling: touch;
        outline: 0;
        padding: 15px;
        box-sizing: border-box;
    }



    .noscroll{
        position: fixed;
        overflow: hidden;
    }
    .noscroll .modal-mask,
    .modal-open .modal-mask {
        overflow-x: hidden;
        overflow-y: auto;
    }

    .modal-container {
        position: relative;
        width: auto;
        margin: 30px auto;
        padding: 20px 30px;
        background-color: #fff;
        border-radius: 2px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, .33);
        transition: all .3s ease;
        position: relative;
        -webkit-box-shadow: 0 3px 9px rgba(0, 0, 0, 0.5);
        -webkit-background-clip: padding-box;
        background-clip: padding-box;
        outline: 0;


    }

    .no-padding{
        padding: 0;
    }
    .modal-header h3 {
        margin-top: 0;
        color: #0288d1;
    }



    .modal-default-button {
        float: right;
    }

    .modal-enter {
        opacity: 0;
    }

    .modal-leave-active {
        opacity: 0;
    }

    .modal-enter .modal-container,
    .modal-leave-active .modal-container {
        -webkit-transform: scale(1.1);
        transform: scale(1.1);
    }

    .modal-description{
        padding: 20px 5px;
    }



    .modal-container {
        position: relative;
        width: auto;
        margin: 10px;
    }

    .modal-backdrop {
        position: fixed;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        z-index: 1040;
        background-color: #000000;
    }
    .modal-backdrop.fade {
        opacity: 0;
        filter: alpha(opacity=0);
    }
    .modal-backdrop.in {
        opacity: 0.5;
        filter: alpha(opacity=50);
    }

    .modal-scrollbar-measure {
        position: absolute;
        top: -9999px;
        width: 50px;
        height: 50px;
        overflow: scroll;
    }

    .modal-padding {
        padding: 20px;
    }

    .modal-container.modal-blank{
        padding:0;
        box-shad0w: none;
    }


    .clearfix:before,
    .clearfix:after,
    .modal-header:before,
    .modal-header:after,
    .modal-footer:before,
    .modal-footer:after {
        content: " ";
        display: table;
    }
    .clearfix:after,
    .modal-header:after,
    .modal-footer:after {
        clear: both;
    }

    .modal-container button.close.icon {
        position: absolute;
        top: 15px;
        right: 20px;
        font-size: 16px;
        opacity: .3;
        padding: 10px 15px;
    }

    @media (max-width: 768px) {
        .modal-container button.close.icon {
            top: 0;
            right: 10px;
        }

    }
    @media (max-width: 600px) {

        .modal-container {
            margin: 10px 10px;
            padding: 10px 10px;
            border-radius: 2px;

        }

        .modal-body {
            padding: 0px;
        }
        .modal-padding {
            padding: 0px;
        }

    }
    @media (min-width: 768px) {
        .modal-container {
            width: 600px;
            margin: 30px auto;
        }
        .modal-content {
            -webkit-box-shadow: 0 5px 15px rgba(0, 0, 0, 0.5);
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.5);
        }
        .modal-sm {
            width: 300px;
        }
        .modal-padding {
            padding: 10px;
        }


    }
    @media (min-width: 992px) {
        .modal-xl{
            width: 100%;
        }
        .modal-lg {
            width: 800px;
        }
        .modal-padding {
            padding: 15px;
        }
    }

    @media (min-width: 1260px) {
        .modal-xl {
            margin-left: auto;
            margin-right: auto;
            width: 1200px;
        }
    }


</style>