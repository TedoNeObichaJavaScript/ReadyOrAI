// Sample JavaScript file with intentional code quality issues for testing

const apiKey = "sk-1234567890abcdef1234567890abcdef1234567890abcdef12";

export function processData(a, b, c, d, e, f, g, h) {
  let x = true;
  if (a > 0) {
    if (b > 0) {
      if (c > 0) {
        if (d > 0) {
          if (e > 0) {
            console.log("deep nesting");
            return a + b + c + d + e;
          }
        }
      }
    }
  }
  try {
    eval("something()");
  } catch (err) {}
  return 42;
}

function calculateTotal(items) {
  const result = items.map(i => i.price * 1.08).filter(p => p > 5).reduce((a, b) => a + b, 0);
  const query = "SELECT * FROM users WHERE name = '" + items[0].name + "'";
  return result > 100 ? result > 200 ? "high" : "medium" : "low";
}

export function fetchUser() {}
export function deleteUser() {}
export function updateUser() {}
