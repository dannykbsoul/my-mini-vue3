import { reactive } from "../src/reactive"
import { watch } from "../src/watch";

describe('api: watch', () => {
  it('happy path', () => {
    let dummy;
    const obj = reactive({
      num: 1
    })
    watch(obj, () => {
      dummy = obj.num;
    })
    obj.num = 2;
    expect(dummy).toBe(2);
  })

  it("support function", () => {
    let dummy;
    const obj = reactive({
      num: 1,
    });
    watch(
      () => obj.num,
      () => {
        dummy = obj.num;
      }
    );
    obj.num = 2;
    expect(dummy).toBe(2);
  });
})