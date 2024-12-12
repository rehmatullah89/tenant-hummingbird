"use strict";

var queue =  {
    async updateProgress(job, params) {
        if(!job) return;
        let { total, done } = params;
        await job.updateProgress({
            done,
            total,
            prct: (Math.round(((done) / total) * 1e4) / 1e2)
        });
    }
}

module.exports = queue;