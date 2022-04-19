import { h } from "../../lib/mini-vue.esm.js";
export default {
  name: "Child",
  setup(props, { emit }) {},
  beforeCreate() {
    console.log("Child —————— beforeCreate");
  },
  created() {
    console.log("Child —————— created");
  },
  beforeMount() {
    console.log("Child —————— beforeMount");
  },
  mounted() {
    console.log("Child —————— mounted");
  },
  beforeUpdate() {
    console.log("Child —————— beforeUpdate");
  },
  updated() {
    console.log("Child —————— updated");
  },
  render(proxy) {
    return h("div", {}, [h("div", {}, "child - props - msg: " + this.$props.msg)]);
  },
};
