import { h, ref, reactive } from "../../lib/mini-vue.esm.js";
export default {
  name: "Child",
  setup(props, { emit }) {
    return {
      msg: props.msg
    }
  },
  render(proxy) {
    return h("div", {}, [h("div", {}, "child " + this.msg)]);
  },
};
