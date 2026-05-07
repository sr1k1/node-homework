let taskChange = { isCompleted: true };

let keys = Object.keys(taskChange);
console.log(keys);

keys = keys.map((key) => (key === "isCompleted" ? "is_completed" : key));
console.log(keys);

const setClauses = keys.map((key, i) => `${key} = $${i + 1}`).join(", ");
console.log(setClauses);

console.log(Object.values(taskChange));
