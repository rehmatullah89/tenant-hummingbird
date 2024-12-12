<template>

    <div
        :id="'autocomplete_' + identity"
        class="combobox-wrapper"
        :class="className"
        @blur="onBlur"
    >
        <div role="combobox"
             :aria-expanded="showList"
             :aria-owns="id"
             :aria-haspopup="id + '-listbox'"
             :id="id + '-combobox'"
             :class="{'show-all': showAll}"
        >
            <div class="combobox-input-wrapper">
                <input
                    autocomplete="off"
                    type="text"
                   :name="name"
                   :id="id"
                   aria-autocomplete="both"
                   :aria-controls="id + '-listbox'"
                   :aria-labelledby="labeledBy"
                   @keydown="onKeyDown"
                   @keyup="onKeyUp"
                   @focus="onFocus"
                   @blur="onBlur"
                   class="combo-input"
                   ref="input"
                   v-model="search"
                   :placeholder="placeholder"
                   :aria-activedescendant="activeDecendant"
                >
                <div
                    v-show="search.length"
                    class="combobox-remove icon"
                    @click="unset()"
                >
                    
                </div>

                <div
                    v-show="showLoading"
                    class="combobox-loading"
                >
                    <loader color="#00b2ce" size="20px" class="inline-loader"></loader>
                </div>

            </div>


            <div class="combobox-dropdown icon"

                 :id="id + '-arrow'"
                 tabindex="-1"
                 role="button"
                 @click="onArrowClick"
                 aria-label="id + '-arrow'">
                <slot name="trigger">
                    <span class="icon"></span>
                </slot>
            </div>
        </div>
        <ul
            :aria-labelledby="labeledBy"
            role="listbox"
            :id="id + '-listbox'"
            class="listbox"
            :aria-expanded="showList"
            v-show="showList"
            ref="list"
        >
            <li
                    v-show="addText"
                    class="result add-link"
                    role="option"
                    @click="$emit('add')"
            >
                <span class="icon"></span>&nbsp;&nbsp;{{addText}}
            </li>
            <li v-show="!results.length" class="result no-results">No Results Found</li>

            <li
                    v-show="filteredResults.length"
                    v-for="result, i in filteredResults"
                    class="result"
                    role="option"
                    :key="optionString(result)"
                    :id="id + 'result-item-' + i"
                    :aria-selected="i == activeIndex"
                    :class="{focused: i == activeIndex}"
                    @click="selectItem(result, i)"
                    :ref="'element_' + optionString(result) "
            >
                <slot name="option" :data="result">
                    {{ optionLabel(result) }}
                </slot>
            </li>




        </ul>
    </div>



</template>


<script type="text/babel">


    import Loader from './CircleSpinner.vue';
    export default{
        name: "Autocomplete",
        data(){
            return {
                hasSearched: false,
                identity: '',
                showList: false,
                search: '',
                activeIndex: -1,
                results: [],
                shouldAutoSelect: false,
                isInitial: true,
                KeyCode: {
                    BACKSPACE: 8,
                    TAB: 9,
                    RETURN: 13,
                    ESC: 27,
                    SPACE: 32,
                    PAGE_UP: 33,
                    PAGE_DOWN: 34,
                    END: 35,
                    HOME: 36,
                    LEFT: 37,
                    UP: 38,
                    RIGHT: 39,
                    DOWN: 40,
                    DELETE: 46
                },
                focused: null
            }
        },
        components:{
            Loader
        },
        computed:{
            activeDecendant(){
                if(!this.activeIndex) return null;
                return 'result-item-' + this.activeIndex;
            },
            idSlug(){
                if(!this.id) return '';
                return this.slugify(this.id);
            },
            filteredResults(){

                if(!this.search && this.showAll) return this.results;

                return this.results.filter(r => {

                    try{
                        if(this.labelField && r[this.labelField]){
                            return r[this.labelField].toLowerCase().indexOf(this.search.toLowerCase()) >= 0;
                        }
                        console.log(r)
                        return r.indexOf(this.search) >= 0;
                    } catch(err){

                        console.log("err", err);
                        return false;
                    }
                })
            }
        },
        mounted(){

            this.identity = this.rando();
            this.results = this.options;
            if(this.value) this.setSearch(this.value);
        },

        methods:{

            rando(){
                return Math.random().toString(36).replace(/[^a-z]+/g, '');
            },


            slugify(text){
                return text.toString().toLowerCase()
                    .replace(/\s+/g, '-')           // Replace spaces with -
                    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
                    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
                    .replace(/^-+/, '')             // Trim - from start of text
                    .replace(/-+$/, '');            // Trim - from end of text
            },
            onArrowClick(){
                if(this.showList){
                    this.hideList()
                } else {
                    this.openList()
                }
                this.doSearch();
            },
            onKeyDown(evt){
                this.handleKeyDownPress(evt);
            },
            onKeyUp(evt){
               this.handleKeyUpPress(evt);
            },
            onFocus(){
                this.doSearch();
            },

            clickSource(event){
                var a = document.getElementById('autocomplete_' + this.identity);
                var d = event.target;
                if (this.showList && a && !a.contains(d)) {
                    this.setVal('');
                    this.hideList();
                }
            },
            away(){
                if(this.hasSearched && this.showList && (!this.filteredResults.length || this.activeIndex < 0)) {
                    this.setVal('');
                    this.hideList();
                    return;
                }

            },
            onBlur(){

//                if(!this.search.trim().length){
//                    this.setVal('');
//                } else if(this.filteredResults[this.activeIndex]){
//                    this.selectItem(this.filteredResults[this.activeIndex]);
//                }
//                if(this.hasSearched && this.showList && (!this.filteredResults.length || this.activeIndex < 0)) {
//
//
//                    this.showList = false;
//                    return;
//                }
//
//                if(this.labelField && this.search == this.filteredResults[this.activeIndex][this.labelField]){
//                    this.selectItem(this.filteredResults[this.activeIndex]);
//                    this.showList = false;
//                    return;
//                } else if(this.search == this.filteredResults[this.activeIndex]){
//                    this.selectItem(this.filteredResults[this.activeIndex]);
//                    this.showList = false;
//                    return;
//                }
//
//                this.setVal('');
            //    this.showList = false;

                return;

            },
            setSearch(value){
//                if(!value) return;


                if(this.idField && value){
                    var found = this.options.filter(o => o[this.idField] == value );
                    if(!found.length) return;
                    this.search = found[0][this.labelField] || '';
                    return;
                } else if (this.labelField && value) {
                    this.search = value[this.labelField] || '';
                    return;
                }
                this.search = value || '';

            },
            selectItem(item){

                if(item){
                    this.setVal(item);
                    if(!this.keepOpen){
                        this.hideList();
                    }
                }
            },
            handleKeyUpPress(evt){

                var key = evt.which || evt.keyCode;
                switch (key) {
                    case this.KeyCode.UP:
                    case this.KeyCode.DOWN:
                    case this.KeyCode.ESC:
                    case this.KeyCode.RETURN:
                        evt.preventDefault();
                        return;
                    default:
                        this.doSearch();
                }
            },
            handleKeyDownPress(evt){
                var key = evt.which || evt.keyCode;
                if (key === this.KeyCode.ESC) {
                    this.hideList();
                    this.setVal('');
                    return;
                }

                switch (key) {
                    case this.KeyCode.UP:

                        if(!this.showList) this.doSearch();

                        if (this.activeIndex <= 0) {
                            this.activeIndex = this.filteredResults.length - 1;
                        } else {
                            this.activeIndex--;
                        }
                        this.moveWindow();
                        evt.preventDefault();
                        break;
                    case this.KeyCode.DOWN:

                        if(!this.showList) this.doSearch();

                        if (this.activeIndex === -1 || this.activeIndex >= this.filteredResults.length - 1) {
                            this.activeIndex = 0;
                        } else {
                            this.activeIndex++;
                        }
                        this.openList();
                        this.moveWindow();
                        evt.preventDefault();
                        break;
                    case this.KeyCode.RETURN:

                        if(!this.filteredResults.length) evt.preventDefault();
                        this.selectItem(this.filteredResults[this.activeIndex]);
                        return;
                    case this.KeyCode.TAB:

                        if(!this.hasSearched) return;

                        if(this.activeIndex >= 0 ) {
                            this.selectItem(this.filteredResults[this.activeIndex]);
                            return;
                        }
                        var found = this.filteredResults.filter(r => {
                            if(this.labelField){
                                return r[this.labelField] == this.search;
                            } else {
                                return r == this.search;
                            }
                        });

                        if (!found.length) {
                            //this.search = '';
                            this.setVal('');
                            return;
                        }
                        this.activeIndex = this.filteredResults.indexOf(found[0]);
                        this.selectItem(found[0]);

                        return;
                    default:

                        this.openList();
                        return;
                }

              //  evt.preventDefault();



            },
            moveWindow(){

                if(!this.filteredResults.length) return;
                var element = this.$refs['element_' +  this.optionString(this.filteredResults[this.activeIndex])][0];

                // MOVE WINDOW TO PROPER POSITION

                if (this.$refs.list.scrollHeight > this.$refs.list.clientHeight) {
                    var scrollBottom = this.$refs.list.clientHeight + this.$refs.list.scrollTop;

                    var elementBottom = element.offsetTop + element.offsetHeight;
                    if (elementBottom > scrollBottom) {
                        this.$refs.list.scrollTop = elementBottom - this.$refs.list.clientHeight;
                    }
                    else if (element.offsetTop < this.$refs.list.scrollTop) {
                        this.$refs.list.scrollTop = element.offsetTop;
                    }
                }
            },
            doSearch(){

                this.activeIndex = -1;
                this.$emit('search', this.search);
            },

            setVal(value){

                if(this.idField && value){
                    this.$emit('input', value[this.idField]);
                } else if(this.labelField && !this.idField && !value){
                    this.$emit('input', {});
                } else {
                    this.$emit('input', value);
                }
            },
            unset(){
                this.search = '';
                this.setVal('');
                this.hideList();
            },
            openList(){
                this.showList = true;
                document.body.addEventListener('click', this.clickSource);

            },
            hideList(){
                document.body.removeEventListener('click', this.clickSource);
                this.showList = false;
            },


            optionString(o){
                if(this.idField && o[this.idField]){
                    return this.slugify(o[this.idField])
                }

                if(this.labelField && o[this.labelField]){
                    return this.slugify(o[this.labelField])
                }

                if(!o) return '';
                return this.slugify(o);
            },
            optionLabel(o){
                if(this.labelField && o[this.labelField]){
                    return o[this.labelField]
                }
                return o;
            },




        },

        props: {
            id:{
                type: String,
                required: false
            },
            name:{
                type: String,
                required: false
            },
            labeledBy:{
                type: String,
                required: false
            },
            options: {
                type: Array,
                required: false
            },
            value: {
                required: false
            },
            className: {
                type: String,
                required: false
            },
            showAll:{
                type: Boolean,
                required: false,
                default: false
            },
            placeholder: {
                type: String,
                required: false,
                default: ''
            },
            idField:{
                type: String,
                required: false
            },
            labelField:{
                type: String,
                required: false
            },
            keepOpen:{
                type: Boolean,
            },

            addText: {
                type: String,
                required: false
            },
            showLoading:{
                type: Boolean,
                default: false
            }
        },
        watch:{
            options(o){
                this.results = o;
                if(!this.hasSearched){
                    this.setSearch(this.value)
                }
                this.hasSearched = true;

            },
            hasSearched(val){

            },
            value(value){
                this.setSearch(value);
            }
        }

    }


</script>


<style scoped>

    .combobox-wrapper {
        display: block;
        position: relative;
        text-align: left;

    }


    .combobox-wrapper input.combo-input{
        display: block;
        width: 100%;
        color: #333333;
        vertical-align: middle;
        background-color: #ffffff;
        border: 1px solid #cccccc;
        height: 38px;
        padding: 8px 40px 8px 12px;
    }

    .combobox-wrapper .combobox-dropdown {
        position: absolute;
        right: 0;
        top: 0;
        color: #cccccc;
        height: 100%;
        border-left: 1px solid #e2e2e2;
        cursor: default;
        font-family: "FontAwesome", sans-serif;
        padding: 10px 15px;
    }

    .combobox-wrapper .listbox{
        top: 37px;
        width: 100%;
        background: white;
        border: 1px solid #ccc;
        list-style: none;
        margin: 0;
        padding: 0;
        position: absolute;
        z-index: 1000 ;
        max-height: 300px;
        overflow-y: auto;
        box-shadow: 1px 1px 4px 0 #ddd;
    }

    .combobox-wrapper .listbox .result {
        cursor: default;
        margin: 0;
        display: block;
        position: relative;
        line-height: 18px;
        padding: 10px 12px;
    }


    li.loader {
        padding-left: 10px;
    }

    li.no-results{

    }

    /* Custom styles */
    .combobox-wrapper li:hover{
        background-color: #f5f7f8;
    }
    .combobox-wrapper input:focus{
        border: 2px solid #00b2ce;
        outline: 0;
    }
    .combobox-wrapper li.focused,
    .combobox-wrapper li.focused:hover{
        background: #f5f7f8;
    }

    .combobox-input-wrapper{
        position: relative;

    }

    .combobox-remove.icon {
        position: absolute;
        top: 0;
        right: 0;
        color: #cccccc;
        cursor: default;
        padding: 10px 13px;
        text-align: center;
        font-size: 10px;
        z-index: 100;
    }

    .combobox-loading{
        position: absolute;
        top: 0;
        right: 0px;
        padding: 4px 2px;
        text-align: center;
        font-size: 10px;
        z-index: 0;
    }

    .show-all .combobox-dropdown {
        display: block;
        background-color: white;
        border: 1px solid #cccccc;
        border-left: 0;

    }

    .show-all  .combobox-input-wrapper{
        margin-right: 39px;
    }

    .result.add-link{
        background: #f5f7f8;
        color: #788f9b;
        font-weight: 500;
        border-bottom: 1px solid #f0f0f5;
        text-transform: uppercase;
        font-size: 11px;
        cursor: pointer;
    }


</style>
