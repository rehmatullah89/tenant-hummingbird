const s3Endpoint = 'https://s3.amazonaws.com';
const s3Region =  process.env.AWS_REGION;

let keysMap = {
    products : { Products: "name", Description: "description", Amount: "price", IsProductTaxable:  "taxable" },
    spacemix:{
        Space:"Space",
        Width:"Width",
        Length:"Length",
        Height:"Height",
        Rate:"Rate",
        'Space Category':"Space_Category",
        'Door Width':"Door_Width",
        'Door Height':"Door_Height",
        Floor:"Floor",
        //tenants 
        'First Name':"First_Name",
        'Last Name':"Last_Name",
        'Middle Name': "Middle_Name",
        Address: "Address",
        City: "City",
        State:"State",
		ZIP:"ZIP",
        Country:"Country",
        Email:"Email",
        'Cell Phone':"Cell_Phone",
        'Home Phone':"Home_Phone",
        'Work Phone':"Work_Phone",
        'Access Code':"Access_Code",
        DOB:"DOB",
        'Active Military':'Active_Military',

        'CO First Name':'CO_First_Name',
        'CO Last Name':'CO_Last_Name',
        'CO Cell Phone':'CO_Cell_Phone',
        'Military Serial Number':'Military_Serial_Number',
        'Military Branch':'Military_Branch',

        'DL Id':"DL_Id",
        'DL State':"DL_State",
        'DL Country':"DL_Country",
        'DL City':"DL_City",
        'DL Exp Date':"DL_Exp_Date",
        Rent:"Rent",
        'Move In Date':"Move_In_Date",
        'Move Out Date':"Move_Out_Date",
        'Bill Date':"Bill_Date",
        'Paid Date':"Paid_Date",
        'Paid Through Date':"Paid_Through_Date",
        'Alt First Name':"Alt_First_Name",
        'Alt Last Name':"Alt_Last_Name",
        'Alt Middle Name':"Alt_Middle_Name",
        'Alt Address':"Alt_Address",
        'Alt City':"Alt_City",
        'Alt State':"Alt_State",
        'Alt Country':"Alt_Country",
        'Alt ZIP':"Alt_ZIP",
        'Alt Email':"Alt_Email",
        'Alt Home Phone':"Alt_Home_Phone",
        'Alt Work Phone':"Alt_Work_Phone",
        'Alt Cell Phone':"Alt_Cell_Phone",
        //payments
        'Rent Balance':"Rent_Balance",
        'Fees Balance':"Fees_Balance",
        'Protection/Insurance Balance':"Protection_Plan_Balance",
        'Merchandise Balance':"Merchendise_Balance",
        'Late Fees Balance':"Late_Fees_Balance",
        'Lien Fees Balance':"Lien_Fees_Balance",
        'Tax Balance':"Tax_Balance",
        'Prepaid Rent':"Prepaid_Rent",
        'Prepaid Additional Rent/Premium':"Prepaid_Additional_Rent",
        'Prepaid Tax':"Prepaid_Tax",
        'Protection/Insurance Provider':"Protection_Provider",
        'Protection/Insurance Coverage':"Protection_Coverage",
        'Additional Rent/Premium':"Additional_Rent",
        'Delinquency Status':"Delinquency_Status",
        //promotions
        Promotion:"Promotion",
        'Promotion Type': "Promotion_Type",
        'Promotion Value': "Promotion_Value",
        'Promotion Start Date': "Promotion_Start_Date",
        'Promotion Length': "Promotion_Length",
        //discounts
        Discount: "Discount",
        'Discount Type': "Discount_Type",
        'Discount Value': "Discount_Value",
        'Discount Start Date': "Discount_Start_Date"
     }    
}

module.exports = {
    getDefaultTemplateColumns(template){
        let templateFileName = settings.config.base_path + 'uploads/onboarding/templates/'+template+'.xlsx';
        let tw =   XLSX.readFile(templateFileName);			
        let templateFileData = XLSX.utils.sheet_to_json(tw.Sheets[tw.SheetNames[0]], {header:1, blankrows : false});
        return templateFileData[0];
    },

    getUploadedTemplateData(filepath, cols){
        let wb = XLSX.readFile(filepath,{ type:'binary', cellText:false, cellDates:true});
        let sheet_name_list = wb.SheetNames;
        let templateData = XLSX.utils.sheet_to_json(wb.Sheets[sheet_name_list[0]], {raw:false, header: cols, defval: '', blankrows : false, dateNF:'MM/DD/YYYY'});
        return templateData;
    },

    validateHeadersFromFile(originalCols, cols){
        let isHeadersMatching = false;
        if (originalCols.length && cols && originalCols.every(e => cols.includes(e))) {
            isHeadersMatching = true;
        } else {
            isHeadersMatching = false;
        }
        return isHeadersMatching;
    },

    validateTemplate(filename){
        const ext = ['xlsx','csv', 'xls'];
        if(ext.indexOf(filename.split('.')[1]) === -1){
            return false;
        }
        return true;
    },

    collectErrorsForUploadedSheet(errorObj){      
        let errors = [];               
        errorObj.forEach(function(detail){
            if(!errors[detail.path[0]])
                errors[detail.path[0]]= [];                
            errors[detail.path[0]].push(detail.message);            
        });
        return errors;
    },

    async writeErroredFileForDownload(dataObj, errors, filename, templatename){
        dataObj.forEach(function(row,i){            
            row['Errors']  = errors[i] ? errors[i].toString() : ''; 
        });
        let ws = XLSX.utils.json_to_sheet(dataObj);
        let wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, templatename);
        if (!fs.existsSync(settings.config.base_path + 'uploads/onboarding/errortemplates/')){
            fs.mkdirSync(settings.config.base_path + 'uploads/onboarding/errortemplates/');
        }
        let errorFile = settings.config.base_path + 'uploads/onboarding/errortemplates/'+filename;
        XLSX.writeFile(wb, errorFile);
        /*Save the errorfile on S3 bucket,
		delete the temporarily saved local file in 'uploads' directory as this is no longer needed
		because the errorfile is pushed to S3*/
        await this.uploadToS3(filename,errorFile);
		await this.deleteTmpFile(errorFile);
        return errorFile;
    },

    transformKeys(type, data){
        const newKeys = keysMap[type];
        let sheetData = [];
        data.forEach((item)=>{
            mappedData = Object.keys(newKeys).reduce((obj,k) => Object.assign(obj, { [newKeys[k]]: item[k] }),{});            
            sheetData.push(mappedData);
        })       
        return sheetData;
    },

    validateDocument(filename){
        const ext = ['docx', 'doc'];
        if(ext.indexOf(filename.split('.')[1]) === -1){
            return false;
        }
        return true;
    },
   /*Utility methods to communicate with S3 bucket*/
   /*Upload the file on S3 based on name of file and temporary location of file for e.g. 'uploads' directory*/
    async uploadToS3(filename,fileloc){

        let s3 =  new AWS.S3({
          endpoint: s3Endpoint,
          region: s3Region
        });
    
          let params = {
          params: {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: 'onboarding/'+filename,
            Body: fs.createReadStream(fileloc),
          },
          service: s3
        };
    
        var upload = new AWS.S3.ManagedUpload(params);
        let promise = upload.promise();
        try{
           var response = await promise;
        } catch(err){
          console.log("err", err);
          e.th(404, err);
        }
    },
  /*Delete the file from temporary location of file for e.g. 'uploads' directory*/
    async deleteTmpFile(fileloc){
            return await fs.unlinkSync(fileloc); // Empty temp folder
    },
  /*Download the file from S3 based on name of file,
    which was used during the save of file to S3*/
    async download(filename){
            
            let aws_params = {
              Bucket: process.env.AWS_BUCKET_NAME,
              Key: 'onboarding/'+filename
            }
            let s3Promise = new AWS.S3({
              endpoint: s3Endpoint,
              region: s3Region
            }).getObject(aws_params).promise();
        
            try{
              return await s3Promise;
            } catch(err){
              console.log("err", err);
              e.th(404, "File not found");
            }
        
     },
  /*Return the list of files existing in S3 bucket based on the prefix criteria,
    which was used during the save of all the files to S3 */
     async getFileList(filename){

            let params2 = {
				
                Bucket: process.env.AWS_BUCKET_NAME,
                Prefix: 'onboarding/'+filename
            };

            let s3 =  new AWS.S3({
                endpoint: s3Endpoint,
                region: s3Region
              });

            let list = await s3.listObjects(params2).promise();
               
             try{
                return list;
             } catch(err){
               console.log("err", err);
               e.th(404, err);
             }              
            
     },
   /*Delete the file from S3 based on filename,
     which was used during the save of the file to S3*/
    async deleteFile(filename){
        let params3 = {
				
				Bucket: process.env.AWS_BUCKET_NAME,
				Key: 'onboarding/'+filename
							  
			  };
            let s3 =  new AWS.S3({
                endpoint: s3Endpoint,
                region: s3Region
              });

       s3.deleteObject(params3, async function (err, data) {
				
            try{
              await data;
            } catch(err){
              console.log("err", err);
              e.th(404, err);
            } 				 
			   });
    },

    async glossaryCMS (){
      let GLOSSARY_APP_ID = process.env.GLOSSARY_APP_ID;
      let GDS_API_KEY = process.env.GDS_API_KEY;
      let uri = `${settings.get_gds_url()}applications/`;
      let glossary_url = uri + GLOSSARY_APP_ID + '/api/help/tags/';
      try {
        var response = await request({
          headers: {
            'X-storageapi-key': GDS_API_KEY,
            'X-storageapi-date': moment().unix(),
          },
          uri: glossary_url,
          method: 'GET',
          json: true
        }); 
  
      } catch(err) {
      
        throw err;
      }

      return response.applicationData[GLOSSARY_APP_ID][0];
    },

    selectFields(payload,row){

      let unit_fields = {
        Owner: payload.activeCompanyName,
        Name: payload.propertyName,
        Building: '',
        Space: row.Space.trim(),
        Width: row.Width,
        Length: row.Length,
        Height: row.Height,
        Rate: row.Rate,
        Web_Rate: row.Rate,//same as rate
        Space_Size: `${row.Width} X ${row.Length}`,
        Space_Category: row.Space_Category,
        Door_Width:`${row.Door_Width}`,
        Door_Height:`${row.Door_Height}`,
        Sq_Ft: (row.Width * row.Length),
        Floor: row.Floor,
      }

      let military_fields =  (row.First_Name && row.Active_Military.toLowerCase() === 'yes')  && {
        
        CO_First_Name: row.CO_First_Name,
        CO_Last_Name: row.CO_Last_Name,
        CO_Cell_Phone: row.CO_Cell_Phone,
        Military_Serial_Number: row.Military_Serial_Number,
        Military_Branch: row.Military_Branch

      } || {
        CO_First_Name: null,
        CO_Last_Name: null,
        CO_Cell_Phone: null,
        Military_Serial_Number: null,
        Military_Branch: null
      }
       
      let save_fields = row.First_Name && {
       ...unit_fields,
        //tenants personal info
        First_Name: row.First_Name.charAt(0).toUpperCase() + row.First_Name.toLowerCase().slice(1),
        Last_Name: row.Last_Name.charAt(0).toUpperCase() + row.Last_Name.toLowerCase().slice(1),
        Middle_Name: row.Middle_Name.length ? row.Middle_Name.charAt(0).toUpperCase() + row.Middle_Name.toLowerCase().slice(1): '',
        Account_Code: parseInt(Math.random() * (5000 - 100) + 100),
        Address: row.Address,
        City: row.City,
        State: row.State,
        ZIP: row.ZIP,
        Country: row.Country,
        Email: row.Email,
        Cell_Phone: row.Cell_Phone,
        Home_Phone: row.Home_Phone,
        Work_Phone: row.Work_Phone,
        Access_Code: row.Access_Code,
        DOB: row.DOB,
        Active_Militory: row.Active_Military.toLowerCase() === 'yes' ? 'True':'False',//todo ? spelling wrong in column   
        ...military_fields,
        DL_Id: row.DL_Id,
        DL_State: row.DL_State,
        DL_Country: row.DL_Country || '',
        DL_City: row.DL_City,
        DL_Exp_Date: row.DL_Exp_Date,
        Rent: row.Rent,
        Move_In_Date: row.Move_In_Date,
        Move_Out_Date: row.Move_Out_Date,
        Bill_Date: row.Bill_Date,
        Paid_Date: row.Paid_Date,
        Paid_Through_Date: row.Paid_Through_Date,
        Alt_First_Name: row.Alt_First_Name.length ? row.Alt_First_Name.charAt(0).toUpperCase() + row.Alt_First_Name.toLowerCase().slice(1): '',
        Alt_Last_Name: row.Alt_Last_Name.length ?  row.Alt_Last_Name.charAt(0).toUpperCase() + row.Alt_Last_Name.toLowerCase().slice(1): '',
        Alt_Middle_Name: row.Alt_Middle_Name.length ?  row.Alt_Middle_Name.charAt(0).toUpperCase() + row.Alt_Middle_Name.toLowerCase().slice(1): '',
        Alt_Address: row.Alt_Address,
        Alt_City: row.Alt_City,
        Alt_State: row.Alt_State,
        Alt_Country: row.Alt_Country || '',
        Alt_ZIP: row.Alt_ZIP,
        Alt_Email: row.Alt_Email,
        Alt_Home_Phone: row.Alt_Home_Phone,
        Alt_Work_Phone: row.Alt_Work_Phone,
        Alt_Cell_Phone: row.Alt_Cell_Phone,
        //payments
        Rent_Balance: row.Rent_Balance,
        Fees_Balance: row.Fees_Balance,
        Protection_Plan_Balance: row.Protection_Plan_Balance,
        Merchendise_Balance: row.Merchendise_Balance,
        Late_Fees_Balance: row.Late_Fees_Balance,
        Lien_Fees_Balance: row.Lien_Fees_Balance,
        Tax_Balance: row.Tax_Balance,
        Prepaid_Rent: row.Prepaid_Rent,
        Prepaid_Additional_Rent: row.Prepaid_Additional_Rent,
        Prepaid_Tax: row.Prepaid_Tax,
        Protection_Provider: row.Protection_Provider,
        Protection_Coverage: row.Protection_Coverage,
        Additional_Rent: row.Additional_Rent,
        Delinquency_Status: row.Delinquency_Status.toLowerCase() === 'yes' ? 'True'
                            : row.Delinquency_Status === ''? ''
                            : 'False',
      }
        || {
          
          ...unit_fields,
          First_Name: null,
          Last_Name: null,
          Middle_Name: null,
          Account_Code: null,
          Address: null,
          City: null,
          State: null,
          ZIP: null,
          Country: null,
          Email: null,
          Cell_Phone: null,
          Home_Phone: null,
          Work_Phone: null,
          Access_Code: null,
          DOB: null,
          Active_Militory: null, 
          ...military_fields,
          DL_Id: null,
          DL_State: null,
          DL_Country: null,
          DL_City: null,
          DL_Exp_Date: null,
          Rent: null,
          Move_In_Date: null,
          Move_Out_Date: null,
          Bill_Date: null,
          Paid_Date: null,
          Paid_Through_Date: null,
          Alt_First_Name: null,
          Alt_Last_Name: null,
          Alt_Middle_Name: null,
          Alt_Address: null,
          Alt_City: null,
          Alt_State: null,
          Alt_Country: null,
          Alt_ZIP: null,
          Alt_Email: null,
          Alt_Home_Phone: null,
          Alt_Work_Phone: null,
          Alt_Cell_Phone: null,
          //payments
          Rent_Balance: null,
          Fees_Balance: null,
          Protection_Plan_Balance: null,
          Merchendise_Balance: null,
          Late_Fees_Balance: null,
          Lien_Fees_Balance: null,
          Tax_Balance: null,
          Prepaid_Rent: null,
          Prepaid_Additional_Rent: null,
          Prepaid_Tax: null,
          Protection_Provider: null,
          Protection_Coverage: null,
          Additional_Rent: null,
          Delinquency_Status: null
          
        };
        return save_fields;
    }

    
}
var settings    = require(__dirname + '/../config/settings.js');
var XLSX = require('xlsx');
var fs = require('fs');
var AWS = require("aws-sdk");
var e  = require(__dirname + '/../modules/error_handler.js');
var request = require("request-promise");
var moment  = require('moment');