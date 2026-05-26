let taskChange = { isCompleted: true };

let keys = Object.keys(taskChange);
console.log(keys);

keys = keys.map((key) => (key === "isCompleted" ? "is_completed" : key));
console.log(keys);

const setClauses = keys.map((key, i) => `${key} = $${i + 1}`).join(", ");
console.log(setClauses);

console.log(Object.values(taskChange));

// ----------------------------------- //
const undefinedVar = undefined;
const isStillUndef = parseInt(undefinedVar);

console.log("variable's initial value");
console.log(undefinedVar);

console.log("this is NaN when parseInt'd. Truthy?");
console.log(isStillUndef === true);

// -------------------------------- //
const objTest = { clark: 14 };

objTest.oligarchy = 15;

console.log(objTest);
