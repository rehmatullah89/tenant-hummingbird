var Rounding = require('../../modules/rounding.js');

module.exports = {
	run(){
		it("should return the decimal part of a number", function() {
			let number = 12.655;
			let decimalValue = Rounding.getDecimalPart(number);
			expect(decimalValue).toBe(0.655);
		});

		it("should round up to the nearest integer if the decimal part is greater than 0.50", function() {
			let number = 12.655;
			let roundedValue = Rounding.upHalf(number);
			expect(roundedValue).toBe(13);
		});

		it("should round to the nearest half value if the decimal part is less than or equal to 0.50", function() {
			let number = 12.3;
			let roundedValue = Rounding.upHalf(number);
			expect(roundedValue).toBe(12.5);
		});

		it("should round up to the next integer", function() {
			let number1 = 12.1;
			let number2 = -12.8;
			let roundedValue1 = Rounding.upFull(number1);
			let roundedValue2 = Rounding.upFull(number2);
			expect(roundedValue1).toBe(13);
			expect(roundedValue2).toBe(-12);
		});

		it("should round down to the previous integer if the decimal part is less than 0.50 or round to the nearest half value", function() {
			let number1 = 12.01;
			let number2 = 12.61;
			let roundedValue1 = Rounding.downHalf(number1);
			let roundedValue2 = Rounding.downHalf(number2);
			expect(roundedValue1).toBe(12);
			expect(roundedValue2).toBe(12.5);
		});

		it("should round down to the nearest integer", function() {
			let number1 = 12.8;
			let number2 = -12.8;
			let roundedValue1 = Rounding.downFull(number1);
			let roundedValue2 = Rounding.downFull(number2);
			expect(roundedValue1).toBe(12);
			expect(roundedValue2).toBe(-13);
		});

		it("should round to the nearest half value of the number", function() {
			let number1 = 12.20;
			let number2 = 12.25;
			let number3 = 12.75;
			let nearestNumber1 = Rounding.nearestHalf(number1);
			let nearestNumber2 = Rounding.nearestHalf(number2);
			let nearestNumber3 = Rounding.nearestHalf(number3);
			expect(nearestNumber1).toBe(12);
			expect(nearestNumber2).toBe(12.5);
			expect(nearestNumber3).toBe(13);
		});

		it("should round to the nearest full value of the number", function() {
			let number1 = 12.25;
			let number2 = 12.5;
			let nearestNumber1 = Rounding.nearestFull(number1);
			let nearestNumber2 = Rounding.nearestFull(number2);
			expect(nearestNumber1).toBe(12);
			expect(nearestNumber2).toBe(13);
		});

		it("should return undefined if value or type is not provided", function() {
			let result = Rounding.convert();
			expect(result).toBeUndefined();
		
			result = Rounding.convert({ value: 12 });
			expect(result).toBeUndefined();
		
			result = Rounding.convert({ type: 'up_half' });
			expect(result).toBeUndefined();
		});
		
		it("should set the rounding functions correctly", function() {
			Rounding.setRoundingFunctions();
			expect(Rounding.ROUND_FUNCTIONS).toBeDefined();
			expect(Rounding.ROUND_FUNCTIONS.up_half).toBeDefined();
			expect(Rounding.ROUND_FUNCTIONS.up_full).toBeDefined();
			expect(Rounding.ROUND_FUNCTIONS.down_half).toBeDefined();
			expect(Rounding.ROUND_FUNCTIONS.down_full).toBeDefined();
			expect(Rounding.ROUND_FUNCTIONS.nearest_half).toBeDefined();
			expect(Rounding.ROUND_FUNCTIONS.nearest_full).toBeDefined();
		});
		
		it("should join rounding data correctly", function() {
			let roundingData = { round_type: 'up', dollar_type: 'half' };
			let round = Rounding.joinData(roundingData);
			expect(round).toBe('up_half');
		
			roundingData = { round_type: 'down', dollar_type: 'full' };
			round = Rounding.joinData(roundingData);
			expect(round).toBe('down_full');
		
			round = Rounding.joinData(null);
			expect(round).toBeNull();
		});
		
		it("should split rounding data correctly", function() {
			let round = 'up_half';
			let roundingData = Rounding.splitData(round);
			expect(roundingData).toEqual({ round_type: 'up', dollar_type: 'half' });
		
			round = 'down_full';
			roundingData = Rounding.splitData(round);
			expect(roundingData).toEqual({ round_type: 'down', dollar_type: 'full' });
		
		});
		
		it("should round a number with the specified precision", function() {
			let number = 12.3456789;
			let roundedValue = Rounding.round(number, 2);
			expect(roundedValue).toBe(12.35);
		
			roundedValue = Rounding.round(number, 4);
			expect(roundedValue).toBe(12.3457);
		
			roundedValue = Rounding.round(number, 0);
			expect(roundedValue).toBe(12);
		});
	}
}