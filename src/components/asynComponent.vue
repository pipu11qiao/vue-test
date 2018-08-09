<template>
  <div >
    <h1>{{msg}}</h1>
  </div>
</template>

<script>
  import util from 'markor-util';

  export default {
    name: '',
    data() {
      return {
        msg: '异步加载组件'
      }
    },
    created: function () {
      let ginkgo = util.GetGinkgo({
        brand: 'zest',
        key: '90cff53bb6fcc29f6ebf9ad0221fa26f',
        duration: 1,   //间隔多久发送一次埋点请求，单位： 秒
        addr: 'http://192.168.1.57/orange/src/api.php',
        failTime: 10    //用户多久没有操作后认定此次对话已终止?单位： 秒
      });
      ginkgo.send({
        'tag': 'oo',
        'session': '99',
        'userid': '99',
        'data': 'aaa'
      });
    },
  }
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>

</style>
