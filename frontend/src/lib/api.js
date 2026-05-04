import axios from "axios";
import { getDeviceId } from "./device";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const http = axios.create({ baseURL: API, timeout: 60000 });

export const api = {
    listMoutoun: async () => {
        const { data } = await http.get("/moutoun", { params: { device_id: getDeviceId() } });
        return data;
    },
    getMatn: async (id) => {
        const { data } = await http.get(`/moutoun/${id}`);
        return data;
    },
    createMatn: async (matn) => {
        const { data } = await http.post("/moutoun", { ...matn, device_id: getDeviceId() });
        return data;
    },
    deleteMatn: async (id) => {
        const { data } = await http.delete(`/moutoun/${id}`, { params: { device_id: getDeviceId() } });
        return data;
    },
    updateMatn: async (id, updates) => {
        const { data } = await http.put(`/moutoun/${id}`, updates);
        return data;
    },
    restoreMatn: async (id) => {
        const { data } = await http.post(`/moutoun/${id}/restore`);
        return data;
    },
    listDeletedMoutoun: async () => {
        const { data } = await http.get("/moutoun/deleted/list");
        return data;
    },
    getProgress: async (matn_id) => {
        const { data } = await http.get(`/progress/${getDeviceId()}`, { params: matn_id ? { matn_id } : {} });
        return data;
    },
    updateProgress: async ({ matn_id, bayt_index, action }) => {
        const { data } = await http.post("/progress", {
            device_id: getDeviceId(), matn_id, bayt_index, action,
        });
        return data;
    },
    getPlan: async () => {
        const { data } = await http.get(`/plan/${getDeviceId()}`);
        return data;
    },
    getStats: async () => {
        const { data } = await http.get(`/stats/${getDeviceId()}`);
        return data;
    },
    aiChat: async ({ matn_id, bayt_index, message, mode = "free" }) => {
        const { data } = await http.post("/ai/chat", {
            device_id: getDeviceId(), matn_id, bayt_index, message, mode,
        });
        return data;
    },
    listPrograms: async () => {
        const { data } = await http.get(`/programs/${getDeviceId()}`);
        return data;
    },
    createProgram: async (program) => {
        const { data } = await http.post("/programs", { ...program, device_id: getDeviceId() });
        return data;
    },
    deleteProgram: async (id) => {
        const { data } = await http.delete(`/programs/${id}`, { params: { device_id: getDeviceId() } });
        return data;
    },
    updateProgramStatus: async (id, status) => {
        const { data } = await http.patch(`/programs/${id}`, null, {
            params: { device_id: getDeviceId(), status },
        });
        return data;
    },
    getProgramDetail: async (id) => {
        const { data } = await http.get(`/programs/detail/${id}`);
        return data;
    },
    getTodayPrograms: async () => {
        const { data } = await http.get(`/programs/today/${getDeviceId()}`);
        return data;
    },
};
