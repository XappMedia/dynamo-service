/**
 * Generates a random alpha-numeric string of provided size.  Default is 5.
 *
 * @export
 * @param {number} size - The size the string should be.  The default is 5.
 */
export function randomString(size: number = 5) {
    if (size < 0) {
        throw Error("Random string can not have a negative length.");
    }
    const useChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890";
    let full = "";
    for (let i = 0; i < size; ++i) {
        full += useChars.charAt(Math.floor(Math.random() * useChars.length));
    }
    return full;
}