<template>
  <div>
    <ul>
      <li v-for="(item,index) in pages"><router-link  :to="item.path">{{item.text}}</router-link></li>
    </ul>
  </div>
</template>

<script>
export default {
  name: 'HelloWorld',
  data () {
    return {
      pages: [
        {
          path: 'test',
          text: 'Test'
        }
      ]
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>

</style>
