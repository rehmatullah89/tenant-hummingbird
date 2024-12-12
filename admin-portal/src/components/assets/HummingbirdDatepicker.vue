<template>

    <v-menu
            v-model="menu"
            :close-on-content-click="false"
            :nudge-right="40"
            transition="scale-transition"
            offset-y
            min-width="290px"
    >
        <template v-slot:activator="{ on }">

            <v-text-field
              :hide-details="message && !message.length"
              :value="date | formatDateServices"
              :clearable="!!clearable"
              readonly
              backgroundColor="white"
              v-on="on"
              :single-line="singleLine"
              outlined
              :error-messages="message"
              dense
              placeholder="MM/DD/YYYY"
              @click:clear="setValue(null)"
              :class="{'pt-1': todo, 'adjust-label': adjustLabel}"
              @click="$emit('clicked')"
            >
                <template v-slot:prepend v-if="prepend_icon">
                    <v-icon :class="[defaultValue === false ? 'pt-1': '']" color="#757575">mdi-calendar-blank</v-icon>
                </template>
                <template v-slot:prepend-inner v-else>
                    <v-icon >mdi-calendar-blank</v-icon>
                </template>
            </v-text-field>
              <!-- :class="{'pt-1': todo}"
            ></v-text-field> -->
            {{errors.first('hb-date-picker')}}
        </template>
        <v-date-picker
          no-title
          backgroundColor="white"
          v-model="date"
          @change="setValue"
          show-current
          :max="max ? max : ''"
          :min="min ? min : ''"
        >
        </v-date-picker>

    </v-menu>
</template>

<script type="text/babel">
    import moment from 'moment';
    export default {
        name: 'HummingBirdDatepiker',
        components: {},
        data: (vm) => ({
            menu: false,
            date: '',
            dateFormatted: vm.formatDate(new Date().toISOString().substr(0, 10)),
        }),
        props: ["value", "label", "clearable", 'error', 'message', 'dense', "min", 'max', 'default_today', 'placeholder', 'solo','flat', 'prepend_icon','todo','change', 'singleLine', 'adjustLabel'],
        filters: {
            formatDateOnly: function(value) {
                let date = null
                if(value){
                    date = moment(value).format('MM/DD/YYYY');
                }
                return date;
            }
        },
        mounted(){
            if(this.value){
                this.date = moment(this.value).format('YYYY-MM-DD');
                //this.date = moment(this.value).toDate().toISOString().substr(0, 10);
            } else if (this.default_today){
                this.date = this.currentDate;
            }
            this.$forceUpdate();
            //var now = moment().add(1, 'day').startOf('day').toDate();
        },
        computed:{
            defaultValue () {
                if(this.solo === false) return this.solo;
                return true;
            },
            computedDateFormatted () {
                if(!this.date) return;
                return this.formatDate(this.date);
            },
            currentDate(){
              return new Date().toISOString().substr(0, 10);
            },
        },
        methods:{
            formatDate (date) {
                if (!date) return null;
                const [year, month, day] = date.split('-')
                return `${month}/${day}/${year}`
            },
            setValue(value){
                this.menu = false;

                // when user clear input it will remove value from date picker
                let newDate = ''
                if(value){
                    newDate = moment(value).format('YYYY-MM-DD')
                }
                this.$emit('input', newDate);
                this.$emit('change');
            },
        },
        watch: {
            value(){
                if(this.value) {
                    this.date = moment(this.value).format('YYYY-MM-DD');
                } else {
                    this.date = '';
                }
            },
            message(){
                if(this.date){
                    this.message = '';
                }
            }
        }
        // date (val) {
        //     this.dateFormatted = this.formatDate(this.date)
        // },
    }
</script>
<style scoped>
  .v-text-field--outlined.v-input--dense .v-label{
    top: 2px;
  }
  .v-input .v-label{
    margin-top: 0;
    height: auto;
    line-height: 25px;
}
</style>
