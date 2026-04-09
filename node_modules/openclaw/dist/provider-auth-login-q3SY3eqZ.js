import { n as createLazyRuntimeMethodBinder, r as createLazyRuntimeModule } from "./lazy-runtime-BwFSOU2O.js";
//#region src/plugin-sdk/provider-auth-login.ts
const bindProviderAuthLoginRuntime = createLazyRuntimeMethodBinder(createLazyRuntimeModule(() => import("./provider-auth-login.runtime-D6HqLI3k.js")));
const githubCopilotLoginCommand = bindProviderAuthLoginRuntime((runtime) => runtime.githubCopilotLoginCommand);
const loginChutes = bindProviderAuthLoginRuntime((runtime) => runtime.loginChutes);
const loginOpenAICodexOAuth = bindProviderAuthLoginRuntime((runtime) => runtime.loginOpenAICodexOAuth);
//#endregion
export { loginChutes as n, loginOpenAICodexOAuth as r, githubCopilotLoginCommand as t };
