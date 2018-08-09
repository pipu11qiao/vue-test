<template>
  <div class="page-title">
    {{title}}
  </div>
</template>

<script>
export default {
  name: 'm-title',
  props: {
    title: {
      type: String,
      default: '标题'
    }
  },
  data () {
    return {
    }
  }
}
</script>
<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
  @import "../../assets/scss/variables";
  .page-title{
    height: 40px;
    line-height: 40px;
    text-align: center;
    font-size: 18px;
    font-weight: bold;
    background-color: darken($brand-primary,20%);
    color: #fff;
  }
</style>
