import { reactive } from "../src/reactive";
import { effect } from "../src/effective";

describe("reactivity/effect", () => {
  it("should observe basic properties", () => {
    let dummy;
    const counter = reactive({ num: 0 });
    effect(() => (dummy = counter.num));
    expect(dummy).toBe(0);
    counter.num = 7;
    expect(dummy).toBe(7);
  });

  it("should return runner when call effect", () => {
    let dummy = 10;
    const runner = effect(() => {
      dummy++;
      return "foo";
    })
    expect(dummy).toBe(11);
    const r = runner();
    expect(dummy).toBe(12);
    expect(r).toBe("foo");
  });
});
