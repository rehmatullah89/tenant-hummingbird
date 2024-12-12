"use strict";
class OnboardingTemplate {
    
    constructor(data){
        this.bulkData = data;
        this.keys = [];
        this.saveData = [];
    }

    makeProducts(company_id){
      this.keys = [];
      this.saveData = [];
      let bindProduct = {};
      this.bulkData.forEach((row,i) => {
          row.taxable = row.taxable.toLowerCase() == 'yes' ? 1 : 0;
          let product = new Product();
          product.make(row, company_id)
          bindProduct = {
            company_id: product.company_id,
            name: product.name,
            description: product.description,
            type: product.type || 'product',
            default_type: product.default_type || 'product',
            price: product.price || 0,
            taxable: product.taxable,
            prorate: product.prorate,
            prorate_out: product.prorate_out,
            recurring: product.recurring,
            amount_type: product.amount_type || 'fixed',
            category_type: product.category_type || 'service'
          };
          this.saveData.push(Object.values(bindProduct));
      });
      this.keys = Object.keys(bindProduct);
    }

    makeUnitsWithTenants(payload){
      this.keys = [];
      this.saveData = [];
      let bindSpacesWithTenants ={};
      this.bulkData.forEach((row,i) => {
        bindSpacesWithTenants = onboardingModule.selectFields(payload,row)

          this.saveData.push(Object.values(bindSpacesWithTenants));

        });

        this.keys = Object.keys(bindSpacesWithTenants);

    }

    async validate(products, errors){
      if(products){
      await Promise.all(this.bulkData.map(async (row,i) => {
        let valid =  products.indexOf(row.name) == -1;        
          !valid ? (!errors[i] ? errors[i] =[] : '',errors[i].push(['A product with this name already exists'])) : '';
      }));
    }
    } 
    
    async save(connection, tablename){      
      if(!(this.saveData.length && this.keys.length)) return;
      let save= {
        keys : this.keys,
        data : this.saveData
      }      
      let result = await models.Onboarding.saveBulkData(connection, tablename, save);
      return result;
    }

    async findProductsByCompanyId(connection, company_id){ 
      let productNames = [];
      let product_list = await Product.findByCompanyId(connection, company_id , null, null);
      product_list.forEach(item => {
        productNames.push(item.name)
      })
      return productNames;
    }

    async validateSheetDuplicates(errors,template){ 

        let sheetData = [];
        let fieldData = [];
        let field; 
        let errorMessage;

        switch(template){
          case 'spacemix':
            field = 'Space';
            errorMessage = 'A Space with this name already exists in the sheet';
            break;
          case 'products':
            field = 'name';
            errorMessage = 'Product name duplicates are not allowed within a sheet';
            break;
          default:
            return;
        }

        await Promise.all(this.bulkData.map(async (row,i) => {

         if(template == 'spacemix' && row.First_Name){
            let currentRowData = {};

            let keyFields = ['First_Name','Last_Name','Address'];
            let fields = ['Middle_Name','City','State','ZIP','Country','Email','Cell_Phone','Home_Phone','Work_Phone','Access_Code','DOB','Active_Military','DL_Id','DL_State','DL_City','DL_Exp_Date'];
      
            let identifierKey = '';
            
            keyFields.forEach(field => identifierKey += row[field].toLowerCase().trim());
            currentRowData[identifierKey] = '';

            fields.forEach(field =>  currentRowData[identifierKey] += row[field].toLowerCase().trim());

            let rowData = sheetData.find(obj => Object.keys(obj)[0] === identifierKey );
            
            if(rowData){
              if(currentRowData[identifierKey] !== rowData[identifierKey]) !errors[i] ? errors[i] =[] : '',errors[i].push(['Please verify tenant details']);
            }
            else sheetData.push(currentRowData);

            this.billDateValidation(errors,row,i);

        }
         
        if(!row[field] && typeof(row[field]) != 'string') return;

          if(fieldData.includes(row[field].trim()))
          !errors[i] ? errors[i] =[] : '',errors[i].push([errorMessage])

          fieldData.push(row[field].trim())
            
          }));
    
    }

    billDateValidation(errors,row,i){
    if(!(row.Bill_Date === moment(row.Paid_Through_Date, "MM/DD/YYYY").add(1, 'days').format("MM/DD/YYYY")))  
      !errors[i] ? errors[i] =[] : '',errors[i].push(['Bill date is always one day ahead of paid through date.']);
    }

    makePromotions(payload){      
      this.keys = [];
      this.saveData = [];
      let bindPromotions = {};
      this.bulkData.forEach((row,i) => {

        if(row.First_Name && row.Promotion){
        bindPromotions = {
            Owner: payload.activeCompanyName,
            Name: payload.propertyName,
            Promotion: row.Promotion,
            Unit_Size: `${row.Width} X ${row.Length}`,//same as space size 
            Unit_Size_Category :row.Space_Category,//same as space category 
            Promotion_Type: (function () {
              let Promotion_Type = row.Promotion_Type.trim();
              return Promotion_Type === '%' ? 'percent'
                            : Promotion_Type === '$' ? 'dollar' 
                            : Promotion_Type === 'Fixed Rate' ? 'fixed'
                            : ''
            })(),
            Promotion_Value: row.Promotion_Value,
            Promotion_Start_Date: row.Promotion_Start_Date,
            Promotion_Length: row.Promotion_Length
          };
          this.saveData.push(Object.values(bindPromotions));
        }
      });
      this.keys = Object.keys(bindPromotions);
    }

    makeDiscounts(payload){
      this.keys = [];
      this.saveData = [];
      let bindDiscounts = {};
      this.bulkData.forEach((row,i) => {
         if(row.First_Name && row.Discount){ 
           bindDiscounts = {
            Owner: payload.activeCompanyName,
            Name: payload.propertyName,
            Building: '',
            Space: row.Space.trim(),
            First_Name :row.First_Name.charAt(0).toUpperCase() + row.First_Name.toLowerCase().slice(1),
            Last_Name :row.Last_Name.charAt(0).toUpperCase() + row.Last_Name.toLowerCase().slice(1),
            Middle_Name :row.Middle_Name.length ? row.Middle_Name.charAt(0).toUpperCase() + row.Middle_Name.toLowerCase().slice(1): '',
            Account_Code : parseInt(Math.random() * (5000 - 100) + 100),
            Promotion: row.Discount,
            Promotion_Type: (function () {
              let Discount_Type = row.Discount_Type.trim();
              return Discount_Type === '%' ? 'percent'
                            : Discount_Type === '$' ? 'dollar' 
                            : Discount_Type === 'Fixed Rate' ? 'fixed'
                            : ''
            })(),
            Promotion_Value: row.Discount_Value,
            Promotion_Start_Date: row.Discount_Start_Date
          };
          this.saveData.push(Object.values(bindDiscounts));
        }
      });
      this.keys = Object.keys(bindDiscounts);
    }

    async removeExistingRecords(connection,payload){
      await models.Onboarding.removeExistingRecords(connection,payload);
    }
}

module.exports = OnboardingTemplate;
var models  = require(__dirname + '/../../models');
const Product = require('../product');
var moment = require('moment');
var onboardingModule = require(__dirname + '/../../modules/onboarding.js');