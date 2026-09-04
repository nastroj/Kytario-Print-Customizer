const regex = /^(?:REF|R|CHORUS|BRIDGE|VERSE|PRE-CHORUS|INTRO|OUTRO|SOLO|CODA)[a-z]*\s*\d*[\.\:]?$/i;
console.log(regex.test("REF"));
console.log(regex.test("Chorus"));
console.log(regex.test("VERSE 1"));
console.log(regex.test("R1:"));
console.log(regex.test("Am"));
console.log(regex.test("C"));
