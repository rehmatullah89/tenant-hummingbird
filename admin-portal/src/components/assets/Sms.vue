<template>
    <div class="sms-notification" :style="styleObj" :class="smsStatus" v-if="sms.Contact">

        <div @click="dismiss" class="close icon "></div>
        <div class="sms-header">
            <h2>{{sms.Contact.first}} {{sms.Contact.last}}</h2>

            {{sms.Contact.Phones[0].type }}: {{sms.Contact.Phones[0].phone | formatPhone}}<br />
            Email: {{sms.Contact.email}} <br /><br />

            <span class="preview" v-html="$options.filters.nl2br(sms.Thread[0].content)">
            </span>
        </div>

        <div style="text-align: left;" >
            <button @click="goToChat" class="w-button btn-sm primary-btn">Go To Chat</button>
        </div>

    </div>
</template>

<script type="text/babel">

    import Status from '../includes/Messages.vue';
    import Loader from '../assets/CircleSpinner.vue';
    import moment from 'moment';
    import api from '../../assets/api.js';
    import { EventBus } from '../../EventBus.js';
    export default {
        name: 'SMSWindow',
        data: function(){
            return {
                sms: {},
                i: 0,
                smsStatus: '',
                styleObj: {
                    top: '20px',
                    left: '20px'
                },
                threadStyle:{
                    maxHeight: '300px',

                },
                content: '',
            }
        },
        filters:{
            showLeaseStatus(status){
                switch(status){
                    case 1:
                        return 'Active';
                        break;
                    case 2:
                        return 'Pending';
                        break;
                }
            }
        },
        created(){
            EventBus.$on('contact_updated', this.checkContact);

        },
        destroyed(){
            EventBus.$off('contact_updated', this.checkContact);
        },
        mounted(){
            this.i = this.index;
            this.styleObj.top = (this.i + 1) * 20 + 'px';
            this.styleObj.left = (this.i + 1) * 20 + 'px';
            this.getSMSDetails();

        },
        methods:{
            goToChat(){
                this.$router.push('/chats?id=' + this.sms.id);
                this.dismiss();
            },
            shouldShowSender(message, i){
                if(i < 1 ) return true;
                if(this.sms.Thread[i - 1].Contact.id !== message.Contact.id) return true;
                return false;
            },

            getSMSDetails(){
                api.get(this, api.MAINTENANCE  + this.info).then(r => {
                    //r.maintenance.Thread = r.maintenance.Thread.reverse();
                    this.sms = r.maintenance;
                });
            },
            checkContact(contact_id){
                if(contact_id == this.sms.Contact.id){
                    this.getSMSDetails();
                }
            },
            dismiss(){
                this.callStatus = 'dismissed';
                this.$store.dispatch('callStore/closeSMSWindow', this.i);
                // make API call to dismiss
            },
            close(){
                this.$store.dispatch('callStore/closeSMSWindow', this.i);
            },

            sendResponse(){
                var data = {
                    content: this.content
                }
                api.post(this, api.MAINTENANCE  + this.sms.id + '/sms_message', data).then(r => {
                    this.content = '';
                    this.getSMSDetails();
                });
            },
        },
        watch:{
            info(){
                this.getSMSDetails();
            },
            update(update){
               if(update){
                   this.getSMSDetails();
                   this.$store.dispatch('callStore/resetSmsUpdate', this.info);
               }
            },
            index(index){
                this.i = index;
            }

        },


        props: ['info', 'index', 'update']
    }


</script>

<style scoped>


    .sms-header{
        text-align: left;
        border-bottom: 1px solid #e2e2e2;
        padding: 0 0 20px;
        margin-bottom: 20px;


    }

    .sms-header h2{
        font-size: 22px;
        margin: 0;
    }

    .sms-thread{
        overflow: scroll;
    }

    .sms-message{
        margin: 0px 0 5px 0;
        display: flex;
        text-align: left;
        width: 100%;
        align-items: center;
    }

    .sms-message .message-sender{
        margin: 0 0 10px;
        color: #a0a0a0;
    }

    .sms-message .message{
        text-align: left;
        display: flex;
        -webkit-border-radius: 10px;
        -moz-border-radius: 10px;
        border-radius: 10px;
        padding: 10px;
        background: #00b2ce;
        color: white;

    }

    .sms-message.admin{
        flex-direction: row-reverse;
    }

    .sms-message.admin .message{
        color: #333;
        background: #f5f7f8;
        max-width: 66%;
    }




    .sms-header h2{
        font-size: 16px;
        color: #00b2ce;
        margin: 0 0 5px;
    }
    .sms-notification .close.icon{
        position: absolute;
        top: 10px;
        color: #cccccc;
        right: 10px;
        cursor: pointer;
    }

    .sms-notification .close.icon.left{
        right: 30px;
    }

    .sms-notification{
        background: #FFF;
        border: 1px solid #00b2ce;
        text-align: center;
        padding: 25px;
        position: fixed;
        margin: 10px;
        box-shadow: 3px 3px 10px 0px #bbbbbb;
        z-index: 999999;
        width: 500px;
    }

    .sms-notification.completed{
        border: 2px solid #545454;
    }

    .sms-notification.no-answer{
        border: 2px solid rgba(217, 30, 24, 1);
    }


    .call-notification-heading{
        color: #00b2ce;
        font-weight: 500;
        font-size: 21px;
        margin: 5px 0 25px 0;
        text-transform: capitalize;
    }
    .info-container{
        text-align: left;
    }

    .chat-actions{
        float: right
    }
    .sms-response{
        padding: 20px;
        border: 1px solid #e2e2e2;
        margin-top: 20px;
        text-align: left;
        background: #f5f7f8;
    }

    .sms-time {
        float: left;
        padding: 10px;
        color: #a0a0a0;
    }
    span.preview {
        background: #f4f4f4;
        display: block;
        padding: 16px 20px;
        font-style: italic;
    }
    @media (max-width: 767px) {
        .sms-notification{
            right: 20px;
            width: auto;
        }
    }


</style>