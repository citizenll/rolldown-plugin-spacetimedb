import { useReducer, F32, Bool, String } from 'spacetimedb/composable';

type Foo = {
    bar: F32,
    baz: String,
    qux: Bool
}

useReducer('beepboop', (x: F32[], y: Bool, z: Foo) => {
    //@ts-ignore
    let c = x.map((a) => a + 1)
});
