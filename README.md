## 使用rolldown(编写插件根rollup兼容), 编写ts转义
## 我们要实现的就是以ts符合直觉的写法, 通过rolldown插件最终编译为适用于生成环境调用底层库的ts代码.


### 编译前的优化使用体验代码, 更加符合ts语法, 减少不必要的类型定义

```typescript
import { registerReducer, registerType, type } from 'spacetimedb';

type Foo = {
    bar: type.f32
    baz: type.string
}

useReducer('beepboop', (x:type.f32[], y:type.bool, z:Foo)=>{

})
```



### 最终生成ts代码

```typescript
import { registerReducer, registerType, type } from 'spacetimedb';

const Foo = registerType(
    'Foo',
    type.product({
        bar: type.f32,
        baz: type.string,
    })
);

registerReducer('beepboop', [type.array(type.f32), type.bool, Foo], (x, y, z) => {
    // z.bar;
});
```

