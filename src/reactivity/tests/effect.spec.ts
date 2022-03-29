import { reactive } from "../src/reactive";
import { effect, stop } from "../src/effective";

describe("reactivity/effect", () => {
  it("should run the passed function once (wrapped by a effect)", () => {
    const fnSpy = jest.fn(() => {});
    effect(fnSpy);
    expect(fnSpy).toHaveBeenCalledTimes(1);
  });
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
    });
    expect(dummy).toBe(11);
    const r = runner();
    expect(dummy).toBe(12);
    expect(r).toBe("foo");
  });

  it("should observe multiple properties", () => {
    let dummy;
    const counter = reactive({ num1: 0, num2: 0 });
    effect(() => (dummy = counter.num1 + counter.num1 + counter.num2));

    expect(dummy).toBe(0);
    counter.num1 = counter.num2 = 7;
    expect(dummy).toBe(21);
  });

  it("should handle multiple effects", () => {
    let dummy1, dummy2;
    const counter = reactive({ num: 0 });
    effect(() => (dummy1 = counter.num));
    effect(() => (dummy2 = counter.num));

    expect(dummy1).toBe(0);
    expect(dummy2).toBe(0);
    counter.num++;
    expect(dummy1).toBe(1);
    expect(dummy2).toBe(1);
  });

  it("should observe nested properties", () => {
    let dummy;
    const counter = reactive({ nested: { num: 0 } });
    effect(() => (dummy = counter.nested.num));

    expect(dummy).toBe(0);
    counter.nested.num = 8;
    expect(dummy).toBe(8);
  });

  it("should observe delete operations", () => {
    let dummy;
    const obj = reactive({ prop: "value" });
    effect(() => (dummy = obj.prop));

    expect(dummy).toBe("value");
    // @ts-ignore
    delete obj.prop;
    expect(dummy).toBe(undefined);
  });

  it("should observe has operations", () => {
    let dummy;
    const obj = reactive({ prop: "value" });
    effect(() => (dummy = "prop" in obj));

    expect(dummy).toBe(true);
    // @ts-ignore
    delete obj.prop;
    expect(dummy).toBe(false);
    obj.prop = 12;
    expect(dummy).toBe(true);
  });

  it("should observe properties on the prototype chain", () => {
    let dummy;
    const counter = reactive({ num: 0 });
    const parentCounter = reactive({ num: 2 });
    Object.setPrototypeOf(counter, parentCounter);
    effect(() => (dummy = counter.num));

    expect(dummy).toBe(0);
    // @ts-ignore
    delete counter.num;
    expect(dummy).toBe(2);
    parentCounter.num = 4;
    expect(dummy).toBe(4);
    counter.num = 3;
    expect(dummy).toBe(3);
  });

  it("should observe has operations on the prototype chain", () => {
    let dummy;
    const counter = reactive({ num: 0 });
    const parentCounter = reactive({ num: 2 });
    Object.setPrototypeOf(counter, parentCounter);
    effect(() => (dummy = "num" in counter));

    expect(dummy).toBe(true);
    // @ts-ignore
    delete counter.num;
    expect(dummy).toBe(true);
    // @ts-ignore
    delete parentCounter.num;
    expect(dummy).toBe(false);
    counter.num = 3;
    expect(dummy).toBe(true);
  });

  // obj.prop = 4; 会导致副作用函数执行两次
  // effect(() => (dummy = obj.prop));
  // 1. 读取 obj 的 prop 属性，此时会执行 obj 的 get 方法，此时obj.prop与副作用函数有了响应式联系
  // 2. 当 obj 中 发现找不到 prop 属性，会去它的原型上找，此时触发 parent 的 get 方法，此时 parent.prop与副作用函数有了响应式联系
  // 3. 当我们 obj.prop = 4; 设置的时候，首先会去触发 obj 的 set 方法，然后触发依赖的副作用函数执行
  // 4. 由于 set 的时候发现找不到 prop 属性，则去它的原型上 set，即触发 parent 的 set 方法，然后触发依赖的副作用函数执行
  // 5. 所以一次设置会导致副作用函数重复的执行两次

  // 优化
  
  it("should observe inherited property accessors", () => {
    let dummy, parentDummy, hiddenValue: any;
    const obj = reactive({});
    const parent = reactive({
      set prop(value) {
        hiddenValue = value;
      },
      get prop() {
        return hiddenValue;
      },
    });
    Object.setPrototypeOf(obj, parent);
    effect(() => (dummy = obj.prop));
    effect(() => (parentDummy = parent.prop));

    expect(dummy).toBe(undefined);
    expect(parentDummy).toBe(undefined);
    obj.prop = 4;
    expect(dummy).toBe(4);
    // this doesn't work, should it?
    // expect(parentDummy).toBe(4)
    parent.prop = 2;
    expect(dummy).toBe(2);
    expect(parentDummy).toBe(2);
  });

  it("should observe function call chains", () => {
    let dummy;
    const counter = reactive({ num: 0 });
    effect(() => (dummy = getNum()));

    function getNum() {
      return counter.num;
    }

    expect(dummy).toBe(0);
    counter.num = 2;
    expect(dummy).toBe(2);
  });

  // it("should observe iteration", () => {
  //   let dummy;
  //   const list = reactive(["Hello"]);
  //   effect(() => (dummy = list.join(" ")));

  //   expect(dummy).toBe("Hello");
  //   list.push("World!");
  //   expect(dummy).toBe("Hello World!");
  //   list.shift();
  //   expect(dummy).toBe("World!");
  // });

  // it("should observe implicit array length changes", () => {
  //   let dummy;
  //   const list = reactive(["Hello"]);
  //   effect(() => (dummy = list.join(" ")));

  //   expect(dummy).toBe("Hello");
  //   list[1] = "World!";
  //   expect(dummy).toBe("Hello World!");
  //   list[3] = "Hello!";
  //   expect(dummy).toBe("Hello World!  Hello!");
  // });

  // it("should observe sparse array mutations", () => {
  //   let dummy;
  //   const list = reactive<string[]>([]);
  //   list[1] = "World!";
  //   effect(() => (dummy = list.join(" ")));

  //   expect(dummy).toBe(" World!");
  //   list[0] = "Hello";
  //   expect(dummy).toBe("Hello World!");
  //   list.pop();
  //   expect(dummy).toBe("Hello");
  // });

  it("should observe enumeration", () => {
    let dummy = 0;
    const numbers = reactive({ num1: 3 });
    effect(() => {
      dummy = 0;
      for (let key in numbers) {
        dummy += numbers[key];
      }
    });

    expect(dummy).toBe(3);
    numbers.num2 = 4;
    expect(dummy).toBe(7);
    delete numbers.num1;
    expect(dummy).toBe(4);
  });

  // 分支切换与cleanup
  it("should not be triggered by mutating a property, which is used in an inactive branch", () => {
    let dummy;
    const obj = reactive({ prop: "value", run: true });

    const conditionalSpy = jest.fn(() => {
      dummy = obj.run ? obj.prop : "other";
    });
    effect(conditionalSpy);

    expect(dummy).toBe("value");
    expect(conditionalSpy).toHaveBeenCalledTimes(1);
    // 此时 run 为 false，应该不再依赖 obj.prop，也就是后续 obj.prop 变动，effect也不会执行
    obj.run = false;
    expect(dummy).toBe("other");
    expect(conditionalSpy).toHaveBeenCalledTimes(2);
    obj.prop = "value2";
    expect(dummy).toBe("other");
    expect(conditionalSpy).toHaveBeenCalledTimes(2);
  });

  // obj.foo++ 拆分成 obj.foo = obj.foo + 1
  // 1. 首先读取 obj.foo，会触发 track 操作，将当前的 effect 收集起来
  // 2. 接着将 +1 后的 foo 赋值 给 obj.foo，此时会触发 trigger 操作，即把之前收集的 effect 拿出来执行
  // 3. 但其实上一个 effect 还在执行中，然后又把自己拿出来执行，就会导致无限递归的调用自己，造成栈溢出
  // 我们发现对 obj.foo 的读取和设置都在同一个 effect 中执行
  // 所以无论是 track 时候要收集的 effect 还是 trigger 时候要触发的 effect，都是 activeEffect
  // 基于此我们可以在 trigger 的时候增加 守卫条件
  it("should avoid infinite recursion", () => {
    let obj = reactive({
      foo: 1,
    });
    effect(() => {
      obj.foo++;
    });
    expect(obj.foo).toBe(2);
  });

  // 允许嵌套 effect
  // 应用场景：
  // vue 的渲染函数其实就是在一个 effect 中执行的，Bar是Foo的子组件
  // effect(() => {
  //   Foo.render();
  //   effect(() => {
  //     Bar.render();
  //   })
  // })
  it("should allow nested effects", () => {
    const nums = reactive({ num1: 0, num2: 1, num3: 2 });
    const dummy: any = {};

    const childSpy = jest.fn(() => (dummy.num1 = nums.num1));
    const childeffect = effect(childSpy);
    const parentSpy = jest.fn(() => {
      dummy.num2 = nums.num2;
      childeffect();
      dummy.num3 = nums.num3;
    });
    effect(parentSpy);

    expect(dummy).toEqual({ num1: 0, num2: 1, num3: 2 });
    expect(parentSpy).toHaveBeenCalledTimes(1);
    expect(childSpy).toHaveBeenCalledTimes(2);
    // this should only call the childeffect
    nums.num1 = 4;
    expect(dummy).toEqual({ num1: 4, num2: 1, num3: 2 });
    expect(parentSpy).toHaveBeenCalledTimes(1);
    expect(childSpy).toHaveBeenCalledTimes(3);
    // this calls the parenteffect, which calls the childeffect once
    nums.num2 = 10;
    expect(dummy).toEqual({ num1: 4, num2: 10, num3: 2 });
    expect(parentSpy).toHaveBeenCalledTimes(2);
    expect(childSpy).toHaveBeenCalledTimes(4);
    // this calls the parenteffect, which calls the childeffect once
    nums.num3 = 7;
    expect(dummy).toEqual({ num1: 4, num2: 10, num3: 7 });
    expect(parentSpy).toHaveBeenCalledTimes(3);
    expect(childSpy).toHaveBeenCalledTimes(5);
  });

  // 懒执行 effect
  it("lazy", () => {
    const obj = reactive({ foo: 1 });
    let dummy;
    const runner = effect(() => (dummy = obj.foo), { lazy: true });
    expect(dummy).toBe(undefined);

    expect(runner()).toBe(1);
    expect(dummy).toBe(1);
    obj.foo = 2;
    expect(dummy).toBe(2);
  });

  // 可调度
  // 当 trigger 动作触发 effect 重新执行时，有能力决定 effect 执行的时机、次数以及方式
  it("scheduler", () => {
    // 通过 effect 的第二个参数给定 scheduler
    // 当 effect 第一次执行的时候还会执行 fn
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

  it("stop", () => {
    // 通过 stop(runner) 以后，通过 set 触发 fn 执行就不存在了
    // 但是仍然可以手动执行 runner
    // 所以我们考虑将当调用stop的时候将 effect 从 deps 中删除，这样我们 set 操作以后，就不会执行 effect
    // 之前是用 depsMap 记录了 ReactiveEffect，那么如何通过 ReactiveEffect 找到 deps
    // 通过双向记录的方式
    let dummy;
    const obj = reactive({ prop: 1 });
    const runner = effect(() => {
      dummy = obj.prop;
    });
    obj.prop = 2;
    expect(dummy).toBe(2);
    stop(runner);
    // obj.prop = 3;
    // obj.prop = obj.prop + 1;
    // 相比于 obj.prop = 3，++涉及到了get操作，这时候又会去收集依赖，之前
    // stop 的时候清除的依赖白做了，考虑给全局加个 shouldTrack 参数用来判断
    obj.prop++;
    expect(dummy).toBe(2);

    // stopped effect should still be manually callable
    runner();
    expect(dummy).toBe(3);
  });

  it("events: onStop", () => {
    const onStop = jest.fn();
    const runner = effect(() => {}, {
      onStop,
    });

    stop(runner);
    expect(onStop).toHaveBeenCalled();
  });
});
