<template>
    <div class="pt-0 ma-0 section-content">
        <div class="primary-section-content">

            <div class="main-section-heading">
                <div>

                    <h1 class="main-section-header">Test</h1>
                    <!--
                    <br />
                    <br />
                    -->
                    <p>Use this as a playground to test new components as you develop</p>
                </div>
            </div>

            <div class="content-view">
                <div class="form-section">
                    <div title class="mb-1">Test Icon 24px:</div>
                    <v-tooltip bottom>
                        <template v-slot:activator="{ on }">
                            <v-hover v-slot:default="{ hover }">
                                <v-btn :ripple="false" large icon v-on="on" :class="{'hb-button-active' : buttonIsOn1}" @click="buttonIsOn1 = !buttonIsOn1">
                                    <v-icon :color="hover || buttonIsOn1 ? 'black' : ''">mdi-magnify</v-icon>
                                </v-btn>
                            </v-hover>
                        </template>
                        <span>Search</span>
                    </v-tooltip>
                    <br />
                    <div title class="mb-1">Test Icon 18px:</div>
                    <v-tooltip bottom>
                        <template v-slot:activator="{ on }">
                            <v-hover v-slot:default="{ hover }">
                                <v-btn :ripple="false" icon v-on="on" :class="{'hb-button-active' : buttonIsOn2}" @click="buttonIsOn2 = !buttonIsOn2">
                                    <v-icon size="18" :color="hover || buttonIsOn2 ? 'black' : ''">mdi-magnify</v-icon>
                                </v-btn>
                            </v-hover>
                        </template>
                        <span>Search</span>
                    </v-tooltip>
                    <br /><br />
                    <v-divider></v-divider>
                    <br />
                    <div title class="mb-1">Test Primary Button:</div>
                    <v-hover v-slot:default="{ hover }">
                        <v-btn class="primary-button" :class="{'hb-primary-button-hover' : hover}" depressed :ripple="false"><span class="subtitle-1 white--text">Next</span></v-btn>
                    </v-hover>
                    <br /><br />
                    <div title class="mb-1">Test Primary Button Disabled:</div>
                    <v-hover v-slot:default="{ hover }">
                        <v-btn class="primary-button" :class="{'hb-primary-button-hover' : hover}" depressed disabled><span class="subtitle-1 white--text">Next</span></v-btn>
                    </v-hover>
                    <br /><br />
                    <div title class="mb-1">Test Primary Button With Menu Down:</div>
                    <v-hover v-slot:default="{ hover }">
                        <v-btn class="primary-button" :class="{'hb-primary-button-hover' : hover}" depressed :ripple="false"><span class="subtitle-1 white--text">Next <v-icon color="#212B36" class="mr-0 pr-0">mdi-menu-down</v-icon></span></v-btn>
                    </v-hover>
                    <br /><br />
                    <div title class="mb-1">Test Delete Button:</div>
                    <v-hover v-slot:default="{ hover }">
                        <v-btn class="delete-button" :class="{'hb-delete-button-hover' : hover}" depressed :ripple="false"><span class="subtitle-1 white--text">Delete</span></v-btn>
                    </v-hover>
                    <br /><br />
                    <div title class="mb-1">Test Delete Button Disabled:</div>
                    <v-hover v-slot:default="{ hover }">
                        <v-btn class="delete-button" :class="{'hb-delete-button-hover' : hover}" depressed disabled><span class="subtitle-1 white--text">Delete</span></v-btn>
                    </v-hover>
                    <br /><br />
                    <div title class="mb-1">Test Secondary Button:</div>
                    <v-hover v-slot:default="{ hover }">
                        <v-btn class="secondary-button" :class="{'hb-secondary-button-hover' : hover}" depressed :ripple="false"><span class="subtitle-1">Delete</span></v-btn>
                    </v-hover>
                    <br /><br />
                    <div title class="mb-1">Test Secondary Button Disabled:</div>
                    <v-hover v-slot:default="{ hover }">
                        <v-btn class="secondary-button" :class="{'hb-secondary-button-hover' : hover}" depressed disabled><span class="subtitle-1">Delete</span></v-btn>
                    </v-hover>
                    <br /><br />
                    <div title class="mb-1">Test Regular Link:</div>
                    <a class="hb-link-secondary">Go to lease</a>
                    <br /><br />
                    <div title class="mb-1">Test Disabled Link:</div>
                    <a class="hb-link-disabled">Go to lease</a>
                    <br /><br />
                    <div title class="mb-1">Test Action Link:</div>
                    <a class="hb-link">Edit</a>
                    <br /><br />
                    <v-divider></v-divider>
                    <br />
                    <div title class="mb-1">Example Vuetify font classes (based upon "sp" not "px", "sp" scales depending on user's font size preference, although "px" also suffers from the same problem):</div>
                    <v-divider></v-divider>
                    <v-row>
                        <v-col cols="3">
                            .display-4
                        </v-col>
                        <v-col>
                            <span class="display-4">Graphik Light 96sp</span>
                        </v-col>
                    </v-row>
                    <v-divider></v-divider>
                    <v-row>
                        <v-col cols="3">
                            .display-3
                        </v-col>
                        <v-col>
                            <span class="display-3">Graphik Light 60sp</span>
                        </v-col>
                    </v-row>
                    <v-divider></v-divider>
                    <v-row>
                        <v-col cols="3">
                            .display-2
                        </v-col>
                        <v-col>
                            <span class="display-2">Graphik Regular 48sp</span>
                        </v-col>
                    </v-row>
                    <v-divider></v-divider>
                    <v-row>
                        <v-col cols="3">
                            .display-1
                        </v-col>
                        <v-col>
                            <span class="display-1">Graphik Regular 34sp</span>
                        </v-col>
                    </v-row>
                    <v-divider></v-divider>
                    <v-row>
                        <v-col cols="3">
                            .headline
                        </v-col>
                        <v-col>
                            <span class="headline">Graphik Regular 24sp</span>
                        </v-col>
                    </v-row>
                    <v-divider></v-divider>
                    <v-row>
                        <v-col cols="3">
                            .title
                        </v-col>
                        <v-col>
                            <span class="title">Graphik Medium 20sp</span>
                        </v-col>
                    </v-row>
                    <v-divider></v-divider>
                    <v-row>
                        <v-col cols="3">
                            .subtitle-1
                        </v-col>
                        <v-col>
                            <span class="subtitle-1">Graphik Regular 16sp</span>
                        </v-col>
                    </v-row>
                    <v-divider></v-divider>
                    <v-row>
                        <v-col cols="3">
                            .subtitle-2
                        </v-col>
                        <v-col>
                            <span class="subtitle-2">Graphik Medium 14sp</span>
                        </v-col>
                    </v-row>
                    <v-divider></v-divider>
                    <v-row>
                        <v-col cols="3">
                            .body-1
                        </v-col>
                        <v-col>
                            <span class="body-1">Graphik Regular 16sp</span>
                        </v-col>
                    </v-row>
                    <v-divider></v-divider>
                    <v-row>
                        <v-col cols="3">
                            .body-2
                        </v-col>
                        <v-col>
                            <span class="body-2">Graphik Regular 14sp</span>
                        </v-col>
                    </v-row>
                    <v-divider></v-divider>
                    <v-row>
                        <v-col cols="3">
                            .caption
                        </v-col>
                        <v-col>
                            <span class="caption">Graphik Regular 12sp</span>
                        </v-col>
                    </v-row>
                    <v-divider></v-divider>
                    <v-row>
                        <v-col cols="3">
                            .overline
                        </v-col>
                        <v-col>
                            <span class="overline">Graphik Regular 10sp - CAPITALIZED</span>
                        </v-col>
                    </v-row>
                    <v-divider></v-divider>
                    <!--
                  <ag-grid-vue
                    style="width: 100%; height: 500px;"
                    :gridOptions="gridOptions"
                    @grid-ready="onGridReady"
                    :columnDefs="columnDefs"
                    :rowData="rowData"
                    :suppressMenuHide="true"
                    :defaultColDef="defaultColDef"
                  >
                  </ag-grid-vue>
                  -->

<!--                    :frameworkComponents="frameworkComponents"-->
<!--                    :frameworkComponents="frameworkComponents"-->
                  <!--                    :floatingFilter="gridOptions.floatingFilter"-->
                  <!--                    :rowSelection="gridOptions.rowSelection"-->
                  <!--                    :suppressDragLeaveHidesColumns="gridOptions.suppressDragLeaveHidesColumns"-->
                  <!--                    :suppressRowClickSelection="gridOptions.suppressRowClickSelection"-->
                  <!--                    :suppressCellSelection="gridOptions.suppressCellSelection"-->
                  <!--                    :rowModelType="gridOptions.rowModelType"-->
                  <!--                    :cacheBlockSize="gridOptions.cacheBlockSize"-->
                  <!--                    :maxBlocksInCache="gridOptions.maxBlocksInCache"-->
                  <!--                    @dragStopped="handleDragStopped"-->
                  <!--                    @rowClicked="handleRowClick"-->
                  <!--                    @cellClicked="handleCellClick"-->
                  <!--                    :getContextMenuItems="getContextMenuItems"-->
                  <!--                    :suppressContextMenu="gridOptions.suppressContextMenu"-->
                  <!--                    :rowClass="gridOptions.rowClass"-->
                  <!--                    @grid-ready="onGridReady"-->


<!--                           :floatingFilter="gridOptions.floatingFilter"-->
<!--                           :suppressDragLeaveHidesColumns="gridOptions.suppressDragLeaveHidesColumns"-->
<!--                           :suppressRowClickSelection="gridOptions.suppressRowClickSelection"-->
<!--                           :suppressCellSelection="gridOptions.suppressCellSelection"-->
<!--                           :rowModelType="gridOptions.rowModelType"-->
<!--                           :cacheBlockSize="gridOptions.cacheBlockSize"-->
<!--                           :onSortChanged="gridOptions.onSortChanged"-->
<!--                           :onColumnMoved="gridOptions.onColumnMoved"-->
<!--                           :getContextMenuItems="gridOptions.getContextMenuItems"-->
<!--                           :rowClass="gridOptions.rowClass"-->
                </div>



            </div>
    </div>
    </div>
</template>
<script type="text/babel">



    // import "ag-grid-community/dist/styles/ag-grid.css";
    // import "ag-grid-community/dist/styles/ag-theme-balham.css";
    // import "ag-grid-community/dist/styles/ag-theme-balham.css";
    // import {AgGridVue} from "ag-grid-vue";
    //import {ModuleRegistry, AllCommunityModules} from '@ag-grid-community/all-modules';
    // import CustomHeader from "./includes/ReportFunctions/CustomHeader.js";

    export default {
        name: "Test",
        data: function() {
            return {
                gridOptions: null,
                gridApi: null,
                columnApi: null,
                columnDefs: null,
                frameworkComponents: null,
                defaultColDef: null,
                //modules: AllCommunityModules,
                rowData: null,
                buttonIsOn1: false,
                buttonIsOn2: false,
            };
        },
        components:{


        },
        beforeMount() {
            this.gridOptions = {};
            this.columnDefs = [
                {
                    headerName: "Athlete",
                    field: "athlete",
                    width: 125,
                    // headerComponent: CustomHeader,
                    suppressMenu: true
                },
                {
                    headerName: "Age",
                    field: "age",
                    width: 90,
                    sortable: false,
                    headerComponentParams: { menuIcon: "fa-external-link-alt" }
                },
                {
                    headerName: "Country",
                    field: "country",
                    width: 120,
                    headerComponent: CustomHeader,
                    headerComponentParams: { name: 'Theara' },
                    suppressMenu: true
                },
                {
                    headerName: "Year",
                    field: "year",
                    width: 90,
                    sortable: false
                },
                {
                    headerName: "Date",
                    field: "date",
                    width: 100,
                    suppressMenu: true
                },
                {
                    headerName: "Sport",
                    field: "sport",
                    width: 90,
                    sortable: false
                },
                {
                    headerName: "Gold",
                    field: "gold",
                    width: 115,
                    headerComponentParams: { menuIcon: "fa-cog" }
                },
                {
                    headerName: "Silver",
                    field: "silver",
                    width: 90,
                    sortable: false
                },
                {
                    headerName: "Bronze",
                    field: "bronze",
                    width: 115,
                    suppressMenu: true
                },
                {
                    headerName: "Total",
                    field: "total",
                    width: 90,
                    sortable: false
                }
            ];
            this.frameworkComponents = { agColumnHeader: CustomHeader };
            this.defaultColDef = {
                width: 100,
                headerComponentParams: { menuIcon: "fa-bars" },
                sortable: true,
                resizable: true,
                filter: true
            };
        },
        mounted() {
            this.gridApi = this.gridOptions.api;
            this.gridColumnApi = this.gridOptions.columnApi;
        },
        methods: {
            onGridReady(params) {
                const httpRequest = new XMLHttpRequest();
                const updateData = data => {
                    this.rowData = data;
                };

                httpRequest.open(
                    "GET",
                    "https://raw.githubusercontent.com/ag-grid/ag-grid/master/packages/ag-grid-docs/src/olympicWinnersSmall.json"
                );
                httpRequest.send();
                httpRequest.onreadystatechange = () => {
                    if (httpRequest.readyState === 4 && httpRequest.status === 200) {
                        updateData(JSON.parse(httpRequest.responseText));
                    }
                };
            }

        },
    }
</script>

<style scoped>
    .hb-button-active {
        background: #E0F5F5;
    }
    .hb-primary-button-hover {
        background: linear-gradient(180deg, #47C0BF -142.5%, #00848E 103.75%);
        border: 1px solid #005F66;
    }
    .delete-button {
        background: linear-gradient(180deg, #D34B30 -70%, #C24228 126.25%);
        border: 1px solid #A13621;
        box-shadow: 0px 1px 0px rgba(22, 29, 37, 0.05);
    }
    .hb-delete-button-hover {
        background: linear-gradient(180deg, #D34B30 -133.75%, #C24228 106.25%);
        border: 1px solid #8C2F1D;
    }
    .hb-secondary-button-hover {
        background: linear-gradient(180deg, #FAFBFC 0%, #EBEFF2 100%);
    }
    .hb-link-secondary {
        color:#007ACE;
        text-decoration:none;
    }
    .hb-link-disabled {
        color: #919EAB;
        text-decoration:none;
        cursor:default;
    }
    .hb-link {
        color:#00848E;
        text-decoration:none;
    }
</style>
