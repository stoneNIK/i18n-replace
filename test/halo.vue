<template>
  <div>
    <span title="测试">你好</span
    ><span :title="$t('beMoved')">{{ $t('beMoved') }}</span>
  </div>
</template>
<script>
export default {
  name: 'simpleView',
};
</script>
<style lang="scss" scoped>
.main {
  background: '#fff';
}
</style>
