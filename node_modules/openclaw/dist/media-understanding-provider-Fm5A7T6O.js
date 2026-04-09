import { n as describeImagesWithModel, t as describeImageWithModel } from "./image-runtime-C6QbxTR_.js";
import "./media-understanding-Cl-f734o.js";
//#region extensions/openrouter/media-understanding-provider.ts
const openrouterMediaUnderstandingProvider = {
	id: "openrouter",
	capabilities: ["image"],
	defaultModels: { image: "auto" },
	describeImage: describeImageWithModel,
	describeImages: describeImagesWithModel
};
//#endregion
export { openrouterMediaUnderstandingProvider as t };
