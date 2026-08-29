/**
 * Universal Firestore payload sanitizer
 * Converts undefined values to null so Firestore setDoc, updateDoc,
 * and writeBatch.commit() do not reject writes silently.
 */
export const sanitizeForFirestore = <T>(data: T): T => {
  return JSON.parse(
    JSON.stringify(data, (_, value) => (value === undefined ? null : value))
  );
};

export default sanitizeForFirestore;
