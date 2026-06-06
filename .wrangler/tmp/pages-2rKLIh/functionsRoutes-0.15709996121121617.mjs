import { onRequestPost as __api_verify_ts_onRequestPost } from "C:\\Users\\kouki\\ai-factory\\typeflow\\functions\\api\\verify.ts"

export const routes = [
    {
      routePath: "/api/verify",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_verify_ts_onRequestPost],
    },
  ]