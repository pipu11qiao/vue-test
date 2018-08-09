<template>
  <div >
    <h1>{{msg}}</h1>
    <p><label for="aa"></label><input type="text" id="aa" v-focus></p>
    <p><label for="aab"></label><input type="text" id="aab" v-focus></p>
    <async></async>
  </div>
</template>

<script>
export default {
  name: 'directive',
  data () {
    return {
      msg: '指令玩'
    }
  },
  components:{
    'async': () => import('./asynComponent')

  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>

</style>
