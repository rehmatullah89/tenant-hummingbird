
const { Workflow } = require(__dirname + '/../modules/workflow_manager.js');
var AuctionRoutines = require(__dirname + '/../routines/auction.js');

var AuctionWorkFlows = {

    async auction_day_routine(job, wm){
        console.log("auction_day_routine: ", job.data);

        try{
            let data = await AuctionRoutines.auctionDayRoutine(job.data);
            //await wm.continueWorkflow(job, data);   
        } catch(err){
            job.data.msg = err.toString();
            console.log("auction_day_routine error function", job.data);
            await wm.error(job);
        }
    }
}


module.exports = {
    auction_day_routine: async(job, wm) => {
		return await AuctionWorkFlows.auction_day_routine(job, wm);
    },
};