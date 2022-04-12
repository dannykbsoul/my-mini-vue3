import { h } from "../../lib/mini-vue.esm.js";

export default {
  name: "App",
  setup() {
    return {
      x: 100,
      y: 100,
    };
  },

  render() {
    return h("rect", { x: this.x, y: this.y });
  },
};
