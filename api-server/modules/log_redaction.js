var traverse = require('traverse');





var RM = {

    redactAuthnetIntegration(logs = {}){

        if (logs.createTransactionRequest?.transactionRequest?.billTo?.address?.length) {
            logs.createTransactionRequest.transactionRequest.billTo.address = RM.methods.text(logs.createTransactionRequest.transactionRequest.billTo.address);
        } 
        
        if (logs.createCustomerPaymentProfileRequest?.paymentProfile?.billTo?.address?.length) {
            logs.createCustomerPaymentProfileRequest.paymentProfile.billTo.address = RM.methods.text(logs.createCustomerPaymentProfileRequest.paymentProfile.billTo.address);
        } 


        if (logs.createTransactionRequest?.transactionRequest?.billTo?.lastName?.length) {
            logs.createTransactionRequest.transactionRequest.billTo.lastName =  RM.methods.last(logs.createTransactionRequest.transactionRequest.billTo.lastName);
        }

        if (logs.createTransactionRequest?.transactionRequest?.billTo?.firstName?.length) {
            logs.createTransactionRequest.transactionRequest.billTo.firstName =  RM.methods.first(logs.createTransactionRequest.transactionRequest.billTo.firstName);
        }


        if (logs.createCustomerPaymentProfileRequest?.paymentProfile?.billTo?.lastName?.length) {
            logs.createCustomerPaymentProfileRequest.paymentProfile.billTo.lastName =  RM.methods.last(logs.createCustomerPaymentProfileRequest.paymentProfile.billTo.lastName);
        }

        if (logs.createCustomerPaymentProfileRequest?.paymentProfile?.billTo?.firstName?.length) {
            logs.createCustomerPaymentProfileRequest.paymentProfile.billTo.firstName =  RM.methods.first(logs.createCustomerPaymentProfileRequest.paymentProfile.billTo.firstName);
        }



        if (logs.createTransactionRequest?.transactionRequest?.payment?.creditCard?.cardNumber?.length) {
            logs.createTransactionRequest.transactionRequest.payment.creditCard.cardNumber = '####-' + logs.createTransactionRequest.transactionRequest.payment.creditCard.cardNumber.slice(-4);
        }

        if (logs.createCustomerPaymentProfileRequest?.paymentProfile?.payment?.creditCard?.cardNumber?.length) {
            logs.createCustomerPaymentProfileRequest.paymentProfile.payment.creditCard.cardNumber = '####-' + logs.createCustomerPaymentProfileRequest.paymentProfile.payment.creditCard.cardNumber.slice(-4);
        }


        if (logs.createCustomerProfileRequest?.profile?.description?.length) {
            logs.createCustomerProfileRequest.profile.description = RM.methods.message(logs.createCustomerProfileRequest.profile.description);
        }
 
        if(logs.response?.validationDirectResponse?.length){
            logs.response.validationDirectResponse = RM.methods.message(logs.response.validationDirectResponse); 
        }



        return logs;
    },  

    redactGateAccessAppLogs(logs = {}){
        return logs;
    }, 

    redact(logs = {}){
        
        if(!logs.endpoint) return logs; 

        let endpoint = logs.endpoint.replace(/\/v1\/companies\/[a-zA-z]*\//, "");
        let method = logs.method;

        if(logs.response?.data){
            logs.response.data = RM.global(logs.response.data) 
        } 

        if(logs.request){
            logs.request = RM.global(logs.request)
        }
 
        // TODO: Evaluate response. Should not return entire contacts object, too big to fit in NR. 
        if(method === 'POST' && endpoint.match(/units\/omni-search/)){
            if(logs.response?.data?.results){
                logs.response.data.results = logs.response.data.results.map(data => RM.objects.contact(data)); 
                logs.request.search = RM.methods.message(logs.request.search); 
            }
                        
        }
        if(method === 'POST' && endpoint.match(/contacts\/[a-zA-Z0-9]{10}\/send-message/)){
            if(logs.request?.message){
                logs.request.message = RM.methods.message(logs.request.message); 
            }
        }
        if(method === 'POST' && endpoint.match(/gds-integration\/phone-call-event/)){
            logs.request.from_phone = RM.methods.phone(logs.request.from_phone); 
            logs.request.to_phone = RM.methods.phone(logs.request.to_phone); 
            logs.request.via_phone = RM.methods.phone(logs.request.via_phone); 
        }

        if(method === 'POST' && endpoint.match(/gds-integration\/inbound-email/)){

            if(logs.request){
                logs.request.data.from.email = RM.methods.email(logs.request.data.from.email); 
                logs.request.data.from.name = RM.methods.allButFirst(logs.request.data.from.name); 
                logs.request.reply_to = RM.methods.all(logs.request.reply_to); 
                logs.request.html_body = RM.methods.message(logs.request.html_body); 
                logs.request.text_body = RM.methods.message(logs.request.text_body); 
                logs.request.to = logs.request.to.map(d => RM.methods.email(d)); 
                logs.request.cc = logs.request.cc.map(d => RM.methods.email(d)); 
                logs.request.bcc = logs.request.bcc.map(d => RM.methods.email(d)); 
            }
        }


        if(method === 'POST' && endpoint.match(/gds-integration\/inbound-sms/)){
            if(logs.request){
                logs.request.data.from = RM.methods.phone(logs.request.data.from);
                logs.request.data.tp = RM.methods.phone(logs.request.data.to);
                logs.request.body = RM.methods.message(logs.request.body); 
            }
        }
        if(method === 'POST' && endpoint.match(/interactions\/[a-zA-Z0-9]{10}\/note/)){
            if(logs.request){
                logs.request.content = RM.methods.message(logs.request.content);
            }
        }

        if(method === 'POST' && endpoint.match(/leases\/[a-zA-Z0-9]{10}\/payment-method/)){
            
            logs.request = RM.objects.paymentMethod(logs.request);

        }

        if(method === 'POST' && endpoint.match(/payments\/[a-zA-Z0-9]{10}\/email/)){
            if(logs.request){
                logs.request.email = RM.methods.email(logs.request.email);
            }
        }

        return logs;
    },


    global(logs){

        return traverse(logs).map(function (x) {
            let val = null;

            
            switch(this.key){
                case 'report':
                case 'table_data':
                    val = '****'; 
                case 'content':
                    val = RM.methods.text(x); 
                    break;
                case 'creds':
                    val = RM.objects.creds(x);
                    break;
                case 'Contacts':
                case 'contacts':
                    val = x.map(data => RM.objects.contact(data)); 
                    break;
                case 'tenant':
                    val = RM.objects.tenant(x);
                case 'interactor':
                case 'Contact':
                case 'contact':
                case 'last_modified_by':
                    val = RM.objects.contact(x);
                    break;
                case 'payment_method':
                case 'paymentMethod':
                    val = RM.objects.paymentMethod(x);
                    break;
                case 'payment_methods':
                case 'paymentMethods':
                    val = x.map(data => RM.objects.paymentMethod(data)); 
                    break;
                case 'Lead':
                    val =  RM.objects.lead(x); 
                    break;
                case 'Leads':
                    val = x.map(data => RM.objects.lead(data)); 
                    break;
                case 'Phones':
                    val = x.map(data => RM.objects.phone(data)); 
                    break;
                case 'Phone':
                    val = RM.objects.phone(x); 
                    break;
            }
            if(val){
                this.update(val);
            }
        });


    }, 

    objects:{
        tenant(data){
            if(!data) return;
            data.Contact =  RM.methods.contact(data.Contact);
            return data;
        }, 
        lead(data){
            if(!data) return;
            data.first =  RM.methods.first(data.first);
            data.last =  RM.methods.last(data.last);
            data.email =  RM.methods.email(data.email);
            return data;
        },

        creds(data){
            if(!data) return;
            data.first =  RM.methods.first(data.first);
            data.last =  RM.methods.last(data.last);
            data.email =  RM.methods.email(data.email);
            data.phone =  RM.methods.phoneNumber(data.phone);
            data.pin =  RM.methods.all(data.pin);
        },


        contact(data){
            if(!data) return;
            data.first =  RM.methods.first(data.first);
            data.last =  RM.methods.last(data.last);
            data.email =  RM.methods.email(data.email);
            //TODO THIS!
            data.ssn =  RM.methods.ssn(data.ssn);
            data.driver_license =  RM.methods.driverLicense(data.driver_license);
    
            if(data.Address) {
                data.Address =  RM.objects.address(data.Address);
            }

            if(data.Addresses) {
                data.Addresses = data.Addresses.map(d => {
                    d.Address = RM.objects.address(d.Address)
                    return d;
                }) 
            }

            if(data.Military) {
                data.Military =  RM.objects.military(data.Military);
            }

            return data;
    
    
        }, 
        address(data){
            if(!data) return;
            data.address = RM.methods.text(data.address);
            return data;
        },
        phone(data){
            if(!data) return;
            if(data.phone){
                data.phone = RM.methods.phoneNumber(data.phone);
            }
            return data;
        },
    
        paymentMethod(data){
            if(!data) return null;
            
            if(data.Address) data.Address = RM.objects.address(data.Address);
            data.address =  RM.methods.all(data.address);

            data.last = RM.methods.allButFirst(data.last);
            data.name_on_card = RM.methods.allButFirst(data.name_on_card);
            data.card_number = RM.methods.cardNumber(data.card_number);
            data.cvv2 = RM.methods.all(data.cvv2);
            
            return data; 
        },
        military(data){
            if(!data) return;
            if(data.identification_number){
                data.identification_number = RM.methods.ssn(data.identification_number);
            }
            return data
        }
    },
    methods: {
        allButFirst: str => str && str.length > 1 && str[0] + "*".repeat(str.length - 1) || '*',
        last: str => str && str.length > 2 && str.slice(0,2) + "*".repeat(str.length - 2) || '*',
        first: str => str || '*',
        all: str => str && str.length > 0 && "*".repeat(str.length) || '*',
        message: str => "*****",
        email: str => {
            if(!str) return;
            const [name, domain] = str.split('@');
            const [d, tld] = domain.split('.');
            return name + '@' + "*".repeat(d.length) + '.' + tld;
        },
        
        phoneNumber: str => str && str.length > 4 && "*".repeat(str.length - 4) + str.slice(-4) || '*',
        text: str => str && str.length  && "*".repeat(str.length) || null, 
        ssn: str => str => str && str.length > 4 && "*".repeat(str.length - 4) + str.slice(-4) || '*',
        driverLicense: str => str && str.length > 4 && str[0] + "*".repeat(str.length - 3) + str.slice(-2) || '*',
        cardNumber: str => str && str.length > 4 && '####-' + str.slice(-4) || '*',
        
    }
    




}

module.exports = RM