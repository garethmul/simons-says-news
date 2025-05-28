// Auto-generated port configuration
export const PORTS = {
  FRONTEND: 5576,
  BACKEND: 3607,
  HMR: 5577
};

export const getPortConfig = () => ({
  vite: PORTS.FRONTEND,
  express: PORTS.BACKEND,
  hmr: PORTS.HMR
}); 