"use strict";

var rounding =  {

    ROUND_FUNCTIONS: null,
    
    getDecimalPart(value) {
      const decimalPart = ((value + '').split('.'))[1];
      return parseFloat(`0.${decimalPart}`);
    },

    upHalf(value) {
      const decimalPart = this.getDecimalPart();
      if(decimalPart > 0.50) {
          return Math.ceil(value);
      } else {
          return Math.trunc(value) + 0.5;
      }
    },

    upFull(value) {
      return Math.ceil(value);
    },

    downHalf(value) {
      const decimalPart = this.getDecimalPart();
      if(decimalPart >= 0.50) {
          return Math.trunc(value) + 0.5;
      } else {
          return Math.floor(value);
      }
    },

    downFull(value) {
      return Math.floor(value);
    },

    nearestHalf(value) {
      return Math.round(value * 2) / 2;
    },

    nearestFull(value) {
      return Math.round(value);
    },

    convert(data) {
      data = data || {};
      let {value, type} = data;

      if(!value || !type) return 
      rounding.setRoundingFunctions();
      return this[rounding.ROUND_FUNCTIONS[type].FUNCTION](value); 
    },

    setRoundingFunctions() {
      const ROUND_OPTIONS = Enums.ROUND;

      const ROUND_FUNCTIONS = {};
      Object.values(ROUND_OPTIONS).map(r => ROUND_FUNCTIONS[r] = {});

      ROUND_FUNCTIONS.up_half = { FUNCTION: 'upHalf' };
      ROUND_FUNCTIONS.up_full = { FUNCTION: 'upFull' };
      ROUND_FUNCTIONS.down_half = { FUNCTION: 'downHalf' };
      ROUND_FUNCTIONS.down_full = { FUNCTION: 'downFull' };
      ROUND_FUNCTIONS.nearest_half = { FUNCTION: 'nearestHalf' };
      ROUND_FUNCTIONS.nearest_full = { FUNCTION: 'nearestFull' };

      rounding.ROUND_FUNCTIONS = ROUND_FUNCTIONS;
    },

    joinData(rounding) {
      let round = null;
      
      if(rounding != null) {
      const { round_type, dollar_type } = rounding; 
      round = `${round_type}_${dollar_type}`;
      }
      
      return round;
    },

    splitData(round) {
      const roundingData = round?.split('_');
      let rounding = null;

      if(roundingData?.length === 2) {
          rounding = {
              round_type: roundingData[0],
              dollar_type: roundingData[1]
          };
      }

      return rounding;
	  },

    round(num, precision = 2) {
        return +(Math.round(num + `e+${precision}`) + `e-${precision}`);
    },
  
    // round(num, p_val = 2) {
    //   var m = Number((Math.abs(num) * (10 ** p_val)).toPrecision(15));
    //   return Math.round(m) / (10 ** p_val) * Math.sign(num);
    // }
}

module.exports = rounding;

var Enums = require(__dirname + '/../modules/enums.js');