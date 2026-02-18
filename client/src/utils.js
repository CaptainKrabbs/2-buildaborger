export const SERVER_URL = "http://localhost:8080"

export function capitalise(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

export function swap(arr, idx) {
    if (idx > arr.length-1) {
        console.error("Error on swap. Index belongs to the last element.")
        return arr
    } else if (idx < 0 || idx >= arr.length) {
        console.error("Error on swap. Index out of bounds.")
    } else {
        return [...arr.slice(0, idx), arr[idx+1], arr[idx], ...arr.slice(idx+2)];
    }
}

export function setAtIdx(arr, idx, val) {
    const newArr = [...arr];
    newArr[idx] = val;
    return newArr;
}

export function insertAtIdx(arr, idx, val) {
    return [...arr.slice(0, idx), val, ...arr.slice(idx+1)];
}

export function insertFirst(arr, val) {
    return [val, ...arr];
}

export function insertLast(arr, val) {
    return [...arr, val];
}

export function removeFirst(arr) {
    return [...arr.slice(1)];
}
export function removeLast(arr) {
    return [...arr.slice(0, arr.length-1)];
}