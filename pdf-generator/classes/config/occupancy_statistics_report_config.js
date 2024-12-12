module.exports = function  returnConfig(standardStorage, parking, report){

    let data = [];
    let count = 1
    let row;
    let Rows = [ {groups: {}, summary: report.summary} ];

    if(report.groups.storage){
        Rows[0].groups["standard_storage"] = {
            type: 'storage',
            size: "Standard Storage",
            istitle: true
        };
    
        let storageGroups = Object.entries(report.groups.storage.groups);
        for(row = 0; row < storageGroups.length; row++){
            let [ key, value] = storageGroups[row];
            value.summary.isBorder = true;
            value.summary.size = count++ + '. ' + key;
            Rows[0].groups["row" + row] = value.summary;
        }
    
        report.groups.storage.summary.isBorder = true;
        report.groups.storage.summary.isfooter = true
        report.groups.storage.summary.size = "                                                                                                         Subtotal";
        Rows[0].groups["standard_storage_subtotal"] = report.groups.storage.summary;
    }

    if(report.groups.parking){
        Rows[0].groups["parking"] = {
            type: 'parking',
            size: "Parking",
            istitle: true
        };
    
        let parkingGroups = Object.entries(report.groups.parking.groups);
        for(let j = 0; j < parkingGroups.length; j++){
            let [ key, value] = parkingGroups[j];
            value.summary.isBorder = true;
            value.summary.size = count++ + '. ' + key;
            Rows[0].groups["row" + row] = value.summary;
            row++;
        }
    
        report.groups.parking.summary.isBorder = true;
        report.groups.parking.summary.isfooter = true
        report.groups.parking.summary.size = "                                                                                                         Subtotal";
        Rows[0].groups["parking_subtotal"] = report.groups.parking.summary;
    }
    
    report.summary.isBorder = true;
    report.summary.isfooter = true
    report.summary.size = "                                                                                                  Grand Total";
    Rows[0].groups["grande_total"] = report.summary;

    data.push(
        { 
            pos: 'left',
            summary: {
                columns: [
                    {
                        name: "Occupancy Summary",
                        type: 'string',
                        width: 175,
                        key: 'occupancy_name'
                    },
                    {
                        name: "Occ.",
                        type: 'string',
                        width: 30,
                        key: 'occupied'
                    },
                    {
                        name: "Vacant",
                        type: 'string',
                        width: 30,
                        key: 'vacant'
                    },
                    {
                        name: "Offline",
                        type: 'string',
                        width: 30,
                        key: 'offline'
                    },
                    {
                        name: "Total",
                        type: 'string',
                        width: 35,
                        key: 'occupancy_total'
                    },
                    {
                        name: "Revenue",
                        type: 'string',
                        width: 70,
                        key: 'revenue_name'
                    },
                    {
                        name: "",
                        type: 'money',
                        width: 40,
                        key: 'revenue_total'
                    },
                    {
                        name: "%",
                        type: 'string',
                        width: 23,
                        key: 'revenue_percentage'
                    },
                    {
                        name: "",
                        type: 'string',
                        width: 28,
                        key: 'empty'
                    },
                    {
                        name: "Other",
                        type: 'string',
                        width: 85,
                        key: 'other_name'
                    },
                    {
                        name: "",
                        type: 'string',
                        width: 50,
                        key: 'other_total'
                    },
                ],
                    
            },
            columns: [
                {
                    name: "Size/Area Tier",
                    type: 'string',
                    width: 135,
                    key: 'size'
                },
                {
                    key: 'area_per_space',
                    name: "Area per Space",
                    type: 'number',
                    width: 25
                },
                {
                    key: 'total_area',
                    name: "Total Area",
                    type: 'number',
                    width: 24
                },
                {
                    key: 'occupied_units',
                    name: "Occ. Spaces",
                    type: 'number',
                    width: 25
                },
                {
                    key: 'available_units',
                    name: "Vacant Spaces",
                    type: 'number',
                    width: 25
                },
                {
                    key: 'offline_units',
                    name: "Offline Spaces",
                    type: 'number',
                    width: 25
                },
                {
                    key: 'num_spaces',
                    name: "Total Spaces",
                    type: 'number',
                    width: 25
                },
                {
                    key: 'avg_set_rate',
                    name: "Avg Set  Rate¹",
                    type: 'money',
                    width: 28
                },
                {
                    key: 'avg_sell_rate',
                    name: "Avg Sell Rate²",
                    type: 'money',
                    width: 25
                },
                {
                    key: 'avg_rent',
                    name: "  Avg   Rent³",
                    type: 'money',
                    width: 24
                },
                {
                    key: 'gross_potential',
                    name: "Gross Pot.⁴",
                    type: 'money',
                    width: 35
                },
                {
                    key: 'gross_occupied',
                    name: "Gross Occ.⁵",
                    type: 'money',
                    width: 35
                },
                {
                    key: 'actual_occupied',
                    name: "Actual Occ.⁶",
                    type: 'money',
                    width: 35
                },
                {
                    key: 'income_occupancy_pct',
                    name: "Income Occ. %⁷",
                    type: 'percentage',
                    width: 25
                },
                {
                    key: 'space_occupancy_pct',
                    name: "Space Occ. %",
                    type: 'percentage',
                    width: 25
                },
                {
                    key: 'area_occupancy_pct',
                    name: "Area Occ. %",
                    type: 'percentage',
                    width: 21
                },
                {
                    key: 'economic_occupancy_pct',
                    name: "Econ Occ. %⁸",
                    type: 'percentage',
                    width: 30
                },
                {
                    key: 'avg_los_mo',
                    name: "Avg. LOS (MO)⁹",
                    type: 'number',
                    width: 29
                },
            ],
            rows: Rows
        }
    );

    //Adding total row for standard storage
    for(var i = 0; i < standardStorage.length; i++){
        standardStorage[i].summary.isfooter = true;
        standardStorage[i].summary.label =  "                                                                                                                Total";
        standardStorage[i].groups["total"] = standardStorage[i].summary;
    }

    //Adding the dividers for standard storage and parking
    for(var i = 0; i < standardStorage.length; i++){
        for(var element in standardStorage[i].groups){
            standardStorage[i].groups[element]["isBorder"] = true;
        }
    }

    data.push({ 
        pos: 'left',
        summary: {
            columns: [
                {
                    name: "Occupancy Summary",
                    type: 'string',
                    width: 175,
                    key: 'occupancy_name'
                },
                {
                    name: "Occ.",
                    type: 'string',
                    width: 30,
                    key: 'occupied'
                },
                {
                    name: "Vacant",
                    type: 'string',
                    width: 30,
                    key: 'vacant'
                },
                {
                    name: "Offline",
                    type: 'string',
                    width: 30,
                    key: 'offline'
                },
                {
                    name: "Total",
                    type: 'string',
                    width: 35,
                    key: 'occupancy_total'
                },
                {
                    name: "Revenue",
                    type: 'string',
                    width: 70,
                    key: 'revenue_name'
                },
                {
                    name: "",
                    type: 'money',
                    width: 40,
                    key: 'revenue_total'
                },
                {
                    name: "%",
                    type: 'string',
                    width: 23,
                    key: 'revenue_percentage'
                },
                {
                    name: "",
                    type: 'string',
                    width: 28,
                    key: 'empty'
                },
                {
                    name: "Other",
                    type: 'string',
                    width: 85,
                    key: 'other_name'
                },
                {
                    name: "",
                    type: 'string',
                    width: 50,
                    key: 'other_total'
                },
            ],
                
        },
        columns: [
            {
                name: "Size/Area Tier",
                type: 'string',
                width: 135,
                key: 'label'
            },
            {
                key: 'area_per_space',
                name: "Area per Space",
                type: 'number',
                width: 25
            },
            {
                key: 'total_area',
                name: "Total Area",
                type: 'number',
                width: 24
            },
            {
                key: 'occupied_units',
                name: "Occ. Spaces",
                type: 'number',
                width: 25
            },
            {
                key: 'available_units',
                name: "Vacant Spaces",
                type: 'number',
                width: 25
            },
            {
                key: 'offline_units',
                name: "Offline Spaces",
                type: 'number',
                width: 25
            },
            {
                key: 'num_spaces',
                name: "Total Spaces",
                type: 'number',
                width: 25
            },
            {
                key: 'avg_set_rate',
                name: "Avg Set  Rate¹",
                type: 'money',
                width: 28
            },
            {
                key: 'avg_sell_rate',
                name: "Avg Sell Rate²",
                type: 'money',
                width: 25
            },
            {
                key: 'avg_rent',
                name: "  Avg   Rent³",
                type: 'money',
                width: 24
            },
            {
                key: 'gross_potential',
                name: "Gross Pot.⁴",
                type: 'money',
                width: 35
            },
            {
                key: 'gross_occupied',
                name: "Gross Occ.⁵",
                type: 'money',
                width: 35
            },
            {
                key: 'actual_occupied',
                name: "Actual Occ.⁶",
                type: 'money',
                width: 35
            },
            {
                key: 'income_occupancy_pct',
                name: "Income Occ. %⁷",
                type: 'percentage',
                width: 25
            },
            {
                key: 'space_occupancy_pct',
                name: "Space Occ. %",
                type: 'percentage',
                width: 25
            },
            {
                key: 'area_occupancy_pct',
                name: "Area Occ. %",
                type: 'percentage',
                width: 21
            },
            {
                key: 'economic_occupancy_pct',
                name: "Econ Occ. %⁸",
                type: 'percentage',
                width: 30
            },
            {
                key: 'avg_los_mo',
                name: "Avg. LOS (MO)⁹",
                type: 'number',
                width: 29
            },
        ],
        rows: standardStorage
    });
    
    //Adding total row for parking
    for(var i = 0; i < parking.length; i++){
        parking[i].summary.isfooter = true;
        parking[i].summary.label =  "                                                                                                                Total";
        parking[i].groups["total"] = parking[i].summary;
    }

    for(var i = 0; i < parking.length; i++){
        for(var element in parking[i].groups){
            parking[i].groups[element]["isBorder"] = true;
        }
    }

    data.push({ 
        pos: 'left',
        summary: {
            columns: [
                {
                    name: "Occupancy Summary",
                    type: 'string',
                    width: 175,
                    key: 'occupancy_name'
                },
                {
                    name: "Occ.",
                    type: 'string',
                    width: 30,
                    key: 'occupied'
                },
                {
                    name: "Vacant",
                    type: 'string',
                    width: 30,
                    key: 'vacant'
                },
                {
                    name: "Offline",
                    type: 'string',
                    width: 30,
                    key: 'offline'
                },
                {
                    name: "Total",
                    type: 'string',
                    width: 35,
                    key: 'occupancy_total'
                },
                {
                    name: "Revenue",
                    type: 'string',
                    width: 70,
                    key: 'revenue_name'
                },
                {
                    name: "",
                    type: 'money',
                    width: 40,
                    key: 'revenue_total'
                },
                {
                    name: "%",
                    type: 'string',
                    width: 23,
                    key: 'revenue_percentage'
                },
                {
                    name: "",
                    type: 'string',
                    width: 28,
                    key: 'empty'
                },
                {
                    name: "Other",
                    type: 'string',
                    width: 85,
                    key: 'other_name'
                },
                {
                    name: "",
                    type: 'string',
                    width: 50,
                    key: 'other_total'
                },
            ],
                
        },
        columns: [
            {
                name: "Size/Area Tier",
                type: 'string',
                width: 135,
                key: 'label'
            },
            {
                key: 'area_per_space',
                name: "Area per Space",
                type: 'number',
                width: 25
            },
            {
                key: 'total_area',
                name: "Total Area",
                type: 'number',
                width: 24
            },
            {
                key: 'occupied_units',
                name: "Occ. Spaces",
                type: 'number',
                width: 25
            },
            {
                key: 'available_units',
                name: "Vacant Spaces",
                type: 'number',
                width: 25
            },
            {
                key: 'offline_units',
                name: "Offline Spaces",
                type: 'number',
                width: 25
            },
            {
                key: 'num_spaces',
                name: "Total Spaces",
                type: 'number',
                width: 25
            },
            {
                key: 'avg_set_rate',
                name: "Avg Set  Rate¹",
                type: 'money',
                width: 28
            },
            {
                key: 'avg_sell_rate',
                name: "Avg Sell Rate²",
                type: 'money',
                width: 25
            },
            {
                key: 'avg_rent',
                name: "  Avg   Rent³",
                type: 'money',
                width: 24
            },
            {
                key: 'gross_potential',
                name: "Gross Pot.⁴",
                type: 'money',
                width: 35
            },
            {
                key: 'gross_occupied',
                name: "Gross Occ.⁵",
                type: 'money',
                width: 35
            },
            {
                key: 'actual_occupied',
                name: "Actual Occ.⁶",
                type: 'money',
                width: 35
            },
            {
                key: 'income_occupancy_pct',
                name: "Income Occ. %⁷",
                type: 'percentage',
                width: 25
            },
            {
                key: 'space_occupancy_pct',
                name: "Space Occ. %",
                type: 'percentage',
                width: 25
            },
            {
                key: 'area_occupancy_pct',
                name: "Area Occ. %",
                type: 'percentage',
                width: 21
            },
            {
                key: 'economic_occupancy_pct',
                name: "Econ Occ. %⁸",
                type: 'percentage',
                width: 30
            },
            {
                key: 'avg_los_mo',
                name: "Avg. LOS (MO)⁹",
                type: 'number',
                width: 29
            },
        ],
        rows: parking
    });

   return data;
}