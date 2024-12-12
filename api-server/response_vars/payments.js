

module.exports = {
	'/:payment_id':{
		get: 'id,property_id,payment_methods_id,lease_id,amount,transaction_id,auth_code,date,created,payment_source,source,number,ref_name,notes,type,method,sub_method,status,status_desc,accepted_by,amt_remaining,total_applied,payment_remaining,is_settled,is_auction_payment,is_auctioned_lease_payment,can_reverse,PaymentMethod(id,lease_id,first,last,name_on_card,address_id,Address(id,address,address2,city,state,country,zip),unit_number,auto_charge,card_end,card_type,active),AppliedPayments(id,invoice_id,payment_id,date,amount,Invoice(id,lease_id,number,date,due,total_payments,total_discounts,total_tax,subtotal,unit_info)),Refunds(id,payment_id,amount,transaction_id,auth_code,date,reason,type,created_at,upload_id,upload_src),Contact(*),AcceptedBy(first,last,email),is_inter_property_payment,InterPropertyPayment(sourcePayment(id,property_id,method,sub_method,amount,transaction_id,PaymentMethod(card_type,card_end),Property(id,number,Address(*))),appliedPayments(id,invoice_id,payment_id,date,amount,Invoice(id,property_id,lease_id,number,date,due,total_payments,total_discounts,total_tax,subtotal,unit_info(*),property_info(*))) )'
	},
  '/:payment_id/receipt':{
    get: 'company(*),property(name,Address(*),Phones(*),Emails(*)),InterPropertyInvoices,invoices(id,number,date,due,sub_total,total_tax,discounts,total_due,total_payments,balance,balance_remaining,Lease(Unit(number,Category(name))),InvoiceLines(Product(name,default_type),qty,cost,start_date,end_date,Service(name,recurring,prorate,taxable))),payment(id,amount,amount_tendered,transaction_id,date,created,number,ref_name,source,method,account_balance,AcceptedBy,Property,LeaseAuction(id,lease_id,unit_id,auction_type,notes,created_by,scheduled_date,contact_id,amount,tax,tax_exempt,cleaning_deposit,cleaning_period,license_number,deleted_at,modified_at,payment_id,refund_id,Contact(last,first,email,Phones(id,type,phone,sms))),AppliedPayments(id,invoice_id,payment_id,date,amount),InterPropertyPayment(appliedPayments(id,invoice_id,payment_id,date,amount)),Contact(first,last,email,company,Phones(*),Addresses(*)),AcceptedBy(first,last,email),payment_remaining,status,status_desc,PaymentMethod(first,last,name_on_card,type,card_end,card_type,routing_number))'
  },
  '/:payment-methods':{
		post: 'id,first,last,property_id,Address(*),card_end,card_type,contact_id,type'
	},


}
