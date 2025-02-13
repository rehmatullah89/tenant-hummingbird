const TENANT_PAYMENTS = Object.freeze({
    CONTROL_CODES: {
        STX: 0x02,
        ETX: 0x03,
        EOT: 0x04,
        ENQ: 0x05,
        ACK: 0x06,
        NAK: 0x15,
        FS: 0x1C,
        GS: 0x1D,
        RS: 0x1E,
        LF: 0x0A,
        GS: 0x1D,
        US: 0x1F,
        COMMA: 0x2c,
        COLON: 0x3A,
        PTGS: 0x7C
      },
      TRANSACTION_TYPES: {
        MENU:           "00",
        SALE:           "01",
        TOKENIZE:       "32"
    },
    TRANSACTION_COMMANDS : {
        CREDIT: "T00",
        DEBIT:  "T02"
    },
    TERMINAL_RESPONSE_CODES: {
        "000000": "OK",
        "000100": "This transaction was declined.",
        "100001": "The transaction timed out, please try again.",
        "100002": "This transaction was cancelled on the terminal.",
        "100003": "This transaction failed. Please contact support with the following error message. ",
        "100004": "Transaction type not supported. Please contact support.",
        "100005": "Terminal unsupported the EDC type. Please contact support.",
        "100006": "Batch failed.",
        "100008": "Send message to host error. Please try again",
        "100009": "Receive message error. Please contact support.",
        "100010": "Communication error. Please contact support.",
        "100011": "This transaction failed because of a duplication transaction.",
        "100012": "Get var error. Please contact support.",
        "100013": "Var name missing. Please contact support.",
        "100014": "An error occurred, please contact support.",
        "100015": "This transaction was declined due to a CVV mismatch.",
        "100016": "This transaction was declined due to a AVS mismatch.",
        "100017": "Halo exceeded.",
        "100018": "Swipe only, cannot input account",
        "100019": "The track data is wrong.",
        "100020": "A swipe error occurred",
        "100021": "This transaction was already voided.",
        "100022": "Pin pad error. Please try again.",
        "100023": "An error occurred. please contact support.",
        "100024": "There is no host application.",
        "100025": "Please settle.",
        "100027": "Unsupported Command, please contact support.",
        "100028": "The tax exceeded the purchase amount.",
        "100029": "Batch close succeeded but some records failed during uploading.",
        "100030": "Printer not supported.",
        "100031": "Printer disabled.",
        "100032": "Printer out of paper.",
        "100033": "An error occurred.",
        "100040": "Transaction declined due to insufficient funds.",
        "100050": "Data storage key missing.",
        "100100": "P2PE Key is missing.",
        "100500": "Customer declined to pay online surcharge fee.",
        "100503": "PED is busy. Please try again later",
        "100504": "PED injection error. Please contact support",
        "100505": "The specified MAC key type mismatch the specified algorithm. Please contact support.",
        "100506": "The encryption key type mismatch the specified algorithm. Please contact support.",
        "100507": "PED parameter error. Please contact support.",
        "100508": "PED general error. Please contact support.",
        "100509": "PED unknown error. Please contact support.",
        "100510": "Terminal detected WIC card while it's not for WIC.",
        "100511": "Service is busy, please try again later.",
        "100512": "Card not accepted.",
        "100513": "User didn't sign the EULA.",
        "100514": "The creation of the bar code file failed. Please contact support.",
        "100515": "Scan error. Please contact support.",
        "199999": "A terminal error occurred. Please contact support.",
        "101000": "Payment failed.",
        "101001": "Payment ok, VAS failed.",
        "101002": "VAS error.",
        "101003": "Payment failed.",
        "101004": "There was a VAS error and the payment was not performed.",
        "101005": "The payment could not be completed.",
        "101100": "The interface chip does not exist or is not recognized.",
        "101101": "Parameter error.",
        "101102": "RF module closed.",
        "101103": "The card was not detected or is not activated.",
        "101104": "Communication conflict. Too much card in sensing area.",
        "101105": "Protocol Error.",
        "101106": "Card not activated.",
        "101107": "Multi-card Conflict.",
        "101108": "Response timeout.",
        "101109": "Protocol error.",
        "101110": "Communication transmission error.",
        "101111": "M1 Card authentication failure.",
        "101112": "Sector is not certified.",
        "101113": "The data format of the value block is incorrect.",
        "101114": "Card is still in sensing area.",
        "101115": "Card status error.",
        "101116": "An unknown error occurred. Please contact support.",
        "101117": "Parameter error.",
        "101118": "RPC I/O error.",
        "101119": "This device is not supported.",
        "101120": "Permission denied for PICC.",
        "101121": "RPC busy.",
        "101200": "Tip form error.",
        "101201": "Cash back form error.",
        "101202": "EBT type form error.",
        "101203": "Pass reason error.",
        "101204": "AID form error.",
        "101205": "Tax reason error.",
        "101206": "Card type error.",
        "101207": "Transaction type error.",
        "101208": "EDC type error.",
        "101209": "Search index error.",
        "101210": "Surcharge fee error.",
        "101212": "Sub transaction type error.",
        "101213": "Account type error.",
        "101230": "Card present confirm must return boolean.",
        "101231": "Duplicate transaction confirm ui entry action must return boolean.",
        "101232": "Card deactivated warn confirm ui entry action must return boolean.",
        "101233": "Surcharge fee confirm ui entry action must return boolean.",
        "101234": "Delete SAF transaction confirm ui entry action must return boolean.",
        "101235": "Print customer copy confirm ui entry action must return boolean.",
        "101236": "Print failed trans confirm ui entry action must return boolean.",
        "101237": "Print FPS confirm ui entry action must return boolean.",
        "101238": "Print status confirm ui entry action must return boolean.",
        "101239": "Amount confirm ui entry action must return boolean.",
        "101240": "Partial approval confirm ui entry action must return boolean.",
        "103000": "Duplicate transaction."
    },
    CARD_TYPES: {
        "01": "Visa" ,
        "02": "MasterCard",
        "03": "AMEX",
        "04": "Discover",
        "05": "Diner Club", 
        "06": "enRoute",
        "07": "JCB",
        "08": "RevolutionCard", 
        "09": "VisaFleet", 
        "10": "MasterCardFleet", 
        "11": "FleetOne", 
        "12": "Fleetwide", 
        "13": "Fuelman", 
        "14": "Gascard", 
        "15": "Voyager", 
        "16": "WrightExpress", 
        "17": "Interac", 
        "18": "CUP", 
        "19": "Maestro", 
        "20": "Sinclair", 
        "99": "OTHER" 
    },
    CVM_CODES: {
        "0": "Fail CVM processing" ,
        "1": "Plaintext Offline PIN Verification",
        "2": "Online PIN",
        "3": "Plaintext Offline PIN and Signature",
        "4": "Enciphered Offline PIN Verification", 
        "5": "Enciphered Offline PIN Verification and Signature",
        "6": "Signature",
        "7": "No CVM Required", 
        "8": "On Device CVM", 
    },
    ENTRY_MODES:{
        "0": "Manual",
        "1": "Swipe",
        "2": "Contactless",
        "3": "Scanner",
        "4": "Chip",
        "5": "Chip Fall Back Swipe"
    },
    API_RESPONSE_ERROR_CODES:{
        "20": "This username is already in use in our system.",
        "21": "Requested TransType method is not permitted for this account.",
        "22": "Invalid currency code.",
        "23": "Invalid account type.",
        "24": "Source email is invalid.",
        "25": "First name cannot exceed 20 characters.",
        "26": "Middle initial cannot exceed 2 characters.",
        "27": "Last name cannot exceed 25 characters.",
        "28": "Invalid address. 100 character limit, P.O. boxes are not allowed.",
        "29": "Invalid apt number.",
        "30": "Invalid city. Cannot exceed 30 characters.",
        "31": "Invalid state.",
        "32": "Invalid zip.",
        "33": "Invalid mail address. 100 character limit, P.O. boxes are not allowed.",
        "34": "Invalid mail apt number.",
        "35": "Invalid mail city. Cannot exceed 30 characters.",
        "36": "Invalid mail state.",
        "37": "Invalid mail zip.",
        "38": "Invalid day phone.",
        "39": "Invalid evening day phone.",
        "40": "Invalid SSN.",
        "41": "Invalid date of birth.",
        "42": "Invalid receiving email.",
        "43": "Invalid known account. Value should be Yes or No.",
        "44": "Invalid amount. Should be passed without decmials or formatting.",
        "45": "Invalid Invoice number. Cannot exceed 50 characters",
        "46": "Invalid routing number.",
        "47": "Invalid account number.",
        "48": "Invalid credit card number.",
        "49": "Invalid expiration date. Should be in mmyy format.",
        "50": "Invalid CVV code.",
        "51": "Invalid transnum.",
        "52": "Invalid split number.",
        "53": "A merchant account with this email address already exists.",
        "54": "A merchant account with this SSN already exists.",
        "55": "The email address provided does not correspond to a merchant account.",
        "56": "Recipients email address shouldn't have a merchant account.",
        "57": "Cannot settle transaction because it already expired.",
        "58": "Credit card declined.",
        "59": "Invalid credential or IP address not allowed.",
        "60": "Credit authorization timed out. Please try again later.",
        "61": "Amount exceeds single transaction limit.",
        "62": "Amount exceeds monthly volume limit.",
        "63": "Insufficient funds in account.",
        "64": "Over credit card use limit.",
        "65": "An error has occurred. (CODE: 65)",
        "66": "We're unable to verify your identity with our automated systems, so we’ll need to manually verify it. Please contact your onboarding project manager or email us at onboarding@tenantinc.com so we can begin.",
        "67": "This account is not authorized to perform this action.",
        "68": "Account not affiliated.",
        "69": "Duplicate invoice number.",
        "70": "Duplicate external ID.",
        "71": "Account prev iously set up, but problem affiliating it with partner.",
        "72": "This account has already been upgreded to a premium account.",
        "73": "Invalid destination account.",
        "74": "Account or Trans error.",
        "75": "The funds have already been pulled.",
        "76": "No premium.",
        "77": "Empty Results.",
        "78": "Invalid authentication.",
        "79": "An error has occurred. Please contact customer support (CODE 79).",
        "80": "Invalid password.",
        "81": "Account expired.",
        "82": "Invalid User IO.",
        "83": "Batch trans count error.",
        "84": "Invalid BEGIN date. Cannot be greater than END date",
        "85": "Invalid END date.",
        "86": "Invalid external ID.",
        "87": "Duplicate user ID.",
        "88": "Invalid track 1 data.",
        "89": "Invalid track 2 data.",
        "90": "Transaction already refunded.",
        "91": "Duplicate batch ID.",
        "92": "Duplicate batch transaction.",
        "93": "Batch transaction amount error.",
        "94": "Invalid code. Please check your registration code and try again.",
        "95": "Invalid country code.",
        "96": "Invalid pin.",
        "97": "We're unable to verify your identity with our automated systems, so we’ll need to manually verify it. Please contact your onboarding project manager or email us at onboarding@tenantinc.com so we can begin.",
        "98": "We're unable to verify your identity with our automated systems, so we’ll need to manually verify it. Please contact your onboarding project manager or email us at onboarding@tenantinc.com so we can begin.",
        "99": "We're unable to verify your identity with our automated systems, so we’ll need to manually verify it. Please contact your onboarding project manager or email us at onboarding@tenantinc.com so we can begin.",
        "100": "Transaction already refunded.",
        "101": "Refund exceeds original transaction.",
        "102": "Invalid payer name.",
        "103": "Transaction does not meet date criteria.",
        "104": "Transaction could not be refunded due to current transaction state.",
        "105": "Invalid SEC code.",
        "106": "Invalid ACH account name.",
        "107": "One of the business legal address fields is invalid.",
        "108": "Invalid x509 certificate.",
        "109": "Invalid value for require credit card refund.",
        "110": "Required field is missing.",
        "111": "Invalid EIN.",
        "112": "Invalid business legal name (DBA).",
        "113": "One of the business legal address fields is invalid.",
        "114": "Business (legal) city is invalid.",
        "115": "Business (legal) state is invalid.",
        "116": "Business (legal) zip is invalid.",
        "117": "Business (legal) country is invalid.",
        "118": "Mailing address is invalid.",
        "119": "Business (legal) address is invalid.",
        "120": "Incomplete business address.",
        "121": "Amount Encumbered by enhanced Spendback.",
        "122": "Invalid encrypting device type.",
        "123": "Invalid key serial number.",
        "124": "Invalid encrypted track data.",
        "125": "You may not transfer money between these two accounts.",
        "126": "Currency code not allowed for this transaction.",
        "127": "Currency code not permitted for this transaction.",
        "128": "Requires Additional Validation.",
        "129": "Multicurrency processing is not allowed for the account.",
        "130": "Multicurrency processing is not supported for this bank processor.",
        "131": "Capture amount exceeds allowed amount.",
        "132": "Account setup does not allow capture for amount greater than authorization.",
        "133": "Threat Metrix risk denied.",
        "134": "Threat Metrix Inv alid SessionId.",
        "135": "Threat Metrix Inv alid Account configuration. Please contact support (CODE: 135).",
        "136": "External Payment Method Not Provided.",
        "137": "External Payment Prov ider not prov ided.",
        "138": "External Payment Identifier not provided.",
        "139": "External Payment Provider not valid.",
        "140": "External Payment Method Provided.",
        "141": "Inactive or blocked MCC Code.",
        "142": "Invalid MCC Code.",
        "143": "Gross settle: invalid credit card information.",
        "144": "Gross settle: invalid billing information.",
        "145": "Gross settle: no billing information was included with the payment info.",
        "146": "Gross settle: error setting up billing information.",
        "147": "Gross settle: Tier does not support gross settlement.",
        "148": "ExternalPaymentMethodIdentifier invalid.",
        "149": "Invalid DoingBusinessAs.",
        "150": "Invalid Service Setting.",
        "151": "Amex Enhanced Account Not Configured.",
        "152": "Bad Request.",
        "153": "Invalid Payment Type.",
        "154": "Invalid Significant Owner Percentage.",
        "155": "Invalid Significant Owner Date Of Birth.",
        "156": "Invalid Significant Owner SSN.",
        "157": "Invalid notification email.",
        "158": "Invalid Beneficial Owner data.",
        "159": "Invalid Beneficial Owner count.",
        "160": "Invalid card holder billing name.",
        "161": "Invalid card for fast fund.",
        "162": "Transaction declined.",
        "163": "Invalid card type.",
        "164": "Flash fund not enabled.",
        "165": "Missing required flash fund data.",
        "166": "Service unavailable. Please try again.",
        "167": "Account not registered.",
        "168": "Invalid document name.",
        "169": "Invalid document type.",
        "170": "Invalid document.",
        "171": "Invalid transaction reference number.",
        "172": "Invalid cardholder name.",
        "173": "Invalid referrer URL.",
        "174": "Invalid IP address.",
        "175": "Invalid subnet mask.",
        "176": "Invalid tip amount.",
        "178": "Invalid moto e-commerce indicator.",
        "179": "Invalid account source.",
        "180": "Invalid approval status.",
        "181": "Invalid acquirer reference number.",
        "182": "Invalid card present type ID.",
        "183": "Invalid cardholder identity ID.",
        "184": "Invalid cardholder address.",
        "185": "Missing required signup data.",
        "186": "Invalid CPS merit indicator.",
        "187": "Invalid merchant descriptor.",
        "189": "Invalid document category.",
        "190": "daily transaction limit exceeded.",
        "191": "Invalid comment.",
        "192": "Invalid account credit limit.",
        "193": "Invalid batch request.",
        "194": "Incomplete batch request.",
        "195": "Batch in progress.",
        "201": "Invalid quasi cash indicator.",
        "202": "DTE partner not set.",
        "203": "Invalid time zone data.",
        "204": "Invalid device request format.",
        "205": "We're unable to verify your identity with our automated systems, so we’ll need to manually verify it. Please contact your onboarding project manager or email us at onboarding@tenantinc.com so we can begin.",
        "206": "Invalid device quantity.",
        "207": "Missing Device Name.",
        "208": "Invalid device name.",
        "209": "Invalid office key.",
        "210": "Gateway boarding failed.", 
        "211": "Invalid soundPayment device request format.",
        "212": "Postback url too long or empty.",
        "213": "SoundPayments not equal with devices.",
        "215": "We're unable to verify your identity with our automated systems, so we’ll need to manually verify it. Please contact your onboarding project manager or email us at onboarding@tenantinc.com so we can begin.",
        "220": "Invalid global transaction ID.",
        "221": "ACH decline.",
        "222": "Invalid business type.",
        "223": "Transit devices payment failed.",
        "224": "Gateway transaction id too long.",
        "225": "Global transaction id too long.",
        "226": "Card brand transaction id too long.",
        "227": "Global transaction source too long.",
        "228": "Ambiguous transaction ID’s provided.",
        "229": "None of the transaction ID’s provided.",
        "230": "Invalid GlobalTransSource.",
        "231": "Invalid attept number.",
        "232": "Invalid terms acceptance IP.",
        "233": "Invalid terms version.",
        "235": "Previous address incomplete.",
        "236": "Time at address is required.",
        "237": "Invalid district.",
        "238": "State does not apply for the given country.",
        "239": "Invalid Previous Address.",
        "240": "Invalid business registration number.",
        "241": "Invalid county or post town.",
        "242": "Invalid address id.",
        "243": "Invalid business phone number.",
        "244": "Invalid building number.",
        "245": "Invalid nationality.",
        "246": "Device order failed.",
        "249": "Invalid fee type.",
        "257": "No available terminal ID range for the Portico Card Present device.",
        "258": "No available terminal ID range for Portico Card Not Present device.",
        "259": "No language is defined for the ProPay international Canada integration dev ice order. The Language attribute of “en” (English) or “fr” (French) is required."
    },
    CREDIT_CARD_REJECTIONS_ISSUER_CODE: {
        "02": "The cardholder may have exceeded daily spending limits or allowed number of transactions.",
        "03": "The card may not be permitted for use at this type of merchant. E.g. The card is a prepaid card for grocery store use only.",
        "04": "Suspected fraud or incorrect CVV",
        "05": "Suspected fraud or credit limit exceeded",
        "06": "Invalid card number",
        "07": "Suspected fraud",
        "10": "Transaction was partially approved",
        "12": "Try again",
        "13": "Invalid amount",
        "14": "Invalid card number",
        "15": "Invalid card number", 
        "19": "Try again or have cardholder contact their bank",
        "41": "Lost card",
        "43": "Stolen card",
        "44": "Pick up card",
        "51": "Insufficient funds",
        "52": "Card being used is not linked to a checking account",
        "53": "Card being used is not linked to a savings account",
        "54": "Expired card",
        "55": "Wrong pin",
        "56": "Invalid Card",
        "57": "The card may not be permitted for use at this type of merchant. E.g. The card is a prepaid card for grocery store use only",
        "58": "The card may not be permitted for use at this type of merchant. E.g. The card is a prepaid card for grocery store use only",
        "61": "Debit card limit exceeded",
        "62": "Card type not supported",
        "63": "Invalid CVV",
        "65": "Activity limit exceeded or insufficient funds",
        "75": "Maximum number of PIN attempts exceeded",
        "76": "Reversal data in the POS transaction does not match the Issuer data.",
        "77": "Duplicate reversal or duplicate transaction.",
        "78": "Invalid Card",
        "86": "Cannot verify PIN",
        "91": "Issuing bank unavailable",
        "EL": "Exceeds maximum number of PIN attempts",
        "N1": "Currency not allowed",
        "N7": "Incorrect number of CVV2/CID digits sent",
        "R0": "Recurring charge stopped at customer request",
        "R1": "Recurring charge stopped at customer request",
        "R3": "Recurring charge stopped at customer request",
    },
    PARTIAL_ACCEPTANCE_CODES: ["65", "97", "98", "99", "205", "215", "66"],
    REVERSE_ON_STATUS_CODE: ['-1', '1', '20', '21', '22', '27', '30', '31', '34', '35', '37', '47', '50', '51', '52', '53', '55'],
    APPLICATION_STATUS: ["ReadytoProcess", "FraudAccount", "Canceled", "CheckPending", "AdditionalInformation", "PendingUnpaid", "RiskWiseDeclined", "Hold", "ClosedEULA", "ClosedCollections", "GatewayBoardingFailed"],
    APPLICATION_REASON: ["AccountCancellation", "AccountReactivation", "Prohibited", "Fraud", "IDTheft", "CustomerRequest", "PartnerRequest", "DataChange", "Null", "NewSignup", "Released From Hold"]
  });
  
  module.exports = TENANT_PAYMENTS;
