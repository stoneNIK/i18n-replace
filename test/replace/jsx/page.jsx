export default {
  name: "approveTag",
  functional: true,
  props: {
    value: String,
    size: String,
    resourceType: String,
  },
  render(h, { props, listeners }) {
    const options = getApproveOptions(props.resourceType) || [];
    const info = options.find((e) => e.value === props.value) || {};
    return (
      <el-tag
        type={info.type}
        size={props.size}
        class={{ [$style.tag]: true, [$style.pending]: props.value === "6" }}
        nativeOnClick={(e) => {
          e.stopPropagation();
          listeners.click();
        }}
      >
        {info.type ? "xx" : "未知状态"}
      </el-tag>
    );
  },
};
