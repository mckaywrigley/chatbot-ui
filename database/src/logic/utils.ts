export function generateRandomSixDigitNumber() {
  const min = 100000;
  const max = 999999;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function isObjNonEmpty(obj: any): boolean {
  return !!Object.keys(obj).length;
}

