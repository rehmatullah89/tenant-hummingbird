'use strict';
var hummus = require('hummus');
var utils    = require(__dirname + '/utils.js');
var moment = require('moment');
var ms = require('memory-streams');


var settings    = {
  config:{
    base_path: `${__dirname}/../public`
  } 
}

class ManagementSummary {

  constructor(data) {
    this.data = data;

    // A4 page size dim
    // this.page_width = 595;
    // this.page_height = 842;

    // Letter page size dime
    this.page_width = 612;
    this.page_height = 807;

    this.margin_left = 20;
    this.margin_right = 20;
    this.margin_top = 35;
    this.margin_bottom = 15;

    this.config = [];
    this.summaryConfig = [];
    this.logoUrl = null;
  }

  setConfig(){

    let dailyLabel = moment(this.data.start_date).format('MM/DD/YY');
    let paymentDeposits = this.data.data.payment_deposits;
    this.config.push({
      name: 'Deposits & Refunds',
      pos: 'left',
      Columns: [
        {
          name:'Deposits & Refunds',
          type: 'string',
        },
        {
          name: dailyLabel,
          type: 'string',
        },
        {
          name:'MTD',
          type: 'string',
        },
        {
          name:'YTD',
          type: 'string',
        }
      ],
      Rows: [
        {
          key: 'Cash',
          values: [
            this.formatMoney(paymentDeposits.cash.daily,false),
            this.formatMoney(paymentDeposits.cash.mtd,false),
            this.formatMoney(paymentDeposits.cash.ytd,false),
          ]
        },
        {
          key: 'Check',
          values: [
            this.formatMoney(paymentDeposits.check.daily,false),
            this.formatMoney(paymentDeposits.check.mtd,false),
            this.formatMoney(paymentDeposits.check.ytd,false),
          ]
        },
        {
          key: 'Gift Card',
          values: [
            this.formatMoney(paymentDeposits.giftcard.daily,false),
            this.formatMoney(paymentDeposits.giftcard.mtd,false),
            this.formatMoney(paymentDeposits.giftcard.ytd,false),
          ]
        },
        {
          key: 'ACH Debit',
          values: [
            this.formatMoney(paymentDeposits.ach.daily,false),
            this.formatMoney(paymentDeposits.ach.mtd,false),
            this.formatMoney(paymentDeposits.ach.ytd,false),
          ]
        },
        {
          key: 'Debit/Credit Cards',
          values: [
            this.formatMoney(paymentDeposits.card.daily,false),
            this.formatMoney(paymentDeposits.card.mtd,false),
            this.formatMoney(paymentDeposits.card.ytd,false),
          ]
        },
        {
          key: 'SubTotal',
          values: [
            this.formatMoney(paymentDeposits.subtotal.daily,false),
            this.formatMoney(paymentDeposits.subtotal.mtd,false),
            this.formatMoney(paymentDeposits.subtotal.ytd,false),
          ]
        },
        {
          key: 'NSF/Reversals',
          summary_row: true,
          values: [
            this.formatMoney(paymentDeposits.reversals.daily,false),
            this.formatMoney(paymentDeposits.reversals.mtd,false),
            this.formatMoney(paymentDeposits.reversals.ytd,false),
          ]
        },
        {
          key: 'Total',
          values: [
            this.formatMoney(paymentDeposits.total.daily,false),
            this.formatMoney(paymentDeposits.total.mtd,false),
            this.formatMoney(paymentDeposits.total.ytd,false),
          ]
        },
      ]
    })

    let revenue = this.data.data.revenue;
    this.config.push({
        name: 'Projected Income',
        pos: 'left',
        Columns: [
          {
            name:'Projected Income',
            type: 'string',
          },
          {
            name: dailyLabel,
            type: 'string',
          },
          {
            name:'MTD',
            type: 'string',
          },
          {
            name:'YTD',
            type: 'string',
          }
        ],
        Rows: [
          {
            key: 'Rent',
            values: [
              this.formatMoney(revenue.rent.daily,false),
              this.formatMoney(revenue.rent.mtd,false),
              this.formatMoney(revenue.rent.ytd,false),
            ]
          },
          {
            key: 'Insurance/Protection',
            values: [
              this.formatMoney(revenue.insurance.daily,false),
              this.formatMoney(revenue.insurance.mtd,false),
              this.formatMoney(revenue.insurance.ytd,false),
            ]
          },
          {
            key: 'Fee',
            values: [
              this.formatMoney(revenue.fee.daily,false),
              this.formatMoney(revenue.fee.mtd,false),
              this.formatMoney(revenue.fee.ytd,false),
            ]
          },
          {
            key: 'Merchandise',
            values: [
              this.formatMoney(revenue.merchandise.daily,false),
              this.formatMoney(revenue.merchandise.mtd,false),
              this.formatMoney(revenue.merchandise.ytd,false),
            ]
          },          
          {
            key: 'Others',
            values: [
              this.formatMoney(revenue.others.daily,false),
              this.formatMoney(revenue.others.mtd,false),
              this.formatMoney(revenue.others.ytd,false),
            ]
          },
          {
            key: 'Total',
            values: [
              this.formatMoney(revenue.total.daily,false),
              this.formatMoney(revenue.total.mtd,false),
              this.formatMoney(revenue.total.ytd,false),
            ]
          },
        ]
    })

    let allowances = this.data.data.allowances;
    this.config.push({
      name: 'Allowances',
      pos: 'left',
      Columns: [
        {
          name:'Allowances',
          type: 'string',
        },
        {
          name: dailyLabel,
          type: 'string',
        },
        {
          name:'MTD',
          type: 'string',
        },
        {
          name:'YTD',
          type: 'string',
        }
      ],
      Rows: [
        {
          key: 'Discounts/Promotions',
          values: [
            this.formatMoney(allowances.discounts.daily,false),
            this.formatMoney(allowances.discounts.mtd,false),
            this.formatMoney(allowances.discounts.ytd,false),
          ]
        },
        {
          key: 'Write Offs',
          superscripts: '2',
          values: [
            this.formatMoney(allowances.write_offs.daily,false),
            this.formatMoney(allowances.write_offs.mtd,false),
            this.formatMoney(allowances.write_offs.ytd,false),
          ]
        },
        {
          key: 'Applied Credits',
          superscripts: '3',
          values: [
            this.formatMoney(allowances.credits.daily,false),
            this.formatMoney(allowances.credits.mtd,false),
            this.formatMoney(allowances.credits.ytd,false),
          ]
        }
      ]
    })

    let rentalActivity = this.data.data.rental_activity;
    this.config.push({
      name: 'Rental Activity',
      pos: 'left',
      Columns: [
        {
          name:'Rental Activity',
          type: 'string',
        },
        {
          name: dailyLabel,
          type: 'string',
        },
        {
          name:'MTD',
          type: 'string',
        },
        {
          name:'YTD',
          type: 'string',
        }
      ],
      Rows: [
        {
          key: 'Move-Ins',
          values: [
            utils.formatNumber(rentalActivity.move_ins.daily),
            utils.formatNumber(rentalActivity.move_ins.mtd),
            utils.formatNumber(rentalActivity.move_ins.ytd)
          ]
        },
        {
          key: 'Move-Outs',
          values: [
            utils.formatNumber(rentalActivity.move_out.daily),
            utils.formatNumber(rentalActivity.move_out.mtd),
            utils.formatNumber(rentalActivity.move_out.ytd)
          ]
        },
        {
          key: 'Transfers',
          values: [
            utils.formatNumber(rentalActivity.transfers.daily),
            utils.formatNumber(rentalActivity.transfers.mtd),
            utils.formatNumber(rentalActivity.transfers.ytd)
          ]
        },
        {
          key: 'Reservations',
          values: [
            utils.formatNumber(rentalActivity.reservations.daily),
            utils.formatNumber(rentalActivity.reservations.mtd),
            utils.formatNumber(rentalActivity.reservations.ytd) 
          ]
        }
      ]
    })

    let leadsData = this.data.data.leads_data;
    this.config.push({
      name: 'Leads',
      pos: 'left',
      Columns: [
          {
            name:'Leads',
            type: 'string',
          },
          {
            name: dailyLabel,
            type: 'string',
          },
          {
            name:'MTD',
            type: 'string',
          },
          {
            name:'YTD',
            type: 'string',
          }
      ],
      Rows: [
        {
          key: 'Web Leads',
          values: [
            utils.formatNumber(leadsData.web_leads.daily),
            utils.formatNumber(leadsData.web_leads.mtd),
            utils.formatNumber(leadsData.web_leads.ytd)
          ]
        },
        {
          key: 'Walk-in Leads',
          values: [
            utils.formatNumber(leadsData.walk_in_leads.daily),
            utils.formatNumber(leadsData.walk_in_leads.mtd),
            utils.formatNumber(leadsData.walk_in_leads.ytd)
          ]
        },
        {
          key: 'Phone Leads',
          values: [
            utils.formatNumber(leadsData.phone_leads.daily),
            utils.formatNumber(leadsData.phone_leads.mtd),
            utils.formatNumber(leadsData.phone_leads.ytd)
          ]
        },
        {
          key: 'Other Leads',
          values: [
            utils.formatNumber(leadsData.other_leads.daily),
            utils.formatNumber(leadsData.other_leads.mtd),
            utils.formatNumber(leadsData.other_leads.ytd) 
          ]
        },
        {
          key: 'Leads Converted',
          values: [
            utils.formatNumber(leadsData.leads_converted.daily),
            utils.formatNumber(leadsData.leads_converted.mtd),
            utils.formatNumber(leadsData.leads_converted.ytd)
          ]
        }
      ]
    })

    let autoPay = this.data.data.auto_pay;
    let insurance = this.data.data.insurance;
    let overlock = this.data.data.overlock;
    let rentUnchanged = this.data.data.rentUnchanged;
    this.config.push({
      name: 'Performance Indicators',
      pos: 'left',
      Columns: [
        {
          name:'Performance Indicators',
          type: 'string',
        },
        {
          name:'Total Count',
          type: 'string',
        },
        {
          name:'% Total',
          type: 'string',
        }
      ],
      Rows: [
        {
          key: 'Autopay Enrollment',
          values: [
            utils.formatNumber(autoPay.total),
            utils.formatPersontage(autoPay.percentage),
          ]
        },
        {
          key: 'Insurance/Protection Enrollment',
          values: [
            utils.formatNumber(insurance.total),
            utils.formatPersontage(insurance.percentage),
          ]
        },
        {
          key: 'Overlocked Spaces',
          values: [
            utils.formatNumber(overlock.total),
            utils.formatPersontage(overlock.percentage)
          ]
        },
        {
          key: 'No Rent Change in Last 12 Months',
          superscripts: '4',
          values: [
            utils.formatNumber(rentUnchanged.total),
            utils.formatPersontage(rentUnchanged.percentage)
          ]
        }
      ]
    })

    let spaceMetrics = this.data.data.space_metrics;
    this.config.push({
        name: 'Space Statistics',
        pos: 'left',
        Columns: [
            {
              name:'Space Statistics',
              type: 'string',
            },
            {
              name:'Occupied',
              type: 'string',
            },
            {
              name:'Vacant',
              type: 'string',
            },
            {
              name:'Total',
              type: 'string',
            }
        ],
        Rows: [
          {
            key: 'Average SQ FT/Space',
            values: [
              this.formatMoney(spaceMetrics.average_area_space.occupied,false),
              this.formatMoney(spaceMetrics.average_area_space.vacant,false),
              this.formatMoney(spaceMetrics.average_area_space.total,false),
            ]
          },
          {
            key: 'Average Rent/Space ($)',
            values: [
              this.formatMoney(spaceMetrics.average_rent_space.occupied,false),
              this.formatMoney(spaceMetrics.average_rent_space.vacant,false),
              this.formatMoney(spaceMetrics.average_rent_space.total,false),
            ]
          },
          {
            key: 'Average Rent/SQ FT ($)',
            values: [
              this.formatMoney(spaceMetrics.average_rent_area.occupied,false),
              this.formatMoney(spaceMetrics.average_rent_area.vacant,false),
              this.formatMoney(spaceMetrics.average_rent_area.total,false),
            ]
          },
            
        ]
    })

    let occupancyBreakdown = this.data.data.occupancy_breakdown;
    this.config.push({
        name: 'Occupancy',
        pos: 'right',
        double_heading: false,
        Columns: [
            {
                name:'Space Occupancy',
                type: 'string',
            },
            {
                name:'Count',
                type: 'string',
            },
            {
                name:'%Space',
                type: 'string',
            },
            {
                name:'SQ FT',
                type: 'string',
            },
            {
                name:'%SQ FT',
                type: 'string',
            },
        ],
        Rows: [
          {
            key: 'Occupied',
            values: [
              utils.formatNumber(occupancyBreakdown.occupied.unit_count),
              utils.formatPersontage(occupancyBreakdown.occupied.unit_percent),
              this.formatMoney(occupancyBreakdown.occupied.sqft,false),
              utils.formatPersontage(occupancyBreakdown.occupied.sqft_percent),
            ]
          },
          {
            key: 'Vacant',
            values: [
              utils.formatNumber(occupancyBreakdown.vacant.unit_count),
              utils.formatPersontage(occupancyBreakdown.vacant.unit_percent),
              this.formatMoney(occupancyBreakdown.vacant.sqft,false),
              utils.formatPersontage(occupancyBreakdown.vacant.sqft_percent),
            ]
          },
          {
            key: 'Complimentary',
            subKey: '(not in total)',
            values: [
              utils.formatNumber(occupancyBreakdown.complimentary.unit_count),
              utils.formatPersontage(occupancyBreakdown.complimentary.unit_percent),
              this.formatMoney(occupancyBreakdown.complimentary.sqft,false),
              utils.formatPersontage(occupancyBreakdown.complimentary.sqft_percent),
            ]
          },
          {
            key: 'Reserved',
            subKey: '(not in total)',
            values: [
              utils.formatNumber(occupancyBreakdown.reserved.unit_count),
              utils.formatPersontage(occupancyBreakdown.reserved.unit_percent),
              this.formatMoney(occupancyBreakdown.reserved.sqft,false),
              utils.formatPersontage(occupancyBreakdown.reserved.sqft_percent), 
            ]
          },
          {
            key: 'Total',
            values: [
              utils.formatNumber(occupancyBreakdown.total.unit_count),
              utils.formatPersontage(occupancyBreakdown.total.unit_percent),
              this.formatMoney(occupancyBreakdown.total.sqft,false),
              utils.formatPersontage(occupancyBreakdown.total.sqft_percent),
            ]
          },
            
        ]
    })

    let deliquencies= this.data.data.deliquencies;
    this.config.push({
        name: 'Delinquent Tenants',
        pos: 'right',
        Columns: [
            {
                name:'Delinquency by Days',
                type: 'string',
                superscripts: '5'
            },
            {
                name:'$',
                type: 'string',
            },
            {
                name:'Count',
                type: 'string',
            },
            {
                name:'%Total',
                type: 'string',
                superscripts: '6',
                superscripts_position: 'left'
            }
        ],
        Rows: [
          {
            key: '0-10',
            values: [
              this.formatMoney(deliquencies.deliquent_10.amount,false),
              utils.formatNumber(deliquencies.deliquent_10.units),
              utils.formatPersontage(deliquencies.deliquent_10.percent_units),
            ]
          },
          {
            key: '11-30',
            values: [
              this.formatMoney(deliquencies.deliquent_30.amount,false),
              utils.formatNumber(deliquencies.deliquent_30.units),
              utils.formatPersontage(deliquencies.deliquent_30.percent_units),
            ]
          },
          {
            key: '31-60',
            values: [
              this.formatMoney(deliquencies.deliquent_60.amount,false),
              utils.formatNumber(deliquencies.deliquent_60.units),
              utils.formatPersontage(deliquencies.deliquent_60.percent_units),
            ]
          },
          {
            key: '61-90',
            values: [
              this.formatMoney(deliquencies.deliquent_90.amount,false),
              utils.formatNumber(deliquencies.deliquent_90.units),
              utils.formatPersontage(deliquencies.deliquent_90.percent_units),
            ]
          },
          {
            key: '91-120',
            values: [
              this.formatMoney(deliquencies.deliquent_120.amount,false),
              utils.formatNumber(deliquencies.deliquent_120.units),
              utils.formatPersontage(deliquencies.deliquent_120.percent_units),
            ]
          },
          {
            key: '121-180',
            values: [
              this.formatMoney(deliquencies.deliquent_180.amount,false),
              utils.formatNumber(deliquencies.deliquent_180.units),
              utils.formatPersontage(deliquencies.deliquent_180.percent_units),
            ]
          },
          {
            key: '181-360',
            values: [
              this.formatMoney(deliquencies.deliquent_360.amount,false),
              utils.formatNumber(deliquencies.deliquent_360.units),
              utils.formatPersontage(deliquencies.deliquent_360.percent_units),
            ]
          },
          {
            key: '361+',
            values: [
              this.formatMoney(deliquencies.deliquent_gt_360.amount,false),
              utils.formatNumber(deliquencies.deliquent_gt_360.units),
              utils.formatPersontage(deliquencies.deliquent_gt_360.percent_units),
            ]
          },
          {
            key: 'Total',
            values: [
              this.formatMoney(deliquencies.total.amount,false),
              utils.formatNumber(deliquencies.total.units),
              utils.formatPersontage(deliquencies.total.percent_units),
            ]
          },
          {
            key: 'Greater than 30 Days',
            summary_row: true,
            values: [
              this.formatMoney(deliquencies.deliquent_gt_30.amount,false),
              utils.formatNumber(deliquencies.deliquent_gt_30.units),
              utils.formatPersontage(deliquencies.deliquent_gt_30.percent_units),
            ]
          } 
        ]
    })

    let liabilities = this.data.data.liabilities;
    this.config.push({
        name: 'Liabilities',
        pos: 'right',
        Columns: [
            {
              name:'Liabilities',
              type: 'string',
            },
            {
              name:'Amount',
              type: 'string',
            },
            {
              name:'Tax',
              type: 'string',
            },
            {
              name:'Total',
              type: 'string',
            },
            {
              name:'Count',
              type: 'string',
            },
        ],  
        Rows: [
          {
            key: 'Prepaid Rent',
            values: [
              this.formatMoney(liabilities.prepaid_rent.amount,false),
              this.formatMoney(liabilities.prepaid_rent.tax,false),
              this.formatMoney(liabilities.prepaid_rent.total,false),
              utils.formatNumber(liabilities.prepaid_rent.units),
            ]
          },
          {
            key: 'Prepaid Insurance/Protection',
            values: [
              this.formatMoney(liabilities.prepaid_insurance.amount,false),
              this.formatMoney(liabilities.prepaid_insurance.tax,false),
              this.formatMoney(liabilities.prepaid_insurance.total,false),
              utils.formatNumber(liabilities.prepaid_insurance.units),
            ]
          },
          {
            key: 'Prepaid Fee',
            values: [
              this.formatMoney(liabilities.prepaid_services.amount,false),
              this.formatMoney(liabilities.prepaid_services.tax,false),
              this.formatMoney(liabilities.prepaid_services.total,false),
              utils.formatNumber(liabilities.prepaid_services.units),
            ]
          },
          // {
          //   key: 'Reserve Balance',
          //   superscripts: '7',
          //   values: [
          //     this.formatMoney(liabilities.prepaid_unallocated.amount,false),
          //     utils.formatNumber(liabilities.prepaid_unallocated.units),
          //   ]
          // },
          {
            key: 'Miscellaneous Deposits',
            superscripts: '7',
            values: [
              this.formatMoney(liabilities.miscellaneous_deposits.amount,false),
              this.formatMoney(liabilities.miscellaneous_deposits.tax,false),
              this.formatMoney(liabilities.miscellaneous_deposits.total,false),
              utils.formatNumber(liabilities.miscellaneous_deposits.units),
            ]
          },
          {
            key: 'Total',
            values: [
              this.formatMoney(liabilities.total.amount,false),
              this.formatMoney(liabilities.total.tax,false),
              this.formatMoney(liabilities.total.total,false),
              utils.formatNumber(liabilities.total.units),
            ]
          },
        ]
    })

    let rent_change_summary = this.data.data.rent_change_summary;
    this.config.push({
      name: 'Rent Change Summary',
      pos: 'right',
      Columns: [
          {
            name:'Rent Change Summary',
            type: 'string',
          },
          {
            name:'Count',
            type: 'string',
          },
          {
            name:'%Change',
            type: 'string',
            superscripts: '8'
          },
          {
            name:'Rent Variance',
            type: 'string',
            superscripts: '9'
          },
      ],  
      Rows: [
        {
          key: 'Less than 6 Months',
          values: [
            utils.formatNumber(rent_change_summary.six_month.count),
            utils.formatPersontage(rent_change_summary.six_month.prct_variance),
            this.formatMoney(rent_change_summary.six_month.variance,false),
          ]
        },
        {
          key: '6-12 Months',
          values: [
            utils.formatNumber(rent_change_summary.six_to_twelve_month.count),
            utils.formatPersontage(rent_change_summary.six_to_twelve_month.prct_variance),
            this.formatMoney(rent_change_summary.six_to_twelve_month.variance,false),
          ]
        },
        {
          key: '12-18 Months',
          values: [
            utils.formatNumber(rent_change_summary.twelve_to_eighteen_month.count),
            utils.formatPersontage(rent_change_summary.twelve_to_eighteen_month.prct_variance),
            this.formatMoney(rent_change_summary.twelve_to_eighteen_month.variance,false),
          ]
        },
        {
          key: '18-24 Months',
          values: [
            utils.formatNumber(rent_change_summary.eighteen_to_twenty_four_month.count),
            utils.formatPersontage(rent_change_summary.eighteen_to_twenty_four_month.prct_variance),
            this.formatMoney(rent_change_summary.eighteen_to_twenty_four_month.variance,false),
          ]
        },
        {
          key: 'Greater than 24 Months',
          values: [
            utils.formatNumber(rent_change_summary.twenty_four_month.count),
            utils.formatPersontage(rent_change_summary.twenty_four_month.prct_variance),
            this.formatMoney(rent_change_summary.twenty_four_month.variance,false),
          ]
        },
        {
          key: 'Total',
          values: [
            utils.formatNumber(rent_change_summary.total.count),
            utils.formatPersontage(rent_change_summary.total.prct_variance),
            this.formatMoney(rent_change_summary.total.variance,false),
          ]
        }
      ]
    })

  }
  
  async drawHeader(cxt, pdfWriter,leftOffset,topOffset,font,mediumFont,boldFont){

    let mediumTextOptions = {
      font: mediumFont,
      size: 8,
      colorspace: 'gray',
      color: 0x00,
      underline: false
    };

    let textFontOptions = {
      font: font,
      size: 10,
      colorspace: 'gray',
      color: 0x00,
      underline: false
    };

    let textFontOptions2 = {
        font: font,
        size: 8,
        colorspace: 'gray',
        color: 0x00,
        underline: false
      };

    let heading = {
        font: boldFont,
        size: 15,
        colorspace: 'gray',
        color: 0x00,
        underline: false
    };
    
    let logoOffset = 125;

    if(this.logoUrl) {
      let dim = pdfWriter.getImageDimensions(this.logoUrl); 
      let imageOptions = {
        transformation: {
          width: 100,
          height: 45,
          fit: 'overflow'
        }
      }

      let logoTopOffset =  dim.height >= 50 ? 50 : 45;
      cxt.drawImage(this.page_width - this.margin_right - 100, topOffset - logoTopOffset,this.logoUrl,imageOptions);
    } else {
      logoOffset = 11;
    }

    let startDate = moment(this.data.start_date).format('dddd, MMMM DD, YYYY');
    let facility_name = utils.formatFacilityName(this.data.property);
    let facility_address = utils.formatFacilityAddress(this.data.property.Address);
    let facility_phone = utils.formatPhone(this.data.property.Phones);

    let nameDimensions = mediumFont.calculateTextDimensions(facility_name,8);
    let cszDimensions = font.calculateTextDimensions(facility_address,8);
    let phoneDimensions = font.calculateTextDimensions(facility_phone,8);

    cxt.writeText('Management Summary',leftOffset+8,topOffset-25,heading)
       .writeText(startDate,leftOffset+8,topOffset-40,textFontOptions)
       .writeText(facility_name,this.page_width-(nameDimensions.width + leftOffset + logoOffset),topOffset-23,mediumTextOptions)
       .writeText(facility_address,this.page_width-(cszDimensions.width + leftOffset + logoOffset),topOffset-38,textFontOptions2)
       .writeText(facility_phone,this.page_width-(phoneDimensions.width + leftOffset + logoOffset),topOffset-48,textFontOptions2)
       //here we need to add logo ..... call logo function here

    

  }
  
  async drawReportTables(cxt,leftOffset,topOffset,font,mediumFont,pathFillOptions,pathStrokeOptions){

    let mediumTextOptions = {
      font: mediumFont,
      size: 6,
      colorspace: 'gray',
      color: 0x00,
      underline: false
    };
    let mediumTextOptions2 = {
      font: mediumFont,
      size: 7,
      colorspace: 'gray',
      color: 0x00,
      underline: false
    };
    let textFontOptions = {
      font: font,
      size: 6,
      colorspace: 'gray',
      color: 0x00,
      underline: false
    };

    let numOfTables = this.config.length
    let box_start = topOffset - 190;
    let box_start2 = topOffset - 190;
    let table_paddings = [];
    let table_paddings2 = [];
    table_paddings.push(0, 410, 355, 305);
    table_paddings2.push(0, 100, 55, 5);

    for(let i=0; i< numOfTables; i++){
        console.log("Now at table-----",this.config[i].name);
        let useSmallMedium = false;
        let numOfRows = this.config[i].Rows.length
        let tableSize = 16 * numOfRows;
        let tableSize2 = 17 * numOfRows;

        if(numOfRows <= 3){
            tableSize = tableSize + 11;
        }
        //Manual overriding of table sizes according to required look n feel. 
        switch(this.config[i].name){
          case 'Rental Activity':
            tableSize = tableSize + 5;
            break;
          case 'Leads':
          case 'Projected Income':
            tableSize = tableSize + 3;
            break;
          case 'Performance Indicators':
            tableSize = tableSize + 5;
            break;
          case 'Deposits & Refunds':
            tableSize = tableSize - 3
            break;       
        }

        if(this.config[i].name === 'Occupancy'){
            tableSize2 = tableSize2 - 3;
        }
        if(this.config[i].name === 'Delinquent Tenants'){
            tableSize2 = tableSize2 - 22.5;
        }
        if(this.config[i].name === 'Rent Change Summary'){
            tableSize2 = tableSize2 - 6;
        }
        if(this.config[i].name === 'Liabilities'){
          tableSize2 = tableSize2 - 3;
        }

        // tableSize -=3;
        // tableSize2 -=3;

        let position = this.config[i].pos;
        let tableLeftOffset = 312;
        let tableTextLeftOffset = 315;
        if(position === 'right'){
            cxt.drawRectangle(leftOffset+tableLeftOffset,box_start2-17,270,17,pathFillOptions)
               .drawRectangle(leftOffset+tableLeftOffset,box_start2-tableSize2,270,tableSize2,pathStrokeOptions)
               .writeText(this.config[i].Columns[0].name,leftOffset + tableTextLeftOffset,box_start2-11,{
                font: mediumFont,
                size: 8,
                colorspace: 'gray',
                color: 0x00,
                underline: false
               });

            if(this.config[i].Columns[0].superscripts) {
              let redius = 3;
              let w = mediumFont.calculateTextDimensions(this.config[i].Columns[0].name,8).width + 8;
              await cxt.drawCircle(leftOffset + tableTextLeftOffset + w,box_start2 - 9,redius,
              {
                type:'stroke',
                width: 0.6,
                color:'black'
              });

              await cxt.writeText(this.config[i].Columns[0].superscripts,leftOffset + tableTextLeftOffset + w - 1,box_start2- 10,{
                font: mediumTextOptions2.font,
                size: 3.5,
                colorspace: 'gray',
                color: 0x00,
                underline: false
              });
            }
            
            for(let j = 1; j < this.config[i].Columns.length; j++){
                let d = mediumFont.calculateTextDimensions(this.config[i].Columns[j].name,7);
                
                if(this.config[i].name === 'Liabilities'){
                    table_paddings2 = [];
                    table_paddings2.push(0, 136, 95, 42, 13);
                }
                else if(this.config[i].name === 'Occupancy'){
                    table_paddings2 = [];
                    table_paddings2.push(0, 150, 100, 60, 15);
                }
                else if(this.config[i].name === 'Rent Change Summary'){
                  table_paddings2 = [];
                  table_paddings2.push(0, 130, 80, 15);
                }

                cxt.writeText(this.config[i].Columns[j].name,this.page_width-(leftOffset + d.width + table_paddings2[j])+1 ,box_start2-11,mediumTextOptions2);
                if(this.config[i].Columns[j].superscripts) {
                  let redius = 3;
                  await cxt.drawCircle(this.page_width - (leftOffset + d.width + table_paddings2[j]) - (redius * 2),box_start2 - 9,redius,
                  {
                    type:'stroke',
                    width: 0.6,
                    color:'black'
                  });
                  let circle_padding = this.config[i].Columns[j].superscripts === '10' ? 2:1
                  await cxt.writeText(this.config[i].Columns[j].superscripts,this.page_width - (leftOffset + d.width + table_paddings2[j]) - (redius * 2) - circle_padding,box_start2-10,{
                    font: mediumTextOptions2.font,
                    size: 3.5,
                    colorspace: 'gray',
                    color: 0x00,
                    underline: false
                  });
                }

                // if(useSmallMedium){
                //     cxt.writeText(this.config[i].Columns[j].name,this.page_width-(leftOffset + d.width + table_paddings2[j]),box_start2-11,{
                //       font: mediumFont,
                //       size: 7,
                //       colorspace: 'gray',
                //       color: 0x00,
                //       underline: false
                //     })
                // }
                // else { }
                
            }
            // row part here if the table doesnt have double heading..........place a if(this.config[i].double_heading)
            let tempTextFontOptions = null;
            if(!this.config[i].double_heading){
                let f2 = box_start2 -(11 + 15) //11 for the column heading and 15 for next entry below it
                for(let j = 0; j < this.config[i].Rows.length; j++){

                  if(this.config[i].Rows[j].key !== 'Total' && !this.config[i].Rows[j].summary_row && j % 2 === 1) {
                    cxt.drawRectangle(leftOffset + tableLeftOffset + 0.6,f2 - 3.5,268.5,13, {
                      type: 'fill',
                      color: 0xf9fafb,
                      opacity: 0.9
                    })
                  }

                  if(this.config[i].Rows[j].key === 'Total' || this.config[i].Rows[j].summary_row){
                    let txtWidth = mediumTextOptions2.font.calculateTextDimensions(this.config[i].Rows[j].key,mediumTextOptions2.size).width - 17;
                    cxt.writeText(this.config[i].Rows[j].key,leftOffset+380 - txtWidth,f2,mediumTextOptions2)
                      .drawPath(leftOffset + tableLeftOffset,box_start2-(tableSize2-14),leftOffset+582,box_start2-(tableSize2-14),pathStrokeOptions)

                    if(this.config[i].Rows[j].summary_row) {
                      cxt.drawPath(leftOffset + tableLeftOffset,box_start2-(tableSize2-26),leftOffset+582,box_start2-(tableSize2-26),pathStrokeOptions);
                    }
                    tempTextFontOptions = mediumTextOptions2;
                  } else {
                    cxt.writeText(this.config[i].Rows[j].key,leftOffset + tableTextLeftOffset ,f2,mediumTextOptions2);
                    if(this.config[i].Rows[j].superscripts) {
                      let w = mediumTextOptions2.font.calculateTextDimensions(this.config[i].Rows[j].key,mediumTextOptions2.size).width + 2;
                      let redius = 3;
                      await cxt.drawCircle(leftOffset + tableTextLeftOffset + w + redius,f2 + 2,redius,
                        {
                            type:'stroke',
                            width: 0.6,
                            color:'black'
                        });
                      cxt.writeText(this.config[i].Rows[j].superscripts,leftOffset + tableTextLeftOffset + w + 2,f2 + 1,{
                        font: mediumTextOptions2.font,
                        size: 3.5,
                        colorspace: 'gray',
                        color: 0x00,
                        underline: false
                      });
                    }
                    if(this.config[i].Rows[j].subKey){
                      let w = mediumTextOptions2.font.calculateTextDimensions(this.config[i].Rows[j].key,mediumTextOptions2.size).width + 3;
                      cxt.writeText(this.config[i].Rows[j].subKey,leftOffset + tableTextLeftOffset  + w,f2,tempTextFontOptions);
                    }
                    tempTextFontOptions = textFontOptions;
                  }
                  for(let k = 0; k < this.config[i].Rows[j].values.length; k++){
                      let t2 = tempTextFontOptions.font.calculateTextDimensions(this.config[i].Rows[j].values[k]+'',tempTextFontOptions.size);
                      cxt.writeText(this.config[i].Rows[j].values[k],this.page_width-(leftOffset + t2.width + table_paddings2[k+1]),f2,tempTextFontOptions)
                  }
                  f2 -= 13
                }
            }
            table_paddings2 = [];
            table_paddings2.push(0, 100, 60, 15);
            if(this.config[i].double_heading){
                cxt.drawRectangle(leftOffset+ 0.1 + tableLeftOffset,box_start2-(17+18),269.6,18,pathFillOptions)
                  .drawPath(leftOffset + tableLeftOffset,box_start2-17,leftOffset+582,box_start2-17,pathStrokeOptions)
                   .writeText(this.config[i].Columns2[0].name,leftOffset + tableTextLeftOffset ,box_start2-(17+11),mediumTextOptions2)
                for(let j = 1; j < this.config[i].Columns2.length; j++){
                    let d2 = mediumFont.calculateTextDimensions(this.config[i].Columns2[j].name,7);
                    if(this.config[i].name === 'Occupancy'){
                        table_paddings2 = [];
                        table_paddings2.push(0, 150, 100, 60, 15);
                    }
                    cxt.writeText(this.config[i].Columns2[j].name,this.page_width-(leftOffset + d2.width + table_paddings2[j]),box_start2-(17+11),{
                      font: mediumFont,
                      size: 7,
                      colorspace: 'gray',
                      color: 0x00,
                      underline: false
                    })
                }
                //row part here if the table has double heading..............
                let f2 = box_start2 -(11 + 17 + 15) //11 for the column heading, 17 for second heading of column  and 15 for next entry below it
                let tempTextFontOptions = null;
                for(let j = 0; j < this.config[i].Rows.length; j++){

                  if(this.config[i].Rows[j].key !== 'Total' && !this.config[i].Rows[j].summary_row && j % 2 === 1) {
                    cxt.drawRectangle(leftOffset + tableLeftOffset+ + 0.6,f2 - 3.5,268.5,13, {
                      type: 'fill',
                      color: 0xf9fafb,
                      opacity: 0.9
                    })
                  }

                  if(this.config[i].Rows[j].key === 'Total' || this.config[i].Rows[j].summary_row){
                    let txtWidth = mediumTextOptions2.font.calculateTextDimensions(this.config[i].Rows[j].key,mediumTextOptions2.size).width - 17;
                    cxt.writeText(this.config[i].Rows[j].key,leftOffset + 367 - txtWidth,f2,mediumTextOptions2)
                      .drawPath(leftOffset + tableLeftOffset,box_start2-(tableSize2-14),leftOffset+582,box_start2-(tableSize2-14),pathStrokeOptions);

                    if(this.config[i].Rows[j].summary_row) {
                      cxt.drawPath(leftOffset + tableLeftOffset,box_start2-(tableSize2-26),leftOffset+582,box_start2-(tableSize2-26),pathStrokeOptions);
                    }

                    tempTextFontOptions = mediumTextOptions2;

                  } else {
                    cxt.writeText(this.config[i].Rows[j].key,leftOffset + tableTextLeftOffset ,f2,mediumTextOptions2);
                    if(this.config[i].Rows[j].subKey){
                      let w = mediumTextOptions2.font.calculateTextDimensions(this.config[i].Rows[j].key,mediumTextOptions2.size).width + 3;
                      cxt.writeText(this.config[i].Rows[j].subKey,leftOffset + tableTextLeftOffset  + w,f2,tempTextFontOptions);
                    }
                    tempTextFontOptions = textFontOptions;
                  }
                  for(let k = 0; k < this.config[i].Rows[j].values.length; k++){
                    let t2 = tempTextFontOptions.font.calculateTextDimensions(this.config[i].Rows[j].values[k]+'',tempTextFontOptions.size);
                    cxt.writeText(this.config[i].Rows[j].values[k],this.page_width-(leftOffset + t2.width + table_paddings2[k+1]),f2,tempTextFontOptions)
                  }

                  f2 -= 13
                }

                table_paddings2 = [];
                table_paddings2.push(0, 100, 60, 15);
            }

            box_start2 = box_start2 - (tableSize2 + 7);
            continue;
        }

        cxt.drawRectangle(leftOffset+8,box_start-17,285,17,pathFillOptions)
           .drawRectangle(leftOffset+8,box_start-tableSize,285,tableSize,pathStrokeOptions)
           .writeText(this.config[i].Columns[0].name,leftOffset+11,box_start-11,{
            font: mediumFont,
            size: 8,
            colorspace: 'gray',
            color: 0x00,
            underline: false
           })

        
        for(let j = 1; j < this.config[i].Columns.length; j++){
          let d = mediumFont.calculateTextDimensions(this.config[i].Columns[j].name,7);
          if(this.config[i].Columns.length === 3){
              table_paddings = [];
              table_paddings.push(0, 355, 305, 0);
          }
          cxt.writeText(this.config[i].Columns[j].name,this.page_width-(leftOffset + d.width + table_paddings[j]),box_start-11,mediumTextOptions2)
        }
        let f = box_start -(11 + 15) //11 for the column heading and 15 for next entry below it
        let tempTextFontOptions = null;
        for(let j = 0; j < this.config[i].Rows.length; j++){

          if(this.config[i].Rows[j].key !== 'Total' && this.config[i].Rows[j].key !== 'Subtotal' && !this.config[i].Rows[j].summary_row  && j % 2 === 1) {
            cxt.drawRectangle(leftOffset + 8.5 ,f - 3.5,284,13, {
              type: 'fill',
              color: 0xf9fafb,
              opacity: 0.9
            })
          }

          if(this.config[i].Rows[j].key === 'Total' || this.config[i].Rows[j].key === 'SubTotal' || this.config[i].Rows[j].summary_row){
            let txtWidth = 0;
            if(this.config[i].Rows[j].summary_row) {
              txtWidth = font.calculateTextDimensions(this.config[i].Rows[j].key,mediumTextOptions2.size).width;
              await cxt.writeText(this.config[i].Rows[j].key,leftOffset+90-txtWidth,f,{
                ...mediumTextOptions2,
                font:font
              });
            } else {
              txtWidth = font.calculateTextDimensions(this.config[i].Rows[j].key,mediumTextOptions2.size).width;
              await cxt.writeText(this.config[i].Rows[j].key,leftOffset+90-txtWidth,f,{
                ...mediumTextOptions2,
                font:mediumFont
              });
            }
            
            await cxt.drawPath(leftOffset+8,f + 10,leftOffset+293,f+10,pathStrokeOptions);
            tempTextFontOptions = mediumTextOptions2;
            
          } else {
            cxt.writeText(this.config[i].Rows[j].key,leftOffset+11,f,mediumTextOptions2);
            if(this.config[i].Rows[j].superscripts) {
              let w = mediumTextOptions2.font.calculateTextDimensions(this.config[i].Rows[j].key,mediumTextOptions2.size).width + 2;
              let redius = 3;
              await cxt.drawCircle(leftOffset + 11 + w + redius,f + 2,redius,
                {
                    type:'stroke',
                    width: 0.6,
                    color:'black'
                });
              cxt.writeText(this.config[i].Rows[j].superscripts,leftOffset + 13 + w,f + 1,{
                font: mediumTextOptions2.font,
                size: 3.5,
                colorspace: 'gray',
                color: 0x00,
                underline: false
              });
            }

            tempTextFontOptions = textFontOptions;
          }
          for(let k = 0; k < this.config[i].Rows[j].values.length; k++){
            
            if(this.config[i].Rows[j].key === 'Total' || this.config[i].Rows[j].key === 'SubTotal' ) {
              tempTextFontOptions.font = mediumFont;
            } else {
              tempTextFontOptions.font = font;
            }

            let t = tempTextFontOptions.font.calculateTextDimensions(this.config[i].Rows[j].values[k]+'',tempTextFontOptions.size);
            cxt.writeText(this.config[i].Rows[j].values[k],this.page_width-(leftOffset + t.width + table_paddings[k+1]),f,tempTextFontOptions)
          }
          f -= 13
        }

        table_paddings = [];
        table_paddings.push(0, 410, 355, 305);

        box_start = box_start - (tableSize + 7);
           //.drawPath(leftOffset+150,topOffset-105,leftOffset+300,topOffset-105,pathStrokeOptions)

    }



  }

  async drawReportBoxes(cxt,leftOffset,topOffset,font,mediumFont,boldFont,pathFillOptions,pathStrokeOptions){

    let textFontOptions = {
      font: font,
      size: 8,
      colorspace: 'gray',
      color: 0x00,
      underline: false
    };

    let mediumTextOptions2 = {
      font: mediumFont,
      size: 9,
      colorspace: 'gray',
      color: 0x00,
      underline: false
    };

    let boldOption = {
      font: boldFont,
      size: 10,
      colorspace: 'gray',
      color: 0x00,
      underline: false
    };

    let dailyLabel = moment(this.data.start_date).format('MM/DD/YY');

    await cxt.drawRectangle(leftOffset+8.2,topOffset-90,154.5,24.7,pathFillOptions)
      .drawRectangle(leftOffset+8,topOffset-180,155,115,pathStrokeOptions)
      .drawPath(leftOffset+8,topOffset-90,leftOffset+163,topOffset-90,pathStrokeOptions)
      .drawPath(leftOffset+8,topOffset-135,leftOffset+163,topOffset-135,pathStrokeOptions)
       //here the text of this box----------------
    
    let newTopOffset = topOffset - 82;
    await cxt.writeText('Net Revenue', leftOffset + 20 , newTopOffset, boldOption);

    let revenueMonthly = this.formatMoney(this.data.data.net_revenue.revenue_mtd);
    newTopOffset -= 30;
    mediumTextOptions2.size = 10
    await cxt.writeText(revenueMonthly, leftOffset + 15 , newTopOffset, mediumTextOptions2);

    let revenuWidth = mediumFont.calculateTextDimensions(revenueMonthly+'',mediumTextOptions2.size).width + 18;
    textFontOptions.size = 9
    await cxt.writeText('Month-to-date', leftOffset + revenuWidth, newTopOffset, textFontOptions);

    let revenueLastMonth = this.formatMoney(this.data.data.net_revenue.previous_mtd);
    newTopOffset -= 13  ;
    textFontOptions.size = 7
    await cxt.writeText(revenueLastMonth+' same day last month', leftOffset + 15 , newTopOffset, textFontOptions);


    let revenueYearly = this.formatMoney(this.data.data.net_revenue.revenue_ytd);
    newTopOffset -= 30;
    mediumTextOptions2.size = 10
    await cxt.writeText(revenueYearly, leftOffset + 15 , newTopOffset, mediumTextOptions2);

    revenuWidth = mediumFont.calculateTextDimensions(revenueYearly+'',mediumTextOptions2.size).width + 18;
    textFontOptions.size = 9
    await cxt.writeText('Year-to-date', leftOffset+ revenuWidth, newTopOffset, textFontOptions);

    let revenueLastYear = this.formatMoney(this.data.data.net_revenue.previous_ytd);
    newTopOffset -= 13;
    textFontOptions.size = 7
    await cxt.writeText(revenueLastYear+' same day last year', leftOffset + 15 , newTopOffset, textFontOptions);

    /********************* Occupancy Table ********************/


    cxt.drawRectangle(leftOffset+170.4,topOffset-90,157.4,24.8,pathFillOptions)
      .drawRectangle(leftOffset+170,topOffset-180,158,115,pathStrokeOptions)
      .drawPath(leftOffset+170,topOffset-90,leftOffset+328,topOffset-90,pathStrokeOptions)
      .drawPath(leftOffset+170,topOffset-120,leftOffset+328,topOffset-120,pathStrokeOptions)
      .drawPath(leftOffset+170,topOffset-150,leftOffset+328,topOffset-150,pathStrokeOptions)
       //here the text of this box----------------

    newTopOffset = topOffset - 82;
    mediumTextOptions2.size = 8;
    await cxt.writeText('Occupancy', leftOffset + 175 , newTopOffset, boldOption)
            .writeText(dailyLabel, leftOffset + 245, newTopOffset, mediumTextOptions2)
            .writeText('YOY', leftOffset + 303, newTopOffset, mediumTextOptions2);

    newTopOffset -= 27;
    mediumTextOptions2.size = 9;
    await cxt.writeText('SQ FT', leftOffset + 175 , newTopOffset, mediumTextOptions2)
      .writeText('Spaces', leftOffset + 175, newTopOffset - 30, mediumTextOptions2)
      .writeText('ECON', leftOffset + 175, newTopOffset - 60, mediumTextOptions2);
    
    let redius = 3.5;
    let temp_w = mediumFont.calculateTextDimensions('ECON',mediumTextOptions2.size).width + 8;
    await cxt.drawCircle(leftOffset + 175 + temp_w,newTopOffset - 57,redius,
    {
      type:'stroke',
      width: 0.6,
      color:'black'
    });

    await cxt.writeText('1',leftOffset + 175 + temp_w - 1,newTopOffset- 58.2,{
      font: mediumTextOptions2.font,
      size: 4,
      colorspace: 'gray',
      color: 0x00,
      underline: false
    });
    
    let occupancy =  this.data.data.occupancy;
    let colWidth = mediumFont.calculateTextDimensions(dailyLabel,8).width;
    let txt = utils.formatPersontage(occupancy.sqft.current);
    let textWidth = mediumTextOptions2.font.calculateTextDimensions(txt,mediumTextOptions2.size).width;
    cxt.writeText(txt, leftOffset + 245 + colWidth - textWidth, newTopOffset, mediumTextOptions2);

    txt = utils.formatPersontage(occupancy.units.current);
    textWidth = mediumTextOptions2.font.calculateTextDimensions(txt,mediumTextOptions2.size).width;
    cxt.writeText(txt, leftOffset + 245 + colWidth - textWidth, newTopOffset - 30, mediumTextOptions2);

    txt = utils.formatPersontage(occupancy.econ.current);
    textWidth = mediumTextOptions2.font.calculateTextDimensions(txt,mediumTextOptions2.size).width;
    cxt.writeText(txt, leftOffset + 245 + colWidth - textWidth, newTopOffset - 60, mediumTextOptions2);


    textFontOptions.color = occupancy.sqft.last_year_change >= 0 ? 'black': 0x637381;
    textFontOptions.size = 9;
    colWidth = mediumFont.calculateTextDimensions('YOY',8).width;

    txt = utils.formatPersontage(occupancy.sqft.last_year_change);
    txt = (occupancy.sqft.last_year_change > 0 ? '+':'') + txt;

    textWidth = textFontOptions.font.calculateTextDimensions(txt,textFontOptions.size).width;
    cxt.writeText(txt, leftOffset + 303 + colWidth - textWidth, newTopOffset, textFontOptions);

    textFontOptions.color = occupancy.units.last_year_change >= 0 ? 'black': 0x637381;
    txt = utils.formatPersontage(occupancy.units.last_year_change);
    txt = (occupancy.units.last_year_change > 0 ? '+':'') + txt;

    textWidth = textFontOptions.font.calculateTextDimensions(txt,textFontOptions.size).width;
    cxt.writeText(txt, leftOffset + 303 + colWidth - textWidth, newTopOffset - 30, textFontOptions);

    textFontOptions.color = occupancy.econ.last_year_change >= 0 ? 'black': 0x637381;
    txt = utils.formatPersontage(occupancy.econ.last_year_change);
    txt = (occupancy.econ.last_year_change > 0 ? '+':'') + txt;

    textWidth = textFontOptions.font.calculateTextDimensions(txt,textFontOptions.size).width;
    cxt.writeText(txt, leftOffset + 303 + colWidth - textWidth, newTopOffset - 60, textFontOptions);

    leftOffset+= 18;
        
    cxt.drawRectangle(leftOffset+317.4,topOffset-90,119.4,24.8,pathFillOptions)
      .drawRectangle(leftOffset+317,topOffset-180,120,115,pathStrokeOptions)
      .drawPath(leftOffset+317,topOffset-90,leftOffset+437,topOffset-90,pathStrokeOptions)
      .drawPath(leftOffset+317,topOffset-120,leftOffset+437,topOffset-120,pathStrokeOptions)
      .drawPath(leftOffset+317,topOffset-150,leftOffset+437,topOffset-150,pathStrokeOptions)
       //here the text of this box----------------


    newTopOffset = topOffset - 82;
    mediumTextOptions2.size = 8;
   

    await cxt.writeText('Activity', leftOffset + 323, newTopOffset, boldOption)
            .writeText('MTD', leftOffset + 390, newTopOffset, mediumTextOptions2)
            .writeText('YTD', leftOffset + 417, newTopOffset, mediumTextOptions2);
   
       newTopOffset -= 27;
       mediumTextOptions2.size = 9;
       await cxt.writeText('Move-Ins', leftOffset + 323 , newTopOffset, mediumTextOptions2)
         .writeText('Move Outs', leftOffset + 323, newTopOffset - 30, mediumTextOptions2)
         .writeText('Net', leftOffset + 323, newTopOffset - 60, mediumTextOptions2);


    let rentalActivity =  this.data.data.rental_activity;
    colWidth = mediumFont.calculateTextDimensions('MTD',8).width;
    txt = utils.formatNumber(rentalActivity.move_ins.mtd);
    textWidth = mediumTextOptions2.font.calculateTextDimensions(txt+'',mediumTextOptions2.size).width;
    cxt.writeText(txt, leftOffset + 390 + colWidth - textWidth, newTopOffset, mediumTextOptions2);

    txt = utils.formatNumber(rentalActivity.move_out.mtd);
    textWidth = mediumTextOptions2.font.calculateTextDimensions(txt+'',mediumTextOptions2.size).width;
    cxt.writeText(txt, leftOffset + 390 + colWidth - textWidth, newTopOffset - 30, mediumTextOptions2);

    txt = utils.formatNumber(rentalActivity.move_ins.mtd - rentalActivity.move_out.mtd);
    textWidth = mediumTextOptions2.font.calculateTextDimensions(txt+'',mediumTextOptions2.size).width;
    cxt.writeText(txt, leftOffset + 390 + colWidth - textWidth, newTopOffset - 60, mediumTextOptions2);


     
    colWidth = mediumFont.calculateTextDimensions('YTD',8).width;
    txt = utils.formatNumber(rentalActivity.move_ins.ytd);
    textWidth = mediumTextOptions2.font.calculateTextDimensions(txt+'',mediumTextOptions2.size).width;
    cxt.writeText(txt, leftOffset + 417 + colWidth - textWidth, newTopOffset, mediumTextOptions2);

    txt = utils.formatNumber(rentalActivity.move_out.ytd);
    textWidth = mediumTextOptions2.font.calculateTextDimensions(txt+'',mediumTextOptions2.size).width;
    cxt.writeText(txt, leftOffset + 417 + colWidth - textWidth, newTopOffset - 30, mediumTextOptions2);

    txt = utils.formatNumber(rentalActivity.move_ins.ytd - rentalActivity.move_out.ytd);
    textWidth = mediumTextOptions2.font.calculateTextDimensions(txt+'',mediumTextOptions2.size).width;
    cxt.writeText(txt, leftOffset + 417 + colWidth - textWidth, newTopOffset - 60, mediumTextOptions2);

    

    cxt.drawRectangle(leftOffset+444.4,topOffset-90,119.4,24.8,pathFillOptions)
      .drawRectangle(leftOffset+444,topOffset-180,120,115,pathStrokeOptions)
      .drawPath(leftOffset+444,topOffset-90,leftOffset+564,topOffset-90,pathStrokeOptions)
      .drawPath(leftOffset+444,topOffset-120,leftOffset+564,topOffset-120,pathStrokeOptions)
      .drawPath(leftOffset+444,topOffset-150,leftOffset+564,topOffset-150,pathStrokeOptions)
       //here the text of this box----------------

    newTopOffset = topOffset - 82;
    mediumTextOptions2.size = 8;
    await cxt.writeText('Leads', leftOffset + 450 , newTopOffset, boldOption)
            .writeText('Total', leftOffset + 494, newTopOffset, mediumTextOptions2)
            .writeText('Converted', leftOffset + 520, newTopOffset, mediumTextOptions2);
      
    newTopOffset -= 27;
    mediumTextOptions2.size = 9;
    await cxt.writeText(dailyLabel, leftOffset + 450 , newTopOffset, mediumTextOptions2)
      .writeText('MTD', leftOffset + 450, newTopOffset - 30, mediumTextOptions2)
      .writeText('YTD', leftOffset + 450, newTopOffset - 60, mediumTextOptions2);

    let leadsData =  this.data.data.leads_data;
    colWidth = mediumFont.calculateTextDimensions('Total',8).width;
    txt = utils.formatNumber(leadsData.total.daily);
    textWidth = mediumTextOptions2.font.calculateTextDimensions(txt+'',mediumTextOptions2.size).width;
    cxt.writeText(txt, leftOffset + 494 + colWidth - textWidth, newTopOffset, mediumTextOptions2);

    txt = utils.formatNumber(leadsData.total.mtd);
    textWidth = mediumTextOptions2.font.calculateTextDimensions(txt+'',mediumTextOptions2.size).width;
    cxt.writeText(txt, leftOffset + 494 + colWidth - textWidth, newTopOffset - 30, mediumTextOptions2);

    txt = utils.formatNumber(leadsData.total.ytd);
    textWidth = mediumTextOptions2.font.calculateTextDimensions(txt+'',mediumTextOptions2.size).width;
    cxt.writeText(txt, leftOffset + 494 + colWidth - textWidth, newTopOffset - 60, mediumTextOptions2);


    colWidth = mediumFont.calculateTextDimensions('Converted',8).width;
    txt = utils.formatNumber(leadsData.leads_converted.daily);
    textWidth = mediumTextOptions2.font.calculateTextDimensions(txt+'',mediumTextOptions2.size).width;
    cxt.writeText(txt, leftOffset + 520 + colWidth - textWidth, newTopOffset, mediumTextOptions2);

    txt = utils.formatNumber(leadsData.leads_converted.mtd);
    textWidth = mediumTextOptions2.font.calculateTextDimensions(txt+'',mediumTextOptions2.size).width;
    cxt.writeText(txt, leftOffset + 520 + colWidth - textWidth, newTopOffset - 30, mediumTextOptions2);

    txt = utils.formatNumber(leadsData.leads_converted.ytd);
    textWidth = mediumTextOptions2.font.calculateTextDimensions(txt+'',mediumTextOptions2.size).width;
    cxt.writeText(txt, leftOffset + 520 + colWidth - textWidth, newTopOffset - 60, mediumTextOptions2);
  
  }

  async generate(socket){
    let ws = new ms.WritableStream()

    var pdfWriter = hummus.createWriter(new hummus.PDFStreamForResponse(ws));

    var font = pdfWriter.getFontForFile(`${settings.config.base_path}/fonts/Graphik-Regular.ttf`);
    var mediumFont  = pdfWriter.getFontForFile(`${settings.config.base_path}/fonts/Graphik-Medium.ttf`);
    var boldFont  = pdfWriter.getFontForFile(`${settings.config.base_path}/fonts/Graphik-Bold.ttf`);
    var semiBoldFont = pdfWriter.getFontForFile(`${settings.config.base_path}/fonts/Graphik-Semibold-Regular.ttf`)

    let url = this.data.company.webLogo && this.data.company.webLogo.mobile ? this.data.company.webLogo.mobile: null;
    let rp = url ? await utils.getLogoPath(url, this.data.company.name) : null;
    this.logoUrl = rp && rp.status === 200 ? rp.path : null;

    
    var page = pdfWriter.createPage();
    page.mediaBox = [0,0,this.page_width,this.page_height];
    let cxt = pdfWriter.startPageContentContext(page)
  
    let leftOffset = 10;
    let topOffset = 802;   

    var pathFillOptions = {type: 'fill', color: 0xdfe3e8,  opacity: 0.5};
    var pathStrokeOptions = {color: 0x9f9f9f, width:0.05};

    this.setConfig();

    await this.drawHeader(cxt,pdfWriter,leftOffset,topOffset,font,mediumFont,semiBoldFont);
    topOffset +=10;
    await this.drawReportBoxes(cxt,leftOffset,topOffset,font,mediumFont,boldFont,pathFillOptions,pathStrokeOptions);
    await this.drawReportTables(cxt,leftOffset,topOffset,font,mediumFont,pathFillOptions,pathStrokeOptions);

    let printText = 'Generated on';
    let printTextWidth = mediumFont.calculateTextDimensions(printText,6).width;
    await cxt.writeText(printText, this.margin_left,19, {
      font: mediumFont,
      size: 6,
      colorspace: 'black',
      color: 0x00,
    });


    printText = `${utils.formatLocalTimeZone(this.data.timeZone,"dddd, MMMM DD, YYYY h:mm:ss A",true)}`;
    await cxt.writeText(printText, this.margin_left + printTextWidth + 3 ,19, {
      font: font,
      size: 6,
      colorspace: 'black',
      color: 0x00,
    });

    let reportGuide = [
      {
        key: 'ECON (Economic Occupancy):',
        value: 'Revenue vs. potential revenue expressed as a percentage.',
      },
      {
        key: 'Write-Off',
        value: 'A reduction of potential revenue that is declared non-collectable (bad debt).',
      },
      {
        key: 'Applied Credits',
        value: 'The number of payments made without the use of cash, such as with',
        value2: 'manager credits.'
      },
      {
        key: 'No Rent Change in Last 12 Months:',
        value: 'The number of tenants, and the percentage of all your',
        value2: 'tenants, whose rent has not changed within the last 12 months.'
      },
      {
        key: 'Delinquency by Days:',
        value: 'This table shows you occupied spaces where the paid through date',
        value2: 'has passed and no payment was made.'
      },
      {
        key: '% Total (Delinquency by Days):',
        value: 'This percentage is calculated by dividing your total number',
        value2: 'of delinquent spaces by the total number of occupied spaces.'
      },
      // {
      //   key: 'Reserve Balance:',
      //   value: ' A payment balance that a tenant has on their account that has not been',
      //   value2: 'applied to an invoice.'
      // },
      {
        key: 'Misc. Deposits:',
        value: 'Other liabilities, such as security deposits and cleaning deposits.'
      },
      {
        key: '% of Change (Rent Change Summary):',
        value: ' The percent difference between the original rent',
        value2: 'and the new rent.'
      },
      {
        key: 'Rent Variance:',
        value: 'The dollar difference between the original rent and the new rent.'
      },
    ]
    
    leftOffset = 322;
    topOffset = 160;
    let txtMedOpt = {
      font: mediumFont,
      size: 6,
      colorspace: 'black',
      color: 0x00,
    }
    let txtOpt = {
      font: font,
      size: 6,
      colorspace: 'black',
      color: 0x00,
    }
    let txtWidth = 0;

    await cxt.writeText('Report Guide:', leftOffset ,topOffset, txtMedOpt);
    await cxt.drawPath(leftOffset,topOffset-2,leftOffset+40,topOffset-2,{color: 'black', width:0.2});

    topOffset-=11;
    let redius = 3.5;

    for(let i=0;i<reportGuide.length;i++){
      await cxt.writeText((i+1), leftOffset + (i === 9 ? 2:2.5),topOffset+1, {
        font: mediumFont,
        size: 3.5,
        colorspace: 'black',
        color: 0x00,
      });

      await cxt.drawCircle(leftOffset + redius,topOffset + 2,redius,
      {
          type:'stroke',
          width: 0.6,
          color:'black'
      });

      await cxt.writeText(reportGuide[i].key, leftOffset + 10 ,topOffset, txtMedOpt);
      txtWidth = txtMedOpt.font.calculateTextDimensions(reportGuide[i].key,txtMedOpt.size).width + 2.5;
      await cxt.writeText(reportGuide[i].value, leftOffset + 10 + txtWidth ,topOffset, txtOpt);
      if(reportGuide[i].value2) {
        topOffset -= 7;
        await cxt.writeText(reportGuide[i].value2, leftOffset + 10 ,topOffset, txtOpt);
      }
      topOffset -= 9;
    }

    pdfWriter.writePage(page);
    console.log('Reach at end');
    pdfWriter.end();

    let bufferResult = ws.toBuffer();
    ws.end();

    if(socket){
      await socket.createEvent("pdf_progress", {
        percentage: 100
      })
    }

    return bufferResult;
  
  }

  formatMoney(value,showDoller = true){
		if (typeof value === 'undefined' ||  value === false || value === null  ) return '';

		if(value < 0) {
			value *= -1;
			value = value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})
			return `(${showDoller ? '$': ''}${value})`;
		} else {
			value = value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})
			return `${showDoller ? '$': ''}${value}`;
		}
	}

}

module.exports = ManagementSummary;