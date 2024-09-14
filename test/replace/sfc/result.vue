<template>
  <div>
    <span :title="$t('test')">{{ $t("hello") }}</span>
    <span :title="$t('beMoved')">{{ $t("beMoved") }}</span>
  </div>
</template>
<script>
import i18n from "@/i18n";
export default {
  name: "simpleView",
  data() {
    return {
      test: i18n.t("hello"),
    };
  },
};
</script>
<style lang="scss" scoped>
.main {
  background: "#fff";
}
</style>
