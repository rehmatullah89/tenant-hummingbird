const ReversalWorkFlows = {
    async process_reversal(job, wm) {
      try {
        console.log('Process Reversal Workflow data: ', job.data);
        job = wm.initJob(job);
        await ReversalRoutines.process_reversal(job.data);
        await wm.continueWorkflow(job, job.data);
      } catch (err) {
        job.error = err;
        job.data.msg = err.toString();
        job.data.error = err?.stack.toString() || err.toString();
        console.log("process_reversal in workflow error: ", job.data);
        let event_name = ENUMS.LOGGING.PROCESS_REVERSAL;
        if (job.data.event_name) {
          event_name = job.data.event_name
        }
        utils.sendLogs({
          event_name,
          logs: {
            payload: {
              data: job.data,
              stage: `ReversalProcessFailed`
            },
            error: err?.stack || err?.msg || err
          }
        });
        await wm.error(job);
      }
    },
};

module.exports = {
    process_reversal: async (job, wm) => {
      return await ReversalWorkFlows.process_reversal(job, wm);
    },
};

const ReversalRoutines = require('../routines/reversal.js');
const ENUMS = require('../modules/enums');
