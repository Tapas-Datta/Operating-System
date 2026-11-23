import { useState } from "react";

export default function Calculator() {
  const [display, setDisplay] = useState("0");
  const [stored, setStored] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [replace, setReplace] = useState(false);

  const digit = (value: string) => {
    if (value === ".") {
      // Start a fresh number with "0." and never allow a second decimal point.
      setDisplay((current) => replace || current === "Error" ? "0." : current.includes(".") ? current : current + ".");
      setReplace(false);
      return;
    }
    setDisplay((current) => replace || current === "0" || current === "Error" ? value : current + value);
    setReplace(false);
  };
  const chooseOperator = (next: string) => {
    const value = Number(display);
    if (stored !== null && operator && !replace) {
      const result = calculate(stored, value, operator);
      setStored(result);
      setDisplay(String(result));
    } else setStored(value);
    setOperator(next);
    setReplace(true);
  };
  const calculate = (a: number, b: number, op: string) => {
    if (op === "+") return a + b;
    if (op === "−") return a - b;
    if (op === "×") return a * b;
    if (op === "÷") return b === 0 ? NaN : a / b;
    return b;
  };
  const equals = () => {
    if (stored === null || !operator) return;
    const result = calculate(stored, Number(display), operator);
    setDisplay(Number.isFinite(result) ? String(Number(result.toPrecision(12))) : "Error");
    setStored(null); setOperator(null); setReplace(true);
  };
  const clear = () => { setDisplay("0"); setStored(null); setOperator(null); setReplace(false); };

  const keys = ["7","8","9","÷","4","5","6","×","1","2","3","−","0",".","C","+"];

  return (
    <section className="tap-mini-app tap-calculator">
      <div className="tap-calculator-display" aria-live="polite">{display}</div>
      <div className="tap-calculator-grid">
        {keys.map((key) => <button key={key} type="button" onClick={() => key === "C" ? clear() : ["÷","×","−","+"].includes(key) ? chooseOperator(key) : digit(key)} className={["÷","×","−","+"].includes(key) || key === "C" ? "operator" : ""}>{key}</button>)}
        <button className="equals" type="button" onClick={equals}>=</button>
      </div>
    </section>
  );
}
