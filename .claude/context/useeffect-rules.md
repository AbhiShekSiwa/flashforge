# useEffect Rules — Read before writing any useEffect

Infinite loop bugs (React error #310) have been a repeated issue.

## Golden Rule
Values you SET inside a useEffect must NEVER be in the dependency array.
Only values you READ go in the dependency array.

## Checklist — run through this before every useEffect
- [ ] Am I setting state inside this effect? → that variable stays OUT of deps
- [ ] Does the effect run unconditionally? → add a guard: `if (already set) return`
- [ ] Is there an object/array in the deps? → use a primitive instead (`.id`, `.length`)
- [ ] Is a function in the deps? → move it outside the component or use useCallback
- [ ] Is startSession or similar trigger inside a useEffect? → move it out, make it a plain function

## Quick examples
```js
// ❌ WRONG
useEffect(() => { setOptions(generate()) }, [options])

// ✅ CORRECT  
useEffect(() => {
  if (options[currentIndex] !== undefined) return
  setOptions(prev => ({ ...prev, [currentIndex]: generate() }))
}, [currentIndex])
```