<template>
  <div>
    <m-title title="mock"></m-title>
    <p>mock</p>
    <ul>
      <li v-for="item in list">{{item.count}}</li>
    </ul>
  </div>
</template>

<script>
  import data from '@/mock/designScheme/list'
  export default {
    data() {
      return data
    },
    methods: {
    }
  }
</script>

<style lang="scss" scoped></style>

