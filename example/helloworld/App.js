import { h } from "../../lib/mini-vue.esm.js"
import { Foo } from "./Foo.js"

window.self = null;
// 这里直接 render 和写template一样，template 需要经过编译转换成 render 函数
export const App = {
  render() {
    window.self = this;
    return h(
      "div",
      {
        id: "root",
        onClick() {
          console.log("click");
        },
        onMousedown() {
          console.log("mousedown");
        }
      },
      [
        h("div", {
          class: [{blue: true}, "red", "12 34"],
        }, "hi, " + this.msg),
        h(Foo, {
          count: 1,
        })
      ]
    );
  },
  setup() {
    // composition api
    return {
      msg: "mini-vue"
    }
  },
}