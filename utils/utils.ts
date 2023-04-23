/**
 * Given an array of objects, returns the object with the maximum value (as optionally determined by the given valueSelector function).
 * @param array The array from which to select the maximum element.
 * @param valueSelector An optional function that returns the value to be used for comparison.
 * @returns The object with the maximum value, or undefined if the array is empty.
 */
export const maxElementOrDefault = <T, TValue>(
  array: T[],
  valueSelector?: (item: T) => TValue,
): T | undefined => {
  if (!array.length) {
    return undefined;
  }

  return array.reduce((a, b) => {
    return (valueSelector ? valueSelector(a) : a) >
      (valueSelector ? valueSelector(b) : b)
      ? a
      : b;
  });
};

/**
 * Given an array of objects, returns the object with the minimum value (as optionally determined by the given valueSelector function).
 * @param array The array from which to select the minimum element.
 * @param valueSelector An optional function that returns the value to be used for comparison.
 * @returns The object with the minimum value, or undefined if the array is empty.
 */
export const minElementOrDefault = <T, TValue>(
  array: T[],
  valueSelector?: (item: T) => TValue,
): T | undefined => {
  if (!array.length) {
    return undefined;
  }

  return array.reduce((a, b) => {
    return (valueSelector ? valueSelector(a) : a) <
      (valueSelector ? valueSelector(b) : b)
      ? a
      : b;
  });
};
