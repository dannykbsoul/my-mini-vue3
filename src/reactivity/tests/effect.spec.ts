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

  it("scheduler", () => {
    // 通过effect的第二个参数给定scheduler
    // 当effect第一次执行的时候还会执行fn
    // 当 set 的时候，不会执行 fn，而是执行 scheduler
    // 如果执行 runner 的时候，会再次执行 fn
    let dummy;
    let run: any;
    const scheduler = jest.fn(() => {
      run = runner;
    });
    const obj = reactive({ foo: 1 });
    const runner = effect(
      () => {
        dummy = obj.foo;
      },
      { scheduler }
    );
    expect(scheduler).not.toHaveBeenCalled();
    expect(dummy).toBe(1);
    // should be called on first trigger
    obj.foo++;
    expect(scheduler).toHaveBeenCalledTimes(1);
    // should not run yet
    expect(dummy).toBe(1);
    // manually run
    run();
    // should have run
    expect(dummy).toBe(2);
  });
});
