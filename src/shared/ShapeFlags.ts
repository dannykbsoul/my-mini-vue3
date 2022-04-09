export const enum ShapeFlags {
  ELEMENT = 1, // 0001
  STATEFUL_COMPONENT = 1 << 1, // 0010
  TEXT_CHILDREN = 1 << 2, // 0100
  ARRAY_CHILDREN = 1 << 3, // 1000
}

// 位运算的方式 高效
// 查找 &
// 修改 ｜
// 0001 element
// 0010 stateful_component
// 0100 text_children
// 1000 array_children