// Device ID stored in localStorage, no auth needed.
const KEY = "moutoun_device_id";

export function getDeviceId() {
    let id = localStorage.getItem(KEY);
    if (!id) {
        id = "dev_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem(KEY, id);
    }
    return id;
}
