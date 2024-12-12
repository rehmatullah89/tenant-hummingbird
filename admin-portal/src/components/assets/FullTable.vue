<template>

    <div id="full-table">

        <div class="full-table-outer">

            <div class="full-table-inner" :style="containerStyle">
                <div ref="full-table" class="full-table" :style="tableStyle">
                    <!-- Headers -->
                    <div class="full-table-row full-table-head-row" :class="headerClass" id="items">

                        <div
                            class="full-table-head "
                            :class="col.fixed ? 'locked': null"
                            @click="setSort(col)"
                            v-for="(col, index) in sortedCols"
                            :key="col.key + '_header'"
                            :id="col.key + '_header'"
                            :style="[col.style,  {flex: '1 0 ' + ( col.width + 'px' || '100px' )  }]"
                            v-if="isSelected(col)"
                        >

<!--                            <div class="handle"></div>-->

                            <slot :name="col.key + '_heading'" :value="col.label" :data="col">
                                {{col.label | capitalize}}
                            </slot>
                            <!-- <span class="icon lock-icon" v-show="index === 0" :class="col.fixed ? 'locked' : ''" @click.stop="toggleAffixColumn(col)"></span> -->

                            <span class="icon sort-icon" v-show="filters.sort.field == col.key &&  filters.sort.dir == 'DESC'">&nbsp;&nbsp;</span>
                            <span class="icon sort-icon" v-show="isSorting(col.key) &&  getSortDir(col.key) == 'ASC'">&nbsp;&nbsp;</span>
                        </div>
                    </div>


                  <!-- FILTERS -->
                  <div class="full-table-row full-table-filter-row" :class="filterClass" id="filters" v-show="filters.groups.filter( g => g ).length">

                    <div
                      class="full-table-filters"
                      :class="col.fixed ? 'locked': null"
                      style="padding: 3px 20px 3px 0;"
                      v-for="col in sortedCols"
                      :key="col.key + '_filter'"
                      :id="col.key + '_filter'"
                      :style="[col.style,  {flex: '1 0 ' + ( col.width + 'px' || '100px' )  }]"
                      v-if="isSelected(col)"
                    >
                      <slot :name="col.key + '_filter'" :value="col.label" :data="col">
                        <dropdown
                          v-show="notGroupedBy(col) && isNumberType(col)"
                          :options="number_aggregation_options"
                          v-model="col.agg_method"
                          forceChoice
                          @input="updateFilters"
                        ></dropdown>

                        <dropdown
                          v-show="notGroupedBy(col) && isDateType(col)"
                          :options="date_aggregation_options"
                          v-model="col.agg_method"
                          forceChoice
                          @input="updateFilters"
                        ></dropdown>

                        <div class="filter-group-header" v-show="notGroupedBy(col) && (!isDateType(col) && !isNumberType(col))">Count</div>
                        <div class="filter-group-header" v-show="!notGroupedBy(col)">Grouped By</div>

                      </slot>

                    </div>
                  </div>


                    <slot name="loading" style="text-align:center;" ></slot>
                    <!-- Data -->
                    <div
                        v-for="(d, i) in tableData"
                        :key="i + '_row'"
                        class="full-table-row full-table-body-row"
                        :class="[rowClass, {open: showing.indexOf('show_all_' + i) >= 0}]"
                        v-show="!sorting"
                        @click="handleRowClick(d)"
                    >

                        <div
                            class="full-table-cell"
                            v-for="(col, j) in sortedCols"
                            :key="col.key + '_data'"
                            :style="[col.style, {flex: '1 0 ' + ( col.width + 'px' || '100px' )  }]"
                            v-show="isSelected(col)"
                            :class="{'show-small': shouldShowSmall(col, j), 'locked' : col.fixed }"
                            @click="handleCellClick(d[col.key], i, $event)"
                        >

                            <div class="icon sm-icon" v-if="j == 0 && showing.indexOf('show_all_' + i) < 0">&nbsp;&nbsp;</div>
                            <div class="icon sm-icon" v-if="j == 0 && showing.indexOf('show_all_' + i) >= 0">&nbsp;&nbsp;</div>

                            <span class="mobile-trigger" v-if="showing.indexOf('show_all_' + i) >= 0 && mobileTriggerText && j == 0">
                                <button @click="handleRowClick(d)" class="w-button btn-sm secondary-btn">{{mobileTriggerText}}</button>
                            </span>
                            <div class="sm-label" v-if="j > 0">
                                {{col.label | capitalize}}
                            </div>
                            <div class="slot-holder">
                                <slot
                                    :name="col.key + '_data'"
                                    :value="d[col.key]"
                                    :data="d"
                                    :index="i"
                                    :count="tableData.length">

                                  <span v-if="col.column_type == 'money'">
                                    <span v-if="!filters.groups.length || colAggIs(col, ['min','max','avg','sum']) ">{{d[col.key] | formatMoney }}</span>
                                    <span v-else>{{d[col.key] | formatNumber}}</span>
                                  </span>

                                  <span v-if="col.column_type == 'number'">
                                    {{d[col.key] | formatNumber}}
                                  </span>
                                  <span v-if="col.column_type == 'phone'">
                                    <span v-if="!filters.groups.length">{{d[col.key] || 0 | formatPhone}}</span>
                                    <span v-else>{{d[col.key] | formatNumber}}</span>
                                  </span>
                                  <span v-if="col.column_type == 'date'">
                                     <span v-if="!filters.groups.length || colAggIs(col, ['min','max']) ">{{d[col.key] | formatDate }}</span>
                                    <span v-else>{{d[col.key] | formatNumber}}</span>
                                  </span>
                                  <span v-if="col.column_type == 'datetime'">
                                    {{d[col.key] || 0 | formatLocalDateTime }}
                                  </span>
                                  <span v-if="col.column_type == 'boolean'">
                                    <span v-if="!filters.groups.length">
                                      <span v-if="d[col.key]" class="success icon"></span>
                                      <span v-else class="error icon"></span>
                                    </span>
                                    <span v-else>{{d[col.key] | formatNumber}}</span>
                                  </span>
                                  <span v-if="col.column_type.toLowerCase() === 'string'">
                                    {{ d[col.key] }}
                                  </span>


                                </slot>
                            </div>

                        </div>
                    </div>

                </div>
            </div>
        </div>


    </div>



</template>
<script type="text/babel">

    import Sortable from "sortablejs";
    import Dropdown from '../assets/Dropdown.vue';
    export default{
        name: "FullTable",
        data(){
            return {
                tableStyle: {
                    width: 'auto'
                },
                containerStyle:{
                    left: 0
                },
                number_aggregation_options:['Sum', 'Avg', 'Count', 'Min', 'Max'],
                date_aggregation_options:['Count', 'Min', 'Max'],
                sorting:false,
                isSortable: false,
                showing: [],
                sortable: null,
                columns: [],
                window_width: 0
            }
        },
        props: {
            cols: {
                required: false,
                type: Array,
                default: () => []
            },
            tableData:{
                required: false,
                type: Array,
                default: () => []
            },
            filters:{
                required: false,
                type: Object
            },
            filterClass:{
                required: false,
                type: String
            },
            filterInputClass:{
                required: false,
                type: String
            },
            headerClass:{
                required: false,
                type: String
            },
            rowClass:{
                required: false,
                type: String
            },
            showSmall:{
                required: false,
                type: Boolean
            },
            mobileTriggerText:{
                required: false,
                type: String
            }
        },
        filters:{
            capitalize(value){
                if (!value) return '';
                value = value.toString();
                return value.charAt(0).toUpperCase() + value.slice(1);
            }
        },
        components:{
            Dropdown
        },
        created(){
            this.columns = this.filters.columns;

            window.addEventListener('resize', this.setWidths);
            this.setWidths();



          //  this.setFilters();
          //  this.setSearch(this.$route);
        },
        mounted(){
            this.setUpDragging();
        },
        destroyed(){
            this.destroyDragging();
            window.removeEventListener("resize", this.setWidths);
        },
        computed:{
            headerCols(){
                var cols = [];

                if(!this.tableData.length) return [];
                for(var col in this.tableData[0]){

                    cols.push(col);
                }
                return cols;
            },

            sortedCols(){

                return this.columns;

                let cols = [];
                this.columns.map(c => {
                    let col = this.cols.find(col => col.key === c);
                    if(!col) return;
                    cols.push(col);
                })
                return cols;

                //return this.cols.sort((a,b) => this.columns.indexOf(a.key) - this.columns.indexOf(b.key));
            }
        },

        methods:{
            toggleAffixColumn(col){
              col.fixed = !col.fixed;
              let index = this.cols.findIndex(c => c.key === col.key);
              this.$set(this.cols, index, col);

            },
            colAggIs(col, types){
                let column = this.sortedCols.find(s => s.key == col.key);
                if(!column) return true;
                return types.map(t => t.toLowerCase()).indexOf(column.agg_method.toLowerCase()) >=0;
            },
            colAggNot(col, type){
                let column = this.sortedCols.find(s => s.key == col.key);
                if(!column) return true;
                return column.agg_method.toLowerCase() !== type.toLowerCase();
            },
            notGroupedBy(col){
              return this.filters.groups.indexOf(col.key) < 0;
            },
            isNumberType(col){
              return ['money', 'number'].indexOf(col.column_type) >= 0;
            },
            isDateType(col){
              return ['date'].indexOf(col.column_type) >= 0;
            },

            updateFilters(data){
                this.filters.sortedCols = this.sortedCols.map(s => {
                    return {
                        key: s.key,
                        width: s.width,
                        agg_method: s.agg_method
                    }
                });
                return this.filter();
            },
            mobileTrigger(row){
                if(mobileTriggerText) return mobileTriggerText;
                return row[0];
            },
            destroyDragging(){
                if(this.sortable){
                    this.sortable.destroy();
                    this.sortable = null;
                }
            },

            setUpDragging(){
                let _this = this;
                if(!this.sortable) {
                    this.sortable = Sortable.create(document.getElementById('items'), {
                        ghostClass: 'sortable-shadow',
                        sort: true,
                        // handle: ".handle",
                        draggable: ".full-table-head",
                        chosenClass: "sortable-chosen",
                        swapThreshold: 1,
                        animation: 150,
                        onStart: function (/**Event*/evt) {

                            evt.oldIndex;  // element index within parent
                        },
                        onEnd: function (/**Event*/evt) {
                            var itemEl = evt.item;  // dragged HTMLElement
                            evt.to;    // target list
                            evt.from;  // previous list
                            evt.oldIndex;  // element's old index within old parent
                            evt.newIndex;  // element's new index within new parent
                            evt.oldDraggableIndex; // element's old index within old parent, only counting draggable elements
                            evt.newDraggableIndex; // element's new index within new parent, only counting draggable elements
                            evt.clone // the clone element
                            evt.pullMode;  // when item is in another sortable: `"clone"` if cloning, `true` if moving
                        },
                        // Changed sorting within list
                        onUpdate: function (/**Event*/evt) {
                            // same properties as onEnd
                            _this.moveColumns(evt.oldIndex, evt.newIndex);

                        },
                        // Called when dragging element changes position
                        onChange: function(evt) {

                        }
                    });
                }
            },
            moveColumns(fromIndex, toIndex) {
                var element = this.columns[fromIndex];

                this.columns.splice(fromIndex, 1);
                this.columns.splice(toIndex, 0, element);

                this.$emit('setColumns', {
                    columns: this.columns
                });
            },
            shouldShowSmall(col, index){
                return col.showSmall || (index == 0 && !this.cols.filter(c => c.showSmall).length)
            },

            handleRowClick(rowVal){
                this.$emit('rowClicked', rowVal)
            },
            handleCellClick(cellVal, index, evt){

                if(this.window_width  <= 767){
                    evt.stopPropagation();
                    this.toggle('show_all_' + index);
                }
                this.$emit('cellClicked', cellVal)
            },
            toggle(colShowing, i){
                if(this.showing.indexOf(colShowing) >= 0 ){
                    this.showing.splice(this.showing.indexOf(colShowing), 1);
                } else {
                    this.showing.push(colShowing);
                }
            },

            isSelected(col){
                return true;
                return this.filters.columns.length && this.filters.columns.indexOf(col.key) >= 0;
            },

            filter(){
                this.$emit('filter', this.filters);
            },
            setFilters(){
                return true;

                // var _this = this;
                // this.cols.forEach(c => {
                //     if(c.filter){
                //         _this.$set(_this.filters.search, c.key, _this.filters.search[c.key] || '');
                //     }
                // });
                //
                // _this.$set(_this.filters, 'sort', _this.filters.sort);
            },
            setWidths: _.debounce( function(){

                let totalFixed = 0;

                //let columns = this.cols.filter(c => !this.filters.columns || !this.filters.columns.length || this.filters.columns.indexOf(c.key) >= 0 );
                let totalWidth = this.filters.columns.reduce(function(a, b){
                    return a + ( b.width || 150);
                }, 0);

                let w=window,d=document,e=d.documentElement,g=d.getElementsByTagName('body')[0],x=w.innerWidth||e.clientWidth||g.clientWidth,y=w.innerHeight||e.clientHeight||g.clientHeight;
                this.window_width = x;


                this.filters.columns.forEach(c => {
                   c.style = c.style || {};
                   c.width = c.width || 150;

                   if(c.fixed){
                       c.style.position = 'absolute';
                       c.style.zIndex = 10;
                       c.style.width = c.width + 'px';
                       c.style.left = totalFixed + 'px';
                       totalFixed += c.width;

                   } else if(c.width){
                       // Required if using fixed columns
                       // c.style.position = 'relative';
                       // c.style.left = 'auto';
                       // c.style.zIndex = 0;
                       if(this.window_width  <= 767){
                          c.style.minWidth = '100%';
                       } else {
                          c.style.minWidth = c.width + 'px';
                       }

                       c.style.width = ((c.width / totalWidth) * 100) + "%"
                   }
               });
                this.containerStyle.paddingLeft = totalFixed + 'px';
                this.tableStyle.width = totalWidth + 'px';
                this.$forceUpdate();
            }, 300),
            setSort(col){

                if(col.sortable === false ) return;

                var val = col.key;

                if(this.filters.sort.field !== val) {
                    this.filters.sort = {
                        field: val,
                        dir: 'ASC'
                    }
                    return this.filter();

                }

                if(this.filters.sort.field === val && this.filters.sort.dir === 'ASC' ) {
                    this.filters.sort = {
                        field: val,
                        dir: 'DESC'
                    }
                    return this.filter();
                }


                this.filters.sort = {
                    field: '',
                    dir: ''
                }

                return this.filter();

            },

            isSorting(val){
                this.filters.sort = this.filters.sort || {};
               return this.filters.sort.field === val;
            },

            getSortDir(val){

                if(this.filters.sort.field === val){
                    return this.filters.sort.dir;
                }
            },
            sortColumns(){
                var _this = this;

                var ancestor = document.getElementById('items'),
                    descendents = ancestor.getElementsByTagName('th');
                var i, e;
                for (i = 0; i < descendents.length; ++i) {
                    e = descendents[i];
                    _this.cols.forEach(function(c, j){
                        if(c.key == e.id){
                            _this.cols[j].sort = i;
                        }
                    });
                }
            }
        },

        watch: {
            cols:{
                handler: function(val) {
                    this.setWidths();
                },
                deep:true
            },
            filters:{
                handler:function(val){
                    this.columns = this.filters.columns;
                    this.setWidths();

                },
                deep:true
            }
        }
    }
</script>
<style scoped>
    .full-table-outer {
        width: 100%;
        position:relative
    }
    .full-table-outer .full-table{
        min-width: 100%;
    }
    .full-table-outer .full-table-row{
        display: flex;
        border-bottom: 1px solid #e2e2e2;
        text-align: left;
    }

    .full-table-head,
    .full-table-cell{
        flex: 1;
        padding: 5px 10px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        min-width: 0;
    }
    .full-table-head{
        cursor: default;
    }

    .full-table-cell .sm-icon{
        display:none;

    }
    .full-table-cell .mobile-trigger{
        display:none;
        float:right;
    }
    .full-table-cell .sm-label{
        display:none;
        width: 45%;
        padding-right: 10px;
        font-weight: bold;
        white-space: nowrap;
    }

    /*.full-table-head .handle{*/
    .full-table-head{
      cursor: move;
    }

    .handle{
      width: 100%;
      height: 5px;
      padding: 0;
      left: 0;
      right: 0;
      background: #a0a0a0;
      position: absolute;
      top: 0;
    }

    .sort-icon{
      float: right;
    }

    .lock-icon {
      font-size: 9px;
      background-color: #e2e2e2;
      text-align: center;
      border-radius: 50%;
      width: 16px;
      margin: 0;
      padding: 0;
      line-height: 16px;
      opacity: .5;
      height: 16px;
    }

    .lock-icon.locked{
      opacity: 1;
      color: #00b2ce;
    }

    .filter-group-header{
      padding: 10px 10px;
    }



    .full-table-cell.locked,
    .full-table-filters.locked,
    .full-table-head.locked {
      background: #FFF;
      border-bottom: 2px solid #e2e2e2;
      min-height: 38px;
    }

    .full-table-head.locked {
      background: #f0f0f5;
      border-bottom: 2px solid #e2e2e2;
      border-top: 2px solid #a0a0a0;
    }

    .full-table-head.locked .handle{
      display: none;
    }

    @media (max-width: 767px) {
        .full-table-cell .sm-icon,
        .full-table-cell .sm-label{
            display: inline-block;
        }

        .full-table-cell .mobile-trigger{
            display: block;
        }


        .full-table .slot-holder{
            display: inline-block;
            vertical-align: top;
        }



        .full-table-outer .full-table-row.full-table-body-row{
            display: flex;
            margin: 0 auto 5px;
            border: 1px solid #dce8ef;
            border-radius: 2px;
            width: 100%;

        }

        .full-table-outer .full-table-row.full-table-body-row .full-table-cell{
            padding: 10px 15px;
        }

        .full-table-outer .full-table-row.full-table-body-row.open{
            flex-direction: column;
            border: 1px solid #00b2ce;
            background: #f2f9fd;
        }

        .full-table-outer .full-table-cell{
            display: block;
            border-bottom: 1px solid #dce8ef;
            position: relative;
        }
        .full-table-outer .full-table-row.full-table-body-row.open .full-table-cell{
            flex: 1 !important;

        }

        .full-table-outer .full-table-head-row,
        .full-table-outer .full-table-cell{
            display: none;
        }

        .full-table-outer .full-table-cell.show-small{
            border-bottom: none;
            cursor: pointer;
            font-weight: bold;
            display: inline-block;
            flex: 1;
        }

        /*.open .full-table-cell,*/
        /*.open .full-table-cell.show-small {*/
            /*flex: 0 0 100%;*/
        /*}*/

        .full-table-outer .full-table-cell.show-small .sm-label{
            display:none;
        }
        .full-table-outer .full-table-row.open .full-table-cell.show-small .sm-label {
            display: inline-block;

        }
        .full-table-outer .full-table-row.full-table-body-row.open .full-table-cell:last-child {
            border-bottom: none;
        }

        .full-table-outer .full-table-row.open .full-table-cell ~ .full-table-cell{
            display:block;
        }

        .full-table-outer .full-table-row.open .full-table-cell{
            border-bottom: 1px solid #dce8ef;
        }

        .full-table-outer .full-table{
            max-width: 100%;
        }
    }
    .sortable-shadow{
      background-color: #f5f7f8;

    }
    .sortable-chosen{
      background-color: white;
      opacity: .75;
      color: #00b2ce;
    }

</style>
