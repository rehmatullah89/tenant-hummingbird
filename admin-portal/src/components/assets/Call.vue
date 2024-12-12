<template>
    <div class="call-notification" :style="styleObj" :class="[isMinimized ? minimized : '', callStatus]">
        <!--<audio ref="ringer" src="/audio/modern_ringtone.mp3" loop></audio>-->

        <div @click="dismiss" class="close icon "></div>
        <div v-show="!isMinimized" @click="isMinimized = true" class="close icon left"></div>
        <div v-show="isMinimized" @click="isMinimized = false" class="close icon left"></div>
        <img src="/img/calling-icon.jpg" />
        <br v-show="!isMinimized" />
        <br v-show="!isMinimized" />

        <div v-if="caller.first">
            <label>Incoming Call From:</label>
            <h2 class="call-notification-heading">{{ caller.first }} {{ caller.last }}</h2>
            <router-link v-show="!isMinimized" tag="button" :to="'/contacts?id=' + caller.id" class="w-button secondary-btn">Go to Contact</router-link>
        </div>
        <div v-else-if="callers.length">
            <h2 class="call-notification-heading">Incoming Call. Multiple callers found:</h2>
            <p @click="caller = c " v-for="c in callers">{{ c.first }} {{ c.last }}</p>
        </div>

        <div v-else>
            <h2 class="call-notification-heading">Incoming Call</h2>
            <p>Unknown Caller</p>

            <button @click="$emit('newlead')" v-show="!isMinimized" class="w-button secondary-btn">Enter New Lead</button>
        </div>
        <br v-show="!isMinimized" />
        <div v-show="!isMinimized">
            {{callStatus}}
        </div>
        <br v-show="!isMinimized" />
        <!--<button class="w-button primary-btn" @click="stopRingingPhone" v-show="!isMinimized">Answer Call</button>&nbsp;&nbsp;&nbsp;&nbsp;-->
        <!--<button class="w-button tertiary-btn" @click="dismiss" v-show="!isMinimized">Dismiss</button>-->

    </div>
</template>

<script type="text/babel">

    export default {
        name: 'CallWindow',
        data: function(){
            return {
                caller: {},
                callers: [],
                callStatus: 'ringing',
                i: 0,
                styleObj: {
                    top: '20px',
                    left: '20px'
                },
                isMinimized: false
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
        mounted(){

            this.caller = JSON.parse(JSON.stringify(this.info.contact));
            this.callers = this.info.contacts;
            this.callStatus = this.info.callStatus;
            this.i = this.index;

            this.styleObj.top = (this.i + 1) * 20 + 'px';
            this.styleObj.left = (this.i + 1) * 20 + 'px';

            this.ringPhone();

        },
        methods:{

            dismiss(){
                this.callStatus = 'dismissed';
                this.$store.dispatch('callStore/closeCallWindow', this.i);
                // make API call to dismiss
            },
            close(){

                this.$store.dispatch('callStore/closeCallWindow', this.i);
            },

            ringPhone(){
            //    this.$refs.ringer.play();
            },
            stopRingingPhone(){
            //    this.$refs.ringer.pause();
            }
        },
        watch:{
            info: {
                handler: function (info, oldInfo) {
                    if(info.callStatus != 'ringing'){
                        this.stopRingingPhone();
                    }
                    this.callStatus = info.callStatus;
                },
                deep: true
            },
            index(index){
                this.i = index;
            },
            isMinimized(newVal){
                if(!newVal){
                    this.styleObj.top = (this.i + 1) * 20 + 'px';
                    this.styleObj.left = (this.i + 1) * 20 + 'px';
                    this.styleObj.bottom = 'auto';
                } else {
                    this.styleObj.top = 'auto';
                    this.styleObj.left = (this.i )  * 305 + 'px';
                    this.styleObj.bottom = 0;


                }

            }

        },


        props: ['info', 'index']
    }


</script>

<style scoped>
    .call-notification .close.icon{
        position: absolute;
        top: 10px;
        color: #cccccc;
        right: 10px;
        cursor: pointer;
    }

    .call-notification .close.icon.left{
        right: 30px;
    }

    .call-notification.minimized img{
        float: left;
        margin-right:15px;
    }
    .call-notification.minimized .call-notification-heading{
        margin: 0;
    }
    .call-notification{
        background: #FFF;
        border: 2px solid #00b2ce;
        text-align: center;
        padding: 25px;
        position: fixed;
        margin: 10px;
        box-shadow: 3px 3px 10px 0px #bbbbbb;
        z-index: 999999;
        width: 500px;
    }

    .call-notification.completed{
        border: 2px solid #545454;
    }
    .call-notification.in-progress{
        border: 2px solid rgba(0, 184, 148,1)
    }
    .call-notification.no-answer{
        border: 2px solid rgba(217, 30, 24, 1);
    }

    .call-notification.minimized {
        padding: 15px;
        width: 400px;
        text-align: left;
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

    .call-notification.minimized{

    }


</style>
