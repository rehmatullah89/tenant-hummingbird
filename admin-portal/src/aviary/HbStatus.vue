<template>
    <span style="background-color: white; border-radius: 15px; line-height: 0;">
        <v-chip
            :color="statusColor"
            outlined
            class="hb-v-chip"
            small
        >
            <v-avatar left class="mr-0">
                <v-icon size="16">mdi-checkbox-blank-circle</v-icon>
            </v-avatar>
            <span class="hb-status-font text-capitalize font-weight-medium">
                <slot></slot>
            </span>
        </v-chip>
    </span>
</template>
<script type="text/babel">

    export default {
        name: "HbStatus",
        data: function() {
            return {
                types: [
                    { color: '#919EAB', name: 'Available', description: 'In Inventory, ready to lease'},
                    { color: '#02AD0F', name: 'Leased', description: 'Space is occupied by a tenant'},
                    { color: '#02AD0F', name: 'Company', description: 'Space occupied by the company for business purposes'},
                    { color: '#02AD0F', name: 'Charity', description: 'Space donated for charitable purpose'},
                    { color: '#FFD600', name: 'Offline', description: 'Scheduled for Maintenance, Prep Space to make Available'},
                    { color: '#FFD600', name: 'Reserved', description: 'Active Lead, Removed from Inventory, On Hold, Hard Reservation'},
                    { color: '#FFD600', name: 'Remove Overlock', description: 'Previously delinquent Tenant is now Current requiring either a manual or electronic removal of restrictions'},
                    { color: '#FFD600', name: 'Scheduled Move-Out', description: 'Intent to Move-Out'},
                    { color: '#FB4C4C', name: 'Overlocked', description: 'Space has manually or electronically restricted tenant access'},
                    { color: '#FB4C4C', name: 'Scheduled for Auction', description: 'Delinquent Tenant in the final stages of the lien process. Can be On-site Auction or Online Auction (Time span)'},
                    { color: '#FB4C4C', name: 'Bankruptcy', description: 'Tenant is in Bankruptcy'},
                    { color: '#FB4C4C', name: 'Active Lien', description: 'Starts with preliminary lien notice and continues through auction sale'},
                    { color: '#FFD600', name: 'Gate Lockout', description: 'Delinquent or problem tenant that has restricted access - Revoke Gate Access, Pending Lease Signature'},
                    { color: '#FFD600', name: 'Balance Due', description: 'Lease is closed but there is still a balance due'},
                    { color: '#FFD600', name: 'Delinquent', description: 'Tenant that is 2+ Days delinquent'},
                    { color: '#02AD0F', name: 'Active Lead', description: 'Tenant that is digitally or manually nurtured'},
                    { color: '#FFD600', name: 'Suspended', description: 'Rent, Fee or Auction/Lien Process Suspension, Pending Verified Move-Out'},
                    { color: '#FFD600', name: 'Pending', description: 'Incomplete Move-In'},
                    { color: '#02AD0F', name: 'Current', description: 'Tenant in good standing'},
                    { color: '#919EAB', name: 'Retired Lead', description: 'Digitally or manually exhausted'},
                    { color: '#919EAB', name: 'Lease Closed', description: 'previous Tenant with or without balance'},
                    { color: '#FB4C4C', name: 'Auction', description: 'Delinquent Tenant in the final stages of the lien process. Can be On-site Auction or Online Auction (Time span)'},

                    { color: '#FFD600', name: 'Signing in Progress', description: 'Document Signing in Progress'},
                    { color: '#FFD600', name: 'Ready to Sign', description: 'Document is Ready to Sign'},
                    { color: '#02AD0F', name: 'Signed', description: 'Document is Signed'},
                ],
                invoiceTypes: [
                    { color: '#FFD600', name: 'Open', description: 'Invoice is Open'},
                    { color: '#02AD0F', name: 'Paid', description: 'Invoice was Paid'},
                    { color: '#919EAB', name: 'Void', description: 'Invoice was Voided'},
                    { color: '#919EAB', name: 'Write Off', description: 'Invoice was Written Off'},
                    { color: '#FB4C4C', name: 'Past Due', description: 'Invoice is Past Due'},
                ]
            };
        },
        computed: {
            default(){
                if(this.$slots.default){
                    return this.$slots.default[0].text.trim();
                }
                else {
                    return '';
                }
            },
            selectedStatus(){
                if(this.status && this.invoice){
                    return this.invoiceTypes.filter( i => this.status.toLowerCase() === i.name.toLowerCase() );
                } else if(this.status){
                    return this.types.filter( i => this.status.toLowerCase() === i.name.toLowerCase() );
                } else if(this.default.length > 0){
                    return this.types.filter( i => this.default.toLowerCase() === i.name.toLowerCase() );
                } else {
                    return '';
                }
            },
            statusName(){
                if(this.selectedStatus.length){
                    return this.selectedStatus[0].name;
                } 
                else {
                    return this.status;
                }
            },
            statusColor(){
                if(this.color === 'success'){
                    return '#02AD0F';
                }
                else if(this.color === 'caution'){
                    return '#FFD600';
                }
                else if(this.color === 'warning'){
                    return '#FB4C4C';
                }
                else if(this.color === 'other'){
                    return '#919EAB';
                }
                else if(this.color){
                    return this.color;
                }
                else if(this.selectedStatus.length){
                    return this.selectedStatus[0].color;
                }
                else {
                    return '#919EAB';
                }
            }
        },
        props: [ 'color', 'status', 'invoice' ],
    }
</script>

<style scoped>

</style>