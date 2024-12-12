<template>


  <div class="section-content pt-4" :class="{'mt-10' : $vuetify.breakpoint.xs , 'mt-n3' : $vuetify.breakpoint.sm}">
    <div class="primary-section-content1">
      <hb-header class="pt-5" fewer-actions>
        <template v-slot:left>
          <hb-page-header title="Worker Jobs"></hb-page-header>
        </template>
      </hb-header>
      <div class="content-view">
        <v-tabs>
          <v-tab
            v-for="status in job_statuses"
            :key="status"
            :href="'#tab-' + status"
            @change="getJobs(status)"
          >
            {{ status }}
          </v-tab>
        </v-tabs>

        <v-row v-if="jobs.length">
          <v-col cols="12">
            <v-data-table
              :headers="headers"
              single-expand
              show-expand
              :expanded.sync="expanded"
              item-key="id"
              :items="jobs"
              disable-pagination
              hide-default-footer
              class="hb-data-table hb-data-table-cursor-on bordered-table"
            >
              <template v-slot:item.processedOn="{ item }">
                {{ item.processedOn | formatDateTime }}
              </template>
              <template v-slot:item.opts="{ item }">
                Attempts: {{ item.opts.attempts }}<br />
                Delay: {{ item.opts.delay }}
              </template>
              <template v-slot:item.finishedOn="{ item }">
                {{ item.finishedOn | formatDateTime }}
              </template>
              <template v-slot:item.timestamp="{ item }">
                {{ item.timestamp | formatDateTime }}
              </template>

              <template v-slot:item.actions="{ item }">
                <hb-btn v-if="active_status !== 'completed' && active_status !== 'active'" @click="retryJob(item)"  color="primary">Retry</hb-btn>&nbsp;
                <hb-btn @click="deleteJob(item)"  color="secondary">Delete</hb-btn>
              </template>


              <template v-slot:expanded-item="{ headers, item }">
                <td :colspan="headers.length" class="pr-10 pl-10 pt-10 pb-10 colored-bg" >

                    <h2>Data</h2>
                    <pre class="pa-5 pre-formatting">{{JSON.stringify(item.data, null, 4) }}</pre>
                    <br /><br />
                    <h2>Options</h2>
                    <pre class="pa-5 pre-formatting">{{JSON.stringify(item.opts, null, 4) }}</pre>
                    <br /><br />
                    <hb-btn @click="loadLogs(item)" color="secondary">Load Logs</hb-btn>

                </td>
              </template>


            </v-data-table>
          </v-col>
        </v-row>


      </div>
    </div>

  </div>

</template>

<script type="text/babel">
    import moment from 'moment';
    import api from '../../assets/api.js';
    import CompanySelector from '../includes/CompanySelector.vue';
    import PropertySelector from '../includes/PropertySelector.vue';
    import HbDatePicker from '../assets/HummingbirdDatepicker';
    export default {
        name: "CompanyIndex",
        data() {
            return {
                expanded: [],
                headers: [
                    {text: 'ID', value: 'id'},
                    {text: 'Name', value: 'name'},
                    {text: 'Progress', value: 'progress'},
                    {text: 'Processed On', value: 'processedOn'},
                    {text: 'Finished On', value: 'finishedOn'},
                    {text: 'Return Value', value: 'returnvalue'},
                    {text: 'Attempts', value: 'attemptsMade'},
                    {text: 'Timestamp', value: 'timestamp'},
                    {text: 'Actions', value: 'actions'},
                ],
                job_statuses: ["active", "waiting", "delayed", "completed"],

                jobs:[],
                logs: [],
                loading: false,
                selected: {},
                dialog: false,
                last_timestamps: {
                    active: '',
                    waiting: '',
                    delayed: '',
                    completed: '',
                },
                active_status: 'active',
                interval: {}
            }
        },
        filters:{
            formatDateTime(item){
              if (!item) return;
              return moment(item).format('MM/DD/YYYY HH:mm:ss')
            }
        },

        async created(){

          this.interval = setInterval(async() => {
              await this.getJobs(this.active_status);
           }, 1000)
        },
        beforeDestroy(){
            clearInterval(this.interval);
        },
        computed:{
            table_data(){
                return [this.data];
            }
        },
        components: {
            CompanySelector,
            PropertySelector,
            HbDatePicker
        },
        methods:{
            async getJobs(status){

                if(status !== this.active_status){
                    this.jobs = [];
                    this.last_timestamps[this.active_status] = '';
                };
                this.active_status = status || this.active_status;
                let r = await api.get(this, api.JOBS + '?type=' + this.active_status + "&timestamp=" + this.last_timestamps[this.active_status]);
                this.jobs = r.jobs.concat(this.jobs);
                this.last_timestamps[this.active_status] = this.jobs.length ? this.jobs[0].timestamp : this.last_timestamps[this.active_status];

            },
            async loadLogs(job){
                let r = await api.get(this, api.JOBS + 'logs/' + job.id );
                this.logs = r.logs;
            },

            async retryJob(job){
                let r = await api.post(this, api.JOBS + 'retry/' + job.id );
            },

            async deleteJob(job){
                let r = await api.delete(this, api.JOBS, job.id);
            }

        }
    }

</script>
<style scoped>
  .login-box img{
    width: 100%;
  }
  .colored-bg{
    background: #F9FAFB
  }
  .colored-bg .subtable-header{
    /*color: white;*/
  }
  .pre-formatting{
    background: #f5f5f5; border: 1px solid #e2e2e2;
  }
</style>




