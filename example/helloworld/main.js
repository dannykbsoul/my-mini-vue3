import { createApp } from "../../lib/mini-vue.esm.js"
import { App } from "./App.js"

const rootContainer = document.querySelector("#app");
console.log(rootContainer)
createApp(App).mount(rootContainer);