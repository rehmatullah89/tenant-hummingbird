<template>
  <v-autocomplete
    :label="label"
    v-model="value"
    :items="items"
    :search-input.sync="search"
    :outlined="outlined"
    :hide-details="hide_details"
    :prepend-inner-icon="prepend_inner_icon"
    :no-filter="no_filter"
    :return-object="return_object"
    @change="onChange"
    ref="autocomplete"
    :autofocus="auto_focus"
    :class="{'auto-complete-legend' : label && auto_focus}"
  >
    <template v-slot:append-item>
      <div
        class="text-center"
        v-observe-visibility="{
          callback: visibilityChanged
        }">
          <v-progress-circular
            v-if="loading"
            indeterminate
            color="primary"
          ></v-progress-circular>
      </div>
       <slot name="append-item"></slot>
    </template>

    <template v-slot:no-data>
        <slot name="no-data"></slot>
    </template>

    <template v-slot:selection="data">
      <slot name="selection" :item="data.item"></slot>
    </template>

    <template v-slot:item="data">
      <slot name="item" :item="data.item"></slot>
    </template>

  </v-autocomplete>
</template>

<script>
export default {
  name: 'HBAutoCompleteWithInfiniteScroll',
  data: (vm) => ({
    loading: false,
    search: '',
    searchParams: {
      search: '',
      limit: vm.page_size || vm.defaultOffset,
      offset: 0,
      result_count: 0
    },
    defaultOffset: 20,
    value: null
  }),
  props: ["label", "items", 'outlined', 'dense', "hide_details", 'prepend_inner_icon',
          'no_filter', 'return_object', 'solo','flat', 'prepend_icon','item_text','item_value','change','fetchData',
          'page_size', 'result_count', 'search_input', 'auto_focus'],
  watch: {
    search: _.debounce( async function(val) {
      this.searchParams =  {
        search: this.search,
        limit: this.page_size || this.defaultOffset,
        offset: 0,
        result_count: 0
      }
      this.$emit('update:search_input', this.search)
      this.$emit('fetchData', this.searchParams)
    }, 300),
    result_count() {
      if(this.result_count) {
        this.searchParams.result_count = this.result_count
      }
    },
    items(){
      this.loading = false
    }
  },
  methods: {
    visibilityChanged(e) {
      e && this.fetchNextData();
    },
    fetchNextData() {

      if(!this.search) return;

      this.loading = true;
      this.searchParams.search = this.search

      if (this.items && this.items.length > 0) {
        this.searchParams.offset += this.defaultOffset
      }

      if (this.searchParams.result_count >= this.searchParams.offset) {
        this.$emit('fetchData', this.searchParams)

        if(this.$refs.autocomplete)
          this.$refs.autocomplete.onScroll();
      } else {
        this.loading = false
      }

    },
    onChange(){
      this.$emit('change',this.value)
    }
  },

}
</script>

<style>
.auto-complete-legend legend {
  width: 88px !important;
}
</style>