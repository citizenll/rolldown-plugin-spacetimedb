import { useReducer, f32, bool, str, i64 } from 'spacetimedb/composable';

type Foo = {
    bar: f32,
    baz: str,
    count: i64,
}

useReducer('beepboop', (x: f32[], y: bool, z: Foo) => {
    // Now we can perform math operations directly!
    const sum = x.reduce((acc, val) => acc + val, 0);
    const newCount = z.count + 1n;

    console.log(`Sum: ${sum}, New Count: ${newCount}, IsActive: ${y}`);
});
