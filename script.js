// Miniräknare – logik
// Bygger upp ett uttryck som en textsträng och beräknar det på ett säkert sätt.

const currentEl = document.getElementById("current");
const historyEl = document.getElementById("history");

let expression = "";      // det pågående uttrycket, t.ex. "12+3*"
let justEvaluated = false; // sant direkt efter att = tryckts

const OPERATORS = ["+", "-", "*", "/", "%"];

function updateDisplay() {
  // Visa uttrycket med snygga tecken, eller 0 om tomt
  currentEl.textContent = expression === "" ? "0" : toPretty(expression);
}

function toPretty(str) {
  return str
    .replace(/\*/g, "×")
    .replace(/\//g, "÷")
    .replace(/-/g, "−")
    .replace(/\./g, ",");
}

function inputValue(value) {
  // Om vi precis beräknat och användaren skriver en siffra -> börja om
  if (justEvaluated && !OPERATORS.includes(value)) {
    expression = "";
  }
  justEvaluated = false;

  const lastChar = expression.slice(-1);

  if (OPERATORS.includes(value)) {
    if (expression === "") {
      // Tillåt att börja med minus (negativt tal)
      if (value === "-") expression = "-";
      return updateDisplay();
    }
    // Ersätt en operator som redan står sist
    if (OPERATORS.includes(lastChar)) {
      expression = expression.slice(0, -1) + value;
    } else {
      expression += value;
    }
    return updateDisplay();
  }

  if (value === ".") {
    // Förhindra flera decimalpunkter i samma tal
    const segments = expression.split(/[+\-*/%]/);
    const currentNumber = segments[segments.length - 1];
    if (currentNumber.includes(".")) return;
    if (currentNumber === "") value = "0."; // ".5" -> "0.5"
  }

  expression += value;
  updateDisplay();
}

function clearAll() {
  expression = "";
  justEvaluated = false;
  historyEl.textContent = "";
  updateDisplay();
}

function backspace() {
  if (justEvaluated) {
    justEvaluated = false;
    expression = "";
  } else {
    expression = expression.slice(0, -1);
  }
  updateDisplay();
}

// Säker beräkning: tolkar bara siffror och tillåtna operatorer.
function evaluate() {
  if (expression === "") return;

  // Trimma bort en operator som råkar stå sist
  let expr = expression;
  if (OPERATORS.includes(expr.slice(-1))) {
    expr = expr.slice(0, -1);
  }
  if (expr === "" || expr === "-") return;

  // Säkerhet: tillåt endast siffror, punkt och operatorer
  if (!/^[-+*/%.\d\s]+$/.test(expr)) {
    showError();
    return;
  }

  try {
    const result = compute(expr);
    if (!isFinite(result)) {
      showError();
      return;
    }
    const rounded = Math.round((result + Number.EPSILON) * 1e10) / 1e10;
    historyEl.textContent = toPretty(expr) + " =";
    expression = String(rounded);
    justEvaluated = true;
    updateDisplay();
  } catch (e) {
    showError();
  }
}

// Enkel egen tolk (shunting-yard) – ingen eval, helt säker.
function compute(expr) {
  const tokens = expr.match(/(\d+\.?\d*|\.\d+|[+\-*/%])/g);
  if (!tokens) throw new Error("tomt");

  const output = [];
  const ops = [];
  const prec = { "+": 1, "-": 1, "*": 2, "/": 2, "%": 2 };

  let prevType = "start";
  for (let token of tokens) {
    if (/[\d.]/.test(token)) {
      output.push(parseFloat(token));
      prevType = "num";
    } else {
      // Hantera unärt minus (t.ex. i början eller efter en operator)
      if (token === "-" && (prevType === "start" || prevType === "op")) {
        output.push(0);
      }
      while (
        ops.length &&
        prec[ops[ops.length - 1]] >= prec[token]
      ) {
        applyOp(output, ops.pop());
      }
      ops.push(token);
      prevType = "op";
    }
  }
  while (ops.length) applyOp(output, ops.pop());

  if (output.length !== 1) throw new Error("ogiltigt");
  return output[0];
}

function applyOp(output, op) {
  const b = output.pop();
  const a = output.pop();
  if (a === undefined || b === undefined) throw new Error("ogiltigt");
  switch (op) {
    case "+": output.push(a + b); break;
    case "-": output.push(a - b); break;
    case "*": output.push(a * b); break;
    case "/": output.push(a / b); break;
    case "%": output.push(a % b); break;
  }
}

function showError() {
  historyEl.textContent = "";
  currentEl.textContent = "Fel";
  expression = "";
  justEvaluated = true;
}

// Klick på knapparna
document.querySelector(".keys").addEventListener("click", (e) => {
  const key = e.target.closest("button");
  if (!key) return;

  const action = key.dataset.action;
  const value = key.dataset.value;

  if (action === "clear") clearAll();
  else if (action === "backspace") backspace();
  else if (action === "equals") evaluate();
  else if (value !== undefined) inputValue(value);
});

// Tangentbordsstöd
document.addEventListener("keydown", (e) => {
  const k = e.key;
  if (/\d/.test(k)) inputValue(k);
  else if (k === "." || k === ",") inputValue(".");
  else if (OPERATORS.includes(k)) inputValue(k);
  else if (k === "Enter" || k === "=") { e.preventDefault(); evaluate(); }
  else if (k === "Backspace") backspace();
  else if (k === "Escape") clearAll();
});

updateDisplay();
