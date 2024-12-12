module.exports = {

    property_rate_management: {
        spacegroup_rate_plan_id: {
            label: "Rate plan id",
            key: "spacegroup_rate_plan_id",
            hide: true
        },
        spacegroup_rate_plan_change_type: {
            label: "Price Delta Type",
            key: "spacegroup_rate_plan_change_type",
            hide: true
        },
        spacegroup_rate_plan_name: {
            label: "Selected Rate Plan",
            key: "spacegroup_rate_plan_name",
            header_tool_tip: "Rate Plan: The settings by which Sell Rate is calculated from Set Rate set by occupancy",
            input: 'multi-select',
            width: 245
        },
        spacegroup_rate_management_active: {
            label: "Active",
            key: "spacegroup_rate_management_active",
            input: 'multi-select',
            column_type: "boolean",
            header_tool_tip: "Active: This determines whether a group has a rate plan associated with it or not.",
            width: 90
        },
        spacegroup_default_promotion: {
            label: "Default Promotion",
            key: "spacegroup_default_promotion",
            width: 120,
            header_tool_tip: "Default Promotion: This is the promotion that will be automatically applied to a group when you activate a rate plan to a group. You can apply a different promotion but this is the promotion first applied. ",
        }
    },

    property_rent_management: {
        spacegroup_rent_increase_plans: {
            label: "Rent Increase Plans",
            key: "spacegroup_rent_increase_plans",
            width: 115
        }        
    },    
    
    revenue_management: {
        // *********** Hidden Keys ***********
        spacegroup_id: {
            label: "Space Group ID",
            key: "spacegroup_id",
            hide: true
        },
        spacegroup_id_hash: {
            label: "Space Group ID",
            key: "spacegroup_id_hash",
            hide: true
        },
        spacegroup_category: {
            label: "Category",
            key: "spacegroup_category",
            hide: true
        },
        // *********** *********** ***********

        // *********** Exposed Keys ***********
        spacegroup_size: {
            label: "Group Size/Area Tier",
            key: "spacegroup_size",
            header_tool_tip: "Group Size/Area Tier: The size in square footage of a specific group.", 
            width: 140
        },
        spacegroup_amenities: {
            label: "Group Amenities",
            header_tool_tip: "Group Amenities: The amenities included and available for a specific group. ",
            key: "spacegroup_amenities",
            width: 472
        },
        spacegroup_spacetype: {
            label: "Space Type",
            key: "spacegroup_spacetype",
            input: 'multi-select',
            header_tool_tip: "Space Type: A space type describes features of a space such as climate-controlled or drive-up", 
            width: 120
        },
        spacegroup_spaces: {
            label: "Spaces",
            key: "spacegroup_spaces",
            input: "comparison",
            header_tool_tip: "Spaces: Otherwise known as a unit these are the spaces that exist at your property.",
            aggregate_enable: true,
            width: 95
        },
        spacegroup_spaces_vacant: {
            label: "Vacant Spaces",
            input: "comparison",
            aggregate_enable: true,
            header_tool_tip: "Vacant Spaces: Spaces that are available for tenants to rent.",
            key: "spacegroup_spaces_vacant",
            width: 95
        },
        spacegroup_avg_days_vacant: {
            label: "Avg Days Vacant",
            header_tool_tip: "Avg Days Vacant: The average number of days that a space is not occupied. ",
            key: "spacegroup_avg_days_vacant",
            input: "comparison",
            aggregate_enable: true,
            column_type: "float",
            width: 103
        },
        spacegroup_occupied_spaces: {
            label: "Occupied Spaces",
            header_tool_tip: "Occupied Spaces: : Spaces that have been rented.",
            key: "spacegroup_occupied_spaces",
            input: "comparison",
            aggregate_enable: true,
            width: 110
        },
        spacegroup_occupancy: {
            label: "Occupancy",
            key: "spacegroup_occupancy",
            header_tool_tip: "Occupancy: Number of occupied spaces vs Total number of spaces as a percentage",
            column_type: "percentage",
            input: "comparison",
            aggregate_enable: true,
            width: 120
        },
        spacegroup_avg_rent_per_space: {
            label: "Avg Rent per Space",
            header_tool_tip: "Avg Rent per Space: Gross Rent averaged over all occupied spaces",
            key: "spacegroup_avg_rent_per_space",
            input: "comparison",
            aggregate_enable: true,
            column_type: "money",
            width: 110
        },
        spacegroup_avg_rent_per_sqft: {
            label: "Avg Rent per sqft",
            header_tool_tip: "Avg Rent per sqft: Gross Rent averaged over all occupied spaces",
            key: "spacegroup_avg_rent_per_sqft",
            column_type: "money",
            width: 105,
            input: "comparison",
            aggregate_enable: true,
        },
        spacegroup_avg_set_rate: {
            label: "Avg Set Rate per Space",
            header_tool_tip: "Avg Set Rate per Space: Standard Rate based on which the Rate Mgmt Software derives Sell Rate",
            key: "spacegroup_avg_set_rate",
            column_type: "money",
            width: 125,
            input: "comparison",
            aggregate_enable: true,
        },
        spacegroup_avg_set_rate_per_sqft: {
            label: "Avg Set Rate per sqft",
            header_tool_tip: "Avg Set Rate per sqft: Standard Rate based on which the Rate Mgmt Software derives Sell Rate",
            key: "spacegroup_avg_set_rate_per_sqft",
            column_type: "money",
            width: 123,
            input: "comparison",
            aggregate_enable: true,
        },
        spacegroup_avg_sell_rate: {
            label: "Avg Sell Rate per Space",
            key: "spacegroup_avg_sell_rate",
            header_tool_tip: "Avg Sell Rate per Space: Rate offered to a customer renting a new space",
            column_type: "money",
            width: 125,
            input: "comparison",
            aggregate_enable: true,
        },
        spacegroup_avg_sell_rate_per_sqft: {
            label: "Avg Sell Rate per sqft",
            key: "spacegroup_avg_sell_rate_per_sqft",
            header_tool_tip: "Avg Sell Rate per sqft: Rate offered to a customer renting a new space",
            column_type: "money",
            width: 124,
            input: "comparison",
            aggregate_enable: true,
        },
        spacegroup_variance_percentage: {
            label: "Variance % (Rent/Sell)",
            key: "spacegroup_variance_percentage",
            header_tool_tip: "Variance % (Rent/Sell): The selected plan difference/variance between Rent and Sell Rate as a percentage",
            column_type: "percentage",
            width: 114,
            input: "comparison",
            aggregate_enable: true,
        },
        spacegroup_variance_amount: {
            label: "Variance $ (Rent/Sell)",
            key: "spacegroup_variance_amount",
            header_tool_tip: "Variance $ (Rent/Sell): The selected plan difference/variance between Rent and Sell Rate as a dollar amount",
            column_type: "money",
            width: 114,
            input: "comparison",
            aggregate_enable: true,
        },
        spacegroup_current_income: {
            label: "Current Income",
            key: "spacegroup_current_income",
            header_tool_tip: "Current Income: Total of Rents of all occupied spaces",
            column_type: "money",
            width: 95,
            input: "comparison",
            aggregate_enable: true,
        },
        spacegroup_potential_income: {
            label: "Potential Income",
            key: "spacegroup_potential_income",
            header_tool_tip: "Potential Income: Current Income plus the Income from vacant spaces rented at the Sell Rate",
            column_type: "money",
            width: 105,
            input: "comparison",
            aggregate_enable: true,
        },
        spacegroup_gross_potential_revenue: {
            label: "Gross Potential Income",
            key: "spacegroup_gross_potential_revenue",
            header_tool_tip: "Gross potential income: Total income if all the spaces are rented at the Sell Rate",
            column_type: "money",
            width: 138,
            input: "comparison",
            aggregate_enable: true,
        },
        spacegroup_economic_occupancy: {
            label: "Economic Occupancy",
            key: "spacegroup_economic_occupancy",
            header_tool_tip: "Economic Occupancy: Comparison of Current Income to Gross Potential Revenue as a percentage",
            column_type: "percentage",
            width: 118,
            input: "comparison",
            aggregate_enable: true,
        },
    }
}
// *********** *********** ***********
