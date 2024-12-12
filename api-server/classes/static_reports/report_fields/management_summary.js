module.exports = {
  "management-summary": {
    msr: {
      net_revenue: {
        amount: {
          dataType: 'money',
          super_header: "Net Revenue",
          alignment: {direction: 'horizontal', value: 'right'}
        }, 
        time_period: {
          dataType: 'string',
          super_header: "Net Revenue"
        } 
      },
      payment_deposits: {
        deposit_refunds: {
          label: "Deposits and Refunds",
          dataType: 'string',
          bold: true
        },
        space_filler1:{
          label: ''
        },
        space_filler2:{
          label: ''
        },
        report_date: {
          label: "<Report Date>",
          dataType: 'number',
          alignment: {direction: 'horizontal', value: 'right'}
        },
        mtd: {
          label: "MTD",
          dataType: 'number',
          alignment: {direction: 'horizontal', value: 'right'},
        },
        ytd: {
          label: "YTD",
          dataType: 'number',
          alignment: {direction: 'horizontal', value: 'right'}
        },
      },
      revenue: {
        revenue:{
          label: "Projected Income",
          dataType: 'string',
          bold: true
        },
        space_filler1:{
          label: ''
        },
        space_filler2:{
          label: ''
        },
        report_date:{
          label: "<Report Date>",
          dataType: 'number',
          alignment: {direction: 'horizontal', value: 'right'}
        },
        mtd: {
          label: "MTD",
          dataType: 'string',
          alignment: {direction: 'horizontal', value: 'right'}
        },
        ytd: {
          label: "YTD",
          dataType: 'string',
          alignment: {direction: 'horizontal', value: 'right'}
        }
      },
      allowances: {
        allowances:{
          label: "Allowances",
          dataType: 'string',
          bold: true
        },
        space_filler1:{
          label: ''
        },
        space_filler2:{
          label: ''
        },
        report_date:{
          label: "<Report Date>",
          dataType: 'number',
          alignment: {direction: 'horizontal', value: 'right'}
        },
        mtd: {
          label: "MTD",
          dataType: 'number',
          alignment: {direction: 'horizontal', value: 'right'}
        },
        ytd: {
          label: "YTD",
          dataType: 'number',
          alignment: {direction: 'horizontal', value: 'right'}
        }
      },
      rental_activity: {
        rental_activity:{
          label: "Rental Activity",
          dataType: 'string',
          bold: true
        },
        space_filler1:{
          label: ''
        },
        space_filler2:{
          label: ''
        },
        report_date:{
          label: "<Report Date>",
          dataType: 'integer',
          alignment: {direction: 'horizontal', value: 'right'}
        },
        mtd: {
          label: "MTD",
          dataType: 'integer',
          alignment: {direction: 'horizontal', value: 'right'}
        },
        ytd: {
          label: "YTD",
          dataType: 'integer',
          alignment: {direction: 'horizontal', value: 'right'}
        }
      },
      leads_data: {
        leads:{
          label: "Leads",
          dataType: 'string',
          bold: true
        },
        space_filler1:{
          label: ''
        },
        space_filler2:{
          label: ''
        },
        report_date:{
          label: "<Report Date>",
          dataType: 'integer',
          alignment: {direction: 'horizontal', value: 'right'}
        },
        mtd: {
          label: "MTD",
          dataType: 'integer',
          alignment: {direction: 'horizontal', value: 'right'}
        },
        ytd: {
          label: "YTD",
          dataType: 'integer',
          alignment: {direction: 'horizontal', value: 'right'}
        }
      },
      performance_indicators: {
        indicators:{
          label: "Performance Indicators",
          dataType: 'string',
          bold: true
        },
        space_filler1:{
          label: ''
        },
        space_filler2:{
          label: ''
        },
        space_filler3:{
          label: ''
        },
        total_count:{
          label: "Total Count",
          dataType: 'integer',
          alignment: {direction: 'horizontal', value: 'right'}
        },
        percent: {
          label: "%Total",
          dataType: 'percentage',
          alignment: {direction: 'horizontal', value: 'right'}
        }
      },
      space_metrics: {
        stats:{
          label: "Space Statistics",
          dataType: 'string',
          bold: true
        },
        space_filler1:{
          label: ''
        },
        space_filler2:{
          label: ''
        },
        occupied:{
          label: "Occupied",
          dataType: 'number',
          alignment: {direction: 'horizontal', value: 'right'}
        },
        vacant: {
          label: "Vacant",
          dataType: 'number',
          alignment: {direction: 'horizontal', value: 'right'}
        },
        total: {
          label: "Total",
          dataType: 'number',
          alignment: {direction: 'horizontal', value: 'right'}
        }
      },
      occupancy: {
        kpi: {
          label: 'KPI',
          dataType: 'string',
          super_header: 'Occupancy',
          bold: true
        },
        current: {
          label: '<Report Date>',
          dataType: 'percentage',
          super_header: 'Occupancy',
          bold: true,
        },
        yoy: {
          label: 'YOY',
          dataType: 'percentage',
          super_header: 'Occupancy',
        }
      },
      activity: {
        kpi: {
          label: 'KPI',
          dataType: 'string',
          super_header: 'Activity',
          bold: true
        },
        mtd: {
          label: 'MTD',
          dataType: 'string',
          super_header: 'Activity',
          bold: true
        },
        ytd: {
          label: 'YTD',
          dataType: 'string',
          super_header: 'Activity',
          bold: true
        }
      },
      leads_summary: {
        time_period: {
          label: 'Time Period',
          dataType: 'string',
          super_header: 'Leads',
          bold: true
        },
        total: {
          label: 'Total',
          dataType: 'string',
          super_header: 'Leads',
          bold: true
        },
        converted: {
          label: 'Converted',
          dataType: 'string',
          super_header: 'Leads',
          bold: true
        }
      },
      occupancy_breakdown: {
        space_occupancy: {
          label: 'Space Occupancy',
          dataType: 'string',
          bold: true
        },
        space_filler1:{
          label: ''
        },
        space_filler2:{
          label: ''
        },
        count: {
          label: 'Count',
          dataType: 'integer',
          alignment: {direction: 'horizontal', value: 'right'}
        },
        space_percent: {
          label: '%Space',
          dataType: 'percentage',
          alignment: {direction: 'horizontal', value: 'right'}
        },
        sqft: {
          label: 'SQ FT',
          dataType: 'number',
          alignment: {direction: 'horizontal', value: 'right'}
        },
        sqft_percent: {
          label: '%SQ FT',
          dataType: 'percentage',
          alignment: {direction: 'horizontal', value: 'right'}
        }
      },
      deliquencies: {
        days:{
          label: 'Delinquency by Days',
          dataType: 'string',
          bold: true
        },
        space_filler1:{
          label: ''
        },
        space_filler2:{
          label: ''
        },
        space_filler3:{
          label: ''
        },
        amount: {
          label: '$',
          dataType: 'number',
          alignment: {direction: 'horizontal', value: 'right'}
        },
        units: {
          label: 'Count',
          dataType: 'integer',
          alignment: {direction: 'horizontal', value: 'right'}
        },
        percent_units: {
          label: '%Total',
          dataType: 'percentage',
          alignment: {direction: 'horizontal', value: 'right'}
        }
      },
      liabilities: {
        liabilities:{
          label: 'Liabilities',
          dataType: 'string',
          bold: true
        },
        space_filler1:{
          label: ''
        },
        space_filler2:{
          label: ''
        },
        space_filler3:{
          label: ''
        },
        space_filler4:{
          label: ''
        },
        amount:{
          label: '$',
          dataType: 'number',
          alignment: {direction: 'horizontal', value: 'right'}
        },
        units: {
          label: 'Count',
          dataType: 'integer'
        }
      },
      rent_change_summary: {
        rent_change_summary: {
          label: 'Rent Change Summary',
          dataType: 'string',
          bold: true
        },
        space_filler1:{
          label: ''
        },
        space_filler2:{
          label: ''
        },
        space_filler3:{
          label: ''
        },
        count: {
          label: 'Count',
          dataType: 'integer',
          alignment: {direction: 'horizontal', value: 'right'}
        },
        prct_variance: {
          label: '%Change',
          dataType: 'percentage',
          alignment: {direction: 'horizontal', value: 'right'}
        },
        variance: {
          label: 'Rent Variance',
          dataType: 'number',
          alignment: {direction: 'horizontal', value: 'right'}
        }
      }
    },

    occupancy:{
      name: {
        label: 'Tenant Name',
        dataType: 'string'
      },
      space_number: {
        label: 'Space Number',
        dataType: 'string'
      },
      unit_type: {
        label: 'Space Type',
        dataType: 'string'
      },
      space_size: {
        label: 'Space Size',
        dataType: 'string'
      },
      occupied_base_rent: {
        label: 'Sell Rate',
        dataType: 'number'
      },
      occupied_rent: {
        label: 'Current Rent',
        dataType: 'number'
      },
      area: {
        label: 'SQ FT',
        dataType: 'number'
      },
      space_status: {
        label: 'Space Status',
        dataType: 'string'
      },
      occupied_vacant: {
        label: 'Occupied/Vacant',
        dataType: 'string'
      }
    },

    delinquencies: {
      name: {
        label: 'Tenant Name',
        dataType: 'string'
      },
      unit_number: {
        label: 'Space Number',
        dataType: 'string'
      },
      days_late: {
        label: 'Days Late',
        dataType: 'integer'
      },
      past_due_amount: {
        label: 'Past Due Amount',
        dataType: 'money'
      },
      rent: {
        label: 'Current Rent',
        dataType: 'money'
      },
      move_in_date: {
        label: 'Move In Date',
        dataType: 'date'
      }
    },

    past_due:{
      name: {
        label: 'Tenant Name',
        dataType: 'string'
      },
      unit_number: {
        label: 'Space Name',
        dataType: 'string'
      },
      invoice_number: {
        label: 'Invoice Number',
        dataType: 'string'
      },
      invoice_date: {
        label: 'Invoice Date',
        dataType: 'date'
      },
      invoice_due: {
        label: 'Invoice Due Date',
        dataType: 'date'
      },
      total_amount: {
        label: 'Invoice Total',
        dataType: 'money'
      },
      total_balance: {
        label: 'Past Due Amount',
        dataType: 'money'
      },
      days_unpaid: {
        label: 'Days Late',
        dataType: 'integer'
      }
    },

    liabilities_detail: {
      name: {
        label: 'Tenant name',
        dataType: 'string'
      },
      unit_number: {
        label: 'Space Number',
        dataType: 'string'
      },
      invoice_number: {
        label: 'Invoice Number',
        dataType: 'string'
      },
      invoice_gen_date: {
        label: 'Invoice Date',
        dataType: 'date'
      },
      invoice_date: {
        label: 'Invoice Due Date',
        dataType: 'date'
      },
      invoice_total: {
        label: 'Invoice Total',
        dataType: 'money'
      },
      product: {
        label: 'Product',
        dataType: 'string'
      },
      product_name: {
        label: 'Product Name',
        dataType: 'string'
      },
      amount: {
        label: 'Product Amount',
        dataType: 'money'
      }
    },

    rent_change:{
      name: {
        label: 'Tenant',
        dataType: 'string'
      },
      unit_number: {
        label: 'Space Name',
        dataType: 'string'
      },
      days_rent_change: {
        label: 'Last Rent Change',
        dataType: 'string'
      },
      new_rent: {
        label: 'Rent Change Amount',
        dataType: 'money'
      },
      variance_amt: {
        label: 'Rent Change Variance',
        dataType: 'money'
      },
      percentage: {
        label: 'Rent Change % Variance',
        dataType: 'percentage'
      }
    },

    rent_not_change:{
      name: {
        label: 'Tenant Name',
        dataType: 'string'
      },
      unit_number: {
        label: 'Space Name',
        dataType: 'string'
      },
      move_in: {
        label: 'Move In Date',
        dataType: 'date'
      },
      last_change_date: {
        label: 'Last Rent Change Date',
        dataType: 'date'
      },
      days_rent_change: {
        label: 'Days Since Last Rent Change',
        dataType: 'string'
      }
    },

    coverage: {
      name: {
        label: 'Tenant Name',
        dataType: 'string'
      },
      unit_number: {
        label: 'Space Number',
        dataType: 'string'
      },
      start_date: {
        label: 'Enrollment Date',
        dataType: 'date'
      },
      coverage_amount: {
        label: 'Coverage Amount',
        dataType: 'money'
      },
      premium: {
        label: 'Premium',
        dataType: 'money'
      }
    },

    autopay: {
      name: {
        label: 'Tenant Name',
        dataType: 'string'
      },
      space_number: {
        label: 'Space Number',
        dataType: 'string'
      },
      card_end: {
        label: 'Card End',
        dataType: 'string'
      },
      card_type: {
        label: 'Card Type',
        dataType: 'string'
      },
      exp_warning: {
        label: 'Method Exp. Date',
        dataType: 'date'
      }
    },

    overlocked: {
      name: {
        label: 'Tenant Name',
        dataType: 'string'
      },
      space_number: {
        label: 'Space Number',
        dataType: 'string'
      },
      size: {
        label: 'Space Size',
        dataType: 'string'
      },
      days_late: {
        label: 'Days Late',
        dataType: 'integer'
      },
      balance: {
        label: 'Total Balance',
        dataType: 'money'
      }
    },

    leads: {
      name: {
        label: 'Tenant Name',
        dataType: 'string'
      },
      created: {
        label: 'Lead Date',
        dataType: 'date'
      },
      status: {
        label: 'Status',
        dataType: 'string'
      },
      category_source: {
        label: 'Type',
        dataType: 'string'
      },
      unit_number: {
        label: 'Space Number',
        dataType: 'string'
      }
    },

    payment: {
      tenant: {
        label: 'Tenant Name',
        dataType: 'string'
      },
      space_nos: {
        label: 'Space Number',
        dataType: 'string'
      },
      payment_date: {
        label: 'Payment Date',
        dataType: 'date'
      },
      amount: {
        label: 'Payment Amount',
        dataType: 'money'
      },
      payment_method: {
        label: 'Payment Method',
        dataType: 'string'
      },
      card_end: {
        label: 'Last 4/Check Number',
        dataType: 'string'
      },
      card_type: {
        label: 'Card Type',
        dataType: 'string'
      }
    },

    refund: {
      tenant: {
        label: 'Tenant Name',
        dataType: 'string'
      },
      space_no: {
        label: 'Space Number',
        dataType: 'string'
      },
      refund_date: {
        label: 'Refund Date',
        dataType: 'date'
      },
      amount: {
        label: 'Refund Amount',
        dataType: 'money'
      },
      payment_date: {
        label: 'Payment Date',
        dataType: 'date'
      },
      payment_method: {
        label: 'Payment Method',
        dataType: 'string'
      },
      card_end: {
        label: 'Last 4/Check Number',
        dataType: 'string'
      },
      card_type: {
        label: 'Card Type',
        dataType: 'string'
      }
    },

    write_off: {
      name: {
        label: 'Tenant Name',
        dataType: 'string'
      },
      space_number: {
        label: 'Space Number',
        dataType: 'string'
      },
      invoice_number: {
        label: 'Invoice Number',
        dataType: 'string'
      },
      invoice_date: {
        label: 'Invoice Date',
        dataType: 'date'
      },
      invoice_due: {
        label: 'Invoice Due Date',
        dataType: 'date'
      },
      invoice_total: {
        label: 'Invoice Total',
        dataType: 'money'
      },
      amount: {
        label: 'Write-off Amount',
        dataType: 'money'
      },
      payment_date: {
        label: 'Write-off Date',
        dataType: 'date'
      }
    },

    invoices: {
      tenant_name: {
        label: 'Tenant Name',
        dataType: 'string'
      },
      unit_number: {
        label: 'Space Number',
        dataType: 'string'
      },
      invoice_number: {
        label: 'Invoice Number',
        dataType: 'string'
      },
      invoice_date: {
        label: 'Invoice Date',
        dataType: 'date'
      },
      invoice_due: {
        label: 'Invoice Due Date',
        dataType: 'date'
      },
      invoice_total: {
        label: 'Invoice Total',
        dataType: 'money'
      },
      rent: {
        label: 'Rent Amount',
        dataType: 'money'
      },
      fees: {
        label: 'Fee Amount',
        dataType: 'money'
      },
      insurance: {
        label: 'Coverage Amount',
        dataType: 'money'
      },
      merchandise: {
        label: 'Merchandise Amount',
        dataType: 'money'
      },
      total_tax: {
        label: 'Tax Amount',
        dataType: 'money'
      },
      total_discount: {
        label: 'Promotion Amount',
        dataType: 'money'
      }
    },

    promotion: {
      name: {
        label: 'Tenant Name',
        dataType: 'string'
      },
      unit_number: {
        label: 'Space Number',
        dataType: 'string'
      },
      invoice_number: {
        label: 'Invoice Number',
        dataType: 'string'
      },
      date: {
        label: 'Invoice Date',
        dataType: 'date'
      },
      invoice_due_date: {
        label: 'Invoice Due Date',
        dataType: 'date'
      },
      invoice_total: {
        label: 'Invoice Total',
        dataType: 'money'
      },
      amount: {
        label: 'Promotion Amount',
        dataType: 'money'
      },
      promotion_type: {
        label: 'Promotion/Discount',
        dataType: 'string'
      },
      promotion_name: {
        label: 'Promotion Name',
        dataType: 'string'
      }
    },

    applied_credit: {
      name: {
        label: 'Tenant Name',
        dataType: 'string'
      },
      space_number: {
        label: 'Space Number',
        dataType: 'string'
      },
      payment_date: {
        label: 'Credit Date',
        dataType: 'date'
      },
      amount: {
        label: 'Credit Amount',
        dataType: 'money'
      }
    },

    move_in: {
      name: {
        label: "Tenant Name",
        dataType: "string",
      },
      unit_number: {
        label: "Space Number",
        dataType: "string",
      },
      move_in_date: {
        label: "Move-In Date",
        dataType: "date",
      },
      unit_type: {
        label: "Space Type",
        dataType: "string",
      }
    },

    move_out: {
      name: {
        label: "Tenant Name",
        dataType: "string",
      },
      unit_number: {
        label: "Space Number",
        dataType: "string",
      },
      move_out_date: {
        label: "Move-Out Date",
        dataType: "date",
      },
      unit_type: {
        label: "Space Type",
        dataType: "string",
      }
    },

    transfer: {
      tenant_name: {
        label: "Tenant Name",
        dataType: "string",
      },
      in_unit_number: {
        label: "Transfer-In Space",
        dataType: "string",
      },
      out_unit_number: {
        label: "Transfer-Out Space",
        dataType: "string",
      },
      transfer_date: {
        label: "Transfer Date",
        dataType: "date",
      }
    },

    reservation: {
      tenant_name: {
        label: "Tenant Name",
        dataType: "string",
      },
      unit_number: {
        label: "Space Number",
        dataType: "string",
      },
      reservation_date: {
        label: "Reservation Date",
        dataType: "date",
      },
      expiration_date: {
        label: "Reservation End Date",
        dataType: "date",
      }
    }

  }
}  