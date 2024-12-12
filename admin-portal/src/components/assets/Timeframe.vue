<template>
    <div>

        <dropdown-confirmation
                size="lg"
                direction="left"
                triggerBtnClass="btn-clear"
                triggerBtnHtml=' <i class="fa fa-sliders"></i>&nbsp;&nbsp;Filter'
                confirmBtnClass="btn-primary"
                confirmBtnHtml='<i class="fa fa-check"></i>&nbsp;&nbsp;OK'

                hasEmpty
                alertMode
        >
            <slot>
                <div>
                    <span class="timeframe-label">
                        <label>Timeframe:</label>
                    </span>

                    <div class="timeframe-chooser text-right" v-show="value.timeframe != 'Custom' && timeframes">
                        <dropdown class="float-right" :list="timeframes" hasEmpty v-model="value.timeframe"></dropdown>
                    </div>

                    <div class="date-picker-form-control" v-show="value.timeframe == 'Custom' || !timeframes">
                        <datepicker
                                v-model="value.start"
                                name="start_begin"
                                input-class="form-control"
                                format="MM-dd-yyyy"
                                :highlighted="todaysDate"
                                placeholder="Start"
                        ></datepicker>
                    </div>
                    <div class="date-picker-form-separator" v-show="value.timeframe == 'Custom' || !timeframes">
                        -
                    </div>
                    <div class="date-picker-form-control" v-show="value.timeframe == 'Custom' || !timeframes">
                        <datepicker
                                v-model="value.end"
                                name="start_end"
                                input-class="form-control"
                                placeholder="End"
                                format="MM-dd-yyyy"></datepicker>
                    </div>

                    <div class="date-picker-form-separator" v-show="value.timeframe == 'Custom' || !timeframes">
                        <i class="fa fa-remove" @click="resetValues"></i>
                    </div>
                </div>

                <button class="bottom btn btn-sm btn-clear" @click="resetAll">Reset Values</button>

            </slot>
        </dropdown-confirmation>



    </div>

</template>
<script>
    import Dropdown from '../assets/Dropdown.vue';
    import DropdownConfirmation from '../assets/DropdownConfirmation.vue';
    import Datepicker from 'vuejs-datepicker';

    export default {
        name: "TimeFrame",
        data() {
            return {
                todaysDate:{
                    to: new Date().setHours(23,59,59,999),
                    from: new Date().setHours(0,0,0,0)
                },
            }
        },
        components:{
            DropdownConfirmation,
            Dropdown,
            Datepicker
        },
        computed:{},
        methods:{
            resetValues(){
                this.value.end = '';
                this.value.start='';
                this.value.timeframe = '';
            },
            resetAll(){
                this.value.end = '';
                this.value.start='';
                this.value.timeframe = '';
            }
        },
        props: {
            value:{
                type: Object,
                required: true
            },
            timeframes:{
                type: Array,
                required: false
            },
        }
    }
</script>
<style>
    .timeframe-label{
        display: inline-block;
        width: 85px;
        padding-top: 10px;
        vertical-align: middle;
        margin-top: 10px;

    }
    .date-picker-form-separator{
        padding-top: 10px;
        width: 15px;
        display: inline-block;
        vertical-align: middle;
        text-align: center;
    }

    .timeframe-chooser{
        vertical-align: middle;
        margin-top: 10px;
        display: inline-block;

    }
    .date-picker-form-control {
        width: 115px;
        display: inline-block;
        position: relative;
        vertical-align: middle;
        margin-top: 10px;
    }
    .bottom {
        position: absolute;
        bottom: 20px;
        left: 20px;
    }
    .timeframe-chooser {
        vertical-align: middle;
        margin-top: 10px;
        display: inline-block;
    }
</style>