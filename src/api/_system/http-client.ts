import axios, { AxiosRequestConfig } from "axios";

interface MakeRequestConfig extends AxiosRequestConfig {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
}

const ai = axios.create({
  headers: {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  },
});

export const makeRequest = async <D>(config: MakeRequestConfig) => {
  return ai<D>(config);
};

makeRequest.auto = <D>(config: MakeRequestConfig): Promise<D> =>
  makeRequest<D>(config).then((response) => response.data);
