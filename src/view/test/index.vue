<template>
  <div class="box">
    <m-title title="测试列表页面"></m-title>
    <div class="box-card"
         v-for="item in testPages"
         :key="item.name"
         @click="stepTo(item.path)"
    >{{item.name}}
  </div>
  </div>
</template>

<script>

  export default {
    data() {
      let pageStr = 'hello ringPic';
      let pageArr = [];
      pageStr.split(' ').forEach(function (item) {
        pageArr.push({
          name: item,
          path: item
        })
      });
      return {
        testPages:pageArr
      }
    },
    methods: {
      stepTo(path){
        this.$router.push('test/' + path)
      }
    }
  }
</script>

<style scoped lang="scss">
  .box{  }
  .box-card{
    width: 400px;
    margin: 10px auto;
    padding: 10px;
    text-align: center;
    cursor: pointer;
    box-shadow: 0 2px 12px 0 rgba(0,0,0,.1);
  }
</style>

