'use strict';
var hummus = require('hummus');
var utils    = require(__dirname + '/utils.js');
var moment = require('moment');
var ms = require('memory-streams');
const GenericReport = require('./generic_report.js')

var c_scale_down_size = 9;
var settings    = {
    config:{
      base_path: `${__dirname}/../public/`
    }
}

class OccupancyStatisticsReport extends GenericReport{
  constructor(config, property, start_date, end_date, company, title, timeZone, dataLength) {
    super(config, property, start_date, end_date, company, title, timeZone, dataLength);

    this.page_width = 842;
      this.page_height = 595;

      this.margin_left = 20;
      this.margin_right = 20;
      this.margin_top = 40;
      this.margin_bottom = 20;

      this.headerOffset = 40;
      this.footerOffset = 40;

      this.font = null;
      this.mediumFont = null;
      this.boldFont = null;
      this.logoUrl = null;
      this.report_notes = [
        {
          key: '(1) Avg Set Rate:',
          value: 'A rate used as a consistent, seldom-changing rate used to gauge the overall financial potential of your property.'
        },
        {
          key: '(2) Avg Sell Rate:',
          value: 'rent quoted by the property; not necessarily the same as the rent the tenant will pay if they enter a rental agreement'
        },
        {
          key: '(3) Avg Rent:',
          value: 'The current rate charged as rent on an individual rental item (space). This may differ from the street rate (sell rate).'
        },
        {
          key: '(4) Gross Potential Revenue:',
          value: 'Amount of rent that would be earned if each rental item (space) was rented at the sell rate (street rate).'
        },
        {
          key: '(5) Gross Occupied Revenue:',
          value: 'This is expressed as the sum of rental income for occupied spaces and sell rate for available and offline spaces.'
        },
        {
          key: '(6) Actual Occupied Revenue:',
          value: 'the amount of revenue from rent expected to be earned. Calculated by totaling the actual rental rates of occupied spaces.'
        },
        {
          key: '(7) Income Occ % (Income Occupancy):',
          value: 'Actual occupied rates as a percentage of the Gross Occupied rates'
        },
        {
          key: '(8) Econ Occ % (Economic Occupancy):',
          value: 'Revenue vs. potential revenue expressed as a percentage.'
        },
        {
          key: '(9) Avg LOS MO (Averate Length of Stay based on move outs:',
          value: 'refers to the average duration in days that a tenant remained at a property.'
        },
        {
          key: '',
          value: 'It is generally calculated by finding the tenant\'s move-in date and move-out date, then determining the difference .'
        },
        {
          key: '(10) Economic Vacancy:',
          value: 'This is expressed as the variance between Gross Occupied and Gross Potential.'
        },
        {
          key: '(11) Gross Complimentary Revenue:',
          value: 'amount of rent that would be earned if each complimentary space was rented at the sell rate/set rate.'
        },
        {
          key: '(12) Gross Offline Revenue:',
          value: 'Amount of rent that would be earned if each offline space was rented at the sell rate/set rate.'
        },
        {
          key: '(13) Promotions:',
          value: 'The total amount of promotional discounts recognized by accounting. Promotions are marketing incentives formally administered by the property to entice new or existing tenants to rent.'
        },
        {
          key: '(14) Discounts (Non-expiring):',
          value: 'The total amount of discounts that are recognized by accounting and affect the balance sheet. Non-expiring discounts occur repeatedly every month; i.e. Student, Military, Senior '
        },
        {
          key: '(15) Average Length of Stay (aggregated):',
          value: 'The aggregated duration in days considering; length of stay for moved out tenants and existing tenants.'
        },
        {
          key: '(16) Lifetime Value (based on move outs):',
          value: 'Helps identify how much revenue one can expect to earn from a tenant over the life of their relationship with the property.'
        },
        {
          key: '(17) Tenants paying over/under sell rate:',
          value: 'The count of tenants paying over the average sell rate versus the count of tenants paying under the sell rate excluding complimentary spaces. This is displayed as 2 values in one cell.'
        },
      ]
  }

  async set_summary_rows(summary, groupings) {

    let area_occupancy_occupied = 0;
    let area_occupancy_available = 0;
    let area_occupancy_offline =0;
    let area_occupancy = 0
    let total_units = 0;

    let area_occupied = 0;
    let area_vacant = 0;
    let area_offline = 0;

    let total_sell_rate_occupied = 0;
    let total_sell_rate_vacant = 0;
    let total_sell_rate_offline = 0;
    

    for (var key in groupings.groups) {
      if (key === "standard_storage_subtotal" || key === "parking" || key === "standard_storage" || key === "parking_subtotal" || key === "grande_total" || key === "total") continue
      else {if (groupings.groups[key]['area_occupancy_occupied'] !== null) area_occupancy_occupied += groupings.groups[key]['area_occupancy_occupied']
      if (groupings.groups[key]['area_occupancy_available'] !== null) area_occupancy_available += groupings.groups[key]['area_occupancy_available']
      if (groupings.groups[key]['area_occupancy_offline'] !== null) area_occupancy_offline += groupings.groups[key]['area_occupancy_offline']

      if (groupings.groups[key]['area_occupancy_occupied'] !== null) area_occupied += ((groupings.groups[key]['area_occupancy_occupied'] / 100) * groupings.groups[key]['total_area'] )
      if (groupings.groups[key]['area_occupancy_available'] !== null) area_vacant += ((groupings.groups[key]['area_occupancy_available'] / 100) * groupings.groups[key]['total_area'] )
      if (groupings.groups[key]['area_occupancy_offline'] !== null) area_offline += ((groupings.groups[key]['area_occupancy_offline'] / 100) * groupings.groups[key]['total_area'] )

      total_sell_rate_occupied += (groupings.groups[key]['avg_sell_rate'] * groupings.groups[key]['occupied_units']);
      total_sell_rate_vacant   += (groupings.groups[key]['avg_sell_rate']  * groupings.groups[key]['available_units']);
      total_sell_rate_offline  += (groupings.groups[key]['avg_sell_rate'] * groupings.groups[key]['offline_units']);

      total_units+= groupings.groups[key]['occupied_units'] + groupings.groups[key]['available_units'] + groupings.groups[key]['offline_units']}
    }

    area_occupancy += (area_occupancy_occupied+area_occupancy_available+area_occupancy_offline)

    let occupied_units = total_units - summary.available_units - summary.offline_units;

    let avg_rent_overall = summary.actual_occupied / occupied_units;
    let avg_sell_rate_occupied = total_sell_rate_occupied / occupied_units;
    let avg_sell_rate_vacant = total_sell_rate_vacant / summary.available_units;
    let avg_sell_rate_offline = total_sell_rate_offline / summary.offline_units;
    let avg_sell_rate_total = (total_sell_rate_occupied + total_sell_rate_vacant + total_sell_rate_offline) / total_units;


    // let area_occupied = (summary.total_area / total_units) * occupied_units;
    // let area_occupied = (area_occupancy_occupied / 100) * summary.total_area;
    // let area_vacant = (summary.total_area / total_units) * summary.available_units;
    // let area_offline = (summary.total_area / total_units) * summary.offline_units;

    let table_summary = [
        {
          occupancy_name: "Space Count",
          occupied: summary.occupied_units,
          vacant: summary.available_units,
          offline: summary.offline_units,
          occupancy_total: summary.num_spaces,  // Total Units
          revenue_name: "Gross Potential Revenue",
          revenue_total: summary.gross_potential,
          revenue_percentage: "100%",
          empty: '',
          other_name: "Reservation Count",
          other_total: summary.reservation_count
      },
      {
          occupancy_name: "Space Occupancy",
          occupied: utils.formatDecimalPercentage(summary.space_occupancy_occupied_pct),
          vacant:  utils.formatDecimalPercentage(summary.space_occupancy_vacant_pct),
          offline:  utils.formatDecimalPercentage(summary.space_occupancy_offline_pct),
          occupancy_total: "100%",
          revenue_name: "Economic Vacancy",
          revenue_total: summary.physical_vacancy,
          revenue_percentage: utils.formatDecimalPercentage(summary.physical_vacancy_pct),
          empty: '',
          other_name: "Complimentary Count",
          other_total: summary.complimentary_count
      },
      {
        occupancy_name: "Area",
        occupied: utils.formatNumber((summary.occupied_area),2,'-'),
        vacant: utils.formatNumber((summary.available_area),2,'-'),
        offline: utils.formatNumber((summary.offline_area),2,'-'),
        occupancy_total: utils.formatNumber((summary.total_area),2,'-'),
        revenue_name: "Gross Occupied Revenue",
        revenue_total: summary.gross_occupied,
        revenue_percentage: utils.formatDecimalPercentage(summary.gross_occupied_pct),
        empty: '',
        other_name: "Offline Count",
        other_total: summary.offline_units
      },
      {
        occupancy_name: "Area Occupancy",
        occupied: utils.formatDecimalPercentage(summary.area_occupancy_occupied_pct),
        vacant: utils.formatDecimalPercentage(summary.area_occupancy_vacant_pct),
        offline: utils.formatDecimalPercentage(summary.area_occupancy_offline_pct),
        occupancy_total: '100%',
        revenue_name: "Gross Complimentary Revenue",
        revenue_total: (-1) * summary.gross_complimentary,
        revenue_percentage: utils.formatDecimalPercentage((-1) * summary.gross_complimentary_pct),
        empty: '',
        other_name: "Avg LOS - Based on MO",
        other_total: Math.round(summary.avg_los_mo) + " Days"
      },
      {
        occupancy_name: "Average Area/Space",
        occupied: utils.formatNumber((summary.avg_area_space_occupied),2,'-'),
        vacant: utils.formatNumber((summary.avg_area_space_vacant),2,'-'),
        offline: utils.formatNumber((summary.avg_area_space_offline),2,'-'),
        occupancy_total: utils.formatNumber((summary.area_per_space),2,'-'),
        revenue_name: "Gross Offline Revenue",
        revenue_total: (-1) * summary.gross_offline,
        revenue_percentage: utils.formatDecimalPercentage((-1) * summary.gross_offline_pct),
        empty: '',
        other_name: "Avg LOS - Aggregated",
        other_total: Math.round(summary.avg_los) + " Days"
      },
      {
        occupancy_name: "Average Rent/Space",
        occupied: this.formatMoney(summary.avg_rent_space_occupied),
        vacant: this.formatMoney(summary.avg_rent_space_vacant),
        offline: this.formatMoney(summary.avg_rent_space_offline),
        occupancy_total:  this.formatMoney(summary.avg_rent_space),
        revenue_name: "Promotions",
        revenue_total: (-1) * (summary.disc_amount +summary.promo_amount),
        revenue_percentage: utils.formatDecimalPercentage((-1) * ((summary.disc_amount + summary.promo_amount) / summary.gross_potential)),
        empty: '',
        other_name: "Lifetime Value - Based on MO",
        other_total: this.formatMoney(summary.lifetime_value)
      },
      {
        occupancy_name: "Average Rent/Area (Monthly)",
        occupied: this.formatMoney(summary.avg_rent_area_occupied),
        vacant: this.formatMoney(summary.avg_rent_area_available),
        offline: this.formatMoney(summary.avg_rent_area_offline),
        occupancy_total: this.formatMoney(summary.avg_rent_area_total),
        // occupancy_total: this.formatMoney(( (summary.actual_occupied  + (avg_sell_rate_vacant * summary.available_units) + (avg_sell_rate_offline * summary.offline_units) ) / summary.total_area || 0).toFixed(2)),
        revenue_name: "Actual Occupied Revenue",
        revenue_total: summary.actual_occupied,
        revenue_percentage: utils.formatDecimalPercentage(summary.actual_occupied_pct),
        empty: '',
        other_name: "Lifetime Value - Aggregated",
        other_total: this.formatMoney(summary.lifetime_value_agg)
      },
      {
        occupancy_name: "Average Rent/Area (Annualized)",
        occupied: this.formatMoney(summary.avg_rent_area_occupied * 12),
        vacant: this.formatMoney(summary.avg_rent_area_available * 12),
        offline: this.formatMoney(summary.avg_rent_area_offline * 12),
        occupancy_total: this.formatMoney(summary.avg_rent_area_total*12),
        // occupancy_total: this.formatMoney(( (summary.actual_occupied  + (avg_sell_rate_vacant * summary.available_units) + (avg_sell_rate_offline * summary.offline_units)) / summary.total_area || 0).toFixed(2) * 12),
        revenue_name: "",
        revenue_total: "non",
        revenue_percentage: "",
        empty: '',
        other_name: "Tenants paying over/under sell rate",
        other_total: summary.tenants_over_sell_rate + "/" + summary.tenants_under_sell_rate
      },
    ]
    return table_summary;

  }

  async truncate_table_text(page_width,margin_right,total_width,cxt,columns, scale_down_size ,column_width ,margin_left , leftOffset ,padding, topOffset, textOptions, d,calculate_total, pdfWriter, summary_table_line, isBorder = false){
  
    var font = this.font;
    var mediumFont  = this.mediumFont;
    var semiBoldFont  = pdfWriter.getFontForFile(settings.config.base_path + 'fonts/Graphik-Semibold-Regular.ttf');

    let textSplitFlag = false;
    for(let j = 0; j < columns.length; j++){
      let value = '';
      let c = '';
      if (calculate_total){
        c = columns[j];
        value =  this.formatCell(d[c.key],c);
        
        // if(!value) value = '';
        column_width = columns[j].tranformedWidth;
      }
      else {
        value = columns[j].name;
        column_width = columns[j].tranformedWidth;
      }

      if(!textOptions.custom) textOptions.font = columns[j].summary_column || !calculate_total ? mediumFont: font;
      var textDimensions = textOptions.font.calculateTextDimensions(value+'',scale_down_size);
      
      textOptions.size = scale_down_size;
      if (textDimensions.width > column_width) {
        var start = 0;
        var end = 0;
        end = value.length;
        let round_off_column_width = Math.floor(column_width);
        let char_capacity = Math.floor(round_off_column_width / 3);
        switch ( true ) {
          case (scale_down_size == 6):
            end = char_capacity - 2;
              break;
          case (scale_down_size == 7):
            end = char_capacity - 6;
              break;
          case (scale_down_size == 8):
            end = char_capacity - 8;
              break;
          case (scale_down_size == 9):
            end = char_capacity - 9;
              break;
          default:
            end = char_capacity;
              break;
        }

        let toltalLength = value.length;
        let noOfSubRows = Math.ceil(toltalLength / (end));
        let subRows = [];
        let t_start = 0;
        let t_end = end;

        let seprator = ' ';
        if(columns[j].type === 'concat') {
          seprator = ','
        }

        let valueArray = this.wrapText(value.toString(),end, seprator);
        if(valueArray.length > 1) {
          subRows = valueArray;

        } else {
          for(let k=0; k < noOfSubRows; k++){
            subRows.push(value.slice(t_start,t_end))
            t_start = t_end;
            t_end += end 
          }
        }

        let row_height = 15.5;
        let m_top = 0;
        let text_lines = subRows.length;
        
        if(text_lines === 1 ){
          m_top -= scale_down_size;
        } else if (text_lines === 2 ) {
            if(!calculate_total){
              m_top = (scale_down_size >= 6 ? -scale_down_size/2 : -scale_down_size); 
            } else{
              m_top = (scale_down_size >= 6 ? -scale_down_size/2 : -2); 
            }
        } else if(text_lines >= 3) {
          m_top = 2
        }

        let newTopOffset = topOffset + scale_down_size + m_top;
        let newCeilLeftOffSet = 0;

        for(let l = 0 ; l< subRows.length; l++){

          newCeilLeftOffSet = margin_left + leftOffset + padding;

          if((columns[j].type === 'money' || columns[j].type === 'number' || columns[j].text_aligin === 'right')&& !calculate_total) {
            newCeilLeftOffSet = newCeilLeftOffSet + column_width - (padding * 2);
            let moneyTextDimensions = font.calculateTextDimensions(subRows[l],scale_down_size);
            newCeilLeftOffSet -= moneyTextDimensions.width;
          }

          await cxt.writeText(subRows[l].trim(), newCeilLeftOffSet , newTopOffset, textOptions);
          newTopOffset = newTopOffset - scale_down_size - 0.7;
          if(newTopOffset <= (topOffset - row_height) || l === 2){ // max 3 row allow
            break;
          }
        }
        
        textSplitFlag = true;
      }
      
      else {
        if(Math.round(column_width - textDimensions.width) <= 3){
          textSplitFlag = true;
          let valueArray = this.wrapText(value,value.length - 2);
          if(valueArray.length === 1) {
            valueArray = [];
            valueArray.push(value.slice(0,value.length - 2));
            valueArray.push(value.slice(value.length - 2,value.length));
          }

          if((columns[j].type === 'money' || columns[j].type === 'number' || columns[j].text_aligin === 'right') && !calculate_total) {
            let newCeilLeftOffSet = 0;
            let newTopOffset = topOffset + (scale_down_size >= 6 ? 3 : 0); 

            for(let n=0; n< valueArray.length; n++) {
              newCeilLeftOffSet = margin_left + leftOffset +  columns[j].width - padding;
              let moneyTextDimensions = font.calculateTextDimensions(valueArray[n].toFixed(2),scale_down_size);
              newCeilLeftOffSet -= moneyTextDimensions.width;

              await cxt.writeText(valueArray[n].toFixed(2), newCeilLeftOffSet , newTopOffset, textOptions);
              newTopOffset = newTopOffset - scale_down_size - 1;

            }

          } else {
            let newTopOffset = topOffset + (scale_down_size >= 6 ? 3 : 0); 
            await cxt.writeText(valueArray[0], margin_left + leftOffset + padding, newTopOffset, textOptions);
            await cxt.writeText(valueArray[1], margin_left + leftOffset + padding, newTopOffset - scale_down_size - 1, textOptions);
          }

        }
      }

      let newLeftOffSet = margin_left + leftOffset + padding
      
      if(!textSplitFlag) {
        // right align the cell
        if(columns[j].type === 'money' || columns[j].type === 'number' || columns[j].text_aligin === 'right') {
          newLeftOffSet = leftOffset + column_width + margin_right - textDimensions.width - padding;
        }
        await cxt.writeText(value, newLeftOffSet , topOffset, textOptions);
      }

      textSplitFlag = false;
      // very important logic for cell spacing
      if (calculate_total){
        leftOffset =  leftOffset +  (( (c.width || column_width ) * (page_width - margin_right  - margin_left)) / total_width);
      }
      else {
        leftOffset += columns[j].tranformedWidth;
      }

      let borderTop = topOffset
      let borderLeft = leftOffset ;
      let borderObj = {};
      let titleTextOptions = null;

      if ((j === 0 || j ===  2 || j ===  6 || j ===  12) && isBorder) {
        borderTop += 7;

        titleTextOptions = {
          font: semiBoldFont,
          size: 8,
          colorspace: 'black',
          color: 0x00,
        };

        borderLeft = calculate_total ? borderLeft += 20 : borderLeft; 

        borderObj = {
          start_x: borderLeft,
          start_y: borderTop,
          end_x: borderLeft,
          end_y: borderTop - 10
        }

        cxt.drawPath(borderObj.start_x,borderObj.start_y,borderObj.end_x,borderObj.end_y, 
        {
          color: 0x808080,
          opacity: 0.5,
          width : 0.2
        });

      }

      if ((j === 4 || j ===  8) && summary_table_line) {
        borderTop += 17;

        titleTextOptions = {
          font: semiBoldFont,
          size: 8,
          colorspace: 'black',
          color: 0x00,
        };

        borderLeft = calculate_total ? borderLeft += 20 : borderLeft; 

        borderObj = {
          start_x: borderLeft,
          start_y: borderTop,
          end_x: borderLeft,
          end_y: borderTop -  20
        }

        cxt.drawPath(borderObj.start_x,borderObj.start_y,borderObj.end_x,borderObj.end_y, 
        {
          color: 0x808080,
          opacity: 0.5,
          width : 0.2
        });
      }
    }
  }

  async printTableHeader(section, tableHeaderName, cxt, leftOffset, topOffset, padding, mediumTextOptions, boldTextOptions, first) {

    mediumTextOptions.size = 8;
    let row_height = 25;
    if(!first) row_height = 10;
    // console.log("section:",section)
      if ( tableHeaderName.length ){
        mediumTextOptions.color = 'white'
        //boldTextOptions.color = 'white'
        await cxt.writeText(tableHeaderName, leftOffset + padding, topOffset - 19, mediumTextOptions);
        topOffset -= 34;
      } else {
        topOffset -= (34/2) ;
      }

      if (first) {

      cxt.drawRectangle(leftOffset + 0.3, topOffset + 0.2 , this.page_width - this.margin_left - this.margin_right - 0.6, row_height-0.4, {
        type: 'stroke',
        color: 0x808080,
        opacity: 1,
        width :0.6
      })

      topOffset -= 10
    }
  
      let col = null;
      let leftMargin = this.margin_left;
      let textDimensions = null;
  
      mediumTextOptions.size = 7;
      mediumTextOptions.color = 'black';
  
      let total_width = 100;
      let column_width = 1;
      let margin_left = 0;
      let d = '';
  
  
      total_width = section.columns.reduce((a, b) => a + b.width, 0);
      section.columns.forEach(col => {
        col.tranformedWidth = (( col.width *  ( this.page_width - this.margin_right  - this.margin_left) ) / total_width);
      });

      if(first){
        cxt.drawRectangle(leftOffset, topOffset , this.page_width - this.margin_left - this.margin_right , 20, {
          type: 'stroke',
          color: 0x808080,
          opacity: 1,
          width :0.6
        })

        cxt.drawRectangle(leftOffset, topOffset , this.page_width - this.margin_left - this.margin_right , 20, {
          type: 'fill',
          color: 0xDFE3E8,
          opacity: 0.9,
          width :0.4
        })

        await this.truncate_text(this.page_width,this.margin_right,total_width,cxt, section.columns, 6 ,column_width ,this.margin_left ,
          0 ,padding, topOffset + 8, mediumTextOptions, d,false);
      }else{
        cxt.drawRectangle(leftOffset, topOffset , this.page_width - this.margin_left - this.margin_right , 10, {
          type: 'stroke',
          color: 0x808080,
          opacity: 1,
          width :0.6
        }) 

        await this.truncate_text(this.page_width,this.margin_right,total_width,cxt, section.columns, 6 ,column_width ,this.margin_left ,
          0 ,padding, topOffset + 3, mediumTextOptions, d,false);
      }
      
  


      
  
      // if (tableHeaderName.length) {
      //   cxt.drawRectangle(leftOffset, topOffset , this.page_width - this.margin_left - this.margin_right , 20, {
      //     type: 'stroke',
      //     color: 0x808080,
      //     opacity: 1,
      //     width :0.4
      //   }) 
      // } else {
      //   cxt.drawRectangle(leftOffset, topOffset , this.page_width - this.margin_left - this.margin_right , 20, {
      //     type: 'stroke',
      //     color: 0x808080,
      //     opacity: 1,
      //     width :0.4
      //   }) 
      // }                           
      
  
      topOffset = topOffset - row_height - 0.2;
      return topOffset;
  }

  async printHeaders(cxt, header_columns, startingLeftOffset, topOffset, titleTextOptions,textOptions,font,padding,page_width,margin_right, pdfWriter){
    let row_height = 20;
    var h_scale_down_size = 9;
    var report_name = "Occupancy Statistics Report";
    
    titleTextOptions.size = 24;
    await cxt.writeText(report_name, startingLeftOffset, topOffset , titleTextOptions);
    titleTextOptions.size = 9;

    let regularFont = pdfWriter.getFontForFile(settings.config.base_path + 'fonts/Graphik-Regular.ttf');
    let startDate = moment(this.start_date).format('dddd, MMMM Do YYYY');
    let endDate = moment(this.end_date).format('dddd, MMMM Do YYYY');
    let report_date = startDate + ' - ' + endDate;

    textOptions.size = 9;
    textOptions.font = regularFont;
    await cxt.writeText(report_date, startingLeftOffset, topOffset - 17, textOptions);

    let squareSize = 100;

    if(this.logoUrl) {
      let dim = pdfWriter.getImageDimensions(this.logoUrl); 
      let imageOptions = {
        transformation: {
          width: 100,
          height: 50,
          fit: 'overflow'
        }
      }
      let logoTopOffset =  dim.height >= 50 ? 20 : 10;
      cxt.drawImage(this.page_width - this.margin_right - 100, topOffset - logoTopOffset,this.logoUrl,imageOptions);
    } else {
      squareSize = -8;
    }

    var semiBoldFont  = pdfWriter.getFontForFile(settings.config.base_path + 'fonts/Graphik-Semibold-Regular.ttf');
    titleTextOptions.font = semiBoldFont;


    let facility_name = utils.formatFacilityName(this.property);
    let facility_address = utils.formatFacilityAddress(this.property.Address);
    let facility_phone = utils.formatPhone(this.property.Phones);

    var boldFont  = semiBoldFont;
    var facilityNameDimensions = boldFont.calculateTextDimensions(facility_name,9);
    var facilityLeftOffset = this.page_width -  this.margin_right - squareSize - facilityNameDimensions.width - 8;

    titleTextOptions.size = 9;
    titleTextOptions.color = 'black';
    await cxt.writeText(facility_name, facilityLeftOffset , topOffset + 13 , titleTextOptions);

    var mediumFont  = textOptions.font;
    textOptions.size = 7;
    textOptions.color = 'black';

    var facilityAddressDimensions = mediumFont.calculateTextDimensions(facility_address,7);
    facilityLeftOffset = this.page_width -  this.margin_right - squareSize - facilityAddressDimensions.width - 8;
    await cxt.writeText(facility_address, facilityLeftOffset , topOffset + 3 , textOptions);

    var facilityPhoneDimensions = mediumFont.calculateTextDimensions(facility_phone,7);
    facilityLeftOffset = this.page_width -  this.margin_right - squareSize - facilityPhoneDimensions.width - 8;

    await cxt.writeText(facility_phone, facilityLeftOffset , topOffset - 7 , textOptions);

    let emailOffset = this.property.Phones.length ? 17 : 7
    
    if (this.property.Emails.length) {
      let facility_email = this.property.Emails[0].email;
      let facilityEmailDimensions = mediumFont.calculateTextDimensions(facility_email, 7);
      facilityLeftOffset = this.page_width - this.margin_right - squareSize - facilityEmailDimensions.width - 8;
      await cxt.writeText(this.property.Emails[0].email, facilityLeftOffset , topOffset - emailOffset , textOptions);
    }

    var header_width_array = [];
    for(let i = 0; i < header_columns.length; i++) {
      var titleDimensions = font.calculateTextDimensions(header_columns[i].value,9);
      var h_width = Math.floor((header_columns[i].width / titleDimensions.width) * 9);
      header_width_array.push(h_width);
      if (h_width < 5) break;
    }
    h_scale_down_size = Math.min(...header_width_array);
    // h_scale_down_size = await this.scale_down_size(h_scale_down_size);
    textOptions.size = h_scale_down_size;



    topOffset = topOffset - (row_height * 2) - 20;
    if(header_columns.length){
      cxt.drawRectangle(startingLeftOffset, topOffset - ((row_height - 5)/2), page_width -20 - 20 , row_height, {
        type: 'fill',
        color: 0xDFE3E8,
        opacity: 0.9
      })
      cxt.drawRectangle(startingLeftOffset, topOffset - ((row_height - 5)/2), page_width -20 - 20 , row_height, {
        type: 'stroke',
        color: 0x808080,
        opacity: 1,
        width :0.4
      })

      cxt.drawRectangle(startingLeftOffset, topOffset - ((row_height - 5)/2), page_width -20 - 20 , row_height * 2, {
        type: 'stroke',
        color: 0x808080,
        opacity: 1,
        width :0.4
      })
    }

    var mediumFont  = pdfWriter.getFontForFile(settings.config.base_path + 'fonts/Graphik-Medium.ttf');
    textOptions.color = 'black';
    textOptions.font = mediumFont;

    let total_width = 100;
    let column_width = 1;
    let margin_left = 0;
    let d = '';
    let total = '';
    let calculate_total = false;
    await this.truncate_text(page_width,margin_right,total_width,pdfWriter,cxt, header_columns, h_scale_down_size ,column_width ,margin_left , startingLeftOffset ,padding, topOffset, textOptions, d,total,calculate_total);
  }

  async generate(socket) {
    let ws = new ms.WritableStream()
    let pdfWriter = hummus.createWriter(new hummus.PDFStreamForResponse(ws));

    this.font = pdfWriter.getFontForFile(settings.config.base_path + 'fonts/Graphik-Regular.ttf');
    this.mediumFont  = pdfWriter.getFontForFile(settings.config.base_path + 'fonts/Graphik-Medium.ttf');
    this.boldFont  = pdfWriter.getFontForFile(settings.config.base_path + 'fonts/Graphik-Bold.ttf');

    var font = this.font;
    var mediumFont  = this.mediumFont;
    var boldFont  = this.boldFont;

    let url = this.company.webLogo && this.company.webLogo.mobile ? this.company.webLogo.mobile: null;
    let rp = url ? await utils.getLogoPath(url, this.company.name) : null;
    this.logoUrl = rp && rp.status === 200 ? rp.path : null;

    let textOptions = {
      font: font,
      size: 10,
      colorspace: 'black',
      color: 0x00,
      underline: false
    };

    let mediumTextOptions = {
      font: mediumFont,
      size: 11,
      colorspace: 'black',
      color: 0x00,
      underline: false
    };

    let boldTextOptions = {
      font: boldFont,
      size: 21,
      colorspace: 'black',
      color: 0x00,
      underline: false
    };

    let current_page = pdfWriter.createPage(0,0,this.page_width,this.page_height);
    let cxt = pdfWriter.startPageContentContext(current_page);

    let topOffset = this.page_height - this.margin_top;
    let leftOffset = this.margin_left;
    let padding = 5;

    await this.printHeader(cxt,pdfWriter, leftOffset, topOffset, textOptions, boldTextOptions)
    topOffset -= 20;

    let row_height = 10;
      let table_border_height = null;
      let section = null
      let section_rows = 0;
      let total_width = 0;
      let page_number = 0;
      
      this.dataLength = this.config[0].rows.length ? this.config[0].rows.length : 0;
      this.dataLength += this.config[1].rows.length  ? this.config[1].rows.length  : 0;
      this.dataLength += this.config[2].rows.length  ? this.config[2].rows.length  : 0;
      console.log('Total_page_number', this.dataLength)
      
      let total_page_no = this.dataLength % 50 === 0 ? (this.dataLength / 50) + 1: Math.ceil(this.dataLength / 50);
      total_page_no = this.dataLength +1;
      let pcount = Math.ceil(total_page_no / 100) * 5;
    
      for(let i=0 ;i<this.config.length; i++) { // section loop
  
        section = this.config[i];
        topOffset -= 15;
        let row = null;
        let col = null;
        let newLeftMargin = this.margin_left;
        let newTextOptions = null;
        let newTopOffset = topOffset;
        let value = null;
        let textDimensions = null;
  
       
        
        
        console.log("section_rows",section.rows)
        console.log("section_rows_length",section.rows.length)
        boldTextOptions.size = 15
        
        if(section.rows.length){
          if (i === 0) await cxt.writeText("Consolidated Summary", leftOffset, topOffset - 10, boldTextOptions);
          else if (i === 1) await cxt.writeText("Standard Storage", leftOffset, topOffset - 10, boldTextOptions);
          else await cxt.writeText("Parking", leftOffset, topOffset - 10, boldTextOptions);
        }

        for (let row_number = 0; row_number < section.rows.length; row_number++) { //loop rows
          console.log("row_number",row_number)
          let row_groups = section.rows[row_number].groups
          
          section_rows = 0;
          
          console.log("ROW_groups", row_groups)
          
          let row_number_in_group = 0

          
          for( var key in row_groups ) {
            
            // console.log("KEY", key)
            // console.log("VALUE",  row_groups[key])
            total_width = section.columns.reduce((a, b) => a + b.width, 0);
            section.columns.forEach(col => {
              col.tranformedWidth = (( col.width *  ( this.page_width - this.margin_right  - this.margin_left) ) / total_width)
            });
            
            row = row_groups[key]

            if (row_number_in_group === 0) {
              topOffset -=15
              cxt.drawRectangle(leftOffset + 0.3, topOffset - 24, this.page_width - this.margin_right - this.margin_left - 0.6, row_height -0.4 +6, {
                type: 'fill',
                color: 0x637381,
                opacity: 0.9
              })
              //mediumTextOptions.color = 'white'
              //boldTextOptions.color = 'white'
              if (i === 0 ) topOffset = await this.printTableHeader(section, "All Spaces/Groups", cxt, leftOffset,topOffset ,padding,mediumTextOptions,boldTextOptions, true);
              else topOffset = await this.printTableHeader(section, row.breakdown, cxt, leftOffset,topOffset ,padding,mediumTextOptions,boldTextOptions, true);

              
              newTopOffset = topOffset + 15;
            }

            
            section_rows++; 
            if (row_number_in_group % 2 === 1 && !row.isFooter) {
              cxt.drawRectangle(leftOffset + 0.3, newTopOffset + 0.4 , this.page_width - this.margin_right - this.margin_left - 0.6, row_height -0.4, {
                type: 'fill',
                color: 0xf9fafa,
                opacity: 0.9
              })
            } else if (row.isFooter) {
              cxt.drawRectangle(leftOffset + 0.3, newTopOffset + 0.4 , this.page_width - this.margin_right - this.margin_left - 0.6, row_height -0.4, {
                type: 'fill',
                color: 0xDFE3E8,
                opacity: 0.9
              });
            }

            textOptions.color = 'black';
            textOptions.font = boldFont;

            if(row.isfooter) {
              cxt.drawRectangle(leftOffset + 0.3, newTopOffset + 0.4 , this.page_width - this.margin_right - this.margin_left - 0.6, row_height -0.4, {
                type: 'fill',
                color: 0xDFE3E8,
                opacity: 0.9
              });

              cxt.drawRectangle(leftOffset + 0.3, newTopOffset + 0.4 , this.page_width - this.margin_right - this.margin_left - 0.6, row_height -0.4, {
                type: 'stroke',
                color: 0x808080,
                opacity: 1,
                width :0.4
            })

            let textoptions = {
              font: mediumFont,
              size: 6,
              colorspace: 'black',
              color: '#637381',
              underline: false,
              custom: true
            }

              await this.truncate_table_text(this.page_width,this.margin_right,total_width,cxt, section.columns,
                6 ,1 ,this.margin_left , 0 ,padding, newTopOffset + 3, textoptions, row,true,pdfWriter, false, row.isBorder);

              
            }else{
              await this.truncate_table_text(this.page_width,this.margin_right,total_width,cxt, section.columns,
              6 ,1 ,this.margin_left , 0 ,padding, newTopOffset + 3, textOptions, row,true,pdfWriter, false, row.isBorder);
            }
            
            

              if(row.istitle) {

                textOptions.color = '#DFE3E8';
                //titleTextOptions.color = 0xFFFFFF;
                cxt.drawRectangle(leftOffset + 0.3, newTopOffset + 0.4 , this.page_width - this.margin_right - this.margin_left - 0.6, row_height -0.4, {
                  type: 'fill',
                  color: 0xf4f6f8,
                  opacity: 1
                });
        
                cxt.drawRectangle(leftOffset + 0.3, newTopOffset + 0.4 , this.page_width - this.margin_right - this.margin_left - 0.6, row_height -0.4, {
                    type: 'stroke',
                    color: 0x808080,
                    opacity: 1,
                    width :0.4
                });

                // await this.truncate_table_text(this.page_width,this.margin_right,total_width,cxt, section.columns,
                //   6 ,1 ,this.margin_left , 0 ,padding, newTopOffset + 3, textOptions, row.size,true,pdfWriter, false);
                let textoptions = {
                  font: mediumFont,
                  size: 6,
                  colorspace: 'black',
                  color: '#637381',
                  underline: false
                }
                  await cxt.writeText(row.size, leftOffset + 2, newTopOffset + 3, textoptions);
              }
                // border should plot after end of the row 
            if (row_number_in_group === (Object.keys(row_groups).length - 1)){
              table_border_height = row_height * section_rows;
              cxt.drawRectangle(leftOffset, newTopOffset , this.page_width - this.margin_left - this.margin_right , table_border_height , {
                type: 'stroke',
                color: 0x808080,
                opacity: 1,
                width :0.4
              })
              topOffset = newTopOffset + 5;
            }
            newTopOffset -= row_height;
            let pageBreak = i === 0 && (row_number_in_group === (section.rows.length - 1))  && section.rows.length > 1 && newTopOffset <= 59;
    
            if(newTopOffset <= (this.margin_bottom) || pageBreak) {
              newTopOffset += row_height;
              page_number++;
              
              if(!pageBreak) {
                table_border_height = (row_height * section_rows ) ;
                cxt.drawRectangle(leftOffset, newTopOffset , this.page_width - this.margin_left - this.margin_right , table_border_height  , {
                  type: 'stroke',
                  color: 0x808080,
                  opacity: 1,
                  width :0.4
                })
              }
    
              let printText = `Printed on ${utils.formatLocalTimeZone(this.timeZone,"MMM Do, YYYY h:mm A",true)}`;
              await cxt.writeText(printText, this.margin_left,10, textOptions);
              await cxt.writeText(`Page ${page_number}/${total_page_no}`, this.page_width  - this.margin_right - 35,10, mediumTextOptions);
            
              pdfWriter.writePage(current_page);

              if(socket && page_number % pcount == 0){
                await socket.createEvent("pdf_progress", {
                  percentage: Math.round((page_number/total_page_no) * 1e4) / 1e2
                })
              }

              current_page = pdfWriter.createPage(0,0,this.page_width,this.page_height);
              cxt = pdfWriter.startPageContentContext(current_page);
    
              topOffset = this.page_height - this.margin_top;
              leftOffset = this.margin_left;
              
              await this.printHeader(cxt, pdfWriter,leftOffset, topOffset, textOptions, boldTextOptions);
              topOffset -= 40;
    
              mediumTextOptions.size = 7;
              mediumTextOptions.color = 'black';
    
              if(!pageBreak) {
                topOffset = await this.printTableHeader(section,"",cxt,leftOffset,topOffset + 6,padding,mediumTextOptions,boldTextOptions);
                topOffset += 0; //4
              } else {
                topOffset += 15;
              }
    
              newTopOffset = topOffset;
              section_rows = 0;
            }
            row_number_in_group++;
          }

          //print summary

          let summary = section.rows[row_number].summary
          let summary_section_row = 0;

          let section_summary = section.summary
          
          topOffset = await this.printTableHeader(section_summary, "" , cxt, leftOffset,topOffset + 2,padding,mediumTextOptions,boldTextOptions, false);
          newTopOffset = topOffset;

          console.log('sectionnn', section.rows[row_number])
          let row_summary = await this.set_summary_rows(summary, section.rows[row_number])
          
          for (let row_summary_row = 0; row_summary_row < row_summary.length; row_summary_row++) {
              total_width = section_summary.columns.reduce((a, b) => a + b.width, 0);
            section_summary.columns.forEach(col => {
              col.tranformedWidth = (( col.width *  ( this.page_width - this.margin_right  - this.margin_left) ) / total_width)
            });
            
            if (row_summary_row % 2 === 1 && !row.isFooter) {
              cxt.drawRectangle(leftOffset + 0.3, newTopOffset + 0.4 , this.page_width - this.margin_right - this.margin_left - 0.6, row_height -0.4, {
                type: 'fill',
                color: 0xf9fafa,
                opacity: 0.9
              })
            } else if (row.isFooter) {
              cxt.drawRectangle(leftOffset + 0.3, newTopOffset + 0.4 , this.page_width - this.margin_right - this.margin_left - 0.6, row_height -0.4, {
                type: 'fill',
                color: 0xDFE3E8,
                opacity: 0.9
              });
            }

            console.log("summary", row_summary[row_summary_row])
            await this.truncate_table_text(this.page_width,this.margin_right,total_width,cxt, section_summary.columns,
              6 ,1 ,this.margin_left , 0 ,padding, newTopOffset + 3, textOptions, row_summary[row_summary_row],true,pdfWriter, true);

            summary_section_row++

            //border should plot at end of summary row
            if (row_summary_row === (row_summary.length - 1)){
              table_border_height = row_height * summary_section_row;
              cxt.drawRectangle(leftOffset, newTopOffset , this.page_width - this.margin_left - this.margin_right , table_border_height , {
                type: 'stroke',
                color: 0x808080,
                opacity: 1,
                width :0.4
              })
              topOffset = newTopOffset + 5;
            }
            newTopOffset -= row_height;
            
            let pageBreak = (row_summary_row === (row_summary.length - 1))  && row_summary.length > 1 && newTopOffset <= 59;

            if(newTopOffset <= (this.margin_bottom) || pageBreak) {
              
              newTopOffset += row_height;
              page_number++;
              
              if(!pageBreak) {
                table_border_height = (row_height * summary_section_row ) ;
                cxt.drawRectangle(leftOffset, newTopOffset , this.page_width - this.margin_left - this.margin_right , table_border_height  , {
                  type: 'stroke',
                  color: 0x808080,
                  opacity: 1,
                  width :0.4
                })
              }
    
              let printText = `Printed on ${utils.formatLocalTimeZone(this.timeZone,"MMM Do, YYYY h:mm A",true)}`;
              await cxt.writeText(printText, this.margin_left,10, textOptions);
              await cxt.writeText(`Page ${page_number}/${total_page_no}`, this.page_width  - this.margin_right - 35,10, mediumTextOptions);
            
              pdfWriter.writePage(current_page);

              if(socket && page_number % pcount == 0){
                await socket.createEvent("pdf_progress", {
                  percentage: Math.round((page_number/total_page_no) * 1e4) / 1e2
                })
              }

              current_page = pdfWriter.createPage(0,0,this.page_width,this.page_height);
              cxt = pdfWriter.startPageContentContext(current_page);
    
              topOffset = this.page_height - this.margin_top;
              leftOffset = this.margin_left;
              
              await this.printHeader(cxt, pdfWriter,leftOffset, topOffset, textOptions, boldTextOptions);
              topOffset -= 40;
    
              mediumTextOptions.size = 7;
              mediumTextOptions.color = 'black';
    
              if(!pageBreak) {
                topOffset = await this.printTableHeader(section_summary, "", cxt,leftOffset,topOffset + 6,padding,mediumTextOptions,boldTextOptions);
                topOffset += 0; //4
              } else {
                topOffset += 15;
              }
              newTopOffset = topOffset;
              summary_section_row = 0;
            }
            
          }

          //end summary  

// Go to next page after each section
          newTopOffset += row_height;
            page_number++;

            let printText = `Printed on ${utils.formatLocalTimeZone(this.timeZone,"MMM Do, YYYY h:mm A",true)}`;
            await cxt.writeText(printText, this.margin_left,10, textOptions);
            await cxt.writeText(`Page ${page_number}/${total_page_no}`, this.page_width  - this.margin_right - 35,10, mediumTextOptions);

            pdfWriter.writePage(current_page);

            if(socket && page_number % pcount == 0){
              await socket.createEvent("pdf_progress", {
                percentage: Math.round((page_number/total_page_no) * 1e4) / 1e2
              })
            }

            current_page = pdfWriter.createPage(0,0,this.page_width,this.page_height);
            cxt = pdfWriter.startPageContentContext(current_page);
    
            topOffset = this.page_height - this.margin_top;
            leftOffset = this.margin_left;

            await this.printHeader(cxt, pdfWriter,leftOffset, topOffset, textOptions, boldTextOptions);
            topOffset -= 40;
    
            mediumTextOptions.size = 7;
            mediumTextOptions.color = 'black';
            newTopOffset = topOffset;
            summary_section_row = 0;
          
          
          topOffset = newTopOffset + 15;
          
        }
        if (i === this.config.length - 1) {

          
          //If not enough space for notes
          if(( section_rows * row_height ) + this.margin_bottom + this.margin_top + this.headerOffset + this.footerOffset + 77 >= this.page_height){

            leftOffset = 0;
            textOptions.font = font;
            textOptions.size = 7;
            let printText = `Printed on ${utils.formatLocalTimeZone(this.timeZone,"MMM Do, YYYY h:mm A",true)} ${page_number}/${total_page_no}`;
            await cxt.writeText(printText, this.margin_left,10, textOptions);
    
            topOffset = this.page_height - this.margin_top;
            section_rows = 0;
            row = 1;
            pdfWriter.writePage(current_page);

            if(socket && page_number % pcount == 0){
              await socket.createEvent("pdf_progress", {
                percentage: Math.round((page_number/total_page_no) * 1e4) / 1e2
              })
            }

            current_page = pdfWriter.createPage(0,0,this.page_width,this.page_height);
            cxt = pdfWriter.startPageContentContext(current_page);
            // Reprint Headers
            textOptions.font = boldFont;
            var semiBoldFont  = pdfWriter.getFontForFile(settings.config.base_path + 'fonts/Graphik-Semibold-Regular.ttf');
            let titleTextOptions = {
              font: semiBoldFont,
              size: 8,
              colorspace: 'black',
              color: 0x00,
            };
            await this.printHeaders(cxt, [], this.margin_left + leftOffset, topOffset, titleTextOptions,textOptions,font,padding,this.page_width,this.margin_right,pdfWriter);
            textOptions.font = font;
            
            topOffset -= this.headerOffset - 1;
            page_number++
          }else {
            topOffset -= 30;
          }

          // Adding notes
        leftOffset = 21;
        let txtMedOpt = {
          font: mediumFont,
          size: 8,
          colorspace: 'black',
          color: 0x00,
        }
        let txtOpt = {
          font: font,
          size: 8,
          colorspace: 'black',
          color: 0x00,
        }
        let txtWidth = 0;
    
        await cxt.writeText('Report Guide:', leftOffset ,topOffset, txtMedOpt);

        topOffset-=11;

        for(let i=0; i<this.report_notes.length; i++){
          await cxt.writeText(this.report_notes[i].key, leftOffset ,topOffset, txtMedOpt);
          txtWidth = txtMedOpt.font.calculateTextDimensions(this.report_notes[i].key,txtMedOpt.size).width + 2.5;
          await cxt.writeText(this.report_notes[i].value, leftOffset + txtWidth ,topOffset, txtOpt);

          topOffset -= 9;
        }
        }
        if(section.rows.length === 0) {
          // let noRecordeFoundOffset = (this.page_width / 2) - this.margin_left;
          // await cxt.writeText('No Data Found', noRecordeFoundOffset, topOffset + 8, textOptions);
          // let table_border_height = row_height * 2;
          // cxt.drawRectangle(leftOffset , topOffset, this.page_width - 40 , table_border_height , {
          //   type: 'stroke',
          //   color: 0x808080,
          //   opacity: 1,
          //   width :0.4
          // })
          // topOffset -= 20;
        }
      }
      
      

      page_number++;
      let printText = `Printed on ${utils.formatLocalTimeZone(this.timeZone,"MMM Do, YYYY h:mm A",true)}`;
      await cxt.writeText(printText, this.margin_left,10, textOptions);
      await cxt.writeText(`Page ${page_number}/${total_page_no}`, this.page_width  - this.margin_right - 35,10, mediumTextOptions);
      pdfWriter.writePage(current_page);
      pdfWriter.end();

      let bufferResult = ws.toBuffer();
      ws.end();

      if(socket){
        await socket.createEvent("pdf_progress", {
          percentage: Math.round((page_number/total_page_no) * 1e4) / 1e2
        })
      }

      return bufferResult;
  }

  formatMoney(value,showDoller = true) {
		if (typeof value === 'undefined' ||  value === false || value === null) return `${showDoller ? '$': ''}${0.00}`;
    if (isNaN(value)) return '-';
    
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

module.exports = OccupancyStatisticsReport;