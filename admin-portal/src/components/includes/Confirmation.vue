<template>

    <div @click="dismiss" class="confirmation" :class="{show: showConfirmation}">
        <div class="message-holder">
            <div class="message">
                {{message}}
            </div>
            <button class="w-button secondary-btn btn-sm" v-show="can_undo" @click.stop="undoAction">Undo</button>
        </div>
    </div>

</template>

<script type="text/babel">
    import Status from '../includes/Messages.vue';
    import Loader from '../assets/CircleSpinner.vue';
    import api from '../../assets/api.js';
    import { EventBus } from '../../EventBus.js';
    import { mapGetters } from 'vuex';
    export default {
        name: 'Confirmation',
        data: function(){
            return {

            }
        },
        filters:{

        },
        computed: {
            ...mapGetters({
                showConfirmation: 'confirmationStore/showConfirmation'
            })
        },
        created(){
        },
        methods:{

            dismiss(){
                this.$store.dispatch('confirmationStore/clearConfirmation');
            },
            undoAction(){


                api.get(this, api.ACTIVITY + this.activity_id + '/undo').then(r => {
                    EventBus.$emit('undo_' + r.c);
                    this.$store.dispatch('confirmationStore/clearConfirmation');
                })
            }
        },

        props: ['message', 'activity_id', 'can_undo']
    }


</script>

<style scoped>
    .message{
        display: inline-block;
        padding-right: 50px;
    }
    
    .message-holder{
        display: flex;
        align-items:center;
        justify-content: space-between;

    }
    .confirmation{
        position: fixed;
        width: 450px;
        z-index:999999;
        color: white;
        box-shadow: 2px 2px 4px 0px #222;
        padding: 15px;
        background-color: #263238;

        /*visibility: hidden; !* Hidden by default. Visible on click *!*/
        min-width: 300px; /* Set a default minimum width */
        text-align: center; /* Centered text */
        border-radius: 2px; /* Rounded borders */
        left: 20px; /* Center the snackbar */
        bottom: -50px; /* 30px from the bottom */
        opacity: 0;

        transition: all 1s;
        transition-timing-function: cubic-bezier(0, 1, 0.5, 1);

    }

    .confirmation.show {
        /*visibility: visible;*/
        transform: translateY(-70px);
        opacity: 1;
    }


    .confirmation .close.icon{
        position: absolute;
        right: 0px;
        top: 0px;
        padding: 15px 20px;
        cursor: pointer;
        color: white;
        opacity:.5;
    }




</style>