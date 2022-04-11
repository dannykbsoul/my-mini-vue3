import { h, renderSlots } from "../../lib/mini-vue.esm.js";
export default {
  name: "Child",
  setup(props, context) {},
  render() {
    console.log(this.$slots)
    return h("div", {}, [
      h("div", {}, "child"),
      // renderSlot 会返回一个 vnode
      // 其本质和 h 是一样的
      // 第三个参数给出数据
      // 具名插槽
      // 作用域插槽
      renderSlots(this.$slots, "default", {
        age: 16,
      }),
    ]);
  },
};
