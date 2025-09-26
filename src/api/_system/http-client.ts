import axios, { AxiosRequestConfig } from "axios";

import { supabase } from "../../lib/supabase";
import { API_BASE_URL } from "../../config";

interface MakeRequestConfig extends AxiosRequestConfig {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
}

export const ACCESS_TOKEN_LS_KEY = "access_token";
export const REFRESH_TOKEN_LS_KEY = "refresh_token";

const ai = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  },
});

export const makeRequest = async <D>(config: MakeRequestConfig) => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return ai<D>({
    ...config,
    headers: {
      ...(!!session?.access_token && {
        Authorization: `Bearer ${session.access_token}`,
      }),
      ...config.headers,
    },
  });
};

makeRequest.auto = <D>(config: MakeRequestConfig): Promise<D> =>
  makeRequest<D>(config).then((response) => response.data);
