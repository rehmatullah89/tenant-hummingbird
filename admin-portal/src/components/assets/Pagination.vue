<template>
    <div>
        <span class="w-hidden-small w-hidden-tiny">
            {{pagination.offset}} - {{ totalShown}} of {{pagination.result_count}} results
        </span>
        <button :disabled="isFirstPage" class="secondary-btn sm-margin w-button btn-sm" style="color:#00727A" @click="prev">
            <span class="icon"><strong></strong></span>
        </button>
        <button v-for="n in numbers" @click="page(n)" class="numbers sm-margin w-button btn-sm " :class="{'primary-btn' : n === activePage, 'secondary-btn': n !== activePage}"><strong>{{n}}</strong></button>

        <button  :disabled="isLastPage"  class="secondary-btn sm-margin w-button btn-sm" style="color:#00727A" @click="next">
            <span class="icon"><strong></strong></span>
        </button>

    </div>

</template>

<script type="text/babel">
    export default {
        name: "Pagination",
        data() {
            return {
                pagination:{
                    page: '',
                    offset: 0,
                    limit: '',
                    result_count: 0
                }
            }
        },
        computed:{
            totalShown(){
                return (this.pagination.offset + this.pagination.limit > this.pagination.result_count) ?
                            this.pagination.result_count : this.pagination.offset + this.pagination.limit
            },

            activePage(){
                if(this.pagination.offset == 0) return 1;
                return Math.floor(this.pagination.offset/this.pagination.limit) + 1;
            },
            isLastPage(){
               return this.pagination.result_count == 0 || (+this.pagination.page ==  Math.ceil(this.pagination.result_count / this.pagination.limit)) ;
            },
            isFirstPage(){
                return this.pagination.offset == 0;
            },
            numbers(){

                if(this.pagination.result_count == 0) return [];

                var offset = this.pagination.offset;
                var limit = this.pagination.limit;
                var curr_page = 1;
                var pages = [];
                if(offset > 0){
                    curr_page =  Math.ceil(this.pagination.offset / this.pagination.limit) + 1;
                }

                if(curr_page == 1){
                    start_page = 1;
                } else if(curr_page >= 3 && offset + limit >= this.pagination.result_count) {
                    var start_page = curr_page - 2
                } else {
                    var start_page = curr_page - 1
                }
                for(var i = (start_page); i < start_page + 3; i++){
                    if(( i-1 ) * limit <= this.pagination.result_count  ){
                        pages.push(i);
                    }
                }
                return pages;
            }
        },
        methods:{
            setUpPaginator(){
                this.pagination.page = +this.value;
                this.pagination.offset = +this.offset;
                this.pagination.limit = +this.limit;
                this.pagination.result_count = this.result_count;
            },
            page(page){
                this.$emit('input', page);

            },
            prev(){
                var page = this.pagination.page > 0 ? this.pagination.page - 1 : 0;
                this.$emit('input', page);
            },
            next(){
                var maxPages = Math.ceil(this.pagination.result_count / this.pagination.limit);
                var page = this.pagination.page < maxPages ? this.pagination.page +1: maxPages;
                this.$emit('input', page);
            }
        },
        props: {
            value:{
                required: true
            },
            limit:{
                required: true
            },
            offset:{
                required: true
            },
            result_count:{
                required: true
            }
        },
        watch:{
            value(){
                this.setUpPaginator();
            },
            limit(){
                this.setUpPaginator();
            },
            offset(){
                console.log('update!');
                this.setUpPaginator();
            },
            result_count(){
                this.setUpPaginator();
            },
        }
    }
</script>

<style scoped>
    @media (max-width: 767px) {
        .numbers{
            display: none;
        }
    }
</style>

