var express = require('express');
var router = express.Router();
var moment      = require('moment');
var settings    = require(__dirname + '/../config/settings.js');
var control    = require(__dirname + '/../modules/site_control.js');
var response = {};

var Promise = require('bluebird');

module.exports = function(app) {

    router.get('/',  function(req, res, next) {
        res.render('calendar/index', {
            nav: 'calendar'
        });
    });


    router.post('/get-triggers', function(req, res) {

        /*
        var conditions = {
            start: {
                gt: req.body.start,
                lt: req.body.end
            }
        };
        var include = [];
        switch(req.body.source){
            case 'candidates':
                conditions.candidate_id = req.body.id;
                // TODO  Should we constrain by Agent?  If so, add agent id here
                break;
            case 'agents':
                conditions.agent_id = req.body.id;
                break;
            case 'companies':
                conditions.company_id = req.body.id;
                break;
            case 'jobs':
                conditions.job_id = req.body.id;
                break;
        }

        if(req.body.status == 'all'){
            conditions.status = {ne: 'unavailable'};
        } else {
            conditions.status = req.body.status;
            include = [
                {   model: models.Candidate,
                    include: [{
                        model: models.User
                    }]},
                {   model: models.Agent,
                    include: [{
                        model: models.User
                    }]},
                {   model: models.Contact },
                {   model: models.Company },
                {   model: models.triggerType },
                {   model: models.Job,
                    include: [{
                        model: models.Company
                    }]
                }
            ];
        }


        models.trigger.findAll({
            where: conditions,
            include: include

        }).success(function(triggers) {
            res.send(triggers);
        });
        */
    });


    return router;


};
