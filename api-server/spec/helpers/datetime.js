const Utils = require('../../helpers/datetime');

module.exports = {
	run(){
        it("should convert a date string in the default format to UTC with the default offset", function() {
            let date = "2023-06-13T10:30:00";
            let opts = {
                offset: "+00:00"
            };
            let utcTime = Utils.getUtcTime(date, opts);
            expect(utcTime).toBe("2023-06-13T10:30:00+00:00");
        });

        it("should convert a date string in the specified format to UTC with the specified offset", function() {
            let date = "06/13/2023 10:30:00 AM";
            let opts = {
                format: "YYYY-MM-DDTHH:mm:ss",
                offset: "-05:00"
            };
            let utcTime = Utils.getUtcTime(date, opts);
            expect(utcTime).toBe("2023-06-13T10:30:00");
        });

        it("should convert an ISO date string to UTC with the default offset", function() {
            let date = "2023-06-13T10:30:00Z";
            let opts = {
                isISO: true
            };
            let utcTime = Utils.getUtcTime(date, opts);
            expect(utcTime).toBe("2023-06-13T10:30:00+00:00");
        });

        it("should convert a date string in the default format to UTC with the specified timeZone", function() {
            let date = "2023-06-13T10:30:00";
            let opts = {
            timeZone: "America/New_York"
            };
            let utcTime = Utils.getUtcTime(date, opts);
            expect(utcTime).toBe("2023-06-13T14:30:00+00:00");
        });
    }
}
