// 这里直接 render 和写template一样，template 需要经过编译转换成 render 函数
export const App = {
  render() {
    return h("div", "hi, " + this.msg);
  },
  setup() {
    // composition api
    return {
      msg: "mini-vue"
    }
  },
}