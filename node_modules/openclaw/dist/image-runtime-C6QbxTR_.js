import { n as createLazyRuntimeMethodBinder, r as createLazyRuntimeModule } from "./lazy-runtime-BwFSOU2O.js";
//#region src/media-understanding/image-runtime.ts
const bindImageRuntime = createLazyRuntimeMethodBinder(createLazyRuntimeModule(() => import("./image-FYK-QUuH.js")));
const describeImageWithModel = bindImageRuntime((runtime) => runtime.describeImageWithModel);
const describeImagesWithModel = bindImageRuntime((runtime) => runtime.describeImagesWithModel);
//#endregion
export { describeImagesWithModel as n, describeImageWithModel as t };
