import axios, { AxiosResponse } from 'axios';

axios.defaults.timeout = 1000 * 60 * 10;
const setInterceptors = (request) => {
  request.interceptors.response.use((res: AxiosResponse) => {
    if (
      res.headers['content-type']?.includes('application/json') &&
      (!res.config.responseType || res.config.responseType === 'json')
    ) {
      return res.data;
    } else {
      return res;
    }
  });
};

export const backendRequest = axios.create();
backendRequest.defaults.baseURL = process.env.BACKEND_URL;
setInterceptors(backendRequest);

export const fetch = axios.create();
setInterceptors(fetch);
