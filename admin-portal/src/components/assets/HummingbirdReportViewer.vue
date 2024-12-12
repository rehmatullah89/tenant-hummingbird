<template>
    <div  v-if="structure_loaded" class="report-viewer-container" >

        <hb-breadcrumb to="/reports" v-if="show_title">
            Back to all reports
        </hb-breadcrumb>

        <hb-header :divider="false" v-if="show_views || show_property_selector || show_search || actions_panel.length">
                <template v-slot:left>
                    <span v-if="show_views">
                        <v-autocomplete
                            style="display: inline-block"
                            rounded
                            hide-details
                            :items="views"
                            item-text="name"
                            item-value="id"
                            :value="report"
                            return-object
                            outlined
                            dense
                            @change="changeView"
                            background-color="white"
                            v-if="show_views"
                            height="48"
                            :class="{'hb-header-select' : $vuetify.breakpoint.mdAndUp }"
                            class="hb-header-autocomplete"
                        >
                            <template v-slot:append>
                                <v-row class="pl-2 d-flex align-center">
                                    <span class="mt-0 pt-1 mr-2 pl-2 hb-larger-font-size hb-text-lighter">view</span>
                                    <svg class="mr-3 mt-1" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <rect x="0.5" y="0.5" width="23" height="23" rx="7.5" stroke="#E0E3E8"/>
                                    <path d="M8.17709 10.623C7.73596 10.623 7.51097 11.1527 7.81725 11.4701L11.6402 15.4329C11.8368 15.6367 12.1632 15.6367 12.3598 15.4329L16.1828 11.4701C16.489 11.1527 16.264 10.623 15.8229 10.623H8.17709Z" fill="#677380"/>
                                    </svg>
                                </v-row>
                            </template>
                        </v-autocomplete>
                    </span>

                    <span v-if="show_title">
                        <hb-page-header
                            :title="report_name"
                            :description="description"
                        ></hb-page-header>
                    </span>
                    <span v-if="show_property_selector">
                        <v-autocomplete
                            v-if="report && report.filters"
                            multiple
                            dense
                            hide-details
                            rounded
                            :items="properties"
                            item-text="name"
                            item-value="id"
                            label="Select A Facility"
                            v-model="report.filters.search.property_id"
                            background-color="white"
                            singleLine
                            outlined
                            prepend-inner-icon="mdi-magnify"
                            placeholder="Select A Facility"
                            @change="setSearchParams(null)"
                            height="48"
                            :class="{'hb-header-select' : $vuetify.breakpoint.mdAndUp }"
                            class="hb-header-autocomplete"
                        >
                            <template v-slot:append>
                                <v-row class="pl-2 d-flex align-center">
                                    <span class="mt-0 pt-1 mr-2 pl-2 hb-larger-font-size hb-text-lighter">view</span>
                                    <svg class="mr-3 mt-1" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <rect x="0.5" y="0.5" width="23" height="23" rx="7.5" stroke="#E0E3E8"/>
                                    <path d="M8.17709 10.623C7.73596 10.623 7.51097 11.1527 7.81725 11.4701L11.6402 15.4329C11.8368 15.6367 12.1632 15.6367 12.3598 15.4329L16.1828 11.4701C16.489 11.1527 16.264 10.623 15.8229 10.623H8.17709Z" fill="#677380"/>
                                    </svg>
                                </v-row>
                            </template>
                        </v-autocomplete>

                    </span>
                    <span v-if="conditions && conditions.show_count_tenant" class="title">
                        <span v-if="conditions.select_all">{{num_results - un_checked.length}}</span><span v-else>{{selected.length}}</span> Tenants
                    </span>
                    <span v-show="!isClean && !conditions">
                      <hb-link text color="primary" class="ml-3" @click="resetReport">Reset</hb-link>
                    </span>

                </template>

                <template v-slot:right>
                    <v-text-field
                        v-if="report && report.filters && show_search"
                        outlined
                        hide-details
                        dense
                        @keyup.enter.prevent="setSearchParams({search: searchField})"
                        v-model="searchField"
                        prepend-inner-icon="mdi-magnify"
                        clearable
                        clear-icon="mdi-close-circle"
                        class="hb-text-field-custom d-flex"
                        :placeholder="report_type === 'active_tenants' ? 'Search Tenants' : 'Search This Report'"
                    ></v-text-field>

                    <hb-header-actions class="d-flex">
                        <hb-btn class="ml-1" v-if="showAction('bulk_edit')" icon tooltip="Bulk Actions" :active="active_action === 'bulk_edit'" @click="toggleActionsWindow('bulk_edit')">mdi-format-line-spacing</hb-btn>
                        <hb-btn class="ml-1" v-if="showAction('save')" icon tooltip="Save Report" :active="active_action === 'save'" @click="toggleActionsWindow('save')">mdi-content-save</hb-btn>
                        <hb-btn class="ml-1" v-if="showAction('export')" icon tooltip="Export Report" :active="active_action === 'export'" @click="toggleActionsWindow('export')">mdi-download</hb-btn>
                        <hb-btn class="ml-1" v-if="showAction('columns')" icon tooltip="Set Columns" :active="active_action === 'columns'" @click="toggleActionsWindow('columns')">mdi-table-actions-custom-2</hb-btn>
                        <hb-btn class="ml-1" v-if="showAction('advanced')" icon tooltip="Advanced" :active="active_action === 'advanced'" @click="toggleActionsWindow('advanced')">mdi-table-actions-custom-3</hb-btn>
                         <hb-btn v-show="hasFilters"  class="ml-1" v-if="showAction('filters')" icon tooltip="Filters" :active="active_action === 'filters'" @click="toggleActionsWindow('filters')">mdi-filter-variant</hb-btn>
                    </hb-header-actions>
                </template>
            </hb-header>

<!--
        <v-row style="flex: 0" v-if="show_views || show_property_selector || show_search || actions_panel.length ">
            <v-col style="max-width: 400px;" class="mr-auto" v-if="show_views">
                <v-autocomplete
                    rounded
                    hide-details
                    :items="views"
                    item-text="name"
                    v-model="view"
                    return-object
                    outlined
                    dense
                    @change="changeView"
                    background-color="white"
                    v-if="show_views"
                ></v-autocomplete>


            </v-col>

            <v-col v-if="show_title" class="px-5" >
                <hb-breadcrumb to="/reports">
                    Back to all reports
                </hb-breadcrumb>
                <h2>{{report_name}}</h2>
                <p>{{description}}</p>
            </v-col>

            <v-col v-if="bulkCommunication" style="max-width: 400px;" class="mr-auto">
                <h2>{{ selected.length }} Tenants selected</h2>
            </v-col>

            <v-col class="mr-auto" style="flex: 0 1 300px;" v-if="show_property_selector">

              <v-autocomplete
                v-if="filters"
                multiple
                dense
                hide-details
                rounded
                :items="properties"
                item-text="name"
                item-value="id"
                label="Select A Facility"
                v-model="filters.search.property_id"
                background-color="white"
                singleLine
                outlined
                prepend-inner-icon="mdi-magnify"
                placeholder="Select A Facility"
                @change="setSearchParams(null)"
              ></v-autocomplete>
            </v-col>
            <v-spacer></v-spacer>

            <v-col style="flex: 0 1 300px" v-if="show_search">
              <v-text-field
                v-if="filters"
                outlined
                hide-details
                dense
                @keyup.enter.prevent="setSearchParams(null)"
                v-model="filters.search.search"
                prepend-inner-icon="mdi-magnify"
            ></v-text-field>
            </v-col>

            <v-col class="text-right mt-1 actions-panel" :style="{'flex-basis': (actions_panel && actions_panel.length * 40 ) + 'px'}"  >

              <v-btn  v-if="showAction('bulk_edit')" :depressed="!!bulk_edit" :class="!!bulk_edit ? 'active' : ''" elevation="0" icon @click="toggleActionsWindow('bulk_edit')">

                <v-icon>mdi-format-line-spacing</v-icon>

              </v-btn>

              <v-btn v-if="showAction('save')" :depressed="!!save_report" :class="!!save_report ? 'active' : ''" elevation="0" icon @click="toggleActionsWindow('save')">
                <v-icon>mdi-content-save</v-icon>
              </v-btn>

              <v-btn
                v-if="showAction('export')" :depressed="!!show_export" :class="!!show_export ? 'active' : ''" elevation="0" icon @click="toggleActionsWindow('export')">
                <v-icon>mdi-download</v-icon>
              </v-btn>

              <v-btn v-if="showAction('columns')" :depressed="!!edit_columns" :class="!!edit_columns ? 'active' : ''" elevation="0" icon @click="toggleActionsWindow('columns')">

                <v-icon style="transform: rotate(90deg);">mdi-menu</v-icon>
              </v-btn>

              <v-btn v-if="showAction('advanced')" :depressed="!!advanced" :class="!!advanced ? 'active' : ''" elevation="0" icon @click="toggleActionsWindow('advanced')">

                <svg version='1.1' id='Layer_1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' x='0px' y='0px' width='20px' height='21px' viewBox='0 0 20 21' enable-background='new 0 0 20 21' xml:space='preserve'>  <image id='image0' width='20' height='21' x='0' y='0' xlink:href='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAVCAMAAABxCz6aAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAABEVBMVEX5+vv////+//+XoqyMmKKNmaOIlJ/U2d3Z3eFNX29bbHpSZHN8ipbb3uJUZXVmdYO7wsm0vMOwuL/s7vDb3+JTZHRpeIX8/P1od4T+/v/h5Oettr36+/xhcX9MXm7f4+aBjZlaa3pgcX9Zann5+/ugqrNJXGxicoBjc4H6+vu/xcvJztNYaXjJztTEytDk5+r7/Pz9/f77+/z3+Pr3+PmyusH9/v5RY3P29/l/jJfGzdJXaHdOX3Di5uiBjpl+i5Z+jJd5h5NVZ3ZVZnaWoavp6+1GWWldbXxTZXRQYnGEkJz6+/vr7e/Fy9C+xMq9xMrf4uaGkp1aannY3OBQYnJkc4G5wMf8/v7y9PWHk578/f3K19rFAAAAAWJLR0QB/wIt3gAAAAlwSFlzAAAOxAAADsQBlSsOGwAAAAd0SU1FB+QEBg8mCrm9Jy8AAADVSURBVBjTY2BgxABMDEzMLKyogI2dgYOTixsVcPIw8PLxCwiiACFhBhFRMXQzxYGCEowMMCApJQ3mIAvKMMrKyTOiCTIqKCopq4ijCDKqqqlrcGswoghqamnr6Ojq6Rugajfk5jZkNECoBBFGxtzcJkZwi4wYTc2ApDi3uYUMTJCR0ZIL5Gwraxu4OxltuRTV7ewdHJ2cXeCCrm7uGrIeQODpxegNV+mjocPv6+fvHwARg5jJxBgYBDLTEOq24JBQRpCvw8IZECDCOhLuTjiIYkThggEAXrgaI8p28eQAAAAldEVYdGRhdGU6Y3JlYXRlADIwMjAtMDQtMDZUMTU6Mzg6MTArMDM6MDBib9kUAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDIwLTA0LTA2VDE1OjM4OjEwKzAzOjAwEzJhqAAAAABJRU5ErkJggg==' /></svg>
              </v-btn>


              <v-btn v-if="showAction('filters')" :depressed="!!filter_toggle" :class="!!filter_toggle ? 'active' : ''" elevation="0" icon @click="toggleActionsWindow('filters')">
                    <v-icon>mdi-filter-variant</v-icon>
                </v-btn>

            </v-col>
        </v-row>
-->

        <status @resetStatus="errorClear($options.name)" v-if="errorHas($options.name)" :message="errorGet($options.name)" status="error"></status>

        <!--
        <status @resetStatus="errorClear($options.name)" v-if="errorHas($options.name)" :message="errorGet($options.name)" status="error"></status>
        -->

        <v-row dense style="flex:0" v-if="show_result_count">
          <v-col class="text-right">{{ num_results}} results</v-col>
        </v-row>

        <v-row no-gutters class="grid-container" style="flex:1; position: relative;">
          <v-col>

              <div v-show="checkboxes_disabled" class="mask" >

              </div>

                <ag-grid-vue
                    style="width: 100%; height: 100%;"
                    :key="activated"
                    class="ag-theme-material p-absolute"
                    :columnDefs="gridOptions.columnDefs"
                    :floatingFilter="gridOptions.floatingFilter"
                    :rowSelection="gridOptions.rowSelection"
                    :suppressDragLeaveHidesColumns="gridOptions.suppressDragLeaveHidesColumns"
                    :suppressRowClickSelection="gridOptions.suppressRowClickSelection"
                    :suppressCellSelection="gridOptions.suppressCellSelection"
                    :rowModelType="gridOptions.rowModelType"
                    :cacheBlockSize="gridOptions.cacheBlockSize"
                    :maxBlocksInCache="gridOptions.maxBlocksInCache"
                    :overlayNoRowsTemplate="overlayNoRowsTemplate"
                    :getContextMenuItems="getContextMenuItems"
                    :suppressContextMenu="gridOptions.suppressContextMenu"
                    :rowClass="gridOptions.rowClass"
                    :modules="modules"
                    blockLoadDebounceMillis="400"
                    :frameworkComponents="frameworkComponents"
                    @dragStopped="handleDragStopped"
                    @rowClicked="handleRowClick"
                    @cellClicked="handleCellClick"
                    @grid-ready="onGridReady"
                    @rowSelected="onRowSelected"
                    @selectionChanged="onSelectionChanged"
                    @filterChanged="onFilterChange"
                >
                </ag-grid-vue>
            </v-col>


          <v-col class="elevation-2" style="flex: 0 1 600px; height: 100%; position: relative; overflow: hidden; z-index: 10;" v-show="active_action" >

              <div  class="filter-container" v-if="active_action === 'columns'">
                <actions-panel-header @close="toggleActionsWindow('columns')">
                    <div style="position:relative;top:2px;">
                        <hb-icon :small="true" color="#101318" class="mr-2" mdi-icon="mdi-table-actions-custom-2"></hb-icon>
                    </div>
                    <div>
                        Set Columns
                    </div>
                </actions-panel-header>
                <columns
                  v-if="report.filters.columns && structure.column_structure"
                  :structure="structure.column_structure"
                  :columns="report.filters.columns"
                  :groups="report.filters.groups"
                  @setColumns="setColumns"
                  @close="toggleActionsWindow('columns')">
                </columns>
              </div>

              <div  class="filter-container" v-if="active_action === 'save'">
                <actions-panel-header @close="toggleActionsWindow('save')">
                    <div class="mt-n1">
                        <hb-icon :small="true" color="#101318" class="mr-2">mdi-content-save</hb-icon>
                    </div>
                    <div>
                        Save Report
                    </div>
                </actions-panel-header>

                <save-report
                  v-if="report.filters"
                  :config="report.filters"
                  :template="report.template"
                  :selected="report.id"
                  @close="toggleActionsWindow('save')"
                  @saved="updateView"
                  :show_default_report_option="show_default_report_option"
                ></save-report>

              </div>

              <div class="filter-container" v-if="active_action === 'export'">

                <actions-panel-header @close="toggleActionsWindow('export')">
                    <div class="mt-n1">
                        <hb-icon :small="true" color="#101318" class="mr-2">mdi-download</hb-icon>
                    </div>
                    <div>
                        Export Report
                    </div>
                </actions-panel-header>
                <export-report
                  v-if="report.filters"
                  :selected="report"
                  @close="toggleActionsWindow('export')"
                ></export-report>
              </div>

              <div  class="filter-container" v-if="active_action === 'advanced'">
                <actions-panel-header @close="toggleActionsWindow('advanced')">
                    <div style="position:relative;top:2px;">
                        <hb-icon :small="true" color="#101318" class="mr-2" mdi-icon="mdi-table-actions-custom-3"></hb-icon>
                    </div>
                    <div>
                        Advanced
                    </div>
                </actions-panel-header>
                <advanced
                  v-if="report.filters"
                  :structure="structure.column_structure"
                  :columns="report.filters.columns"
                  :groups="report.filters.groups"
                  :pivot="report.filters.pivot_mode"
                  @setPivot="setPivot"
                  @close="toggleActionsWindow('advanced')"
                ></advanced>
            </div>

              <div  class="filter-container" v-if="active_action === 'bulk_edit'">
                <actions-panel-header @close="toggleActionsWindow('bulk_edit')">
                    <div class="mt-n1">
                        <hb-icon :small="true" color="#101318" class="mr-2">mdi-format-line-spacing</hb-icon>
                    </div>
                    <div>Bulk Actions</div>
                </actions-panel-header>
                <bulk-edit
                  v-if="report.filters"
                  :items="selected"
                  :config="report.filters"
                  :template="report_type"
                  @disableCheckboxes="manageCheckboxes"
                  @close="toggleActionsWindow('bulk_edit')"
                ></bulk-edit>
              </div>


              <div  class="filter-container" v-if="active_action === 'unit_view'">
                <unit-view
                  :unit_id="unit_id"
                  @close="toggleActionsWindow('unit_view')"
                ></unit-view>
              </div>

              <div  class="filter-container" v-if="active_action === 'contact_view'">
                <contact-view
                  :contact_id="contact_id"
                  @close="toggleActionsWindow('contact_view')"
                ></contact-view>
              </div>



                <div class="filter-container" v-if="active_action === 'filters' && report.filters && structure.filter_structure">
                  <actions-panel-header @close="toggleActionsWindow('filters')">
                    <div class="mt-n1">
                        <hb-icon :small="true" color="#101318" class="mr-2">mdi-filter-variant</hb-icon>
                    </div>
                    <div>
                        Filters
                    </div>
                  </actions-panel-header>
                  <!-- TODO Check this -->
<!--                    :filter_data="report.filter_data" -->
                  <filters
                    :filter_structure="structure.filter_structure"
                    :filters="report.filters"
                    @close="toggleActionsWindow('filters')"
                    @search="setSearchParams"
                  >
                  </filters>
              </div>

          </v-col>
        </v-row>

        <send-message
            v-model="sendMessageDialog"
            v-if="sendMessageDialog"
            :contacts="selected"
            :contact="actions.props.contact_id"
            @close="actions.type = null"
        ></send-message>

      <SendSpaceInfo v-model="sendSpaceInfoModal" v-if="sendSpaceInfoModal" @close="actions.type = null"></SendSpaceInfo>

        <add-interaction
            v-model="addInteractionModal"
            v-if="addInteractionModal"
            :contact_id="actions.props.contact_id"
            @close="actions.type = null"
        ></add-interaction>

        <maintenance-request-view
            v-model="viewMaintenanceModal"
            v-if="viewMaintenanceModal"
            :maintenance_id="actions.props.maintenance_id"
            @close="actions.type = null"
        >
        </maintenance-request-view>

    </div>
</template>


<script type="text/babel">
    import api from '../../assets/api.js';
    import {AgGridVue} from "@ag-grid-community/vue";
    import {AllModules} from '@ag-grid-enterprise/all-modules';
    // import {AllModules} from "@ag-grid-enterprise";
    // import {LicenseManager} from "@ag-grid-enterprise/core";

    // LicenseManager.setLicenseKey("CompanyName=Tenant Inc,LicensedApplication=Hummingbird,LicenseType=SingleApplication,LicensedConcurrentDeveloperCount=4,LicensedProductionInstancesCount=1,AssetReference=AG-009150,ExpiryDate=28_July_2021_[v2]_MTYyNzQyNjgwMDAwMA==d48881ecca41e02fe68291559475716e");

    import moment from 'moment';
    import Status from '../includes/Messages.vue';
    import { EventBus } from '../../EventBus.js';
    import SaveReport from '../includes/ReportFunctions/SaveReport.vue';
    import Columns from '../includes/ReportFunctions/Columns.vue';
    import Advanced from '../includes/ReportFunctions/Advanced.vue';
    import BulkEdit from '../includes/ReportFunctions/BulkEdit.vue';
    import ExportReport from '../includes/ReportFunctions/ExportReport.vue';
    import Filters from '../includes/ReportFunctions/Filters.vue';
    import AddInteraction from '../contacts/AddInteraction.vue';
    import SendMessage from '../includes/SendMessage.vue';
    import SendSpaceInfo from '../includes/SendSpaceInfo.vue';
    import MaintenanceRequestView from '../maintenance/MaintenanceRequestView.vue';
    import ActionsPanelHeader from '../includes/ReportFunctions/ActionsPanelHeader.vue';
    import UnitView from '../includes/ReportFunctions/UnitView.vue';
    import ContactView from '../includes/ReportFunctions/ContactView.vue';
    import Vue from "vue";


    // import moment from 'moment';
    import { BIToolMixin } from '../../mixins/bi_tool';

    export default {

        name: 'HummingbirdTable',
        components:{
            Status,
            AgGridVue,
            Filters,
            SaveReport,
            Columns,
            Advanced,
            BulkEdit,
            ExportReport,
            SendMessage,
            SendSpaceInfo,
            MaintenanceRequestView,
            AddInteraction,
            ActionsPanelHeader,
            UnitView,
            ContactView,
        },

        data: () => ({}),
        async created(){
            this.gridOptions.rowModelType = 'serverSide';
        },
        computed:{},

        methods: {
            onGridReady(params) {
                this.gridApi = params.api;
                this.columnApi = params.columnApi;
                this.gridApi.setServerSideDatasource(this);
                if(this.report.filters.search){
                    if(this.$props.conditions && this.$props.conditions.filters) {
                        if(this.report.filters.search.rate_change_id && !this.$props.conditions.filters.rate_change_id) {
                            delete this.report.filters.search.rate_change_id;
                        }
                        Object.assign(this.report.filters.search, this.$props.conditions.filters);
                    }
                    this.searchField = this.report.filters.search.search
                }
                if(this.report.filters && this.report.filters.sort && this.report.filters.sort.field) {
                    var sort = [{
                        colId: this.report.filters.sort.field,
                        sort: this.report.filters.sort.dir || 'asc',
                    }];
                    this.gridApi.setSortModel(sort);
                }
                this.grid_loaded = true;
            },
        },
        mixins: [ BIToolMixin ],
        watch:{
            "$route.query.id"(){
                this.view = this.views.find(v => v.id === this.$route.query.id);
                this.changeView();
            }
        },

    }

</script>

<style lang="scss">

.ag-header {
    height: 50px !important;
    min-height: 50px !important;
    background: #F4F6F8;
}
.ag-header-row {
    height: 50px !important;
}

  .ag-header-row, .ag-pinned-left-header{
    background-color: #F4F6F8;
    border-bottom: 2px solid #C6CDD4;
  }

  .ag-header-cell.ag-header-cell-sortable:hover {
      background-color: transparent !important;
      .ag-header-cell-text {
            color: #101318;
        }
  }

  .ag-header-cell-text {
      color: #474F5A;
        font-weight: 500;
        font-size: 12px;
  }

  .ag-header-cell-text:hover {
      color: #101318;
  }

    .report-viewer-container{
      display: flex;
      flex-direction: column;
      /*justify-content: space-evenly;*/
      height: 100%;
    }
    .ag-header-viewport {
        font-weight: 500;
        color: #474F5A;
        /*border-bottom: 1px solid #C6CDD4;*/
    }
    .ag-root-wrapper {
        /*border: 1px solid #C6CDD4;*/
      box-shadow: 0px 0px 4px #ccc;
    }
    /*.grid-container{*/
    /*    border: 1px solid #C6CDD4;*/
    /*}*/
    .grid-container {
        margin-top: 1px;
    }
    .filter-container{
        position: absolute;
        overflow-y: scroll;
        bottom: 0;
        top: 0;
        left: 0;
        right: 0;
        background: white;
        border-left: 1px solid #e2e2e2;
        display: flex;
        flex-direction: column;
    }
    .filter-container .filter-headline{
        font-size: 14px;
        padding: 15px 20px;
        background-color: #F4F6F8;
        line-height: 21px;
    }
    .ag-theme-material .ag-header{
      border-bottom: none;
    }

    .ag-theme-material .ag-cell,
    .ag-theme-material .ag-header-cell,
    .ag-theme-material .ag-header-group-cell{
      line-height: 23px;
      padding-left: 17px;
      padding-right: 17px;
    }
    .ag-cell {
        font-size: 12px;
        padding-top: 12px !important;
        padding-bottom: 8px !important;
    }

    .report_link {
      color: #306FB6;
      border-bottom: 1px dotted #306FB6;
      padding-bottom: 2px;
    }


  .ag-body-viewport {
    border-top: 1px solid #C6CDD4;
  }
  .ag-row.hummingbird-row {
    background-color: white;
  }
  .ag-row.ag-row-focus.hummingbird-row,
  .ag-row.ag-row-selected.hummingbird-row,
  .ag-row.hummingbird-row:hover {
    background-color: #eeeeee;
  }

    /*
  .ag-header-cell-resize {
    border-left: 1px solid #F4F6F8;
    border-right: 1px solid #F4F6F8;
  }
  */

.ag-theme-material .ag-header:hover .ag-header-cell-resize{
  /*border-left: 1px solid #C6CDD4;*/
  /*border-right: 1px solid #C6CDD4;*/
  background: linear-gradient(#C6CDD4, #C6CDD4) no-repeat center/1px 100%;
}

  .actions-panel{
    flex: 0 1;
  }


  .mask{
    z-index: 1; background: rgba(255,255,255, .5); display: block; position:absolute; top: 0; left: 0; bottom:0; top: 0; width: 100%; height: 100%;
  }


.ag-header-viewport, .ag-floating-top-viewport, .ag-body-viewport, .ag-pinned-left-cols-viewport, .ag-center-cols-viewport, .ag-pinned-right-cols-viewport, .ag-floating-bottom-viewport, .ag-body-horizontal-scroll-viewport, .ag-virtual-list-viewport{
  background-color: #F4F6F8;
}
.ag-center-cols-viewport {
  background: white;
}
.ag-center-cols-container {min-width: 100%;
}
.p-absolute{
    position: absolute;
}
</style>


<!--  https://codepen.io/ZeroX-DG/pen/vjdoYe - resizeable column -->
