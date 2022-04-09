import { h } from "../../lib/mini-vue.esm.js"

window.self = null;
// 这里直接 render 和写template一样，template 需要经过编译转换成 render 函数
export const App = {
  render() {
    window.self = this;
    return h(
      "div",
      {
        id: "root",
        class: ["red", "blue"],
        onClick() {
          console.log("click");
        },
        onMousedown() {
          console.log("mousedown");
        }
      },
      "hi, " + this.msg
      // [
      //   h("p", {class: "red"}, "hi"),
      //   h("p", {class: "blue"}, "mini-vue")
      // ]
    );
  },
  setup() {
    // composition api
    return {
      msg: "mini-vue"
    }
  },
}